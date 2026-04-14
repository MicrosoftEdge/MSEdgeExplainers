# Web Haptics API

Authors: [Nesh Gandhe](https://github.com/neshgandhe), [Limin Zhu](https://github.com/liminzhu)

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
- [Accessibility, Privacy, and Security Considerations](#accessibility-privacy-and-security-considerations)
- [Open Questions](#open-questions)
- [Reference for Relevant Haptics APIs](#reference-for-relevant-haptics-apis)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [Appendix: CSS Alternatives Side-by-Side](#appendix-css-alternatives-side-by-side)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction

Modern operating systems have embraced haptics as a core part of user experience — providing subtle, low-latency tactile cues that reinforce visual and auditory feedback. These signals improve confidence, precision, and delight in everyday interactions. The Web Haptics API proposes a semantic, cross-platform interface that connects web applications to native haptic capabilities. By focusing on intent-driven effects, the API enables web apps to deliver tactile feedback consistent with OS design principles, while preserving user privacy and security.

This proposal offers two complementary mechanisms:

1. **Declarative API (CSS)** — a selector-triggered at-rule (`@haptic-trigger`) that fires haptic effects when selectors start or stop matching (works with pseudo-classes, classes, and attributes).
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

The Web Haptics API uses a predefined list of effects with an optional intensity parameter, without exposing raw waveform authoring or low-level parameters like duration, sharpness, or ramp. Developers request a named effect, and the user agent maps it to the closest native capability (which may be a generic pattern if OS or hardware support is lacking). To minimize fingerprinting risks, the API does not currently allow developers to query haptics-capable hardware or available waveforms.

For both imperative and declarative APIs, target selection follows one shared model: dispatch to the most recent input device. If that device is not haptics-capable, no haptic is played. User agents do not reroute to another connected haptics-capable device.

Both the imperative and declarative paths share the same effect vocabulary.

### Effect Vocabulary

| Value   | Description | When to reach for it |
|---------|-------------|----------------------|
| `hint`  | A light, subtle cue that signals something is interactive or an action may follow. | Focusing an input field, entering a drop zone during drag. |
| `edge`  | A heavy boundary signal that indicates reaching the end of a range or hitting a limit. | Validation failure, pull-to-refresh threshold, scroll hitting a boundary. |
| `tick`  | A firm pulse that marks discrete changes, like moving through a list or toggling a switch. | Scroll-snap landing, stepping through picker values, toggling a switch. |
| `align` | A crisp confirmation when an object locks into place or aligns with guides or edges. | Drag-to-snap, window snapping to screen edges, zoom snapping to 100%. |

The table below illustrates example mappings of the predefined effects (hint, edge, tick, align) to representative platform-native feedback patterns across Windows, macOS, iOS, and Android. These mappings are illustrative examples only. User agents may choose different mappings, including synthesizing custom effects from lower-level primitives and parameters. The API standardizes the developer-facing intent, while the underlying realization remains platform-defined.

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
- `effect` — one of the predefined effect names: `"hint"`, `"edge"`, `"tick"`, `"align"`.
- `intensity` *(optional)* — a normalized value between 0.0 and 1.0. Defaults to 1.0.

The API always returns `undefined`. No haptic is played if the last input device is not haptics-capable, and the user agent does not reroute to another connected haptics-capable device. If sticky user activation has expired, the call is silently ignored.

### Declarative API (CSS)

The declarative API introduces one selector-triggered at-rule that provides haptic feedback without requiring JavaScript:

- **`@haptic-trigger`** — fires a haptic when a selector starts matching.

#### `@haptic-trigger` at-rule

The `@haptic-trigger` at-rule declares a selector plus descriptors that define which effect to fire and when.

**Syntax:**

```css
@haptic-trigger <selector> {
  effect: <effect-name>;
  intensity: <number> | <percentage>; /* optional, defaults to 1.0 */
}
```

- `effect` — one of `hint`, `edge`, `tick`, `align`.
- `intensity` *(optional)* — a `<number>` between 0.0 and 1.0, or a `<percentage>` between 0% and 100%.

The haptic fires once when the selector starts matching. This supports pseudo-classes (e.g. `:active`, `:checked`), class-driven state (`.is-open`), and attribute-driven state (`[aria-invalid="true"]`) with one model.

When a declarative trigger fires, target selection uses the same input-device model as the imperative API: the most recent input device is targeted; if that device is not haptics-capable, no haptic is played and no rerouting occurs. This target selection and activation check are evaluated when the trigger fires, not at style computation time.

When multiple `@haptic-trigger` rules have selectors that transition into matching the same element in the same rendering update, at most one haptic fires per element. The winning rule is determined by selector specificity; ties are broken by last in document order. This prevents overlapping selectors (e.g. `button:active` and `.cta:active` both matching `<button class="cta">`) from producing a double-tap. To conditionally suppress a trigger, exclude it via `@media` rather than relying on specificity.

Across multiple elements in the same rendering update, user agents may coalesce or suppress triggers and fire at most one haptic per target device per frame as a temporary v1 anti-overload rule.

**Example — button press:**

```css
@haptic-trigger button:active {
  effect: align;
}
```

For interactions that require threshold or gesture logic not directly expressible as selector start-matching events (e.g. drag thresholds), use the [imperative API](#imperative-api-js).

Haptic feedback is inherently progressive enhancement — non-supporting browsers silently ignore unknown at-rules per CSS parsing rules, so `@haptic-trigger` requires no fallback styling. For imperative feature detection in JavaScript, use `'playHaptics' in navigator`.

## Real-World Scenarios

The following examples demonstrate how selector-triggered declarative haptics and the imperative API together cover common use cases.

### E-Commerce "Add to Cart" Button

A tactile press confirmation:

```css
@haptic-trigger .add-to-cart:active {
  effect: align;
  intensity: 0.8;
}
```

### Social Media Stories Scrolling

A horizontal story carousel with a tactile tick on each snap — using the [`:snapped` pseudo-class](https://drafts.csswg.org/css-scroll-snap-2/#snapped) from CSS Scroll Snap 2:

```css
@haptic-trigger .story-carousel > .story:snapped {
  effect: tick;
  intensity: 0.5;
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

Properties `haptic-effect` and `haptic-intensity` inside `@keyframes` blocks would embed haptic cues at specific keyframe offsets, hooking into the existing [CSS Animations](https://drafts.csswg.org/css-animations-1/) lifecycle. This enables **multi-step haptic choreography** — a capability that cannot be expressed with one-shot selector enter triggers alone.

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

### User preference media feature (`prefers-haptics`)

A coarse user-preference media feature could be considered in a future phase (for example, `prefers-haptics: reduce | no-preference`) to help authors adapt non-essential feedback. This is deferred from v1 to avoid expanding API surface before concrete implementation and privacy review feedback.

### Trigger phase control (`exit` / `both`)

v1 declarative triggering is intentionally enter-only to keep the model simple and predictable. A future extension could add explicit phase control (e.g. `exit` and `both`) if concrete use cases justify the extra surface area and arbitration complexity.

## Alternatives Considered

### CSS alternatives

- **Pseudo-class property model (`haptic-feedback`)**. A prior primary candidate where haptics fire when elements enter selected dynamic pseudo-class states:

  ```css
  button:active { haptic-feedback: align; }
  input:checked { haptic-feedback: tick 0.5; }
  ```

  **Strengths:** Very concise for common native interactions.

  **Weaknesses:** Depends on pseudo-class categorization and does not directly cover class/attribute-driven app state.

- **Transition-based haptics (`transition-haptic-effect` / `transition-haptic-intensity`)**. An alternative declarative model where haptics are integrated into the [CSS Transitions](https://drafts.csswg.org/css-transitions-1/) lifecycle. Longhands `transition-haptic-effect` and `transition-haptic-intensity` would pair with `transition-property` to fire haptics when transitions complete (`transitionend`):

  ```css
  .sidebar {
    transition: transform 300ms ease;
    transition-haptic-effect: align;
  }
  ```

  **Strengths:** Reuses established `transition-*` patterns and gives natural bidirectional firing.

  **Weaknesses:** Couples haptics to visual transitions even when interaction intent exists without animation, and can require synthetic transitions for non-animated interactions.

- **Animation-trigger model (`@haptic` + `haptic-name`)**. A model where named haptic effects are defined and then attached similarly to animation patterns:

  ```css
  @haptic bounce-land {
    effect: align;
    intensity: 0.8;
  }

  button:active {
    haptic-name: bounce-land;
  }
  ```

  **Strengths:** Aligns with familiar animation-like patterns and supports reusable named effects across selector types.

  **Weaknesses:** Re-trigger behavior depends on computed-value changes and can require value choreography.

### Comparison of current primary and declarative alternatives

Quick matrix (details above):

| Model | Trigger | Primary upside | Primary downside |
|---|---|---|---|
| A. Selector-trigger at-rule (current primary) | Selector start-matching | Broad selector coverage with direct trigger semantics | Requires precise trigger timing and conflict-resolution rules |
| B. Pseudo-class property | Entering selected dynamic pseudo-classes | Very simple for `:active`/`:checked` | Limited app-state coverage |
| C. Transition-coupled | `transitionend` | Reuses transition family | Couples haptics to visual transitions |
| D. Animation-trigger | `haptic-name` computed-value change | Strong precedent and reusable names | Re-trigger behavior can be less direct |

See [Appendix: CSS Alternatives Side-by-Side](#appendix-css-alternatives-side-by-side) for concrete code examples of each model applied to the same real-world scenarios.

### JavaScript alternatives

- **Extending `navigator.vibrate`** — The existing `vibrate()` API accepts raw duration/pattern arrays (e.g. `navigator.vibrate([100, 50, 200])`) with no way to express semantic intent like "tick" or "align." Adding named effects would require method overloading or a new options-bag signature, complicating an already-shipped interface. Feature detection becomes awkward — `typeof navigator.vibrate` tells you the method exists but not whether it supports named effects. The pattern-based model also encourages developers to hand-tune durations per device, which is the opposite of the platform-adaptive approach this proposal targets. Finally, `vibrate()` lacks broad engine support (absent in Safari/WebKit) and carries existing abuse stigma that could slow adoption of legitimate haptic use cases.
- **Pointer-event based API** ([previous explainer](../HapticsDevice/explainer.md)) — This was the team's earlier proposal and has the advantage of simplicity for pointer-driven interactions — events are familiar to developers and the mapping from input to haptic is explicit. However, it is purely imperative; it tightly couples haptics to specific input events, so common interactions like checkbox toggles and scroll-snap landings always require JavaScript. No declarative path, no cascade composition.

### Other design options

- **HTML attributes** (e.g. `<button haptic-on-activate="tick">`) — While HTML has adopted new attribute families (`aria-*`, `popover`, `inert`), `haptic-on-*` would require a separate attribute per interaction type (`haptic-on-activate`, `haptic-on-toggle`, `haptic-on-focus`, …), each needing dedicated spec text, parsing rules, and IDL definitions. More fundamentally, HTML attributes cannot compose with the cascade, media queries, or pseudo-class selectors — limiting expressiveness compared to a CSS-based approach.
- **Using the `:snapped` pseudo-class** versus a dedicated scroll-snap trigger surface — [CSS Scroll Snap 2](https://drafts.csswg.org/css-scroll-snap-2/#snapped) defines a `:snapped` pseudo-class that applies to snap children when the scroll container is snapped to them. In the selector-trigger primary model this naturally enables rules like `@haptic-trigger .slide:snapped { ... }`. The main consideration is that `:snapped` is still a Working Draft and not yet widely implemented. If `:snapped` does not ship or is significantly delayed, a dedicated `scroll-snap-haptic` CSS property on the scroll container (e.g. `.carousel { scroll-snap-haptic: tick 0.6; }`) could be introduced as a self-contained fallback that does not depend on another in-progress spec.

## Accessibility, Privacy, and Security Considerations

### Privacy

To avoid introducing a new fingerprinting vector, the API does not expose means to query haptics-capable devices, available effects, or whether a haptic was successfully played. No new media features are introduced in v1.

### Security

**Anti-abuse:** User agents may enforce throttling on both APIs. Haptics produce no lasting effect — the user can navigate away at any time. If abuse patterns emerge, user agents may suppress haptics entirely for the offending origin.

**Imperative API:** Requires sticky user activation. No permission gate.

**Declarative API:** Selector start-matching events from direct user interaction may fire haptics without additional activation checks. Activation checks apply to script-initiated selector start-matching events, which require sticky user activation; if activation is not present, the trigger is ignored.

## Open Questions

- **Is selector-trigger the right primary declarative surface, or should animation-trigger be the primary model?** This proposal uses selector-trigger as the primary path and documents animation-trigger as a serious alternative. We welcome feedback on which model should anchor standardization.
- **Should any [future extension](#future-extensions) be promoted to v1?** Animation haptics and custom effects are deferred. If either is critical for initial adoption, we would like to hear which and why.
- **Is the proposed split activation model right for v1?** Current proposal: direct user-interaction start-matching events can fire declarative haptics without additional activation checks, while script-initiated start-matching events require sticky user activation. Should this split be retained, or should declarative triggers be uniformly activation-gated?
- **Should a user-preference media feature be added in a future phase?** v1 introduces no media query. A possible extension is a coarse preference signal (e.g. `prefers-haptics: reduce | no-preference`) if there is concrete use-case and privacy review support.
- **Should a dedicated `scroll-snap-haptic` property be added if `:snapped` does not ship?** The current proposal relies on the [`:snapped` pseudo-class](https://drafts.csswg.org/css-scroll-snap-2/#snapped) from CSS Scroll Snap 2 for scroll-snap haptics (e.g. `@haptic-trigger .slide:snapped { ... }`). If `:snapped` does not ship or is significantly delayed, a dedicated `scroll-snap-haptic` CSS property on the scroll container could serve as a self-contained fallback. We welcome feedback on whether the `:snapped` dependency is acceptable for v1.
- **Feedback on the predefined effect vocabulary?** The current set (`hint`, `edge`, `tick`, `align`) is intentionally small. Feedback is needed on whether these four effects cover the most common interaction patterns and map well to native haptic primitives across platforms.
- **Should the API return whether haptics was successfully played?** Currently, `playHaptics` always returns `undefined` to avoid exposing device capabilities. Returning a boolean or promise could help developers debug, but risks leaking hardware information.
- **Should global arbitration be standardized beyond per-element dedupe?** Current v1 proposal allows user agents to coalesce/suppress cross-element triggers and fire at most one haptic per target device per frame. We welcome feedback on whether a future level should define a deterministic cross-element winner algorithm.
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
- [CSS Scroll Snap 2](https://drafts.csswg.org/css-scroll-snap-2/)

## Stakeholder Feedback / Opposition

We have heard some early developer interest such as [dragging divider to a snap point in Slack](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699).

We intend to seek feedback via:

- Incubation in WICG.
- Discuss within Device & Sensors Working Group.
- Cross‑share with Haptic Industry Forum (non‑standards venue) to align on primitives vocabulary and invite suppliers/OEMs to comment publicly in WICG issues.
- Engage CSS Working Group for review of selector-trigger primary design and animation-trigger alternative.

## Appendix: CSS Alternatives Side-by-Side

The following examples show how each declarative CSS model from the [comparison table](#comparison-of-current-primary-and-declarative-alternatives) would express the same two real-world scenarios.

### "Add to Cart" button press

<table>
<tr><th>A. Selector-trigger (primary)</th><th>B. Pseudo-class property</th></tr>
<tr><td>

```css
@haptic-trigger .add-to-cart:active {
  effect: align;
  intensity: 0.8;
}
```

</td><td>

```css
.add-to-cart:active {
  haptic-feedback: align 0.8;
}
```

</td></tr>
<tr><th>C. Transition-coupled</th><th>D. Animation-trigger</th></tr>
<tr><td>

```css
.add-to-cart {
  /* Requires a visual transition to attach to */
  transition: scale 0ms;
  transition-haptic-effect: align;
  transition-haptic-intensity: 0.8;
}
.add-to-cart:active {
  scale: 1; /* triggers a transition */
}
```

</td><td>

```css
@haptic bounce-land {
  effect: align;
  intensity: 0.8;
}
.add-to-cart:active {
  haptic-name: bounce-land;
}
```

</td></tr>
</table>

### Scroll-snap story carousel

<table>
<tr><th>A. Selector-trigger (primary)</th><th>B. Pseudo-class property</th></tr>
<tr><td>

```css
@haptic-trigger .story:snapped {
  effect: tick;
  intensity: 0.5;
}
```

</td><td>

```css
.story:snapped {
  haptic-feedback: tick 0.5;
}
```

</td></tr>
<tr><th>C. Transition-coupled</th><th>D. Animation-trigger</th></tr>
<tr><td>

```css
.story {
  transition: opacity 0ms;
  transition-haptic-effect: tick;
  transition-haptic-intensity: 0.5;
}
.story:snapped {
  opacity: 1; /* triggers a transition */
}
```

</td><td>

```css
@haptic snap-tick {
  effect: tick;
  intensity: 0.5;
}
.story:snapped {
  haptic-name: snap-tick;
}
```

</td></tr>
</table>

**Observations:** Model B is the most concise for pseudo-class-driven interactions but lacks coverage for class/attribute state. Model C requires a visual property change even when none is intended — the `0ms` synthetic transitions above highlight this ergonomic cost. Model D offers reusable named effects but relies on computed-value changes for re-triggering. Model A (primary) handles all selector types uniformly with a direct trigger model.

## References & Acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many — thank you to everyone who shares feedback and helps shape this work. Special thanks to:
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](../HapticsDevice/explainer.md), which served as the foundation for this proposal.
