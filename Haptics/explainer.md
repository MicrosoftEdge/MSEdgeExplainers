# Web Haptics API

Authors: [Nesh Gandhe](https://github.com/neshgandhe_microsoft), [Limin Zhu](https://github.com/liminzhu)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. The API is in the early ideation and interest-gauging stage, and the solution/design will likely evolve over time.

* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: **This document**

## Table of Contents
- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposed Approach](#proposed-approach)
- [Real-World Scenarios](#real-world-scenarios)
- [Coverage Gaps](#coverage-gaps-and-the-imperative-escape-hatch)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Privacy, and Security](#accessibility-privacy-and-security-considerations)
- [Open Questions](#open-questions)
- [Reference for Relevant Haptics APIs](#reference-for-relevant-haptics-apis)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction

Modern operating systems have embraced haptics as a core part of user experience — providing subtle, low-latency tactile cues that reinforce visual and auditory feedback. These signals improve confidence, precision, and delight in everyday interactions. The Web Haptics API proposes a semantic, cross-platform interface that connects web applications to native haptic capabilities. By focusing on intent-driven effects, the API enables web apps to deliver tactile feedback consistent with OS design principles, while preserving user privacy and security.

This proposal offers two complementary mechanisms:

1. **Declarative API (CSS)** — new CSS properties (`haptic-feedback`, `scroll-snap-haptic`) that configure haptic behavior on elements, requiring no JavaScript. These are behavioral properties — like `touch-action`, `pointer-events`, or `scroll-snap-type` — that tell the browser how to handle interaction feedback for a given element state.
2. **Imperative API** — `navigator.playHaptics(effect, intensity)` — for JavaScript-driven, programmatic haptics triggered by application logic.

The declarative path handles routine UI interactions with zero scripting overhead. The imperative path covers complex, conditional, or computed haptic scenarios that CSS can't express.

## User-Facing Problem

The [navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) API exists today for basic haptics. However, it is mobile-centric, lacks broad engine and device support, and requires developers to manually program duration/pattern sequences — a low-level interface that doesn't map to the way designers think about haptic intent.

Beyond the limitations of the existing API, there is no way for developers to add haptic feedback to common UI interactions — scroll-snap carousels, checkbox toggles, form validation — without JavaScript in the critical path.

## Goals

- Bring standardized, semantic haptic feedback to web apps across desktop and mobile platforms.
- Allow developers to signal intent/effect rather than programming raw patterns.
- Focus on reactive haptics feedback (i.e. haptics immediately after user input).
- Enable low-latency haptic feedback for common interactions without requiring JavaScript.
- Extensible interface for future haptics advancement on the web.
- Respect platform haptics user settings if available.
- Minimize privacy/fingerprinting concerns.

## Non-goals

- Guarantee identical tactile output across platforms — different platforms and user agents may choose varied output that best matches the intent.
- Cover haptics notification scenarios (e.g. vibrate to alert users when long-running task is completed).
- Cover/replace API for highly specialized hardware, namely gamepad.

## Proposed Approach

The Web Haptics API uses a pre-defined list of effects with an optional intensity parameter, without exposing raw waveform authoring or low-level parameters like duration, sharpness, or ramp. Developers request a named effect, and the user agent maps it to the closest native capability (which may be a generic pattern if OS or hardware support is lacking). To minimize fingerprinting risks, the API does not currently allow developers to query haptics-capable hardware or available waveforms. Instead, haptics will be sent to the last input device if haptics-capable.

Both the imperative and declarative paths share the same effect vocabulary.

### Effect Vocabulary

| Value   | Description | When to reach for it |
|---------|-------------|----------------------|
| `hint`  | A light, subtle cue that signals something is interactive or an action may follow. | Pointer entering a button, focusing an input field. |
| `edge`  | A heavy boundary signal that indicates reaching the end of a range or hitting a limit. | Validation failure, pull-to-refresh threshold, scroll hitting a boundary. |
| `tick`  | A firm pulse that marks discrete changes, like moving through a list or toggling a switch. | Scroll-snap landing, checkbox toggle, stepping through picker values. |
| `align` | A crisp confirmation when an object locks into place or aligns with guides or edges. | Drag-to-snap, window snapping to screen edges, zoom snapping to 100%. |
| `none`  | Explicitly disables haptic feedback. | Suppressing haptics on a "quiet" variant of a component via the cascade. |

Intensity is always a normalized value between 0.0 and 1.0. If the platform exposes a system-level intensity setting, the effective intensity is `system intensity × developer-specified intensity`. Intensity defaults to 1.0 if left unspecified.

### Imperative API (JS)

The imperative API is not gated behind a permission but requires [sticky user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation).

```js
navigator.playHaptics(effect, intensity);
```

**Parameters:**
- `effect` — one of the pre-defined effect names: `"hint"`, `"edge"`, `"tick"`, `"align"`.
- `intensity` *(optional)* — a normalized value between 0.0 and 1.0. Defaults to 1.0.

The API always returns `undefined`. No haptic is played if the last input device is not haptics-capable. If sticky user activation has expired, the call is silently ignored.

### Declarative API (CSS)

The declarative API introduces two new CSS behavioral properties. Because the browser controls when and how the haptic fires, the activation model is simpler than the imperative path — direct user interaction (the event that causes the pseudo-class change) is sufficient; no separate sticky activation is required. User agents may apply throttling to prevent excessive haptic output (e.g. at most one haptic per element per 50ms).

#### `haptic-feedback` property

The `haptic-feedback` property configures what haptic behavior the browser should produce when an element is in a given pseudo-class state. When the element **transitions into** a matching pseudo-class state due to direct user interaction, the user agent consults the resolved `haptic-feedback` value and produces the specified effect once — not continuously while the state is active.

**Syntax:**

```
haptic-feedback: <effect-name> <intensity>?
```

- `<effect-name>` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `<intensity>` *(optional)* — a `<number>` between 0.0 and 1.0. Defaults to 1.0.
- **Not inherited.** Not animatable.

**Pseudo-class scoping rule:** Unlike traditional CSS properties that describe continuous visual state, `haptic-feedback` produces a one-shot effect at the moment of state entry. This follows how CSS behavioral properties like `touch-action` and `scroll-snap-type` configure browser behavior rather than appearance — but extends the model to a non-visual output channel triggered by pseudo-class transitions, similar in spirit to how CSS Transitions produce side effects when property values change during style resolution.

The property is valid in any pseudo-class selector. The browser fires the specified haptic when the element transitions into that pseudo-class state, **provided the transition was caused by direct user interaction**. Pseudo-class changes from script, DOM mutations, or initial page render do **not** trigger haptics. For example:

- `:hover`, `:active`, `:focus`, `:checked` from user interaction — fires.
- `:not(:checked)` when the user unchecks a checkbox — fires (negated pseudo-classes are covered by the same rule).
- `:invalid` on initial page render (empty required field) — does **not** fire.
- `:disabled`, `:first-child`, `:visited` — structural/script-driven states, do **not** fire.

This design avoids an allowlist that requires spec updates for each new pseudo-class. Instead, the rule is universal: **if the user caused the state change, fire the haptic; if the system caused it, do not.**

**Conflict resolution:** A single user action (e.g. a click) may transition multiple pseudo-class states on the same element (`:hover` and `:active`) or on different elements (a checkbox and its ancestor `form:focus-within`). When multiple `haptic-feedback` declarations match within a single user action:

1. **Per element**, only the declaration from the highest-specificity matching rule fires. If specificities are equal, normal cascade order applies — last wins.
2. **Across elements**, at most one element fires per user action. The target element is considered first:
   - If the target element **transitions into** a matching pseudo-class in this user action and its resolved `haptic-feedback` is not `none`, fire that value.
   - If the target element resolves to `none`, fire nothing (do not bubble).
   - Otherwise, walk up ancestors and select the first ancestor that **also transitions into** a matching pseudo-class in this same user action and whose resolved value is not `none`; fire that value.
   - If no such ancestor exists, fire nothing.

   Ancestor fallback is only eligible on ancestor pseudo-class **entry transitions** caused by the same user action. Resolution is evaluated for the same pseudo-class transition under consideration.
3. Per-element throttling (at most one haptic per element per 50 ms) still applies as a backstop.

```css
/* Hint haptic at half intensity when pointer enters the button */
button:hover {
  haptic-feedback: hint 0.5;
}

/* Tick haptic at full intensity when the button is pressed */
button:active {
  haptic-feedback: tick;
}
```



#### `scroll-snap-haptic` property

The `scroll-snap-haptic` property is set on a scroll container that uses [CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap). It configures the browser to produce a haptic effect each time the scroll position snaps to a defined snap point due to a user-initiated scroll gesture.

**Syntax:**

```
scroll-snap-haptic: <effect-name> <intensity>?
```

- `<effect-name>` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `<intensity>` *(optional)* — a `<number>` between 0.0 and 1.0. Defaults to 1.0.
- **Not inherited.** Not animatable.

The property applies to the scroll container, not individual snap children:

```css
.carousel {
  scroll-snap-type: x mandatory;
  scroll-snap-haptic: tick 0.6;
}

.carousel > .slide {
  scroll-snap-align: center;
}
```

Each time a scroll gesture causes the container to settle on a new snap point, the user agent fires the haptic. The haptic does not fire for programmatic scrolls (e.g. `element.scrollTo()`). It fires only for scrolls the user agent recognizes as user-initiated — that is, scrolls originating from touch, wheel, keyboard, or scrollbar interaction. A programmatic scroll that follows a user gesture but runs asynchronously (e.g. in a `requestAnimationFrame` callback) is still considered programmatic and does **not** trigger the haptic.

**When to use each:** Use declarative CSS for interactions that map to pseudo-class state changes (button press, checkbox toggle, form validation, focus) or built-in browser behaviors (scroll snap). Use the imperative API when the trigger, intensity, or conditions require runtime logic (chart scrubbers, drag-to-snap with distance thresholds, gesture velocity, non-CSS events).

## Real-World Examples

### Social Media stories scrolling

A horizontal story carousel with a tactile tick on each swipe — one line of CSS:

```css
.story-carousel {
  scroll-snap-type: x mandatory;
  scroll-snap-haptic: tick 0.5;
}
```

The user feels a light tick each time a story avatar snaps into the center position.

### E-Commerce "Add to Cart" Button

A firm confirmation haptic on the most important button on the page:

```css
.add-to-cart:hover  { haptic-feedback: hint 0.3; }
.add-to-cart:active { haptic-feedback: align; }
```

### Drag-to-Snap Divider

App may want to use haptics when [dragging a sidebar divider to a snap point](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699). CSS can't express distance-threshold logic — this requires the imperative API:

```js
// Sticky activation was granted by the pointerdown that started the drag.
divider.addEventListener('pointermove', (e) => {
  const width = e.clientX;
  if (!snapped && Math.abs(width - SNAP_POINT) < 4) {
    snapped = true;
    navigator.playHaptics?.('align', 0.8);
  } else if (snapped && Math.abs(width - SNAP_POINT) >= 4) {
    snapped = false;
  }
});
```

The user feels a crisp `align` when the divider locks into position.

## Coverage Gaps and the Imperative Escape Hatch

Some interactions have no CSS pseudo-class equivalent: `<select>` option changes, `<input type="range">` value steps, custom `<div>`-based toggles, transition/animation completion, and gesture-computed thresholds (drag distance, velocity). For these, the imperative API provides a consistent one-line pattern:

```js
// Per-step haptic on a range slider (use 'input', not 'change', for continuous feedback)
range.addEventListener('input', () => navigator.playHaptics?.('tick', 0.4));
```

Future work may address transition-end haptics (`haptic-transition`), multi-step haptic sequences (`@haptic` at-rule).

## Alternatives Considered

- **Extending `navigator.vibrate`** — Lacks semantic intent, requires method overloading, makes feature detection less straightforward, and includes confusing pattern parameters.
- **Pointer-event based API** ([previous explainer](../HapticsDevice/explainer.md)) — Purely imperative; tightly couples haptics to specific input events, so common interactions like checkbox toggles and scroll-snap landings always require JavaScript. No declarative path, no cascade composition.
- **HTML attributes** (e.g. `<button haptic-on-activate="tick">`) — No precedent for `haptic-on-*` pattern; resembles discouraged `on*` handlers. Cannot compose with cascade, media queries, or pseudo-classes. Each new trigger requires a new attribute (6+), whereas CSS reuses pseudo-classes.
- **Extending `scroll-snap-type` or adding a `:snap` pseudo-class** instead of a separate `scroll-snap-haptic` property — Extending the shorthand grammar creates backward-compatibility risk; a `:snap` pseudo-class doesn't exist and would be a larger spec addition. A sibling property follows the existing `scroll-snap-type` / `scroll-snap-align` pattern.
- **`@media (haptic-feedback)`** — A capability-style haptic media feature would imply device capability detection, creating a new fingerprinting vector. `@supports (haptic-feedback: tick)` tests UA syntax support without revealing hardware information.

## Accessibility, Privacy, and Security Considerations

### Privacy

The API does not expose means to query haptics-capable devices, available effects, or whether a haptic was successfully played. No new media features are introduced — `@supports` detects property support, which is equivalent to detecting any other CSS property and reveals no hardware information.

### Security

**Imperative API:** Requires sticky user activation. No permission gate.

**Declarative API:** Narrower attack surface — the browser controls all trigger conditions (pseudo-class transitions, scroll-snap events). A malicious page cannot fire haptics at arbitrary times.

**Anti-abuse:** User agents may enforce throttling on both APIs. Haptics produce no lasting effect — the user can navigate away at any time. If abuse patterns emerge, user agents may suppress haptics entirely for the offending origin.

## Reference for Relevant Haptics APIs

This section provides reference to existing web and native haptics APIs to help inform the API design and platform supportability.

Known platform-specific native haptics APIs:

- [Windows: InputHapticsManager](https://learn.microsoft.com/en-us/uwp/api/windows.devices.haptics?view=winrt-26100)
- [macOS: NSHapticFeedbackManager](https://developer.apple.com/documentation/appkit/nshapticfeedbackmanager)
- [iOS: Core Haptics](https://developer.apple.com/documentation/corehaptics)
- [Android: VibrationEffect](https://developer.android.com/reference/android/os/VibrationEffect)

Relevant web APIs:
- [navigator.vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)

Relevant CSS specifications:
- [CSS Scroll Snap](https://drafts.csswg.org/css-scroll-snap-1/)
- [CSS Pseudo-Classes (Selectors Level 4)](https://drafts.csswg.org/selectors-4/#pseudo-classes)

## Open Questions

- Feedback on the predefined effect vocabulary and cross-platform implementability.
- Should the API return whether haptics was successfully played?
- Developer interest in haptics device enumeration with acceptable fingerprinting trade-offs.

## Stakeholder Feedback / Opposition

We have heard some early developer interest such as [dragging divider to a snap point in Slack](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699).

We intend to seek feedback via:

- Incubation in WICG.
- Discuss within Device & Sensors Working Group.
- Cross‑share with Haptic Industry Forum (non‑standards venue) to align on primitives vocabulary and invite suppliers/OEMs to comment publicly in WICG issues.
- Engage CSS Working Group for review of the declarative property definitions and pseudo-class scoping rule.

## References & Acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many — thank you to everyone who shares feedback and helps shape this work. Special thanks to:
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](../HapticsDevice/explainer.md), which served as the foundation for this proposal.
