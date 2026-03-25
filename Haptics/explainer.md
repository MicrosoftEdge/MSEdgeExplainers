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

1. **Declarative API (CSS)** — a `haptic-feedback` property that fires haptic effects when an element enters a user-interaction pseudo-class state, plus a `scroll-snap-haptic` property for scroll-snap landings.
2. **Imperative API (JS)** — `navigator.playHaptics(effect, intensity)` for interactions that require runtime logic or have no corresponding CSS state change.

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

The declarative API introduces two CSS properties that provide haptic feedback without requiring JavaScript:

- **`haptic-feedback`** — fires a haptic when an element enters a user-interaction pseudo-class state (e.g. `:active`, `:checked`, `:focus`).
- **`scroll-snap-haptic`** — fires a haptic each time the scroll position snaps to a snap point.

#### `haptic-feedback` property

The `haptic-feedback` property fires a haptic when an element enters a pseudo-class state due to direct user interaction.

**Syntax:**

```
haptic-feedback: <effect-name> <intensity>?
```

- `<effect-name>` — one of `hint`, `edge`, `tick`, `align`, `none`. Initial value: `none`.
- `<intensity>` *(optional)* — a `<number>` between 0.0 and 1.0, or a `<percentage>` between 0% and 100%. Defaults to 1.0 (or 100%).
- **Not inherited.** Not animatable.

The haptic fires once when the element transitions into the matching pseudo-class state. It does not fire when leaving the state, nor does it fire repeatedly while the state persists. `haptic-feedback` applies to any pseudo-class that represents a **dynamic state change** — pseudo-classes an element can enter or leave due to user interaction or browser-mediated actions (e.g. `:active`, `:checked`, `:focus-visible`, `:open`, `:user-invalid`, `:popover-open`). Structural pseudo-classes that reflect document position (`:first-child`, `:nth-of-type()`, etc.) do not trigger haptics.

**Example — button press:**

```css
button:active {
  haptic-feedback: align;
}
```

For interactions that have no corresponding pseudo-class (e.g. drag thresholds, custom gestures), use the [imperative API](#imperative-api-js).

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

Feature detection works via `@supports` (e.g. `@supports (haptic-feedback: tick)`).

## Real-World Scenarios

The following examples demonstrate how the pseudo-class model, scroll-snap model, and the imperative API together cover common haptic use cases.

### E-Commerce "Add to Cart" Button

A tactile press confirmation — one line of CSS:

```css
button:active {
  haptic-feedback: align;
}
```

### Social Media Stories Scrolling

A horizontal story carousel with a tactile tick on each swipe — one line of CSS:

```css
.story-carousel {
  scroll-snap-type: x mandatory;
  scroll-snap-haptic: tick 0.5;
}
```

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

## Future Extensions

The following extensions are out of scope for this initial proposal but represent natural next steps that could broaden the declarative surface.

### Animation haptics (`@keyframes` descriptors)

Descriptors `haptic-effect` and `haptic-intensity` inside `@keyframes` blocks would embed haptic cues at specific keyframe offsets, hooking into the existing [CSS Animations](https://drafts.csswg.org/css-animations-1/) lifecycle. This enables **multi-step haptic choreography** — a capability that cannot be expressed with pseudo-class or scroll-snap haptics.

```css
@keyframes bounce-settle {
  0%   { transform: translateY(-100%); }
  40%  { haptic-effect: edge;  transform: translateY(0); }
  60%  { transform: translateY(-20%); }
  100% { haptic-effect: align; haptic-intensity: 0.5; transform: translateY(0); }
}
```

An `edge` fires at 40% when the element hits the baseline, and a softer `align` at 100% when it settles.

### Custom haptic effects

The current set of four effects is intentionally small. If the effect vocabulary grows (e.g. platform-specific effects or developer-defined waveforms), the API should accommodate them without syntax changes.

## Alternatives Considered

- **Transition-based haptics (`transition-haptic-effect` / `transition-haptic-intensity`)**. An alternative declarative model where haptics are integrated into the [CSS Transitions](https://drafts.csswg.org/css-transitions-1/) lifecycle. Longhands `transition-haptic-effect` and `transition-haptic-intensity` would pair with `transition-property` to fire haptics when transitions complete (`transitionend`). This model aligns naturally with existing `transition-*` conventions and handles bidirectional state changes well (e.g. a sidebar opening *and* closing both produce a tactile cue). However, it couples haptic feedback to visual transitions — many interactions that deserve haptics (button presses, checkbox toggles, disclosure widgets) may not have visual transitions, or have transitions where `transitionend` fires ambiguously (e.g. on hover state changes and `:active` release, not just the intended press). The pseudo-class model was chosen as the primary approach because it covers a broader set of common interactions with simpler, more intuitive syntax.
- **HTML attributes** (e.g. `<button haptic-on-activate="tick">`) — No precedent for `haptic-on-*` pattern; resembles discouraged `on*` handlers. Each interaction type would require its own attribute (`haptic-on-activate`, `haptic-on-toggle`, `haptic-on-focus`, …), each needing dedicated spec text, parsing rules, and IDL definitions. Cannot compose with cascade, media queries, or pseudo-classes.
- **Extending `navigator.vibrate`** — The existing `vibrate()` API accepts raw duration/pattern arrays (e.g. `navigator.vibrate([100, 50, 200])`) with no way to express semantic intent like "tick" or "align." Adding named effects would require method overloading or a new options-bag signature, complicating an already-shipped interface. Feature detection becomes awkward — `typeof navigator.vibrate` tells you the method exists but not whether it supports named effects. The pattern-based model also encourages developers to hand-tune durations per device, which is the opposite of the platform-adaptive approach this proposal targets. Finally, `vibrate()` lacks broad engine support (absent in Safari/WebKit) and carries existing abuse stigma that could slow adoption of legitimate haptic use cases.
- **Extending `scroll-snap-type` or adding a `:snap` pseudo-class** instead of a separate `scroll-snap-haptic` property — Extending shorthands has precedent (`background`, `font`), so backward-compatibility is manageable. A `:snap` pseudo-class could unify scroll-snap haptics with the pseudo-class-based haptic model, but introduces design questions beyond haptics: does `:snap` apply to the child or the container? Is it instantaneous or stateful? A dedicated sibling property like `scroll-snap-haptic` follows the `scroll-snap-type` / `scroll-snap-align` / `scroll-snap-stop` pattern and can ship without resolving those questions.
- **Pointer-event based API** ([previous explainer](../HapticsDevice/explainer.md)) — Purely imperative; tightly couples haptics to specific input events, so common interactions like checkbox toggles and scroll-snap landings always require JavaScript. No declarative path, no cascade composition.

## Accessibility, Privacy, and Security Considerations

### Privacy

To avoid introducing a new fingerprinting vector, the API does not expose means to query haptics-capable devices, available effects, or whether a haptic was successfully played. No new media features are introduced.

### Security

**Imperative API:** Requires sticky user activation. No permission gate.

**Declarative API:** The declarative API does not require user activation. Pseudo-class state changes (e.g. `:active`, `:checked`, `:open`) and scroll-snap landings are inherently user-initiated in most cases. Script-initiated state changes (e.g. `checkbox.checked = true`, `dialog.showModal()`) also trigger haptics if a matching `haptic-feedback` rule applies — this keeps the model simple and consistent, and avoids requiring user agents to distinguish the source of a state change.

**Anti-abuse:** User agents may enforce throttling on both APIs. Haptics produce no lasting effect — the user can navigate away at any time. If abuse patterns emerge, user agents may suppress haptics entirely for the offending origin.

## Open Questions

- **Should transition-based haptics replace pseudo-class haptics as the primary v1 declarative surface?** The [transition model](#alternatives-considered) handles bidirectional transitions (e.g. sidebar open/close) more naturally and reuses established CSS lifecycle events without requiring a novel pseudo-class categorization model. If this better serves developers, we would consider swapping the two.
- **Should any [future extension](#future-extensions) be promoted to v1?** Animation haptics, transition start events, and other features are deferred. If any are critical for initial adoption, we would like to hear which ones and why.
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
- Engage CSS Working Group for review of pseudo-class and scroll-snap haptic integration.

## References & Acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many — thank you to everyone who shares feedback and helps shape this work. Special thanks to:
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](../HapticsDevice/explainer.md), which served as the foundation for this proposal.
