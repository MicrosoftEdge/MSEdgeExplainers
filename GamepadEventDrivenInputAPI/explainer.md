# Gamepad Event-Driven Input API

## Authors:

- [Sneha Agarwal](https://github.com/snehagarwal_microsoft)
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Gabriel Brito](https://github.com/gabrielsanbrito)

## Participate
- [Should fire events instead of using passive model #4](https://github.com/w3c/gamepad/issues/4)

## Status of this document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to the problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

- This document status: **Active**
- Expected venue: **[W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)**
- Current version: **This document**

## Table of contents

1. [Introduction](#introduction)
2. [Definitions](#definitions)
3. [User-facing problem](#user-facing-problem)
4. [Goals](#goals)
5. [Non-goals](#non-goals)
6. [Proposed approach](#proposed-approach)
7. [Examples](#examples)
8. [Alternatives considered](#alternatives-considered)
9. [Accessibility, privacy, and security considerations](#accessibility-privacy-and-security-considerations)
10. [Stakeholder feedback / opposition](#stakeholder-feedback--opposition)
11. [References & acknowledgements](#references--acknowledgements)
12. [Appendix: proposed WebIDL](#appendix-proposed-webidl)

## Introduction

This explainer proposes an event-driven Gamepad Input API for the web, designed to complement the existing polling-based model. By enabling input events to be dispatched in response to changes in gamepad state, this API aims to support low-latency scenarios such as cloud gaming, where timely and reactive input delivery is critical.

This proposal builds on earlier work by Chromium engineers, which explored event-driven gamepad input handling. (Note: The original proposal is documented in a [Google Doc](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).)

## Definitions

### Input frame: 
Each input frame refers to a single timestamped update of a gamepad’s state, typically derived from a HID (Human Interface Device) report, including all button and axis values at that moment in time.

### The `gamepadrawinputchanged` event: 
An event that represents a snapshot of a gamepad’s state at the moment a new input frame is received from the gamepad device. Each event corresponds to a full input report (e.g., a HID report) and contains the complete state of all buttons and axes. This event enables applications to react to input in a timely, event-driven manner, as an alternative to polling via `navigator.getGamepads()`.

## User-facing problem

The Gamepad API lacks event-driven input handling, requiring applications to poll for input state changes. This polling model makes it difficult to achieve low-latency responsiveness, as input changes can be missed between polling intervals. When an application polls at a fixed rate, the average added input delay is approximately half the polling interval. For example, polling at 60 Hz (every ~16.67 ms) introduces an average latency of ~8.33 ms, before the application can even begin to process the input.

Developers working on latency-sensitive applications, such as cloud gaming platforms, have reported needing to poll at very high frequencies (e.g., every 4 ms) to detect input as quickly as possible. However, even with aggressive polling, scripts may still struggle to react in real time, especially under heavy UI thread load or on resource-constrained devices.

An event-driven Gamepad API (similar to existing keyboard and mouse event models) would allow applications to respond immediately to input changes as they occur, reducing the reliance on polling and enabling real-time responsiveness for latency-critical use cases.

### Developer code sample of existing poll-based API
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
#### Key points:
- `navigator.getGamepads()` returns a snapshot of all connected gamepads.
- The polling loop is driven by `requestAnimationFrame()`, typically around 60Hz (matching display refresh rate), which is much lower than the internal OS poll rate (eg., 250Hz). This mismatch can result in missed input updates, making the 60Hz rate insufficient for latency-critical applications like cloud gaming.

## Goals

Reduce input latency by moving away from constant polling and introducing event-driven input handling.

## Non-goals

- The existing polling mechanism will not be deprecated. We are just proposing an alternative way of handling input events and applications are free to select whichever they prefer.

- Additionally, this proposal does not currently address input alignment or event coalescing. Prior work on high-frequency input APIs, particularly the Pointer Events API has demonstrated the importance of these mechanisms for latency-sensitive use cases. For instance, the [`pointerrawupdate`](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerrawupdate_event) event was introduced to provide low-latency input delivery, and it is complemented by the [`getCoalescedEvents()`](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) method, which exposes intermediate pointer updates that occur between animation frames. Together, these features help align input processing with rendering, improving visual smoothness and reducing jitter.

In contrast, this proposal for `gamepadrawinputchanged` intentionally omits alignment and coalescing in its initial design. At this stage, we've intentionally scoped this proposal to deliver immediate, per-HID-report events without adding alignment or coalescing mechanisms. This is both to reduce complexity up front and to validate the value of the raw event model for latency-sensitive use cases.

That said, we recognize that high-frequency gamepad inputs could eventually require similar treatment to pointer events. This proposal is intended as a foundational step, and we explicitly leave room for future evolution. For further background, we recommend reviewing [prior discussions on event-driven gamepad APIs](https://github.com/w3c/gamepad/issues/4#issuecomment-894460031).

## Proposed approach

To address the challenges of input latency, this proposal introduces a new event-driven mechanism: the `gamepadrawinputchanged` event. This event fires directly on the window global object. The `gamepadrawinputchanged` event includes detailed information about the state of the gamepad at the moment of change.

### Event properties
- `gamepad`: A read-only [Gamepad](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad) object that is a snapshot of the gamepad’s state at the moment the input was received. It includes all axes, buttons, ID, index, and timestamp.

- `axesChanged` and `buttonsValueChanged`: Arrays of indices indicating which axes or button values changed since the last event.

- `buttonsPressed` and `buttonsReleased`: Indices of buttons whose pressed state transitioned (from pressed to released or vice versa).

- `touchesChanged` : An array of indices indicating which touch-sensitive controls changed since the last input frame. 
  - Some modern controllers include capacitive or touch-sensitive surfaces (e.g., DualShock 4 touchpad, Steam Controller trackpads). Each index in `touchesChanged` corresponds to an entry in the `gamepad.touches` array and reports which touch points or surfaces changed state (position, or touch presence).

These properties, `axesChanged`, `buttonsPressed`, `buttonsReleased`, `buttonsValueChanged` and ` touchesChanged` properties are arrays of indices and follow the same identification model as the [Gamepad.axes](https://w3c.github.io/gamepad/#dom-gamepad-axes) and [Gamepad.buttons](https://w3c.github.io/gamepad/#dom-gamepad-buttons) arrays.

### Event timing

A new `gamepadrawinputchanged` event is dispatched for every gamepad input state change, without delay or coalescing. This enables latency-sensitive applications, such as rhythm games, cloud gaming, or real-time multiplayer scenarios, to respond immediately and accurately to input

## Examples

### `gamepadrawinputchanged` event data view

The example below shows the structure of a `gamepadrawinputchanged` event, including the gamepad state snapshot and the indices of changed inputs.

```js
gamepadrawinputchangedEventObject {
  type: "gamepadrawinputchanged",

  // Snapshot of the gamepad's state at the moment the event was generated.
  gamepad: Gamepad {
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
    touches: [
      // Index 0 — finger touching at position (0.42, 0.33).
      {
        touchId: 0,
        surfaceId: 0,
        position: Float32Array [0.42, 0.33],
        surfaceDimensions: Uint32Array [1920, 1080]
      },
      ...
    ],
    timestamp: 9123456.789
  },

  // Left stick X and Y moved since last event.
  axesChanged: [0, 1],
  // Indices of buttons whose values changed.
  buttonsValueChanged: [0, 1, 2],
  // Indices of buttons newly pressed.
  buttonsPressed: [0],
  // Indices of buttons newly released.
  buttonsReleased: [1],
  // Indices of touch points whose state changed.
  touchesChanged: [0]
}
```

###  Code sample

This example demonstrates how a web application can listen for `gamepadrawinputchanged` events and react to changes in gamepad input state.

```JS
function onRawInputChanged(event) {
  const snapshot = event.gamepad;
  console.log(`Received gamepadrawinputchanged event for gamepad ${snapshot.index} (${snapshot.id})`);

  for (const axisIndex of event.axesChanged) {
    const axisValue = snapshot.axes[axisIndex];
    console.log(`Axis ${axisIndex} changed to value ${axisValue}`);
  }

  for (const buttonIndex of event.buttonsValueChanged) {
    const buttonValue = snapshot.buttons[buttonIndex].value;
    console.log(`Button ${buttonIndex} value changed to ${buttonValue}`);
  }

  for (const buttonIndex of event.buttonsPressed) {
    console.log(`Button ${buttonIndex} was pressed`);
  }

  for (const buttonIndex of event.buttonsReleased) {
    console.log(`Button ${buttonIndex} was released`);
  }

  for (const touchIndex of event.touchesChanged) {
    const touch = snapshot.touches[touchIndex];
    console.log(`Touch ${touchIndex} changed: id=${touch.touchId}, position=[${touch.position[0]}, ${touch.position[1]}]`);
  }
}

window.addEventListener('gamepadrawinputchanged', onRawInputChanged);
```

## Alternatives considered
`gamepadinputchange` event: Similar to `gamepadrawinputchanged` event but instead the `getCoalescedEvents()` method is used to return a sequence of events that have been coalesced (combined) together.  While `gamepadinputchange` reduces the number of events by coalescing them, this approach introduces latency and may result in missed intermediate states, making it unsuitable for scenarios requiring immediate responsiveness. This event was proposed in the [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).

## Accessibility, privacy, and security considerations
To prevent abuse and [fingerprinting](https://www.w3.org/TR/fingerprinting-guidance/), a ["gamepad user gesture"](https://www.w3.org/TR/gamepad/#dfn-gamepad-user-gesture) will be required before `gamepadrawinputchanged` events start firing (e.g., pressing a button). Moreover, `gamepadrawinputchanged` event will not expose any new state that is not already exposed by polling.

## Stakeholder feedback / opposition
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

Chromium prior discussions on improving gamepad input handling - [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0).

Many thanks for valuable feedback and advice from:
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Gabriel Brito](https://github.com/gabrielsanbrito)
- [Matt Reynolds](https://github.com/nondebug)

## Appendix: proposed WebIDL
### `GamepadRawInputChangeEvent` interface IDL, used for `gamepadrawinputchanged`.
```JS
[
    Exposed=Window,
] interface GamepadRawInputChangeEvent : GamepadEvent {
    constructor(DOMString type, optional GamepadRawInputChangeEventInit eventInitDict = {});
    readonly attribute FrozenArray<long> axesChanged;
    readonly attribute FrozenArray<long> buttonsValueChanged;
    readonly attribute FrozenArray<long> buttonsPressed;
    readonly attribute FrozenArray<long> buttonsReleased;
    readonly attribute FrozenArray<long> touchesChanged;
};

dictionary GamepadRawInputChangeEventInit : GamepadEventInit {
  FrozenArray<long> axesChanged;
  FrozenArray<long> buttonsValueChanged;
  FrozenArray<long> buttonsPressed;
  FrozenArray<long> buttonsReleased;
  FrozenArray<long> touchesChanged;
};
```