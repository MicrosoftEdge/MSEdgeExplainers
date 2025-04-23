# Event-Driven Gamepad Input API

## Authors:

- [Sneha Agarwal](https://github.com/snehagarwal_microsoft)
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Gabriel Brito](https://github.com/gabrielsanbrito)

## Participate
- [Gamepad API input events #662](https://github.com/w3ctag/design-reviews/issues/662)

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

## User-Facing Problem

The Gamepad API lacks event-driven input handling, forcing applications to rely on continuous polling to query for changes in gamepad input. The continuous polling introduces input latency, as scripts cannot synchronize with new input fast enough. If the script increases the polling frequency to mitigate input latency, it increases CPU usage, impacting efficiency and battery life of the device.

This issue is particularly problematic for cloud gaming platforms that stream games to a browser and rely on real-time gamepad input. For instance, to minimize latency, they often poll as frequently as every 4ms, but this high-frequency polling increases CPU usage and battery drain, especially on laptops and mobile devices. Additionally, because the Gamepad API is only supported on the main UI thread, it can cause thread contention—particularly on low-end devices. In some cases, these constraints force developers to reduce polling frequency, increasing input latency as a trade-off.

A more efficient solution would be an event-driven Gamepad API, similar to mouse and keyboard events, enabling real-time responsiveness without the overhead of constant polling.

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
- The polling loop is driven by `requestAnimationFrame`, typically around 60Hz (matching display refresh rate), which is much lower than the internal OS poll rate (eg., 250Hz). This     mismatch can result in missed input updates, making the 60Hz rate insufficient for latency-critical applications like cloud gaming.

### Goals

Reduce input latency by moving away from constant polling and introducing event-driven input handling. 

### Non-goals

The existing polling mechanism will not be deprecated. We are just proposing an alternative way of handling input events and applications are free to select whichever they prefer.

## Proposed Approach
To address the challenges of input latency, this proposal introduces a new event-driven mechanism: The `rawgamepadinputchange` event. This event fires directly on the [Gamepad](https://w3c.github.io/gamepad/#dom-gamepad) object and delivers real-time updates for each input frame, eliminating the need for high-frequency polling. The `rawgamepadinputchange` event includes detailed information about the state of the gamepad at the moment of change:

- `axesChanged` and `buttonsChanged`: Arrays of indices indicating which axes or button values changed since the last event.

- `buttonsPressed` and `buttonsReleased`: Indices of buttons whose pressed state transitioned (from pressed to released or vice versa).

- `gamepadSnapshot`: A complete snapshot of the gamepad's current state, including all axes, buttons, ID, index, and timestamp.

A new `rawgamepadinputchange` event is dispatched for every gamepad input state change, without delay or coalescing, enabling latency-sensitive applications—such as rhythm games, cloud gaming, or real-time multiplayer scenarios—to respond immediately and accurately to input.

## Example `rawgamepadinputchange` Event
```js
rawgamepadinputchange {
  type: "rawgamepadchange",
  gamepadSnapshot: Gamepad {
    id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)",
    index: 0,
    connected: true,
    mapping: "standard",
    buttons: [
      // index 0 - button A.
      { pressed: true, touched: false, value: 1.0 },
      // index 1 - button B.
      { pressed: false, touched: true, value: 0.0 },
      // index 2 - analog button.
      { pressed: false, touched: false, value: 0.5 },
      ...
    ],
    // [left stick X, left stick Y, right stick X, right stick Y].
    axes: [0.25, -0.5, 0.0, 0.0],
    timestamp: 9123456.789
  },
  // Left stick X and Y moved since last event.
  axesChanged: [0, 1],
  // button index 0 was pressed, button index 2 value changed.
  buttonsValueChanged: [0, 2],
  // button index 0 pressed.
  buttonsPressed: [0],
  // button index 1 was touched.
  buttonsTouched: [1],
}
```
## Proposed IDL
```
[Exposed=Window]
partial interface Gamepad : EventTarget {
  attribute EventHandler onrawgamepadinputchange;
};

```
### `RawGamepadInputChangeEvent` interface IDL, used for `rawgamepadinputchange`.
```
[Exposed=Window]
interface RawGamepadInputChangeEvent : Event {
  constructor(DOMString type, optional RawGamepadInputChangeEventInit eventInitDict = {});

  readonly attribute Gamepad gamepadSnapshot;
  readonly attribute FrozenArray<unsigned long> axesChanged;
  readonly attribute FrozenArray<unsigned long> buttonsValueChanged;
  readonly attribute FrozenArray<unsigned long> buttonsPressed;
  readonly attribute FrozenArray<unsigned long> buttonsTouched;
};
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
    const snapshot = changeEvent.gamepadSnapshot;

    for (const axisIndex of changeEvent.axesChanged) {
      const axisValue = snapshot.axes[axisIndex];
      console.log(`Axis ${axisIndex} on gamepad ${snapshot.index} changed to ${axisValue}`);
    }

    // Analog buttons (ex: triggers).
    for (let buttonIndex of changeEvent.buttonsValueChanged) {
      const buttonValue = changeEvent.gamepadSnapshot.buttons[buttonIndex].value;
      console.log(`button ${buttonIndex} on gamepad ${changeEvent.gamepadSnapshot.index} changed to value ${buttonValue}`);
    }

    // Binary buttons pressed.
    for (let buttonIndex of changeEvent.buttonsPressed) {
      const buttonPressed = changeEvent.gamepadSnapshot.buttons[buttonIndex].pressed;
      console.log(`button ${buttonIndex} on gamepad ${changeEvent.gamepadSnapshot.index} changed to value ${buttonPressed}`);
    }

    // Buttons touched.
    for (let buttonIndex of changeEvent.buttonsTouched) {
      const buttonTouched = changeEvent.gamepadSnapshot.buttons[buttonIndex].touched;
      console.log(`button ${buttonIndex} on gamepad ${changeEvent.gamepadSnapshot.index} changed to value ${buttonTouched}`);
    }
  };
};
```

## Alternatives considered
`gamepadinputchange` event: Similar to `rawgamepadinputchange` event but instead the `getCoalescedEvents()` method is used to return a sequence of events that have been coalesced (combined) together.  While `gamepadinputchange` reduces the number of events by coalescing them, this approach introduces latency and may result in missed intermediate states, making it unsuitable for scenarios requiring immediate responsiveness. This event was proposed in the [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).

### Proposed IDL
```
interface GamepadChangeEvent : Event {
  readonly attribute Gamepad gamepadSnapshot;
  readonly attribute FrozenArray<long> axesChanged;
  readonly attribute FrozenArray<long> buttonsChanged;
  readonly attribute FrozenArray<long> buttonsPressed;
  readonly attribute FrozenArray<long> buttonsReleased;

  sequence<GamepadChangeEvent> getCoalescedEvents();
};

```
### How it works:
To avoid firing too many events in quick succession for performance issues, the browser may choose to delay firing the gamepadchange event. When this happens, the browser adds the event to an internal queue.

Before running animation callbacks (e.g., `requestAnimationFrame`), the event queue is flushed. This means that all the events that have been delayed will be combined into one single event, representing the union of all changes up to that point.

The final, combined gamepadchange event represents the combined state of the gamepad from all the events that were delayed and coalesced. When this event is dispatched, it contains all the changes that occurred during the delayed period.

## Accessibility, Privacy, and Security Considerations
To prevent abuse and fingerprinting, a ["gamepad user gesture"](https://www.w3.org/TR/gamepad/#dfn-gamepad-user-gesture) will be required before `RawGamepadInputChange` events start firing (e.g., pressing a button).

Limit Persistent Tracking (fingerprinting): `rawgamepadinputchange` event will not expose any new state that is not already exposed by polling [Fingerprinting in Web](https://www.w3.org/TR/fingerprinting-guidance/).

## Stakeholder Feedback / Opposition
Firefox: No Signal

Safari: No Signal

Web Developers: Positive

## References & acknowledgements

Thanks to the following contributors and prior work that influenced this proposal:

Firefox’s experimental implementation.

Chromium Prior discussions on improving gamepad input handling.

Many thanks for valuable feedback and advice from:
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Gabriel Brito](https://github.com/gabrielsanbrito)
- [Matt Reynolds](https://github.com/nondebug)

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0)
