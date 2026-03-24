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
- [Future Extensions](#future-extensions)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Privacy, and Security](#accessibility-privacy-and-security-considerations)
- [Open Questions](#open-questions)
- [Reference for Relevant Haptics APIs](#reference-for-relevant-haptics-apis)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction

Modern operating systems have embraced haptics as a core part of user experience — providing subtle, low-latency tactile cues that reinforce visual and auditory feedback. These signals improve confidence, precision, and delight in everyday interactions. The Web Haptics API proposes a semantic, cross-platform interface that connects web applications to native haptic capabilities. By focusing on intent-driven effects, the API enables web apps to deliver tactile feedback consistent with OS design principles, while preserving user privacy and security.

This proposal offers two complementary mechanisms:

1. **Declarative API (CSS)** — haptic effects tied to CSS transitions, animations, and scroll-snap events, piggybacking on lifecycle events the browser already manages.
2. **Imperative API (JS)** — `navigator.playHaptics(effect, intensity)` for interactions that have no visual transition or require runtime logic.

## User-Facing Problem

The [navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) API exists today for basic haptics. However, it is mobile-centric, lacks broad engine and device support, and requires developers to manually program duration/pattern sequences — a low-level interface that doesn't map to the way designers think about haptic intent.

Beyond the limitations of the existing API, there is no declarative way for developers to add haptic feedback to common UI interactions — scroll-snap carousels, panel transitions, form validation — without JavaScript in the critical path.

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
| `hint`  | A light, subtle cue that signals something is interactive or an action may follow. | Focusing an input field, entering a drop zone during drag. |
| `edge`  | A heavy boundary signal that indicates reaching the end of a range or hitting a limit. | Validation failure, pull-to-refresh threshold, scroll hitting a boundary. |
| `tick`  | A firm pulse that marks discrete changes, like moving through a list or toggling a switch. | Scroll-snap landing, stepping through picker values, toggling a switch. |
| `align` | A crisp confirmation when an object locks into place or aligns with guides or edges. | Drag-to-snap, window snapping to screen edges, zoom snapping to 100%. |
| `none`  | Explicitly disables haptic feedback. | Suppressing haptics on a "quiet" variant of a component. |

The table below illustrates example mappings of the pre-defined effects (hint, edge, tick, align) to representative platform-native feedback patterns across Windows, macOS, iOS, and Android. These mappings are illustrative examples only. User agents may choose different mappings, including synthesizing custom effects from lower-level primitives and parameters. The API standardizes the developer-facing intent, while the underlying realization remains platform-defined.

| Web Haptics | Windows | macOS | iOS | Android |
|:-----------:|:-------:|:-----:|:---:|:-------:|
| hint | hover | generic | light impact | gesture_threshold_deactivate |
| edge | collide | generic | soft impact | long_press |
| tick | step | generic | selection | segment_frequent_tick |
| align | align | alignment | rigid impact | segment_tick |

**Intensity** is always a normalized value between 0.0 and 1.0. If the platform exposes a system-level intensity setting, the effective intensity is `system intensity × developer-specified intensity`. Intensity defaults to 1.0 if left unspecified.

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

The declarative API extends existing CSS constructs — transitions, animations, and scroll snap — with haptic capabilities. All haptics attach to lifecycle events the browser already manages, requiring no new triggering model. The API surface consists of:

- **`transition-haptic-effect` / `transition-haptic-intensity`** — longhands that pair with `transition-property` to fire haptics when transitions complete.
- **`haptic-effect` / `haptic-intensity` descriptors in `@keyframes`** — embed haptic cues at specific keyframe offsets within an animation.
- **`scroll-snap-haptic`** — fires a haptic each time the scroll position snaps to a snap point.

#### `transition-haptic-effect` / `transition-haptic-intensity` properties

These two longhands follow the established `transition-*` convention. Their values are comma-separated lists that correspond positionally to the entries in `transition-property`, just like `transition-duration`, `transition-timing-function`, and `transition-delay`. A haptic fires when the corresponding property's transition completes (`transitionend`). They hook into the existing [CSS Transitions](https://drafts.csswg.org/css-transitions-1/) lifecycle.

**Syntax:**

```
transition-haptic-effect: <effect-name>#
transition-haptic-intensity: [ <number> | <percentage> ]#
```

- `transition-haptic-effect` — a comma-separated list of effect names, one per `transition-property` entry. Each value is one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `transition-haptic-intensity` — a comma-separated list of intensity values. Each value is a `<number>` between 0.0 and 1.0, or a `<percentage>` between 0% and 100%. Initial value: `1.0`.
- **Not inherited.** Not animatable.

If the `transition-haptic-effect` list is shorter than `transition-property`, missing entries default to `none` rather than cycling. This intentionally deviates from the list-repetition behavior of other `transition-*` longhands — haptics are side effects, not visual properties, so implicit repetition could produce unintended tactile feedback. If longer, excess entries are ignored.

**Example — drawer slide:**

```css
.drawer {
  transition: transform 300ms ease;
  transition-haptic-effect: align;
}
```

#### Haptic descriptors in `@keyframes`

Two descriptors — `haptic-effect` and `haptic-intensity` — can be used inside `@keyframes` blocks to embed haptic cues at specific keyframe offsets. This hooks into the existing [CSS Animations](https://drafts.csswg.org/css-animations-1/) lifecycle.

**Syntax (inside a keyframe rule):**

```
haptic-effect: <effect-name>
haptic-intensity: <number> | <percentage>
```

- `haptic-effect` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `haptic-intensity` — a `<number>` between 0.0 and 1.0, or a `<percentage>` between 0% and 100%. Initial value: `1.0`.

These descriptors are **discrete** — they are not interpolated between keyframes. A haptic fires the first time the animation's progress crosses a keyframe offset where a non-`none` `haptic-effect` is specified within each iteration. If the browser's sampling skips past a keyframe offset (e.g. due to frame drops), the haptic still fires. Haptics do not fire during fill phases (`animation-fill-mode: backwards` or `both`) — only during active iteration. Pausing and resuming an animation does not reset which offsets have been crossed within the current iteration. If the animation loops (`animation-iteration-count` > 1), the haptic fires again on each iteration when the offset is crossed.

**Example — haptic on animation start:**

```css
@keyframes slide-in {
  from {
    haptic-effect: align;
    haptic-intensity: 0.8;
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal.open {
  animation: slide-in 350ms ease-out forwards;
}
```

The `align` fires at the start of the animation when the `from` keyframe is reached.

**Example — multi-step haptic choreography:**

```css
@keyframes bounce-settle {
  0% {
    transform: translateY(-100%);
  }
  40% {
    haptic-effect: edge;
    transform: translateY(0);
  }
  60% {
    transform: translateY(-20%);
  }
  100% {
    haptic-effect: align;
    haptic-intensity: 0.5;
    transform: translateY(0);
  }
}
```

Here two haptics fire: an `edge` at 40% when the element first hits the baseline, and a softer `align` at 100% when it settles into place. For a looping animation, both would fire on every iteration.

**Example — repeated tick on a looping animation:**

```css
@keyframes pulse {
  0% {
    haptic-effect: tick;
    haptic-intensity: 0.3;
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.heartbeat {
  animation: pulse 1s ease-in-out 3;
}
```

The `tick` fires three times — once at the start of each iteration.

#### `scroll-snap-haptic` property

The `scroll-snap-haptic` property is set on a scroll container that uses [CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap). It configures the browser to produce a haptic effect each time the scroll position snaps to a defined snap point due to a user-initiated scroll gesture.

**Syntax:**

```
scroll-snap-haptic: <effect-name> <intensity>?
```

- `<effect-name>` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `<intensity>` *(optional)* — a `<number>` between 0.0 and 1.0, or a `<percentage>` between 0% and 100%. Defaults to 1.0 (or 100%).
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

Feature detection works via `@supports` (e.g. `@supports (transition-haptic-effect: tick)`).

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

### Sidebar Drawer

A sidebar that slides in and out with a haptic when the transition settles — in either direction:

```css
.sidebar {
  transform: translateX(-100%);
  transition: transform 300ms ease;
  transition-haptic-effect: align;
}
.sidebar.open {
  transform: translateX(0);
}
```

The `align` fires each time the `transform` transition completes — when the sidebar finishes opening *and* when it finishes closing. Both are desirable: the user feels the panel lock into place in either direction. Unlike discrete events like button clicks, panel transitions are inherently bidirectional and both endpoints are meaningful, making `transitionend` a natural trigger.

### Modal Slide-In

A modal slides in from the bottom with a crisp haptic cue when the animation begins:

```css
@keyframes slide-in {
  from {
    haptic-effect: align;
    haptic-intensity: 0.8;
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal.open {
  animation: slide-in 350ms ease-out forwards;
}
```

The user feels an `align` as the modal starts its entrance — reinforcing the visual motion with tactile feedback. The haptic is part of the animation definition, so any element using this animation gets the same tactile cue.

### Drag-to-Snap Divider

An app may want to use haptics when [dragging a sidebar divider to a snap point](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699). CSS can't express distance-threshold logic — this requires the imperative API:

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

### E-Commerce "Add to Cart" Button

Button presses are discrete events — the user expects one haptic per click. Transition haptics are a poor fit here: `transitionend` fires on *every* completion of a property's transition, including hover state changes and the release after `:active`, not just the press the developer intended. The imperative API is a more direct match:

```js
btn.addEventListener('click', () => navigator.playHaptics?.('align'));
```

This is a case where a future [pseudo-class triggered haptic](#pseudo-class-triggered-haptics-haptic-feedback) would be ideal — `button:active { haptic-feedback: align; }` would express the intent declaratively without the `transitionend` ambiguity.

## Future Extensions

The following extensions are out of scope for this initial proposal but represent natural next steps that could broaden the declarative surface.

### Pseudo-class triggered haptics (`haptic-feedback`)

A complementary declarative model where a `haptic-feedback` CSS property fires a haptic when an element enters a pseudo-class state due to direct user interaction.

**Syntax:**

```
haptic-feedback: <effect-name> <intensity>?
```

**Examples:**

```css
input[type="checkbox"]:checked {
  haptic-feedback: tick 0.6;
}

button:active {
  haptic-feedback: align;
}

details[open] {
  haptic-feedback: align;
}
```

The two declarative models are complementary — they target different kinds of interactions. The transition/animation model excels at continuous motion: panels sliding, modals bouncing, scroll-snap carousels — haptics choreographed to visual movement the browser is already tracking. Pseudo-class haptics cover the gap: discrete state changes (button presses, checkbox toggles, disclosure widgets) that may have no visual transition at all, or whose transitions are incidental to the haptic intent. Together they cover most common haptic use cases declaratively.

However, the pseudo-class approach has no existing CSS event to piggyback on — unlike `transitionend` or animation keyframe progress, there is no built-in mechanism that fires when an element enters a pseudo-class state. A new triggering primitive would need to be specified. Separately, the spec would need to define which pseudo-classes are eligible to trigger haptics. User-interaction states like `:active`, `:checked`, and `:focus` are natural candidates, but structural pseudo-classes like `:first-child` or `:nth-of-type()` are not.

The transition/animation model was chosen as the initial proposal because it reuses existing lifecycle events and offers richer capabilities — multi-step haptic choreography across keyframe offsets, intensity variation within a single animation, and haptics synchronized to scroll-snap landings. However, we are also considering the inverse: leading with pseudo-class haptics in v1 and deferring the transition/animation integration to a later extension, since the simpler model covers more common interactions with less syntax. We welcome community feedback on which ordering better serves developers. See [Alternatives Considered](#alternatives-considered) & [Open Questions](#open-questions) for more discussion.

### Transition start haptics

The current proposal fires on `transitionend` only. Firing on `transitionstart` as well could enable anticipatory cues — e.g. a `hint` when a panel begins expanding, followed by a `tick` when it settles.

### Custom haptic effects

The current set of four effects is intentionally small. If the effect vocabulary grows (e.g. platform-specific effects or developer-defined waveforms), the `@keyframes` haptic descriptors and `transition-haptic-*` longhands should accommodate them without syntax changes.

## Alternatives Considered

- **Extending `navigator.vibrate`** — The existing `vibrate()` API accepts raw duration/pattern arrays (e.g. `navigator.vibrate([100, 50, 200])`) with no way to express semantic intent like "tick" or "align." Adding named effects would require method overloading or a new options-bag signature, complicating an already-shipped interface. Feature detection becomes awkward — `typeof navigator.vibrate` tells you the method exists but not whether it supports named effects. The pattern-based model also encourages developers to hand-tune durations per device, which is the opposite of the platform-adaptive approach this proposal targets. Finally, `vibrate()` lacks broad engine support (absent in Safari/WebKit) and carries existing abuse stigma that could slow adoption of legitimate haptic use cases.
- **Pseudo-class-triggered `haptic-feedback` property as the primary declarative surface**. A complementary model for discrete state-only interactions (buttons, toggles, form validation) that works naturally even without visual transitions, but has no existing CSS event to piggyback on — a new triggering primitive would need to be specified. We are actively considering whether this should lead in v1 instead. See [Future Extensions](#future-extensions) for a detailed comparison.
- **Pointer-event based API** ([previous explainer](../HapticsDevice/explainer.md)) — Purely imperative; tightly couples haptics to specific input events, so common interactions like checkbox toggles and scroll-snap landings always require JavaScript. No declarative path, no cascade composition.
- **HTML attributes** (e.g. `<button haptic-on-activate="tick">`) — No precedent for `haptic-on-*` pattern; resembles discouraged `on*` handlers. Cannot compose with cascade, media queries, or pseudo-classes.
- **Extending `scroll-snap-type` or adding a `:snap` pseudo-class** instead of a separate `scroll-snap-haptic` property — Extending shorthands has precedent (`background`, `font`), so backward-compatibility is manageable. A `:snap` pseudo-class could unify scroll-snap haptics with a future pseudo-class-based haptic model, but introduces design questions beyond haptics: does `:snap` apply to the child or the container? Is it instantaneous or stateful? A dedicated sibling property like `scroll-snap-haptic` follows the `scroll-snap-type` / `scroll-snap-align` / `scroll-snap-stop` pattern and can ship without resolving those questions.

## Accessibility, Privacy, and Security Considerations

### Privacy

The API does not expose means to query haptics-capable devices, available effects, or whether a haptic was successfully played. No new media features are introduced. Feature detection uses `@supports` (e.g. `@supports (transition-haptic-effect: tick)`), which tests whether the browser engine recognizes the syntax — equivalent to detecting any other CSS property and revealing no hardware information. Device-capability detection (e.g. whether the hardware can produce haptic output) is intentionally omitted to avoid creating a new fingerprinting vector; absent hardware is treated as a graceful no-op.

### Security

**Imperative API:** Requires sticky user activation. No permission gate.

**Declarative API:** Transitions and animations can be programmatically triggered, so the declarative API inherits the same sticky user activation requirement. The browser verifies that the style change that initiated the transition occurred within an activation context. Unlike a purely imperative API, the declarative path limits the *shape* of haptics to declared effects at declared intensities — a malicious script cannot vary haptic effects dynamically through the declarative channel.

**Anti-abuse:** User agents may enforce throttling on both APIs. Haptics produce no lasting effect — the user can navigate away at any time. If abuse patterns emerge, user agents may suppress haptics entirely for the offending origin.

## Open Questions

- **Should pseudo-class triggered haptics be the primary v1 declarative surface instead?** A `haptic-feedback` property on pseudo-classes (e.g. `button:active { haptic-feedback: tick; }`) would be more concise and natively cover state-only interactions without visual transitions. However, it requires novel CSS triggering semantics with no existing precedent, while the transition/animation model reuses established lifecycle events. We welcome feedback on which tradeoff better serves developers (see [Alternatives Considered](#alternatives-considered)).
- **Should any [future extension](#future-extensions) be promoted to v1?** Several features are deferred — transition start events, pseudo-class triggered haptics, etc. If any of these are critical for initial adoption, we would like to hear which ones and why.
- **How should `@keyframes` haptic descriptors interact with `animation-direction: reverse`?** When an animation plays in reverse, keyframe offsets are visited in reverse order. The haptic at `0%` would fire last, and the haptic at `100%` would fire first. This is logically consistent but may surprise authors. Should reverse/alternate animations suppress haptics, or is offset-order firing the right default?
- **Feedback on the predefined effect vocabulary?** The current set (`hint`, `edge`, `tick`, `align`) is intentionally small. Feedback is needed on whether these four effects cover the most common interaction patterns and map well to native haptic primitives across platforms.
- **Should the API return whether haptics was successfully played?** Currently, `playHaptics` always returns `undefined` to avoid exposing device capabilities. Returning a boolean or promise could help developers debug, but risks leaking hardware information.
- **Is there developer interest in haptics device enumeration?** Though out of scope, we would like to understand interest. Exposing available devices or capabilities would enable richer experiences but introduces fingerprinting trade-offs that need careful evaluation.

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

## Stakeholder Feedback / Opposition

We have heard some early developer interest such as [dragging divider to a snap point in Slack](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699).

We intend to seek feedback via:

- Incubation in WICG.
- Discuss within Device & Sensors Working Group.
- Cross‑share with Haptic Industry Forum (non‑standards venue) to align on primitives vocabulary and invite suppliers/OEMs to comment publicly in WICG issues.
- Engage CSS Working Group for review of transition and animation haptic integration.

## References & Acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many — thank you to everyone who shares feedback and helps shape this work. Special thanks to:
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](../HapticsDevice/explainer.md), which served as the foundation for this proposal.
