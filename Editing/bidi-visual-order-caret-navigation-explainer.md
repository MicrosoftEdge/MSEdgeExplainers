# Visual Order Caret Navigation for Bidirectional Text

## Authors

- Samba Murthy Bandaru (sambamurthy.bandaru@microsoft.com)

## Participate
- Feature request: [Visual order caret navigation for bidi text](https://issues.chromium.org/issues/499819853)
- Spec: [Selection API -- `Selection.modify()`](https://w3c.github.io/selection-api/#dom-selection-modify)
- [Chromium editing-dev group](https://groups.google.com/a/chromium.org/g/editing-dev)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [The Bidirectional Text Problem](#the-bidirectional-text-problem)
  - [How Bidi Text Works](#how-bidi-text-works)
  - [The Logical vs. Visual Movement Problem](#the-logical-vs-visual-movement-problem)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposed Solution](#proposed-solution)
- [The API Surface](#the-api-surface)
- [Feature Activation](#feature-activation)
- [Privacy and Security Considerations](#privacy-and-security-considerations)
- [Performance Impact](#performance-impact)
- [Interoperability](#interoperability)
- [Considered Alternatives](#considered-alternatives)
- [Standards Position](#standards-position)
- [Target Users](#target-users)
- [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Chromium's Blink rendering engine currently maps arrow keys to **logical directions** (forward/backward in DOM order) based on the **base direction** of the line -- set by the HTML [`dir`](https://html.spec.whatwg.org/multipage/dom.html#the-dir-attribute) attribute or the CSS [`direction`](https://drafts.csswg.org/css-writing-modes/#direction) property. Concretely: in an LTR line, the Right arrow moves **forward** through DOM order and the Left arrow moves **backward**; in an RTL line, this mapping flips -- Right moves **backward** and Left moves **forward**. This is sometimes called "logical" movement because the arrow keys ultimately resolve to forward/backward traversal of the DOM, but it is not pure memory-order movement -- the mapping depends on the line's base direction, not on the **script direction** (the inherent directionality of the text itself, e.g., LTR for Latin, RTL for Arabic and Hebrew).

This makes the current caret movement visually inconsistent:

| Scenario | Left arrow visually moves... | Right arrow visually moves... |
|----------|------------------------------|-------------------------------|
| LTR text in LTR/auto line | Left | Right |
| RTL text in RTL/auto line | Left | Right |
| LTR text in RTL line | **Right** | **Left** |
| RTL text in LTR line | **Right** | **Left** |
| Mixed bidi text (any line) | **Jumps unpredictably at bidi boundaries** | **Jumps unpredictably at bidi boundaries** |

This behavior is confusing and disorienting, particularly for users who routinely work with bidirectional content.

This explainer proposes implementing **visual caret navigation** in Chromium -- arrow key movement that always follows the on-screen direction, so that Right moves the caret rightward and Left moves it leftward regardless of text or line direction. The feature will be gated behind a feature flag for incremental rollout.

## The Bidirectional Text Problem

### How Bidi Text Works

Chromium stores text in **logical order** — the order in which characters are typed in that language. For English, logical order runs left-to-right: `a`, `b`, `c`. For Hebrew, logical order runs right-to-left: `א`, `ב`, `ג` (aleph, bet, gimel). The DOM offsets always refer to this logical sequence regardless of how the text appears on screen.

To render text, Blink applies the **Unicode Bidirectional Algorithm** (UBA, UAX #9), which maps logical indices to visual coordinates. The algorithm segments mixed-direction text into **runs**, flips only the RTL runs visually, and composes the final on-screen layout.

For example, consider a string with the following characters typed in this order into an LTR paragraph. The DOM stores it exactly in that order:

**Logical order (DOM storage):**

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|-------|---|---|---|---|---|---|---|---|---|---|---|
| Char  | a | b | c | ␣ | א | ב | ג | ␣ | d | e | f |
| Dir   | LTR | LTR | LTR | — | RTL | RTL | RTL | — | LTR | LTR | LTR |

The UBA reorders this for display, flipping only the Hebrew run:

**Visual order (on screen, left to right):**

| Visual pos | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|------------|---|---|---|---|---|---|---|---|---|---|---|
| Char       | a | b | c | ␣ | ג | ב | א | ␣ | d | e | f |
| DOM index  | 0 | 1 | 2 | 3 | **6** | **5** | **4** | 7 | 8 | 9 | 10 |
 
The Hebrew run `גבא` (DOM indices 4–6) is visually reordered to `אבג` on screen. The final rendered string reads: **abc אבג def**. The logical indices in memory have not moved — only the visual positions on screen have changed.

### The Logical vs. Visual Movement Problem

This split between logical storage and visual rendering is where caret movement becomes confusing. Today, Chromium's arrow keys increment or decrement the **logical index**: Right arrow goes from index 3 to 4, then 4 to 5, and so on. This works fine within a single-direction run, but at a direction boundary the caret **jumps visually** because the next logical index maps to a distant screen position.

In the example above, pressing Right from position 3 (after "c ") moves to logical index 4 (`א`). But `א` sits at the *right* end of the Hebrew run on screen — the caret appears to jump rightward past the entire Hebrew text. Subsequent Right presses decrement visually (leftward through the Hebrew), then jump again when crossing back to "def".

Visual movement solves this by moving the caret based on its **screen position**: Right always moves rightward, crossing into the Hebrew run at its visual left edge and continuing smoothly through "def". No jumps.

## Goals

1. **Provide visual caret movement** — Right always moves rightward, Left always moves leftward — matching the mental model that user research confirms almost all participants expect.

2. **Predictable caret behavior at bidi boundaries** — The caret should move smoothly in the arrow key's direction when crossing between LTR and RTL text runs.

3. **Align with Firefox and Safari,** which already use visual caret movement by default.

4. **Gate behind a feature flag** for safe incremental rollout, with no behavior change for users who do not opt in.

5. **Correctly handle all bidi scenarios**: simple LTR/RTL boundaries, multiple bidi runs, nested bidi embeddings, bidi control characters, CSS `direction`/`unicode-bidi` overrides, and cross-line navigation.

## Non-Goals

1. **Changing selection extension behavior.** Shift+Arrow selection operates on logical DOM offsets. True visual selection across bidi boundaries would require multi-range selection support in Chromium, which does not exist today. This is a potential future extension but is out of scope.

## Proposed Solution

When the `BidiVisualOrderCaretNavigation` feature flag is enabled, Chromium's arrow key handling switches to visual (screen-order) caret movement. The implementation works by leveraging Blink's existing inline layout fragments, which are already stored in visual display order after bidi reordering. This allows the algorithm to walk through text in the order it appears on screen rather than the order it is stored in memory.

At a high level:

1. When a user presses an arrow key, the caret's current position is resolved to the layout fragment it belongs to.
2. The caret advances in the visual direction within that fragment. For LTR text, moving right increments the position; for RTL text, moving right decrements it.
3. When the caret reaches the edge of a fragment, it uses the **bidi level** of the current and adjacent fragments to determine which edge to enter — ensuring the caret crosses bidi boundaries smoothly without jumping.
4. At line boundaries, the caret moves to the next or previous line as expected.

## The API Surface

The existing [`Selection.modify()`](https://w3c.github.io/selection-api/#dom-selection-modify) API already distinguishes visual and logical directions:

```javascript
// Visual directions (affected by this feature)
selection.modify('move', 'left', 'character');
selection.modify('move', 'right', 'character');

// Logical directions (unaffected)
selection.modify('move', 'forward', 'character');
selection.modify('move', 'backward', 'character');
```

With this feature enabled, `'left'` and `'right'` will perform true visual movement in bidi text, while `'forward'` and `'backward'` will continue to perform logical movement. This matches the behavior of Firefox and Safari.

## Feature Activation

The feature is currently gated behind a disabled-by-default runtime flag:

- **Command line:** `--enable-blink-features=BidiVisualOrderCaretNavigation`
- **Rollout plan:** A `chrome://flags` entry, followed by enabling by default.

## Privacy and Security Considerations

This feature introduces no new privacy or security concerns.

- **No new APIs that expose user information.** The `Selection.modify()` API already exists; this feature changes the behavior of existing direction parameters, not the API surface.
- **Feature flag gated.** The feature is disabled by default and requires explicit opt-in during the experimental phase.

## Performance Impact

This feature introduces minimal overhead. Each caret movement requires one additional lookup to resolve the visual position from the layout fragments, which is negligible.

## Interoperability

This feature aligns Chromium with the default behavior of both Firefox (Gecko) and Safari (WebKit), which use visual caret movement for bidirectional text. Chrome is currently the only major browser that uses logical movement by default. By adopting visual caret movement, this feature improves cross-browser consistency for developers and users working with bidirectional content. The existing [`Selection.modify()`](https://w3c.github.io/selection-api/#dom-selection-modify) API semantics for `'left'`/`'right'` directions are preserved and made consistent with their documented visual behavior.

Beyond browsers, visual caret movement is also the default in macOS native text editing (TextKit) and GTK on Linux, and is an option in Microsoft Word.

## Considered Alternatives

No alternatives were considered. Visual caret movement is the established default in Firefox, Safari, and native platform text editing (macOS TextKit, GTK). The goal is to align Chromium with this existing cross-browser and cross-platform consensus.

## Standards Position

- **W3C:** No specification mandates logical or visual caret movement. The CSS Text Module and the `Selection` API leave movement behavior to UA implementation.
- **WHATWG:** The `Selection.modify()` method's `'left'`/`'right'` parameters are already defined as visual directions, distinct from `'forward'`/`'backward'` (logical). This feature makes `'left'`/`'right'` behave consistently with their documented semantics.

## Target Users

- Users who create or consume content in bidirectional scripts (Arabic, Hebrew etc.)
- Web developers building multilingual editing experiences
- Accessibility users who rely on consistent and predictable caret behavior

User research with Arabic–English bilingual users confirms that almost all participants expect visual caret movement — Left always moves left, Right always moves right — regardless of script direction.

## References

1. **Unicode Bidirectional Algorithm (UAX #9):** https://unicode.org/reports/tr9/
2. **WHATWG Selection API -- `Selection.modify()`:** https://w3c.github.io/selection-api/#dom-selection-modify
3. **Firefox `bidi.edit.caret_movement_style` preference:** https://kb.mozillazine.org/bidi.edit.caret_movement_style
4. **macOS TextKit 2 — NSTextSelectionNavigation:** https://developer.apple.com/documentation/uikit/nstextselectionnavigation/direction
5. **Chromium M76 visual navigation removal:** https://crbug.com/972750, https://crbug.com/834765
