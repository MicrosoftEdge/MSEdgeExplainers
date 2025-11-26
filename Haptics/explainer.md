# Web Haptics API

Authors: [Nesh Gandhe](https://github.com/neshgandhe_microsoft), [Limin Zhu](https://github.com/liminzhu)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. The API is in the early ideation and interest-gauging stage, and the solution/design will likely evolve over time.

* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: **This document**

## Table of Contents
1. [Introduction](#introduction)
1. [User-Facing Problem](#user-facing-problem)
1. [Goals](#goals)
1. [Non-goals](#non-goals)
1. [Proposed Approach](#proposed-approach)
1. [Sample code](#sample-code)
1. [Alternatives Considered](#alternatives-considered)
1. [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
1. [Reference for Relevant Haptics APIs](#reference-for-relevant-haptics-apis)
1. [Open Questions](#open-questions)
1. [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
1. [References & Acknowledgements](#references--acknowledgements)

## Introduction

Modern operating systems have embraced haptics as a core part of user experience — providing subtle, low-latency tactile cues that reinforce visual and auditory feedback. These signals improve confidence, precision, and delight in everyday interactions. The Web Haptics API proposes a semantic, cross-platform interface that connects web applications to native haptic capabilities. By focusing on intent-driven effects, the API enables web apps to deliver tactile feedback consistent with OS design principles and native experiences, while preserving and protecting user privacy and security.

An example scenario this proposal aims to support is dragging elements/windows to a snap point. This will enable a much more engaging and satisfying experience for end users.

## User-Facing Problem
The [navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) API exists today to allow basic or developer-defined-patterned haptics. However, it is currently mobile-centric and not supported on desktop environments. It is also coarse-grained and requires the developer to manually program the pattern. 

## Goals

- Bring standardized, semantic haptic feedback to web apps across desktop and mobile platforms.
- Focus on reactive haptics feedback (i.e. haptics immediately after user input), at least for v1.
- Extensible interface for future haptics advancement on the web.
- Use intent-driven effect names rather than raw waveforms.
- Respect platform haptics user settings if available.
- Minimize privacy/fingerprinting concerns.

## Non-goals

- Guarantee identical tactile output across platforms - different platforms and user agents may choose varied output that best matches the intent.
- Cover haptics notification scenarios (e.g. vibrate to alert users when long-running task is completed), at least for v1.
- Cover/replace API for highly specialized hardware, namely gamepad.

## Proposed Approach

The Web Haptics API uses a pre-defined list of effects with an optional intensity parameter, without exposing raw waveform authoring or low-level parameters like duration, sharpness, or ramp. Developers request a named effect, and the user agent maps it to the closest native capability on the underlying OS. In order to minimize fingerprinting risks, the API does not currently allow developers to query haptics-capable hardware or available waveforms. Instead, haptics will be sent to the last input device if haptics-capable.

The current solution extends the existing `navigator.vibrate` API in order to avoid creating more haptics-related API and complicating the ecosystem. As is the case with the current API, the extended API is not gated behind permission and requires [sticky user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation).

```js
navigator.vibrate(pattern, {waveform: waveform; intensity: intensity});
```

The additional `options` parameter for `navigator.vibrate` accepts:
- waveform: a pre-defined set of waveform effects. Note that if `waveform` is specified and a `pattern` array is provided, `pattern` is ignored. The effects include - 
    - Hover: a light, subtle cue that signals something is interactive or an action may follow.
    - Edge: a heavy boundary signal that indicates reaching the end of a range or hitting a limit.
    - Tick: a firm, pulse that marks discrete changes, like moving through a list or slider.
    - Align: a crisp confirmation when an object locks into place or aligns with guides or edges.
    - Optional: a dynamic pulse that conveys motion, transitions, or intelligent system activity.
- intensity: a normalized intensity value between 0.0 and 1.0. Note that if platform intensity setting is available, then effective intensity = system intensity value * developer specified intensity. Intensity defaults to 1 if left unspecified.

There are notable limitations to this approach that are currently accepted as tradeoff for not introducing another haptics API. We may re-evaluate this based on feedback.
- The semantics of the returned boolean will need to be preserved for interop. A different design would allow for returning `true`/`false` based on whether haptics is actually triggered.
- Related to the previous point, it’s hard to do feature detection and error handling on extended options. 
- A different API may also return a promise. 

## Sample code 
```html
<html>
   <head>
      <style>
         #target {
            width: 120px;
            height: 120px;
            background: #4caf50;
            border-radius: 8px;
            position: absolute;
            top: 200px;
            left: 200px;
         }
         #draggable {
            width: 100px;
            height: 100px;
            background: #2196f3;
            border-radius: 8px;
            position: absolute;
            top: 40px;
            left: 40px;
            cursor: grab;
            touch-action: none;
         }
      </style>
   </head>
   <body>
      <div id="target"></div>
      <div id="draggable" draggable="true"></div>
      <script>
         const draggable = document.getElementById('draggable');
         const target = document.getElementById('target');
         let offsetX = 0, offsetY = 0;
         let snapped = false;

         draggable.addEventListener('pointerdown', e => {
            offsetX = e.clientX - draggable.offsetLeft;
            offsetY = e.clientY - draggable.offsetTop;
            draggable.setPointerCapture(e.pointerId);
         });

         draggable.addEventListener('pointermove', e => {
            if (!draggable.hasPointerCapture(e.pointerId)) return;
            draggable.style.left = `${e.clientX - offsetX}px`;
            draggable.style.top = `${e.clientY - offsetY}px`;
            checkSnap();
         });

         function checkSnap() {
            const dRect = draggable.getBoundingClientRect();
            const tRect = target.getBoundingClientRect();
            const distance = Math.hypot(
               dRect.left - tRect.left,
               dRect.top - tRect.top
            );
            const SNAP_DISTANCE = 40;
            if (!snapped && distance < SNAP_DISTANCE) {
               snapped = true;
               // Snap the item visually
               draggable.style.left = `${tRect.left}px`;
               draggable.style.top = `${tRect.top}px`;
               // Trigger the haptic feedback
               if ("vibrate" in navigator) {
                  navigator.vibrate(0, {waveform: 'align', intensity: 1});
               }
            } else if (snapped && distance >= SNAP_DISTANCE) {
               snapped = false;
            }
         }
      </script>
   </body>
</html>
```

## Alternatives considered

- A similar declarative API without re-using `navigator.vibrate`
    - Pros: the new API design is not limited by existing `navigator.vibrate` design. Developer will have better feature detection and the API can also return whether haptics is played successfully and can be async.
    - Cons: New interface and added ecosystem complexity.

- A pointer-event based API as previously defined in [explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/HapticsDevice/explainer.md)
    - Pros: Closely tie haptics to input events.
    - Cons: New interface and added ecosystem complexity. Can be more cumbersome than a declarative method. 

## Accessibility, Internationalization, Privacy, and Security Considerations

### Privacy
The current design does not expose means to query haptics-capable devices, available waveforms, or success in playing haptics to alleviate fingerprinting concerns.

### Security
The current design does not include permission gate for haptics but requires [sticky user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation). While there is potential concern for haptics spam, this can be mitigated by user agent stopping haptics when the user navigates away and there is no lasting user impact.

## Reference for relevant haptics APIs

This section provides reference to existing web and native haptics API to help inform the API design and platform supportability.

Known platform-specific native haptics API: 

- [Windows: InputHapticsManager](https://learn.microsoft.com/en-us/uwp/api/windows.devices.haptics?view=winrt-26100)
- [macOS: NSHapticFeedbackManager](https://developer.apple.com/documentation/appkit/nshapticfeedbackmanager)
- [iOS: Core Haptics](https://developer.apple.com/documentation/corehaptics)
- [Android: VibrationEffect](https://developer.android.com/reference/android/os/VibrationEffect)

Relevant web APIs:
- [navigator.vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)
- [(In-progress) Gamepad Event-Driven Input API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/6ea0b9190c7e8b0261323deaf060013d80a0b0ab/GamepadEventDrivenInputAPI/explainer.md)

## Open Questions

- Feedback on the set of predefined waveforms and how well they can be implemented on different platforms.
- How important is it for this API to inform developers whether the waveform they attempted to fire played successfully?
- If a waveform pattern isn't available on the platform, what is the correct fallback behavior (map to closest pattern, generic vibration, no vibration) and whether this should be predetermined or left for user agent discretion?
- While currently out of scope, what is the developer interest level for haptics notifications scenarios?
- What is the developer interest on haptics device enumeration and whether this can be done in a way with minimum fingerprinting concern. 

## Stakeholder Feedback / Opposition

We intend to seek feedback via:

- Incubation in WICG.
- Discuss within Device & Sensors Working Group.
- Cross‑share with Haptic Industry Forum (non‑standards venue) to align on primitives vocabulary and invite suppliers/OEMs to comment publicly in WICG issues.

## References & acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many—thank you to everyone who shares feedback and helps shape this work. Special thanks to: 
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/HapticsDevice/explainer.md), which served as the foundation for this proposal.
