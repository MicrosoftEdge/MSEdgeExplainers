# Multi-Range Selection in Chromium

This document proposes implementing multi-range selection support in Chromium's Selection API, enabling discontinuous text selection and aligning with Firefox's existing implementation.

## Authors

- Samba Murthy Bandaru (sambamurthy.bandaru@microsoft.com)

## Participate

- Spec: [W3C Selection API](https://w3c.github.io/selection-api/#dom-selection-addrange)
- Spec issue tracker: [w3c/selection-api](https://github.com/w3c/selection-api/issues)
- [Chromium editing-dev group](https://groups.google.com/a/chromium.org/g/editing-dev)
- MDN: [Selection.addRange()](https://developer.mozilla.org/en-US/docs/Web/API/Selection/addRange)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Non-Goals](#3-goals-and-non-goals)
4. [Current State of the Platform](#4-current-state-of-the-platform)
5. [Key Use Cases](#5-key-use-cases)
6. [Proposed API Design](#6-proposed-api-design)
7. [Implementation Overview](#7-implementation-overview)
8. [Feature Activation and Rollout Plan](#8-feature-activation-and-rollout-plan)
9. [Compatibility Risk and Mitigation](#9-compatibility-risk-and-mitigation)
10. [Interoperability and Spec Alignment](#10-interoperability-and-spec-alignment)
11. [Standards Position](#11-standards-position)
12. [Performance Impact](#12-performance-impact)
13. [Security and Privacy](#13-security-and-privacy)
14. [Accessibility](#14-accessibility)
15. [Open Questions](#15-open-questions)
16. [References](#16-references)

---

## 1. Introduction

Users cannot Ctrl+Click to select multiple non-contiguous words in Chrome. This interaction works in Firefox and in word processors like Microsoft Word and LibreOffice Writer. Chrome's limitation stems from Blink's `Selection` implementation being hardcoded to a single range.

The [Selection API](https://w3c.github.io/selection-api/) exposes a `Selection` object with methods like `addRange()`, `removeRange()`, `getRangeAt(index)`, and the `rangeCount` attribute, all implying a collection of disjoint `Range` objects. However, Chrome (and Safari) implement single-range-only semantics: `addRange()` is silently ignored when a range already exists, and `rangeCount` is always `0` or `1`.

This explainer proposes making Chromium's `Selection` honor multiple ranges, enabling discontinuous text selection for web content.

---

## 2. Problem Statement

### 2.1 The User-Visible Problem

Some desktop applications support Ctrl+Click (or Cmd+Click on macOS) to build a non-contiguous, multi-word selection. Microsoft Word and LibreOffice Writer both support this interaction natively. Among browsers, Firefox supports Ctrl+Click to add words to a selection. In Chrome, Ctrl+Click simply replaces the existing selection with a new one.

Note: Code editors like VS Code and JetBrains IDEs support multi-cursor editing, but this is implemented via custom overlays rather than the native platform selection API. The existence of these workarounds is itself evidence of demand for the feature (see Section 2.3).

This gap is particularly noticeable for:
- Users switching between Word/Firefox and Chrome who expect the same Ctrl+Click behavior
- Power users copying non-adjacent table cells
- Web-based code editors that want native multi-cursor selection without custom overlays

### 2.2 The API Gap

```javascript
const sel = window.getSelection();
sel.removeAllRanges();

const r1 = document.createRange();
r1.setStart(node, 0); r1.setEnd(node, 5);
sel.addRange(r1);
console.log(sel.rangeCount); // 1

const r2 = document.createRange();
r2.setStart(node, 10); r2.setEnd(node, 15);
sel.addRange(r2);           // silently ignored
console.log(sel.rangeCount); // still 1
```

The W3C Selection API spec (Step 2 of `addRange()`) currently mandates: "If `rangeCount` is not `0`, abort these steps." Chromium and Safari follow this spec text. Firefox deviates from the spec and accumulates multiple ranges. The spec was deliberately restricted to single-range in 2011 to simplify implementation, but this leaves developers without a standards-based way to express discontinuous selection.

### 2.3 Developer Workarounds

Because the platform does not support multi-range selection, developers are forced into complex workarounds:

- Web-based spreadsheets (Google Sheets, Notion, Airtable) maintain custom canvas/overlay highlight layers to simulate column selection
- Browser-based code editors (vscode.dev, CodeMirror) implement multi-cursor entirely outside the native `Selection`, losing native clipboard, copy, and accessibility integration
- Chrome itself built a separate `TextFragmentHighlighter` / `kSearchText` highlight layer because `FrameSelection` cannot hold multiple ranges

### 2.4 Blink Source Evidence

The single-range restriction is intentionally hardcoded:

```cpp
// dom_selection.cc - addRange()
void DOMSelection::addRange(Range* new_range) {
  if (rangeCount() == 0) {
    UpdateFrameSelection(...);
    return;
  }
  // function simply ends here when rangeCount() > 0
}

// selection_editor.h - internal storage
SelectionInDOMTree selection_;  // single (anchor, focus) pair
```

---

## 3. Goals and Non-Goals

### Goals

- **G1**: Enable discontinuous text selection in Chrome, so users can Ctrl+Click/Drag to select multiple non-adjacent text spans
- **G2**: `addRange()` accumulates ranges rather than silently discarding subsequent calls
- **G3**: `rangeCount`, `getRangeAt(i)`, `removeRange()` work correctly for N ranges
- **G4**: Native clipboard integration: Ctrl+C copies the concatenated text of all ranges
- **G5**: All selected ranges are visually highlighted
- **G6**: Align programmatic behavior with Firefox for web compatibility

### Non-Goals

- **NG1**: Cross-origin or cross-frame multi-range selection
- **NG2**: Multi-range inside `<input>` / `<textarea>` text controls (these use a separate selection model with tighter OS input API constraints)
- **NG3**: Changing Shift+Arrow selection extension behavior (Shift+Arrow operates on a single logical selection; multi-range selection extension is a separate future concern)
- **NG4**: Changing existing selection behavior when only a single range is present (must be 100% backward-compatible)

---

## 4. Current State of the Platform

### 4.1 Browser Landscape

| Browser | Multi-range support | Notes |
|---------|-------------------|-------|
| **Firefox** | Yes | Ctrl+Click to add words; table column/cell selection. Supported since early Gecko. [MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/Selection/addRange) |
| **Chrome / Chromium** | No | `addRange()` no-op when non-empty (follows spec Step 2) |
| **Safari / WebKit** | No | Same as Chrome |
| **Edge (Chromium)** | No | Inherits Chromium behavior |

MDN explicitly notes: "only Firefox supports multiple selection ranges."

### 4.2 The W3C Selection API Spec (Current State)

The [W3C Selection API](https://w3c.github.io/selection-api/) (Editor's Draft, January 2025, edited by Ryosuke Niwa of Apple) currently mandates single-range behavior:

**Definition (Section 2):** "Each selection can be associated with a single range."

**`addRange()` (Section 3):** Step 2 says "If `rangeCount` is not `0`, abort these steps."

**`rangeCount` (Section 3):** "must return `0` if this is empty... and must return `1` otherwise."

**Spec NOTE explaining the single-range restriction:**
> "Originally, the Selection interface was a Netscape feature. The Netscape implementation always allowed multiple ranges in a single selection, for instance so the user could select a column of a table. However, multi-range selections proved to be an unpleasant corner case that web developers didn't know about and even Gecko developers rarely handled correctly. Other browser engines never implemented the feature, and clamped selections to a single range in various incompatible fashions."
>
> "This specification follows non-Gecko engines in restricting selections to at most one range, but the API was still originally designed for selections with arbitrary numbers of ranges."

**Spec NOTE on `addRange()`:** "At Step 2, Chrome 58 and Edge 25 do nothing. Firefox 51 gives you a multi-range selection."

This means:
- Chrome **follows** the current spec
- Firefox **deviates** from the spec (but has done so stably for 20+ years)
- Implementing multi-range requires both a Chromium implementation **and** a spec change

### 4.3 UseCounter Instrumentation

Blink already tracks selection operations via `UseCounterFeature`:
```
kSelectionRangeCount  = 1002
kSelectionGetRangeAt  = 1003
kSelectionAddRange    = 1004
```

These counters can be used to measure how often `addRange()` is called when a range already exists, indicating demand for multi-range behavior.

### 4.4 WPT Test Coverage

The WPT suite (`selection/addRange-*.html` tests) explicitly asserts that the second `addRange()` call does nothing:

```javascript
// addRange.js:
testAddRangeDoesNothing(exception, range2, endpoints2, "second", testName);
```

These tests reflect the current spec and would need to be updated alongside the spec change.

---

## 5. Key Use Cases

### 5.1 Ctrl+Click Discontinuous Word Selection

Desktop text editors universally support Ctrl+Click to select non-contiguous words. The browser has never supported this for web content.

```
"The quick brown fox jumps over the lazy dog"
         ^^^^^       ^^^             ^^^^
         Range 1     Range 2         Range 3
```

User selects "quick", Ctrl+clicks "fox", Ctrl+clicks "lazy". Pressing Ctrl+C copies "quickfoxlazy".

### 5.2 Table Column Selection

Selecting a table column means selecting cells from many rows while excluding other columns. This is inherently non-contiguous.

```
| A | B | C |     Selecting column B:
| D | E | F |     Range 1: "B"
| G | H | I |     Range 2: "E"
                  Range 3: "H"
```

Not possible via the native Selection API in Chrome today. Firefox supports this with Ctrl+Click on cells.

### 5.3 Multi-Cursor Code Editors

VS Code's web version (vscode.dev) and other browser-based IDEs simulate multi-cursor via canvas or custom overlay elements. With native multi-range selection:
- Each cursor/selection would be a native `Range`
- Clipboard operations would automatically aggregate all ranges
- Screen readers would receive native selection-changed events
- IME composition panels would position correctly

### 5.4 Find-and-Replace: "Select All Occurrences"

"Select All Occurrences of Current Word" should result in every occurrence being natively selected. Today Chrome uses a separate parallel highlight system (`TextFragmentHighlighter`) because `FrameSelection` cannot hold multiple ranges. With multi-range, this could be a real `Selection` operation with native Ctrl+C support.

---

## 6. Proposed API Design

### 6.1 Behavior Changes

#### `addRange(range)` accumulates ranges

When a selection already exists:
- **Current (spec-mandated):** silently ignore the call.
- **Proposed:** add `range` as an additional disjoint range.
  - If `range` overlaps or is adjacent to an existing range, merge them into a union range (matching Firefox).
  - Ranges are stored sorted by document-order start position.

```javascript
sel.removeAllRanges();
sel.addRange(r1);  // [r1]
sel.addRange(r2);  // [r1, r2] or merged if overlapping
console.log(sel.rangeCount);  // 2
```

#### `rangeCount` reflects true count

Returns the actual number of ranges: 0, 1, or N.

#### `getRangeAt(index)` works for all valid indices

Valid for `0 <= index < rangeCount`. Ranges ordered by document position.

#### `toString()` concatenates all ranges

Returns text of all ranges in document order with no separator (matching Firefox).

#### User gesture: Ctrl+Click / Ctrl+Drag

Wire up `SelectionController` to handle Ctrl+Click/Drag as "add to selection":
- Ctrl+Click: add a caret or word selection at the click position
- Ctrl+Drag: add a range for the drag. Merge if overlapping.

### 6.2 Unchanged APIs

- `collapse()`, `collapseToStart()`, `collapseToEnd()`: collapse to single caret, removing all other ranges
- `extend()`: extends the focused (most recently added) range only
- `setBaseAndExtent()`: replaces all ranges with a single new range
- `selectAllChildren()`: replaces all ranges with a single range
- `deleteFromDocument()`: deletes content of all ranges (matching Firefox)

### 6.3 `getComposedRanges()` Extension

Currently returns at most one `StaticRange`. Under multi-range, returns a `StaticRange[]` for each range, each rescoped to the provided shadow roots.

---

## 7. Implementation Overview

The implementation touches every layer of the selection pipeline in Blink. Key architectural challenges:

### Storage

Replace the single `SelectionInDOMTree selection_` in `SelectionEditor` with a vector-based `MultiRangeSelection` class behind a `RuntimeEnabledFeature` flag. Single-range sites see no change.

### Layout and Painting

`LayoutSelection` currently tags each `LayoutObject` with a single `SelectionState` (`kNone`, `kStart`, `kInside`, `kEnd`, `kStartAndEnd`). A `LayoutObject` belonging to two ranges simultaneously cannot be expressed with this enum. The painting layer needs to support multiple `(startOffset, endOffset)` spans per `LayoutText` node.

### Accessibility

Platform accessibility APIs (UIA on Windows, NSAccessibility on macOS) do not support multi-range selection. The accessibility layer should report the focused (most recently added) range as the primary selection and fire `selectionchange` events normally.

### Phased Plan

| Phase | Scope | Description |
|-------|-------|-------------|
| **1** | Storage + DOM | Vector-based multi-range storage behind flag; `addRange()` accumulates; `rangeCount`/`getRangeAt()` return correct values |
| **2** | Layout + Paint | Extend layout and paint to handle multiple paint ranges; highlight all ranges |
| **3** | Clipboard | Ctrl+C copies concatenated text of all ranges |
| **4** | Input gestures | Ctrl+Click / Ctrl+Drag adds to selection |
| **5** | Accessibility | Platform bridges report multi-range correctly |
| **6** | WPT / Spec | Update WPT expectations; land spec PRs |

---

## 8. Feature Activation and Rollout Plan

The feature will be gated behind a disabled-by-default runtime flag:

- **Command line:** `--enable-blink-features=MultiRangeSelection`
- **Runtime flag:** `RuntimeEnabledFeatures::MultiRangeSelectionEnabled()`

**Rollout phases:**

1. **Phase 1 (current):** Feature flag disabled by default. Developers and testers can opt in via command-line flag.
2. **Phase 2:** Expose a `chrome://flags` entry for user opt-in without command-line flags.
3. **Phase 3:** Enable by default for all users (after spec alignment and WPT updates).
4. **Phase 4:** Remove the feature flag and legacy single-range codepaths.

Until the feature is enabled, selection behavior remains unchanged. No user-visible changes occur without explicit opt-in during Phases 1 and 2.

---

## 9. Compatibility Risk and Mitigation

### 9.1 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sites checking `rangeCount === 1` as a guard | Medium | Feature flag gating; UseCounter data to assess frequency |
| Polyfills calling `addRange()` expecting no-op | Low | UseCounter already tracks `kSelectionAddRange`; monitor calls with existing non-empty selection |
| WPT tests assert `addRange` does nothing | Low | Phase WPT changes alongside spec PR |
| IME composition with multi-range active | Medium | Collapse to focused range on IME start (matching multi-cursor editor convention) |

### 9.2 UseCounter Strategy

Before enabling by default, collect UseCounter data on:
- How often `addRange()` is called when `rangeCount > 0` (indicates intentional multi-range attempts vs. accidental)
- How often code relies on `rangeCount === 1` post-`addRange()`

### 9.3 Rollback

If regressions appear, the feature flag can be disabled instantly via Finch (Chrome's server-side feature configuration) without requiring a new Chrome release.

---

## 10. Interoperability and Spec Alignment

### 10.1 Required Spec Changes

Implementing multi-range requires changing the W3C Selection API spec. The specific text to change:

**Section 2 (Definition):** Change "Each selection can be associated with a single range" to allow a collection of ranges.

**Section 3 (`addRange()`):** Remove Step 2 ("If `rangeCount` is not `0`, abort these steps") and define accumulation/merge semantics.

**Section 3 (`rangeCount`):** Allow values greater than 1.

**Section 3 (`getRangeAt()`):** Allow index values > 0.

The spec NOTE about the single-range restriction would be updated to reflect the new multi-range consensus.

### 10.2 Spec Change Strategy

1. File an issue on [w3c/selection-api](https://github.com/w3c/selection-api/issues) proposing multi-range support
2. Engage with the spec editor (Ryosuke Niwa, Apple) and Web Editing Working Group
3. Define merge semantics for overlapping ranges (match Firefox)
4. Clarify `anchor`/`focus` semantics when N ranges exist
5. Land spec PR alongside Chromium implementation reaching Phase 3

### 10.3 Firefox Reference Behavior

Firefox is the primary implementation reference:
- `addRange()` merges overlapping ranges into a union range
- Ranges stored sorted by start position in document order
- `anchorNode`/`anchorOffset` is the first range's start
- `focusNode`/`focusOffset` is the last range's end
- `toString()` returns concatenated text with no separator
- `deleteFromDocument()` deletes all ranges' content

---

## 11. Standards Position

### 11.1 Current Spec

The W3C Selection API spec (Editor's Draft, January 2025) explicitly restricts selections to a single range. This restriction was introduced in 2011 by then-editor Aryeh Gregor to simplify implementations after non-Gecko engines never adopted multi-range.

### 11.2 Browser Positions

| Engine | Position | Evidence |
|--------|----------|----------|
| **Gecko (Firefox)** | Positive (ships multi-range) | Has shipped for 20+ years; stable implementation in `dom/base/Selection.cpp` |
| **Blink (Chrome)** | Proposing to implement | This explainer |
| **WebKit (Safari)** | Unknown / likely cautious | Spec editor Ryosuke Niwa (Apple) authored the single-range restriction. No public signal of intent to change. |

### 11.3 Assessment

This proposal goes against the current spec text but aligns with Firefox's longstanding behavior. Gaining WebKit buy-in may be the largest standards challenge, given that Apple's representative authored the restriction language. Early engagement with the Web Editing Working Group is critical.

---

## 12. Performance Impact

This feature introduces minimal overhead for the common case (single range). When only one range is present, the code path is identical to today.

For multi-range scenarios:
- `LayoutSelection::Commit()` walks the flat tree once per paint frame. With N ranges, the walk is structured as a single pass with a sorted range list, so complexity remains O(layout tree nodes) rather than O(N x layout tree nodes).
- Each `addRange()` call requires O(N) to check for overlaps and maintain sort order. In practice, N is small (typically < 10 for user-gesture selections).
- Memory overhead is one additional `EphemeralRange` (a few pointers) per range.

---

## 13. Security and Privacy

This feature introduces no new security or privacy concerns:

- The `Selection` and `Range` APIs already exist; this changes the behavior of existing methods, not the API surface
- No new user information is exposed
- Programmatic `addRange()` calls are already possible from script (they just currently no-op)
- The Ctrl+Click gesture requires user interaction (same as any other selection operation)
- `navigator.clipboard.readText()` still requires explicit permission regardless of range count

---

## 14. Accessibility

Platform accessibility APIs largely do not support multi-range selection:

| Platform | Multi-range support |
|----------|-------------------|
| Windows (UIA) | `ITextProvider` exposes one `ITextRangeProvider` selection |
| macOS (NSAccessibility) | `AXSelectedTextRange` is a single range |
| Linux (AT-SPI) | Partial: `Accessible::getSelection()` can return multiple ranges in some implementations |
| Android (AccessibilityNodeInfo) | Single selection range |

**Recommended behavior:**
- Report the focused range (most recently added) as the primary accessibility selection
- Fire `selectionchange` for each selection change
- Screen readers announce the focused range text; optionally indicate "[N] ranges selected" when `rangeCount > 1`

---

## 15. Open Questions

1. **Merge or error on overlap?**
   Firefox merges overlapping ranges. Should Chrome throw on overlap or merge silently? **Recommendation:** merge, matching Firefox.

2. **What is `anchorNode`/`focusNode` when `rangeCount > 1`?**
   Firefox reports `anchor` as the first range's start and `focus` as the last range's end (in document order, since ranges are sorted by start position). **Recommendation:** match Firefox for compat.

3. **IME composition with multi-range?**
   `InputMethodController` tracks a single composition range. **Recommendation:** use the focused range, collapse all others on IME start (matching multi-cursor editor convention).

4. **WebKit engagement strategy?**
   The spec editor is from Apple. What is the path to gaining WebKit support or at least non-opposition? Early engagement via the Web Editing Working Group is essential.

5. **`revealSelection()` with N ranges?**
   **Recommendation:** scroll to the most recently modified range.

---

## 16. References

1. **W3C Selection API (Editor's Draft):** https://w3c.github.io/selection-api/
2. **W3C Selection API issue tracker:** https://github.com/w3c/selection-api/issues
3. **MDN: Selection.addRange():** https://developer.mozilla.org/en-US/docs/Web/API/Selection/addRange
4. **MDN: Selection.rangeCount:** https://developer.mozilla.org/en-US/docs/Web/API/Selection/rangeCount
5. **Firefox multi-range implementation:** https://searchfox.org/mozilla-central/source/dom/base/Selection.cpp
6. **Chromium source: `dom_selection.cc`:** https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/dom_selection.cc
7. **Chromium source: `selection_editor.h`:** https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/selection_editor.h
8. **WPT: `selection/addRange.js`:** https://github.com/web-platform-tests/wpt/blob/master/selection/addRange.js
9. **WPT results for Selection:** https://wpt.fyi/results/selection/
