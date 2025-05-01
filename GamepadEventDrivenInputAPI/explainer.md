# Event-Driven Gamepad Input API

## Authors:

- [Sneha Agarwal](https://github.com/snehagarwal_microsoft)
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Gabriel Brito](https://github.com/gabrielsanbrito)

## Participate
- [Should fire events instead of using passive model #4](https://github.com/w3c/gamepad/issues/4)
- [Need to spec liveness of Gamepad objects #8](https://github.com/w3c/gamepad/issues/8)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to the problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

- This document status: **Active**
- Expected venue: **[W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)**
- Current version: **This document**

## Introduction

This explainer proposes an event-driven Gamepad Input API for the web, designed to complement the existing polling-based model. By enabling input events to be dispatched in response to changes in gamepad state, this API aims to support low-latency scenarios such as cloud gaming, where timely and reactive input delivery is critical.

This proposal builds on earlier work by Chromium engineers, which explored event-driven gamepad input handling. (Note: The original proposal is documented in a [Google Doc](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).)

## Definitions

### Input Frame: 
Each input frame refers to a single timestamped update of a gamepad’s state, typically derived from a HID (Human Interface Device) report, including all button and axis values at that moment in time.

### RawGamepadInputChangeEvent: 
An event that represents a snapshot of a gamepad’s state at the moment a new input frame is received from the gamepad device. Each event corresponds to a full input report (e.g., a HID report) and contains the complete state of all buttons, axes. This event enables applications to react to input in a timely, event-driven manner, as an alternative to polling via navigator.getGamepads().

## User-Facing Problem

The Gamepad API lacks event-driven input handling, requiring applications to poll for input state changes. This polling model makes it difficult to achieve low-latency responsiveness, as input changes can be missed between polling intervals. When an application polls at a fixed rate, the average added input delay is approximately half the polling interval. For example, polling at 60 Hz (every ~16.67 ms) introduces an average latency of ~8.33 ms, before the application can even begin to process the input.

Developers working on latency-sensitive applications, such as cloud gaming platforms, have reported needing to poll at very high frequencies (e.g., every 4 ms) to detect input as quickly as possible. However, even with aggressive polling, scripts may still struggle to react in real time, especially under heavy UI thread load or on resource-constrained devices.

An event-driven Gamepad API (similar to existing keyboard and mouse event models) would allow applications to respond immediately to input changes as they occur, reducing the reliance on polling and enabling real-time responsiveness for latency-critical use cases.

### Developer code sample of existing poll based API
```JS
function pollGamepadInput() {
  const gamepads = navigator.getGamepads();

  for (const gamepad of gamepads) {
    if (!gamepad) continue;
    // Example: Logging the first axis and button.
    const axisX = gamepad.axes[0];
    const buttonA = gamepad.buttons[0].pressed;

    console.log(`Axis X: ${axisX}, Button A pressed: ${buttonA}`);
  }

  // Continue polling in the next animation frame.
  requestAnimationFrame(pollGamepadInput);
}

// Start polling.
window.addEventListener('gamepadconnected', () => {
  console.log('Gamepad connected!');
  requestAnimationFrame(pollGamepadInput);
}); 
```
#### Key Points:
- navigator.getGamepads() returns a snapshot of all connected gamepads.
- The polling loop is driven by `requestAnimationFrame`, typically around 60Hz (matching display refresh rate), which is much lower than the internal OS poll rate (eg., 250Hz). This mismatch can result in missed input updates, making the 60Hz rate insufficient for latency-critical applications like cloud gaming.

## Goals

Reduce input latency by moving away from constant polling and introducing event-driven input handling. 

## Non-goals

The existing polling mechanism will not be deprecated. We are just proposing an alternative way of handling input events and applications are free to select whichever they prefer.

## Proposed Approach
To address the challenges of input latency, this proposal introduces a new event-driven mechanism: The `rawgamepadinputchange` event. This event fires directly on the [Gamepad](https://w3c.github.io/gamepad/#dom-gamepad) object and delivers real-time updates for each input frame, eliminating the need for high-frequency polling. The `rawgamepadinputchange` event includes detailed information about the state of the gamepad at the moment of change:

- The rawgamepadinputchange event is dispatched on the Gamepad object that experienced the input change. This Gamepad instance is accessible via the event's [`event.target`](https://developer.mozilla.org/en-US/docs/Web/API/Event/target) property and represents a live object that reflects the current state of the device. The event also provides an `event.gamepadSnapshot` property which captures the input state at the exact time the event was generated, so that applications can safely reason about what triggered the event, even if the live object (`event.target`) has since changed.

- `axesChanged` and `buttonsChanged`: Arrays of indices indicating which axes or button values changed since the last event.

- `buttonsPressed` and `buttonsReleased`: Indices of buttons whose pressed state transitioned (from pressed to released or vice versa).

- `gamepadSnapshot`: A frozen (read-only) snapshot of the gamepad’s state at the moment the input was received. It includes all axes, buttons, ID, index, and timestamp, and does not update after the event is dispatched.

A new `rawgamepadinputchange` event is dispatched for every gamepad input state change, without delay or coalescing, enabling latency-sensitive applications such as: rhythm games, cloud gaming, or real-time multiplayer scenarios, to respond immediately and accurately to input.

## Example `rawgamepadinputchange` Event
```js
rawgamepadinputchange {
  type: "rawgamepadchange",

  // Snapshot of the gamepad's state at the moment the event was generated.
  gamepadSnapshot: Gamepad {
    id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)",
    index: 0,
    connected: true,
    mapping: "standard",
    buttons: [
      // Index 0 - button A pressed.
      { pressed: true, value: 1.0 },
      // Index 1 - button B released.
      { pressed: false, value: 0.0 },
      // Index 2 - analog button (e.g., triggers).
      { pressed: false, value: 0.5 },
      ...
    ],
    // [left stick X, left stick Y, right stick X, right stick Y].
    axes: [0.25, -0.5, 0.0, 0.0],
    timestamp: 9123456.789
  },

  // Left stick X and Y moved since last event.
  axesChanged: [0, 1],
  // Button index 0 was pressed and button index 1 released, button index 2 value changed.
  buttonsValueChanged: [0, 1, 2],
  // Button index 0 pressed.
  buttonsPressed: [0],
  // Button index 0 released.
  buttonsReleased: [1]
}
```
##  Developer code sample

```JS
// Listen for when a gamepad is connected.
window.ongamepadconnected = (connectEvent) => {

  const connectedGamepads = navigator.getGamepads();

  const gamepad = connectedGamepads[connectEvent.gamepad.index];

  console.log(`Gamepad connected: ${gamepad.id} (index: ${gamepad.index})`);

  // Listen for input changes on this gamepad.
  gamepad.onrawgamepadinputchange = (changeEvent) => {
    // Snapshot of the gamepad state at the time of the event.
    const snapshot = changeEvent.gamepadSnapshot;
    // Live gamepad object that continues to update.
    const liveGamepad = changeEvent.target;

    for (const axisIndex of changeEvent.axesChanged) {
      const snapshotAxisValue = snapshot.axes[axisIndex];
      const liveAxisValue = liveGamepad.axes[axisIndex];
      console.log(`Axis ${axisIndex} on gamepad ${snapshot.index} changed to ${snapshotAxisValue} (live: ${liveAxisValue})`);
    }

    // Analog button changes (ex: triggers).
    for (const buttonIndex of changeEvent.buttonsValueChanged) {
      const snapshotButtonValueChanged = snapshot.buttons[buttonIndex].value;
      const liveButtonsValueChanged = liveGamepad.buttons[buttonIndex].value;
      console.log(`button ${buttonIndex} on gamepad ${snapshot.index} changed to value ${snapshotButtonValueChanged} (live: ${liveButtonValueChanged})`);
    }

    // Binary buttons that were pressed.
    for (const buttonIndex of changeEvent.buttonsPressed) {
      const snapshotButtonPressedValue = snapshot.buttons[buttonIndex].pressed;
      const liveButtonPressedValue = liveGamepad.buttons[buttonIndex].pressed;
      console.log(`button ${buttonIndex} on gamepad ${snapshot.index} changed to value ${snapshotButtonPressedValue} (live: ${liveButtonPressedValue}`);
    }

    // Binary buttons that were released.
    for (const buttonIndex of changeEvent.buttonsReleased) {
      const snapshotButtonReleasedValue = snapshot.buttons[buttonIndex].released;
      const liveButtonReleasedValue = liveGamepad.buttons[buttonIndex].released;
      console.log(`button ${buttonIndex} on gamepad ${snapshot.index} changed to value ${snapshotButtonReleasedValue} (live: ${liveButtonReleasedValue}`);
    }
  };
};
```

## Alternatives considered
`gamepadinputchange` event: Similar to `rawgamepadinputchange` event but instead the `getCoalescedEvents()` method is used to return a sequence of events that have been coalesced (combined) together.  While `gamepadinputchange` reduces the number of events by coalescing them, this approach introduces latency and may result in missed intermediate states, making it unsuitable for scenarios requiring immediate responsiveness. This event was proposed in the [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).

## Accessibility, Privacy, and Security Considerations
To prevent abuse and fingerprinting, a ["gamepad user gesture"](https://www.w3.org/TR/gamepad/#dfn-gamepad-user-gesture) will be required before `RawGamepadInputChange` events start firing (e.g., pressing a button).

Limit Persistent Tracking (fingerprinting): `rawgamepadinputchange` event will not expose any new state that is not already exposed by polling [Fingerprinting in Web](https://www.w3.org/TR/fingerprinting-guidance/).

## Stakeholder Feedback / Opposition
Firefox: No Signal

Safari: No Signal

Web Developers: Positive
- [Should fire events instead of using passive model](https://github.com/w3c/gamepad/issues/4),
- [Using gamepad-api via events, rather than polling](https://stackoverflow.com/questions/72294832/using-gamepad-api-via-events-rather-than-polling)
- [How to create a generic "joystick/gamepad event" in Javascript?](https://stackoverflow.com/questions/70788613/how-to-create-a-generic-joystick-gamepad-event-in-javascript)
- Libraries created by game developers like [gamecontroller.js](https://github.com/alvaromontoro/gamecontroller.js) and [Gamepad-Controller](https://github.com/blovato/Gamepad-Controller)

## References & acknowledgements

Thanks to the following contributors and prior work that influenced this proposal:

Firefox’s experimental implementation: The [`GamepadAxisMoveEvent`](https://searchfox.org/mozilla-central/source/dom/webidl/GamepadAxisMoveEvent.webidl#9) and [`GamepadButtonEvent`](https://searchfox.org/mozilla-central/source/dom/webidl/GamepadButtonEvent.webidl) WebIDL files in Firefox defines an interface for axis movement and button press and release events, which were part of an experimental prototype implementation in Firefox for handling event-driven gamepad input.

Chromium Prior discussions on improving gamepad input handling - [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).

Many thanks for valuable feedback and advice from:
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Gabriel Brito](https://github.com/gabrielsanbrito)
- [Matt Reynolds](https://github.com/nondebug)

## Appendix: Proposed WebIDL
```
[Exposed=Window]
partial interface Gamepad : EventTarget {
  attribute EventHandler onrawgamepadinputchange;
};

```
### `RawGamepadInputChangeEvent` interface IDL, used for `rawgamepadinputchange`.
```
// Inherits `target` from Event, which refers to the live Gamepad.
[Exposed=Window]
interface RawGamepadInputChangeEvent : Event {
  constructor(DOMString type, optional RawGamepadInputChangeEventInit eventInitDict = {});

  // Immutable snapshot of gamepad state at time of event dispatch.
  readonly attribute Gamepad gamepadSnapshot;

  readonly attribute FrozenArray<unsigned long> axesChanged;
  readonly attribute FrozenArray<unsigned long> buttonsValueChanged;
  readonly attribute FrozenArray<unsigned long> buttonsPressed;
  readonly attribute FrozenArray<unsigned long> buttonsReleased;
};

dictionary RawGamepadInputChangeEventInit : EventInit {
  required Gamepad gamepadSnapshot;
  FrozenArray<unsigned long> axesChanged = [];
  FrozenArray<unsigned long> buttonsValueChanged = [];
  FrozenArray<unsigned long> buttonsPressed = [];
  FrozenArray<unsigned long> buttonsReleased = [];
};
```