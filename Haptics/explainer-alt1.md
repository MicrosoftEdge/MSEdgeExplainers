# Web Haptics API — Approach D: Transition/Animation-Primary

Authors: [Nesh Gandhe](https://github.com/neshgandhe_microsoft), [Limin Zhu](https://github.com/liminzhu)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. The API is in the early ideation and interest-gauging stage, and the solution/design will likely evolve over time.

* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: **This document**

## Table of Contents
- [Introduction](#introduction) · [User-Facing Problem](#user-facing-problem) · [Goals](#goals) · [Non-goals](#non-goals)
- [Proposed Approach](#proposed-approach) · [Real-World Scenarios](#real-world-scenarios) · [Coverage Summary](#coverage-summary)
- [Future Extensions](#future-extensions) · [Alternatives Considered](#alternatives-considered) · [Accessibility, Privacy, and Security](#accessibility-privacy-and-security-considerations) · [Open Questions](#open-questions)
- [Reference for Relevant Haptics APIs](#reference-for-relevant-haptics-apis) · [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition) · [References & Acknowledgements](#references--acknowledgements)

## Introduction

Modern operating systems have embraced haptics as a core part of user experience — providing subtle, low-latency tactile cues that reinforce visual and auditory feedback. These signals improve confidence, precision, and delight in everyday interactions. The Web Haptics API proposes a semantic, cross-platform interface that connects web applications to native haptic capabilities. By focusing on intent-driven effects, the API enables web apps to deliver tactile feedback consistent with OS design principles, while preserving user privacy and security.

This proposal offers two complementary mechanisms:

1. **Declarative API (CSS)** — haptic effects tied to CSS transitions, animations, and scroll-snap events. These piggyback on lifecycle events the browser already manages — `transitionend`, animation keyframe milestones, and snap-point landings — requiring no new triggering model. The API consists of `haptic-transition`, `scroll-snap-haptic`, and the `@haptic` at-rule with `haptic-animation`.
2. **Imperative API** — `navigator.playHaptics(effect, intensity)` — for JavaScript-driven, programmatic haptics triggered by application logic.

The declarative path anchors haptics to visual motion: when something moves, it can also be felt. The imperative path covers interactions that have no visual transition, or where conditions require runtime logic.

## User-Facing Problem

The [navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) API exists today for basic haptics. However, it is mobile-centric, lacks broad engine and device support, and requires developers to manually program duration/pattern sequences — a low-level interface that doesn't map to the way designers think about haptic intent.

Beyond the limitations of the existing API:

- There is no way to synchronize haptic cues with CSS animations or transitions so that visual and tactile feedback feel unified.
- There is no way to define reusable haptic sequences in a stylesheet, the same way `@keyframes` enables reusable visual animations.
- Common interactions that involve visual transitions — accordion panels, modal entrances, toggle switches with sliding tracks, animated buttons — require manual JavaScript orchestration to add coordinated haptic feedback.

## Goals

- Bring standardized, semantic haptic feedback to web apps across desktop and mobile platforms.
- Allow developers to signal intent/effect rather than programming raw patterns.
- Focus on reactive haptics feedback (i.e. haptics immediately after user input).
- Enable choreographed haptic-visual experiences where haptic timelines synchronize with CSS animations and transitions.
- Hook into existing CSS lifecycle events (transitions, animations, scroll snap) rather than introducing new triggering models.
- Extensible interface for future haptics advancement on the web.
- Respect platform haptics user settings if available.
- Minimize privacy/fingerprinting concerns.

## Non-goals

- Guarantee identical tactile output across platforms — different platforms and user agents may choose varied output that best matches the intent.
- Cover haptics notification scenarios (e.g. vibrate to alert users when long-running task is completed).
- Cover/replace API for highly specialized hardware, namely gamepad.
- Replace the imperative API for interactions with no visual transition — the declarative surface intentionally requires a CSS transition or animation to attach to; interactions without visual motion use the imperative API.

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
| `none`  | Explicitly disables haptic feedback. | Suppressing haptics on a "quiet" variant of a component. |

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

The declarative API introduces three new CSS constructs. All attach haptics to existing CSS lifecycle events — transition completion, animation keyframe milestones, and scroll-snap landings. Because these lifecycles are already well-defined in CSS, no new triggering model is needed.

**User activation model:** Transitions and animations can be started programmatically via script (e.g. `element.classList.add('open')`). To prevent abuse, the declarative API requires that the transition or animation was triggered within a [sticky user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation) context. A transition caused by a `:hover` or `:active` state change inherently satisfies this (the user physically interacted). A transition triggered by a class change in a click handler also satisfies it. A transition triggered by `setTimeout` or `requestAnimationFrame` without prior user activation does **not** fire haptics. User agents may apply throttling to prevent excessive haptic output (e.g. at most one haptic per element per 50ms).

#### `haptic-transition` property

The `haptic-transition` property fires a single haptic effect when a CSS transition on a specified property completes (`transitionend`). It hooks into the existing [CSS Transitions](https://drafts.csswg.org/css-transitions-1/) lifecycle.

**Syntax:**

```
haptic-transition: <property> <effect-name> <intensity>?
```

- `<property>` — the CSS property being transitioned (e.g. `transform`, `background-color`, `opacity`).
- `<effect-name>` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `<intensity>` *(optional)* — a `<number>` between 0.0 and 1.0. Defaults to 1.0.
- **Not inherited.** Not animatable.

Multiple property haptics can be listed comma-separated:

```css
haptic-transition: transform align 0.7, opacity hint 0.3;
```

The haptic fires once when the named property's transition reaches its end state. If the transition is cancelled before completion (e.g. the property changes again mid-transition), no haptic fires. If the transition reverses and completes in the reverse direction, the haptic fires at the reverse completion.

**Example — accordion panel:**

```css
.accordion-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 250ms ease;
  haptic-transition: max-height tick 0.5;
}
.accordion-panel.open {
  max-height: 500px;
}
```

When the user opens the panel (triggering the `max-height` transition), a `tick` fires at `0.5` intensity once the panel fully expands.

**Example — button press:**

```css
button {
  background-color: var(--btn-bg);
  transition: background-color 80ms ease;
  haptic-transition: background-color tick;
}
button:active {
  background-color: var(--btn-bg-active);
}
```

The user clicks the button, `background-color` transitions, and `tick` fires when the transition completes. The visual change and haptic are correlated.

**Example — toggle switch with sliding track:**

```css
.toggle-track {
  background-color: #ccc;
  transition: background-color 150ms ease;
  haptic-transition: background-color tick 0.5;
}
.toggle-track.on {
  background-color: #4caf50;
}
```

#### `@haptic` at-rule and `haptic-animation` property

For multi-step haptic experiences choreographed with CSS animations, the `@haptic` at-rule defines a named haptic sequence (analogous to `@keyframes`), and `haptic-animation` binds it to an element's animation.

**`@haptic` syntax:**

```css
@haptic <name> {
  <percentage> { effect: <effect-name>; intensity: <number>; }
  /* ... */
}
```

Between keyframes, the user agent does not interpolate haptic effects — each keyframe fires its specified effect at the corresponding time offset. The `intensity` value may be interpolated smoothly between keyframes if the user agent supports it.

**`haptic-animation` syntax:**

```
haptic-animation: <name> <duration> <timing-function>? sync-with(<animation-name>)?
```

- `<name>` — references a `@haptic` at-rule.
- `<duration>` — total playback duration (e.g. `300ms`, `1s`).
- `<timing-function>` *(optional)* — easing (e.g. `ease-out`, `linear`). Defaults to `linear`.
- `sync-with(<animation-name>)` *(optional)* — links to a CSS `animation-name` on the same element. When provided, the haptic timeline starts and stops with the linked CSS animation, and keyframe percentages map to the same timestamps. If the CSS animation is paused or cancelled, the haptic timeline follows suit.

**Example — modal entrance:**

```css
@keyframes slide-in {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@haptic modal-feel {
  0%   { effect: hint;  intensity: 0.2; }
  60%  { effect: tick;  intensity: 0.5; }
  100% { effect: align; intensity: 1.0; }
}

.modal.open {
  animation: slide-in 350ms ease-out forwards;
  haptic-animation: modal-feel 350ms ease-out sync-with(slide-in);
}
```

At 60% elapsed (210ms), the user feels a `tick` as the modal decelerates, then an `align` when it settles.

#### `scroll-snap-haptic` property

The `scroll-snap-haptic` property is set on a scroll container that uses [CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap). It configures the browser to produce a haptic effect each time the scroll position snaps to a defined snap point due to a user-initiated scroll gesture.

**Syntax:**

```
scroll-snap-haptic: <effect-name> <intensity>?
```

- `<effect-name>` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `<intensity>` *(optional)* — a `<number>` between 0.0 and 1.0. Defaults to 1.0.
- **Not inherited.** Not animatable.

The property applies to the scroll container, not individual snap children. The haptic does not fire for programmatic scrolls (e.g. `element.scrollTo()`). It fires only for scrolls the user agent recognizes as user-initiated — that is, scrolls originating from touch, wheel, keyboard, or scrollbar interaction.

```css
.carousel {
  scroll-snap-type: x mandatory;
  scroll-snap-haptic: tick 0.6;
}

.carousel > .slide {
  scroll-snap-align: center;
}
```

**Feature detection via `@supports`:**

```css
@supports (haptic-transition: transform tick) {
  .panel {
    haptic-transition: transform align 0.7;
  }
}
```

## Real-World Scenarios

The following examples demonstrate how the transition/animation model and the imperative API together cover common haptic use cases.

### Social Media Stories Scrolling

A horizontal story carousel with a tactile tick on each swipe — one line of CSS:

```css
.story-carousel {
  scroll-snap-type: x mandatory;
  scroll-snap-haptic: tick 0.5;
}
```

The user feels a light `tick` each time a story avatar snaps into the center position.

### E-Commerce "Add to Cart" Button

Modern button styles typically transition `background-color` or `transform` on `:active`. The haptic hooks into that existing visual feedback:

```css
.add-to-cart {
  background-color: var(--btn-bg);
  transform: scale(1);
  transition: background-color 100ms ease, transform 100ms ease;
  haptic-transition: background-color align;
}
.add-to-cart:hover {
  background-color: var(--btn-bg-hover);
}
.add-to-cart:active {
  background-color: var(--btn-bg-active);
  transform: scale(0.97);
}
```

The `align` fires when the `background-color` transition completes after the user clicks. The tactile cue is correlated with the visual press, reinforcing the "confirmed" feeling.

For minimal buttons or text links that have no visual transition, the imperative API is a one-liner:

```js
link.addEventListener('click', () => navigator.playHaptics?.('align'));
```

### Toggle Switch

Custom toggle switches with a sliding thumb are a natural fit — the thumb slides, and the haptic fires when it arrives:

```css
.toggle-thumb {
  transform: translateX(0);
  transition: transform 150ms ease;
  haptic-transition: transform tick 0.6;
}
input:checked + .toggle-thumb {
  transform: translateX(24px);
}
```

For native unstyled `<input type="checkbox">` elements (no CSS transition involved), the imperative API fills in:

```js
checkbox.addEventListener('change', () => navigator.playHaptics?.('tick', 0.5));
```

### Form Validation with Shake Animation

Form validation is most impactful when the haptic accompanies a visual cue. A shake animation on invalid fields pairs naturally with the `@haptic` at-rule:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-4px); }
  75%      { transform: translateX(4px); }
}

@haptic validation-bump {
  0%   { effect: edge; intensity: 0.6; }
  100% { effect: edge; intensity: 0.3; }
}

input:invalid:user-invalid {
  animation: shake 300ms ease;
  haptic-animation: validation-bump 300ms ease sync-with(shake);
}
```

The user sees the field shake and feels the `edge` haptic simultaneously — a richer, multi-sensory validation signal.

For simpler validation without a visual animation, the imperative API works:

```js
form.addEventListener('submit', (e) => {
  const invalids = form.querySelectorAll(':invalid');
  if (invalids.length > 0) {
    navigator.playHaptics?.('edge', 0.6);
  }
});
```

### Drag-to-Snap Divider

CSS can't express distance-threshold logic — this requires the imperative API:

```js
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

### Modal Slide-In

A modal slides in from the bottom while haptics ramp from a subtle hint to a firm lock-in:

```css
@keyframes slide-in {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@haptic modal-feel {
  0%   { effect: hint;  intensity: 0.2; }
  60%  { effect: tick;  intensity: 0.5; }
  100% { effect: align; intensity: 1.0; }
}

.modal.open {
  animation: slide-in 350ms ease-out forwards;
  haptic-animation: modal-feel 350ms ease-out sync-with(slide-in);
}
```

At 60% elapsed (210ms), the user feels a `tick` as the modal decelerates, followed by an `align` when it settles. The haptic sequence is choreographed to the visual motion — something a single-fire API cannot achieve.

### Accordion Expand

The panel height transitions, and a haptic fires when the expansion completes:

```css
.accordion-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 250ms ease;
  haptic-transition: max-height tick 0.5;
}
.accordion-panel.open {
  max-height: 500px;
}
```

### Page Transition

Multi-stage haptic choreography across a route transition:

```css
@keyframes page-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}

@keyframes page-enter {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}

@haptic page-transition-feel {
  0%   { effect: hint;  intensity: 0.2; }
  25%  { effect: tick;  intensity: 0.4; }
  75%  { effect: tick;  intensity: 0.6; }
  100% { effect: align; intensity: 0.9; }
}

.page-exit {
  animation: page-exit 200ms ease-in forwards;
  haptic-animation: page-transition-feel 200ms linear;
}
.page-enter {
  animation: page-enter 300ms ease-out forwards;
  haptic-animation: page-transition-feel 300ms ease-out sync-with(page-enter);
}
```

### Progress Bar Completion

A progress bar fills to 100% with increasingly strong haptic pulses, culminating in a confirming `align`:

```css
@keyframes fill-bar {
  from { width: 0%; }
  to   { width: 100%; }
}

@haptic progress-celebrate {
  0%   { effect: tick;  intensity: 0.1; }
  50%  { effect: tick;  intensity: 0.3; }
  90%  { effect: tick;  intensity: 0.6; }
  100% { effect: align; intensity: 1.0; }
}

.progress-bar.complete {
  animation: fill-bar 1s ease-out forwards;
  haptic-animation: progress-celebrate 1s ease-out sync-with(fill-bar);
}
```

### Range Slider Steps

Range sliders have no CSS transition between steps. The imperative API provides per-step feedback:

```js
range.addEventListener('input', () => navigator.playHaptics?.('tick', 0.4));
```

## Coverage Summary

The following table summarizes how each scenario is handled — declaratively via CSS, or imperatively via JavaScript:

| Scenario | Declarative (CSS) | Imperative (JS) |
|----------|-------------------|------------------|
| **Scroll-snap carousel** | `scroll-snap-haptic: tick` | — |
| **Button click (styled)** | `haptic-transition: background-color tick` | — |
| **Button click (unstyled)** | — | `navigator.playHaptics('tick')` |
| **Custom toggle switch** | `haptic-transition: transform tick` | — |
| **Native checkbox** | — | `navigator.playHaptics('tick')` |
| **Form validation (with shake)** | `@haptic` + `haptic-animation` sync | — |
| **Form validation (no animation)** | — | `navigator.playHaptics('edge')` |
| **Accordion expand** | `haptic-transition: max-height tick` | — |
| **Modal slide-in** | `@haptic` + `haptic-animation` sync | — |
| **Page transition** | `@haptic` + `haptic-animation` sync | — |
| **Progress bar completion** | `@haptic` + `haptic-animation` sync | — |
| **Drag-to-snap** | — | `navigator.playHaptics('align')` |
| **Range slider steps** | — | `navigator.playHaptics('tick')` |

The declarative surface is strongest for interactions that already involve visual motion — buttons with transitions, sliding toggles, animating modals, expanding panels, and scroll snaps. For interactions with no associated visual transition (native checkboxes, plain links, range sliders), the imperative API provides a consistent one-line fallback.

**When to use each:** Use the declarative API when the element already has a CSS transition or animation — the haptic reinforces the visual motion. Use the imperative API for state-change-only interactions with no visual transition, runtime-computed triggers (drag thresholds, velocity), or non-CSS events.

## Future Extensions

The following extensions are out of scope for this initial proposal but represent natural next steps that could broaden the declarative surface.

### Pseudo-class triggered haptics (`haptic-feedback`)

A CSS property that fires a haptic when an element transitions into a pseudo-class state due to direct user interaction — e.g. `button:active { haptic-feedback: tick; }` or `input:checked { haptic-feedback: tick; }`. This would cover state-change-only interactions (native checkboxes, form validation) that have no visual transition to hook into, eliminating the need for imperative fallbacks in those cases. However, this introduces a novel CSS concept — a property that produces a discrete non-visual side effect on pseudo-class entry — which has no existing precedent and would need careful design of triggering semantics, conflict resolution, and the boundary between user-caused and script-caused state changes.

### `haptic-transition` start events

The current proposal fires on `transitionend` only. Firing on `transitionstart` as well could enable anticipatory cues — e.g. a `hint` when a panel begins expanding, followed by a `tick` when it settles.

### `@haptic` with custom effects

The current set of four effects is intentionally small. If the effect vocabulary grows (e.g. platform-specific effects or developer-defined waveforms), the `@haptic` at-rule should accommodate them without syntax changes.

## Alternatives Considered

- **Extending `navigator.vibrate`** — Lacks semantic intent, requires method overloading, makes feature detection less straightforward, and includes confusing pattern parameters.
- **Pointer-event based API** ([previous explainer](../HapticsDevice/explainer.md)) — Purely imperative; tightly couples haptics to specific input events. No declarative path.
- **HTML attributes** (e.g. `<button haptic-on-activate="tick">`) — No precedent for `haptic-on-*` pattern; resembles discouraged `on*` handlers. Cannot compose with cascade, media queries, or pseudo-classes.
- **Extending `scroll-snap-type` or adding a `:snap` pseudo-class** instead of a separate `scroll-snap-haptic` property — Extending the shorthand grammar creates backward-compatibility risk; a `:snap` pseudo-class doesn't exist and would be a larger spec addition. A sibling property follows the existing `scroll-snap-type` / `scroll-snap-align` pattern.
- **`@media (haptic-feedback)`** — A capability-style haptic media feature would imply device capability detection, creating a new fingerprinting vector. `@supports (haptic-transition: transform tick)` tests UA syntax support without revealing hardware information.

## Accessibility, Privacy, and Security Considerations

### Accessibility

Authors should respect `prefers-reduced-motion`. When the user has indicated a preference for reduced motion, user agents should suppress animation-synced haptics (`haptic-animation`) and scroll-snap haptics. `haptic-transition` on short transitions (e.g. ≤150ms) may still fire, as they are analogous to existing native OS interaction feedback that persists under reduced-motion settings.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    haptic-animation: none;
    scroll-snap-haptic: none;
  }
}
```

### Privacy

The API does not expose means to query haptics-capable devices, available effects, or whether a haptic was successfully played. No new media features are introduced — `@supports` detects property support, which is equivalent to detecting any other CSS property and reveals no hardware information.

### Security

**Imperative API:** Requires sticky user activation. No permission gate.

**Declarative API:** Transitions and animations can be programmatically triggered, so the declarative API inherits the same sticky user activation requirement. The browser verifies that the style change that initiated the transition occurred within an activation context. Unlike a purely imperative API, the declarative path limits the *shape* of haptics to declared effects at declared intensities — a malicious script cannot vary hapt effects dynamically through the declarative channel.

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
- [CSS Transitions](https://drafts.csswg.org/css-transitions-1/)
- [CSS Animations](https://drafts.csswg.org/css-animations-1/)
- [CSS Scroll Snap](https://drafts.csswg.org/css-scroll-snap-1/)

## Open Questions

- Feedback on the predefined effect vocabulary and cross-platform implementability.
- Should the API return whether haptics was successfully played?
- Developer interest in haptics device enumeration with acceptable fingerprinting trade-offs.
- **What triggers `haptic-animation` playback?** When synced with a CSS animation (`sync-with`), the trigger is clear. For standalone `haptic-animation` without `sync-with`, the trigger is the same as CSS animations — the element matching the selector. Should standalone usage require user activation context?
- **How should `@haptic` interact with `prefers-reduced-motion`?** The current recommendation is to suppress animation-synced haptics under `prefers-reduced-motion: reduce`, but user testing may reveal that some users prefer haptic cues even when visual motion is reduced.
- **How should cancelled or reversed transitions interact with `haptic-transition`?** The current proposal says: no haptic on cancel, haptic on reverse completion. Are there cases where a cancel haptic would be useful?
- **Should interactions with no visual transition have a declarative path?** Native checkboxes, form validation, and minimal buttons have no CSS transition. The imperative API covers these today; a future `haptic-feedback` pseudo-class property (see [Future Extensions](#future-extensions)) could extend declarative coverage to these cases.

## Stakeholder Feedback / Opposition

We have heard some early developer interest such as [dragging divider to a snap point in Slack](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699).

We intend to seek feedback via:

- Incubation in WICG.
- Discuss within Device & Sensors Working Group.
- Cross‑share with Haptic Industry Forum (non‑standards venue) to align on primitives vocabulary and invite suppliers/OEMs to comment publicly in WICG issues.
- Engage CSS Working Group for review of transition/animation integration and the `@haptic` at-rule.

## References & Acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many — thank you to everyone who shares feedback and helps shape this work. Special thanks to:
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](../HapticsDevice/explainer.md), which served as the foundation for this proposal.
