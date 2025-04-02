# Gamepad Button and Axis Events

## Authors:

- Sneha Agarwal (https://github.com/snehagarwal_microsoft)
- Steve Becker (https://github.com/SteveBeckerMSFT)

## Participate
- [Issue tracker]
- [Discussion forum]

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to the problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

- This document status: **Active**
- Expected venue:**[W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)**
- Current version: **This document**

## Introduction

The current Gamepad API relies on continuous polling to detect input changes, which can lead to input latency and increased CPU usage. This proposal introduces a more efficient approach that combines event-driven input handling for button presses and releases with frame-based state consolidation, where a single event encapsulates all gamepad state changes that occur within an input frame.

- Event-Driven Input Handling: Immediate events (buttondown, buttonup) fire when discrete inputs like button presses or releases occur.

- Frame-Based Consolidation: gamepadchange event encapsulates all the gamepad state changes that occurred within an input frame, preventing event spam.

This proposal builds upon earlier work by Chromium developers while refining the hybrid model for improved performance.

## User-Facing Problem

The Gamepad API does not natively support event-driven input handling, and applications must rely only on continuous polling for updates. This polling-based approach introduces input latency because scripts cannot sync their polling with the arrival of new input, leading to a delay between input detection and handling. If an application polls at a regular interval, the average added latency is half the polling interval. For example, polling at 60Hz results in a latency of about 8.33 milliseconds. While decreasing the polling interval can reduce this latency, it comes at the cost of increased CPU usage.

### Goals

Reduce input latency by moving away from constant polling and introducing event-driven input handling. 

### Non-goals

The existing polling mechanism will not be deprecated at all. We are just proposing an alternative way of handling input events and applications are free to select whichever they prefer.

## User research

Research and experimental implementations in Firefox suggest that event-driven input handling can significantly improve responsiveness and efficiency. Based on this research, the following challenges with prior implementations have been identified and addressed:

- Inadequate handling of analog button states: Previous implementations only triggered events when the button's pressed state changed, without accounting for changes in the button's numeric value or "touched" state. The new proposal ensures that all relevant state changes, including value adjustments and touch states, are captured, providing more comprehensive input data.

- Potential loss of gamepad state before event listeners execute: The gamepad state at the time the event was created may be lost, as the event includes a reference to the live Gamepad object, which may have updated its state before the event listener is invoked. For instance, if a button is quickly pressed and released, the Gamepad's button state may already indicate that the button is unpressed when the event listener is called. By combining polling with event-driven updates, the new approach mitigates this issue by ensuring the most recent state is captured, and events are triggered only when significant changes occur, reducing the risk of missing relevant input data.

- Unintuitive event targets: Previous event systems fired on the global window object, which was counterintuitive. The windows object is not directly tied to a specific gamepad instance and since multiple gamepads can be connected, handleing events at the gamepad level will be more logical. Most input APIs like KeyboardEvent and MouseEvent dispatch events on the relevant input device not the global window. Gamepad events on window break this consistency. With the new proposal, events will be triggered directly on the Gamepad object that generated the event, providing a clearer and more developer-friendly experience.

- Event spam from per-frame axis updates:When a separate event for each changed axis on each frame of input is fired, if events are received too rapidly then they will queue, introducing input latency. 

## Proposed Approach
To address the challenges of handling gamepad input efficiently while ensuring real-time responsiveness, an approach is proposed to event-driven input handling along with frame-based state consolidation.This proposal would add four new events that fire on the Gamepad object:

1) buttonup: These events fire only when a button is pressed (pressed attribute changes to false).

2) buttondown: These events fire only when a button is released (pressed attribute changes to true).

If multiple input frames have been received since the last time the event listener was invoked, then the event listener is invoked only once with the most recent data received from the device. The getIntermediateEvents method returns the list of event objects representing the intermediate events that were not dispatched. An application only needs to subscribe to the types of events it is interested in handling.

```js
// Example Event Code

// When a button is pressed.
buttondown {
  "type": "buttondown",
  "gamepadIndex": 0,
  "buttonIndex": 2,
  "buttonSnapshot": { "pressed": true, "touched": true, "value": 1 },
  "gamepadTimestamp": 1234.567
}

// When a button is released.
buttonup {
  "type": "buttonup",
  "gamepadIndex": 0,
  "buttonIndex": 2,
  "buttonSnapshot": { "pressed": false, "touched": false, "value": 0 },
  "gamepadTimestamp": 1234.567
}

```
```
// Proposed IDL for GamepadButtonEvent

interface GamepadButtonEvent : Event {
    readonly attribute long gamepadIndex;
    readonly attribute long buttonIndex;
    readonly attribute GamepadButton buttonSnapshot;
    readonly attribute DOMHighResTimeStamp gamepadTimestamp;

    sequence<GamepadButtonEvent> getIntermediateEvents();
};

```
3) gamepadchange event: Will also fire on the Gamepad object, and will include the snapshot of all the changes (buttons and axes) that happened within that input frame. The axesChange and buttonsChanged arrays contain indices of the axes and buttons for which the value attribute changed in the input frame, and the buttonsPressed and buttonsReleased arrays contain indices of buttons for which the pressed attribute changed in the input frame.

The getCoalescedEvents() method is used to return a sequence of events that have been coalesced (combined) together. 

How it woriks: 
To avoid firing too many events in quick succession for performance issues, the browser may choose to delay firing the gamepadchange event. When this happens, the browser adds the event to an internal queue.

Before firing a buttondown or buttonup event (indicating a button has been pressed or released) or before running animation callbacks (e.g., requestAnimationFrame), the event queue is flushed. This means that all the events that have been delayed will be combined into one single event, representing the union of all changes up to that point.

The final, combined gamepadchange event represents the combined state of the gamepad from all the events that were delayed and coalesced. When this event is dispatched, it contains all the changes that occurred during the delayed period.

4) rawgamepadchange event: This event is proposed for applications that need to consume each gamepad change as soon as it occurs. The rawgamepadchange event carries the same information as gamepadchange but is never delayed or coalesced.

```js
// Example gamepadchange Event:
gamepadchange {
  type: "gamepadchange",
  gamepadSnapshot: Gamepad {id: "Example gamepad", index: 0, …},
  axesChanged: [0, 1, 2, 3],
  buttonsChanged: [0],
  buttonsPressed: [0],
  buttonsReleased: [],
}

rawgamepadchange {
    type: "rawgamepadchange",
  gamepadSnapshot: Gamepad {id: "Example gamepad", index: 0, …},
  axesChanged: [0, 1, 2, 3],
  buttonsChanged: [0],
  buttonsPressed: [0],
  buttonsReleased: [],
}
```
```
// Web IDL for the gamepadchange and rawgamepadchange event.

interface GamepadChangeEvent : Event {
  const DOMString type = "gamepadchange";
  readonly attribute Gamepad gamepadSnapshot;
  readonly attribute FrozenArray<long> axesChanged;
  readonly attribute FrozenArray<long> buttonsChanged;
  readonly attribute FrozenArray<long> buttonsPressed;
  readonly attribute FrozenArray<long> buttonsReleased;

  sequence<GamepadChangeEvent> getCoalescedEvents();
};

interface RawGamepadChangeEvent : Event {
  const DOMString type = "rawgamepadchange";
  readonly attribute Gamepad gamepadSnapshot;
  readonly attribute FrozenArray<long> axesChanged;
  readonly attribute FrozenArray<long> buttonsChanged;
  readonly attribute FrozenArray<long> buttonsPressed;
  readonly attribute FrozenArray<long> buttonsReleased;
};

```

### Dependencies on non-stable features

None identified at this stage. The proposal builds upon the existing Gamepad API.

## Alternatives considered

### Alternative 1: axischange and buttonchange events

axischange event: that fires when a member of the Gamepad's axes array changes.
buttonchange event: that fires when a GamepadButton's value attribute changes.

- Event Overload: A gamepad with multiple axes and analog buttons may trigger many events within a single input frame, especially if several axis or button values are modified at the same time.
- Sequential Input Processing: Applications may prefer to process related inputs simultaneously rather than one after the other. For example, both the X and Y axes of a thumbstick are usually handled together.

## Accessibility, Privacy, and Security Considerations
To prevent abuse and fingerprinting:
User Gesture Required:  Gamepad events won’t start firing until a user interacts with the gamepad (e.g., pressing a button). [Gamepad user gesture](https://www.w3.org/TR/gamepad/#dfn-gamepad-user-gesture)

Limit Persistent Tracking (fingerprinting): gamepadchange event will not expose device-specific identifiers. By default, no gamepad state is exposed to the tab even when gamepads are connected. [Fingerprinting in Web](https://www.w3.org/TR/fingerprinting-guidance/)

## Stakeholder Feedback / Opposition
Firefox: [#554 Gamepad API button and axis event](https://github.com/mozilla/standards-positions/issues/554)

WebKit JS: Positive

Safari: No Signal

Web Developers: Positive

## References & acknowledgements

Thanks to the following contributors and prior work that influenced this proposal:

Firefox’s experimental implementation

Chromium Prior discussions on improving gamepad input handling.

Many thanks for valuable feedback and advice from:
- Gabriel Brito
- Matt Reynolds
- Steve Becker

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0)
