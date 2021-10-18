# A HapticsDevice API for the Web

Consider all sections required unless otherwise noted.

Authors: [Scott Low](https://github.com/scottlow), [Steve Becker](https://github.com/SteveBeckerMSFT), [Mario Bianucci](https://github.com/mabian-ms), [Ben Mathwig](https://github.com/bmathwig)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: **This document**

## Introduction

In today's device ecosystem, there are several types of haptic-enabled surfaces:

* In-built haptic engines (i.e. mobile devices)
* Laptop/external touchpads
* Game/XR controllers
* Peripheral hardware such as [Surface Dial](https://www.microsoft.com/p/surface-dial/925r551sktgn)

While solutions such as [navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) and [GamepadHapticActuator](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator) aim to expose a limited set of these haptic capabilities to the web, web developers today do not have the ability to harness the majority of these surfaces as they do on native platforms. This prevents them from building tactile experiences that physically engage users, help them understand when critical activities have succeeded or failed, or immerse them by simulating [virtual textures](https://source.android.com/devices/input/haptics/haptics-ux-design#virtual-texture)/actions.

This explainer defines a new Haptics API with the aim of meeting the following goals:

## Goals

1. Provide web developers with access to more haptic-enabled devices and features during user interaction
1. Give developers a mechanism to leverage both pre-defined and custom haptic waveforms on hardware/platforms that support them
1. Define a flexible enough API surface to enable support for extensions in the future (see [Potential Extensions](#potential-extensions))

## Featured Use Case
A new generation of gaming controllers are built on buffered haptics and Linear Resonance Actuators (LRAs). Notable devices are the Nintendo Switch JoyCon, Playstation's DualSense, and the HTC Vive Wands. Using the existing haptics APIs for Gamepad, there is no way to fully take advantage of the haptic capabilities of these devices. With this new Haptics API, it would provide an extensible interface to allow developers to create rich XR and gaming experiences on the web.

## Out of Scope
### Non-Interactive Haptic Feedback
It is not the goal of this proposal to address developers leveraging haptic feedback in cases where user interaction has not occurred, see below for more information and [Potential Extensions](#potential-extensions). This requires additional investigation to security and privacy as well as ways for a user to disable non-interactive feedback. Selecting the correct device to route haptic feedback in this scenario is another area that requires discussion.

### User Settings
While a user setting will be needed on the User Agent to toggle haptic feedback on their device, how that is implemented is outside the scope of this proposal.

## Proposed Solution
This explainer defines a new Haptics API and proposes that this start as an attribute on the `PointerEvent` interface so that developers have the ability to fire haptic waveforms during user interaction for pointers that are haptic-enabled. In the future, this can be expanded to include additional `UIEvent` instances for other haptics-enabled devices such as keyboards and gamepads.

## Definitions
### Continuous Haptic Waveform
A continuous waveform is a waveform that is meant to be played in a loop to generate a specific kind of effect. 
### Transient Haptic Waveform
A transient haptic waveform is a waveform that can occur at any point in time, even during a continuous waveform. Usually, these waveforms are short-lived in nature, such as a click effect.

### Web IDL
The proposed WebIDL for this feature is as follows. For more information on how this shape was reached, please see the [Alternative Solutions](#alternative-solutions) section.

```webidl
partial interface PointerEvent {
    [SameObject] readonly attribute HapticsDevice? haptics;
}

interface HapticsDevice {
    void play(HapticsPredefinedWaveform predefinedWaveform);
    void stop();
}

dictionary HapticsPredefinedWaveformInit {
    required unsigned short waveformId;
    float intensity = 1.0;
    DOMString vendorId = "";
    sequence<HapticsPredefinedWaveform> alternates = [];
}

interface HapticsPredefinedWaveform {
    constructor(HapticsPredefinedWaveformInit predefinedWaveformInit);
    readonly attribute unsigned short waveformId;
    readonly attribute float intensity;
    readonly attribute DOMString vendorId;
    readonly attribute FrozenArray<HapticsPredefinedWaveform> alternates;
};
```

### Pre-Defined Waveforms
The first part of this new Haptics API covers playing pre-defined waveforms that are defined as part of the [HID Usage Tables for USB](https://usb.org/sites/default/files/hut1_22.pdf), including the Standard Waveforms block and the Vendor Waveforms block. The most basic example is playing a single waveform ID:

```html
<html>
    <body>
        <button id="b">Activate Click Waveform</button>
        <script>
            const WAVEFORM_CLICK = 0x1003;

            const waveform = new HapticsPredefinedWaveform({
                waveformId: WAVEFORM_CLICK
            });

            document.querySelector('#b').addEventListener('pointerdown', function(e) {
                if (e.haptics) {
                    e.haptics.play(waveform);
                }
            });
        </script>
    </body>
</html>
```

There are scenarios where a continuous waveform makes sense and should be triggered on one event and stopped on another event. An example would be a touch-enabled screen and a canvas element:
```html
<html>
    <body>
        <canvas id="c" width="1280" height="720"></canvas>
        <script>
            const WAVEFORM_BUZZ_CONTINUOUS = 0x1004;

            const waveform = new HapticsPredefinedWaveform({ 
                waveformId: WAVEFORM_BUZZ_CONTINUOUS
            });

            const canvas = document.querySelector('#c');

            // Start a continuous pre-defined waveform on pointerdown
            canvas.addEventListener('pointerdown', function(e) {
                if (e.haptics) {
                    e.haptics.play(waveform);
                }
            });

            // Stop the waveform on pointerup
            canvas.addEventListener('pointerup', function(e) {
                if (e.haptics) {
                    e.haptics.stop();
                }
            });
        </script>
    </body>
</html>
```

An example of where the alternates list would be useful is if there are two device vendors A and B, who each implement different vendor waveforms, and a developer that supports both devices by playing `VENDOR_A_CUSTOM_WAVEFORM` and `VENDOR_B_CUSTOM_WAVEFORM` in their application based on which device is connected. The `vendorId` parameter would be provided by documentation from the OEM or by a JavaScript SDK provided by the OEM.

```html
<html>
    <body>
        <button id="b">Activate Custom Waveform</button>
        <script>
            const VENDOR_A_CUSTOM_WAVEFORM = 0x2002;
            const VENDOR_B_CUSTOM_WAVEFORM = 0x2004;

            const VENDOR_A_DEVICE_ID = 'E001';
            const VENDOR_B_DEVICE_ID = 'C004';

            const waveform = new HapticsPredfinedWaveform({
                waveformId: VENDOR_A_CUSTOM_WAVEFORM,
                vendorId: VENDOR_A_DEVICE_ID,
                alternates: [
                    new HapticsPredefinedWaveform({
                        waveformId: VENDOR_B_CUSTOM_WAVEFORM,
                        vendorId: VENDOR_B_DEVICE_ID
                    })
                ]
            });

            document.querySelector('#b').addEventListener('pointerdown', function(e) {
                if (e.haptics) {
                    e.haptics.play(waveform);
                }
            });
        </script>
    </body>
</html>
```

### Relationship Between `HapticsDevice` and `pointerType`
The current thought is that the user agent will be responsible for determining whether a `PointerEvent` is being fired from a haptics-enabled pointer. In cases where the user agent determines this to be a case, the `haptics` property attached to the `PointerEvent` will be non-null and will represent an interface to communicate with the haptic engine associated with that `PointerEvent`'s pointer device:

* For `pointerType === 'mouse'`, a user agent could return a non-null `HapticsDevice` if a user is currently interacting with the page using a haptics-enabled touchpad or mouse
* For `pointerType === 'pen'`, a user agent could return a non-null `HapticsDevice` if a user is currently interacting with the page using a [haptics-enabled pen/stylus](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.60.3171&rep=rep1&type=pdf)
* For `pointerType === 'touch'`, a user agent could return a non-null `HapticsDevice` if a user is currently interacting with the page using a touch-enabled device with an in-built haptics engine

## Privacy and Security Considerations
### Privacy
The following section enumerates the potential privacy concerns identified during the development of this proposal and summarizes proposed solutions for each.

| Potential privacy concern | Description | Proposed solution |
| :- | :- | :- |
| Fingerprinting of predefined waveforms | As called out in the [Alternative Solutions](#alternative-solutions) section below, the original draft of this proposal included a `HapticsDevice.getSupportedWaveforms()` function that would allow web developers to query a list of predefined waveforms supported by a particular `HapticsDevice`. This would have introduced fingerprinting concerns, however, as the waveforms supported by specific pointer devices may vary by OEM, thus providing bits of entropy. | The current solution is to agree on a common set of waveforms that will be standard across all haptic implementations. See [Open Questions](#open-questions) for more information.
| Fingerprinting of successful haptic playback | As called out in the [Open Questions](#open-questions) section, it is still TBD whether this API should expose a mechanism for informing developers whether the waveform they attempted to fire played successfully. While this would have uses from a developer ergonomics perspective, it could be used to fingerprint various device capabilities. | The current draft of this proposal does not include a mechanism for informing developers whether the waveform they attempted to fire played successfully.
| Fingerprinting of device capabilities | As called out in the [Open Questions](#open-questions) section, it is still TBD whether this API should expose a mechanism for developers to query whether certain haptic capabilities (intensity, play count, repeat, etc.) are supported by a given pointer/haptic device. While native platforms expose this today ([Android](https://developer.android.com/reference/android/os/Vibrator), [iOS](https://developer.apple.com/documentation/corehaptics/chhapticengine/3081788-capabilitiesforhardware), [Windows](https://docs.microsoft.com/uwp/api/windows.devices.haptics.simplehapticscontroller)), exposing these on the web would reveal bits of entropy that could be used for fingerprinting. | The current draft of this proposal does not include a mechanism for developers to query whether certain haptic capabilities are supported by a given pointer/haptic device.

### Security

The following section enumerates the potential security concerns identified during the development of this proposal and summarizes proposed solutions for each.

| Potential security concern | Description | Proposed solution |
| :- | :- | :- |
| Sites could play continuous haptic waveforms after user interaction, thus spamming users with unwanted physical feedback. | N/A | User agents could mitigate this by ensuring that haptics stop when a user navigates away from any page that triggers them.

## Potential Extensions

During the development of this proposal, several potential extensions that could be explored as part of future proposals were identified:

### Delarative Haptics Model
Some haptics applications are latency-sensitive and may require pre-event configuration. An extension to this model would be to define a declarative syntax either as an `on(...)` method from an initial event or on the `Navigator` object itself. A syntax for defining bounding parameters on the events needs to be defined.

### Multi-Waveform Haptics

One potential extension to this API is the concept of waveform blending or temporary overrides. For example, if a continuous waveform was being played but an author requested a non-continuous waveform such as a click to be played. After the click was played, the author would like the continuous waveform to continue playing until explicitly stopped.

### Haptic Notifications

A key scenario that's not addressed by only exposing the `HapticsDevice` interface on the `PointerEvent` interface is haptic notifications. This term refers broadly to any haptic waveforms a developer wishes to fire outside of user interaction (e.g. to signal to a user that a long-running asynchronous task has successfully completed). While the original plan was to include support for this scenario in this version of the proposal, thinking through potential future scenarios—such as multiple haptic-enabled devices being exposed to a user agent at once—made it clear that more discussion with native platforms would be required before exposing this capability broadly to the web.

A potential path forwards here could be to define a new web API for querying the haptic-enabled devices available to the user agent and leveraging the existing `HapticsDevice` interface to expose the ability to play both predefined and custom waveforms on each of those devices. Underlying platforms could also provide user agents with heuristics (i.e. when was the last time a haptic-enabled controller connected to the device picked up?) that could help determine which haptic-enabled device should receive haptic notifications in a multi-device scenario.

### Unifying Other APIs Around Haptics API

As additional use cases for haptics on the web are identified, it may make sense to standardize the creation and playback of haptic waveforms around a single interface so that developers have a consistent experience whenever they work with haptics on the web. `HapticsDevice` is one potential mechanism for this, but, given the cross-web-community conversations such an effort would require, this was not placed under the scope of this proposal.

## Alternative Solutions

Throughout the design of this proposal, several other approaches were considered:

### `getSupportedWaveforms()` Versus Standardized, Predefined Waveforms

An earlier version of this proposal suggested the creation of a `getSupportedWaveforms()` function which would let developers query for predefined waveforms associated with a specific pointer/haptic device. The thought here was that OEMs may want to implement vendor-specific waveforms that may not be present on other OEM devices. While this sentiment may exist, exposing `getSupportedWaveforms()` would introduce fingerprinting concerns as the unique set of haptic waveforms supported by a certain haptics controller could be used as bits of entropy to uniquely identify a user. While various mechanisms could be implemented to reduce this risk, such as permission prompts or gating the ability to query for supported waveforms behind user interaction, the idea of a standardized set of pre-defined waveforms combined with a mechanism for developers to access vendor-specific waveforms is a more seamless experience for the end user. The `play(...)` function with `HapticsPattern` fills the gap of allowing a developer to implement other waveforms not provided by the pre-defined or standardized waveforms.

## Open Questions

1. Should this API expose a mechanism for informing developers whether the waveform they attempted to fire played successfully?
2. To align with native platforms, should this API expose a mechanism for developers to query whether certain haptic capabilities (intensity, play count, repeat, etc.) are supported by a given pointer/haptic device?
3. What venues already exist for the standardization of haptic constants? Microsoft haptic documentation refers to the [HID Usage Tables](https://usb.org/sites/default/files/hut1_2.pdf) that defines some waveforms as part of USB-IF's [HID related specifications](https://www.usb.org/hid).
4. What happens when `play()` is called while a waveform is currently playing?
