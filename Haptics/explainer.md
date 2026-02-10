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
The [navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) API exists today to allow basic or developer-defined-patterned haptics. However, the current API is mobile-centric and lacks engine and device support. It is also coarse-grained and requires the developer to manually program the pattern which can be very confusing.

## Goals

- Bring standardized, semantic haptic feedback to web apps across desktop and mobile platforms.
- Allow developers to signal intent/effect rather than programming raw patterns.
- Focus on reactive haptics feedback (i.e. haptics immediately after user input).
- Extensible interface for future haptics advancement on the web.
- Respect platform haptics user settings if available.
- Minimize privacy/fingerprinting concerns.

## Non-goals

- Guarantee identical tactile output across platforms - different platforms and user agents may choose varied output that best matches the intent.
- Cover haptics notification scenarios (e.g. vibrate to alert users when long-running task is completed).
- Cover/replace API for highly specialized hardware, namely gamepad.

## Proposed Approach

The Web Haptics API uses a pre-defined list of effects with an optional intensity parameter, without exposing raw waveform authoring or low-level parameters like duration, sharpness, or ramp. Developers request a named effect, and the user agent maps it to the closest native capability (which may be a generic pattern if OS or hardware support is lacking). In order to minimize fingerprinting risks, the API does not currently allow developers to query haptics-capable hardware or available waveforms. Instead, haptics will be sent to the last input device if haptics-capable. The API is not gated behind permission but requires [sticky user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation).

```js
navigator.playHaptics(effect, intensity);
```

The parameters for `navigator.playHaptics`:
- effect: a pre-defined set of waveform effects (which can be extended in the future) that includes - 
    - Hover: a light, subtle cue that signals something is interactive or an action may follow.
    - Edge: a heavy boundary signal that indicates reaching the end of a range or hitting a limit.
    - Tick: a firm, pulse that marks discrete changes, like moving through a list or slider.
    - Align: a crisp confirmation when an object locks into place or aligns with guides or edges.
- intensity: a normalized intensity value between 0.0 and 1.0. Note that if platform intensity setting is available, then effective intensity = system intensity value * developer specified intensity. Intensity defaults to 1 if left unspecified.

The API always returns `undefined`. No haptics is played if the last input device is not haptics-capable.

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
               if (navigator.playHaptics) {
                  navigator.playHaptics('align', 1);
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

Given this is an early brainstorming explainer, the API shape is very much open to change and we welcome feedback to ask us to revisit below and other alternatives.

- Extending existing `navigator.vibrate`
    - Pros: No newly introduced interface.
    - Cons: Exsiting API includes the pattern param which may be confusing to use and the explainer currently does not plan to support. Extending the API also hinders feature detection. Hypothetical, but if the API evolves to return meaningful value then it would require a new API.

- A pointer-event based API as previously defined in [explainer](../HapticsDevice/explainer.md)
    - Pros: Closely tie haptics to input events.
    - Cons: Can be more cumbersome than a declarative method. 

## Accessibility, Internationalization, Privacy, and Security Considerations

### Privacy
The current design does not expose means to query haptics-capable devices, available waveforms/effects, or success in playing haptics.

### Security
The current design does not include permission gate for haptics but requires [sticky user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation). While there is potential concern for haptics abuse, this is manageable given -

- User may choose to navigate away and there is no lasting impact on the user,
- User agent may choose to apply additional throttle.

## Reference for relevant haptics APIs

This section provides reference to existing web and native haptics API to help inform the API design and platform supportability.

Known platform-specific native haptics API: 

- [Windows: InputHapticsManager](https://learn.microsoft.com/en-us/uwp/api/windows.devices.haptics?view=winrt-26100)
- [macOS: NSHapticFeedbackManager](https://developer.apple.com/documentation/appkit/nshapticfeedbackmanager)
- [iOS: Core Haptics](https://developer.apple.com/documentation/corehaptics)
- [Android: VibrationEffect](https://developer.android.com/reference/android/os/VibrationEffect)

Relevant web APIs:
- [navigator.vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)

## Open Questions

- Feedback on the set of predefined waveforms and how well they can be implemented on different platforms.
- Are there scenarios where developer may want to add delayed haptics effect?
- Should this API return whether haptics is successfully played as opposed?
- Is there developer interest on haptics device enumeration and whether this can be done in a way with minimum fingerprinting concern?
- While currently out of scope, is the developer interest level for haptics notifications scenarios?

## Stakeholder Feedback / Opposition

We have heard some early developer interest such as [dragging divider to a snap point in Slack](https://github.com/w3c/webappswg/issues/138#issuecomment-3514522699). 

We intend to seek feedback via:

- Incubation in WICG.
- Discuss within Device & Sensors Working Group.
- Cross‑share with Haptic Industry Forum (non‑standards venue) to align on primitives vocabulary and invite suppliers/OEMs to comment publicly in WICG issues.

## References & acknowledgements

We acknowledge that this design will change and improve through input from browser vendors, standards bodies, accessibility advocates, and developers. Ongoing collaboration is essential to ensure the API meets diverse needs.

We only get here through the contributions of many—thank you to everyone who shares feedback and helps shape this work. Special thanks to: 
- Ross Nichols – Contributions to Windows Haptics API design and integration guidance.
- Previous Iteration – [HapticsDevice Explainer (Microsoft Edge)](../HapticsDevice/explainer.md), which served as the foundation for this proposal.
