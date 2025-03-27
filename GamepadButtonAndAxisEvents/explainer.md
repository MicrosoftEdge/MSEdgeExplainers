# Gamepad button and Axis Events

## Authors:

- Sneha Agarwal (https://github.com/snehagarwal_microsoft)
- Steve Becker (https://github.com/SteveBeckerMSFT)

## Participate
- [Issue tracker]
- [Discussion forum]

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to the problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

- This document status: **Active**
- Expected venue:
- Current version: **This document**

## Introduction

The current Gamepad API requires applications to repeatedly poll for gamepad input updates, which introduces input latency and increases CPU usage. This proposal introduces event-driven gamepad input handling to mitigate these issues. By firing events when inputs are received, applications can process input with minimal latency and reduced CPU overhead. This Proposal builds on the initial proposal done by Chromium devs.

## User-Facing Problem

The Gamepad API does not natively support event-driven input handling. Applications must poll for updates, which:

- Introduces input latency as polling intervals may not align with input arrival times.

- Increases CPU usage, especially at high polling rates.

- Lacks granularity in handling gamepad input changes efficiently.

### Goals

1) Improve gamepad input handling by introducing event-driven mechanisms.

2) Enhance performance by reducing input latency and minimizing CPU usage.

3) Provide flexibility for developers to efficiently manage gamepad input events.

### Non-goals

- Deprecating the existing polling mechanism.

- Does not guarantee that every single input update from high-speed game controllers will trigger an event for every animation frame, since most games don't need that level of detail.

## User research

Research and experimental implementations in Firefox suggest that event-driven input handling improves responsiveness and efficiency. The following issues with prior implementations have been considered:

- Inadequate handling of analog button states. Events fire only on changes to the button pressed state and not provide events for changes to the button's numeric value  or touched state.

- Potential loss of gamepad state before event listeners execute. If a button is quickly pressed and released then the Gamepad's button state may already indicate that the button is unpressed when the listener is invoked.

- Unintuitive event targets that fire on the windows object. Firing on the Gamepad object that generated the event is more intuitive.

- Event spam from per-frame axis updates. If separate events for each changed axis on each frame is received too rapidly, they will queue and introduce latency.

## Proposed Approach

This proposal adopts the hybrid event-driven approaches, balancing fine-grained event-driven updates with consolidated event batching for efficiency. Instead of soley relying on the fine-grained or frame-based events, we can combine them ensuring both granular control and efficient processing based on developer needs.

1) **Granular Events** (for Buttons & Axes) for precise input detection.

- buttondown / buttonup: Fires only when a button is pressed or released.

- axischange: Fires only when an axis moves beyond a small threshold (to prevent spam).

```js
buttondown {
  "type": "buttondown",
  "gamepadIndex": 0,
  "buttonIndex": 2,
  "buttonSnapshot": { "pressed": true, "touched": true, "value": 1 },
  "gamepadTimestamp": 1234.567
}

buttonup {
  "type": "buttonup",
  "gamepadIndex": 0,
  "buttonIndex": 2,
  "buttonSnapshot": { "pressed": false, "touched": false, "value": 0 },
  "gamepadTimestamp": 1234.567
}

axischange {
  "type": "axischange",
  "gamepadIndex": 0,
  "axisIndex": 1,
  "axisSnapshot": -0.65,
  "gamepadTimestamp": 1234.567
}

```

### Proposed IDL for GamepadButtonEvent and GamepadAxisEvent

```js
interface GamepadButtonEvent : Event {
    readonly attribute long gamepadIndex;
    readonly attribute long buttonIndex;
    readonly attribute GamepadButton buttonSnapshot;
    readonly attribute DOMHighResTimeStamp gamepadTimestamp;

    sequence<GamepadButtonEvent> getIntermediateEvents();
};

interface GamepadAxisEvent : Event {
    readonly attribute long gamepadIndex;
    readonly attribute long axisIndex;
    readonly attribute double axisSnapshot;
    readonly attribute DOMHighResTimeStamp gamepadTimestamp;

    sequence<GamepadAxisEvent> getIntermediateEvents();
};
```

2) Frame-Based Consolidated Event: consolidates state updates per frame to reduce event spam.

- gamepadchange: Fires once per frame for all changes that occurred within that frame.

**Handling Analog Button States**

To address the issue of inadequate handling of analog button states, the following improvements are proposed which provides richer data, including analog button states and touch sensitivity:

- Enhanced gamepadchange Event.

- Modify gamepadchange to include button touched and analog value changes, ensuring finer control.

- Consolidate button state changes within a single event structure.

```js

gamepadchange {
  "type": "gamepadchange",
  "gamepadIndex": 0,
  "gamepadTimestamp": 1234.567,
  "changes": {
    "buttons": [
      {
        "buttonIndex": 2,
        "buttonSnapshot": { "pressed": true, "touched": true, "value": 1 }
      }
    ],
    "axes": [
      {
        "axisIndex": 1,
        "axisSnapshot": -0.65
      }
    ]
  }
}

```

**Event Definitions**
- **Fine-Grained Events** - These events only fire when a button is pressed, released, or an axis moves significantly.
- *Button up/down events* fires only once per actual press/release (not every frame). Avoids event spam by not sending redundant data.
- *Axis Movement Events* Threshold-based (fires only if the axis changes by more than (some %) from the last state). Prevents excessive event spam when a joystick is slightly jittering.

- **Frame-based Consolidated Event** -Instead of firing individual events for every small change, a frame-based gamepadchange event collects multiple updates into one.
- Fires once per animation frame (e.g., 60Hz) and includes all changes.
- Optimized for efficiency (batch updates into one event).

### Dependencies on non-stable features

None identified at this stage. The proposal builds upon the existing Gamepad API.

### Solving [goal 1] with this approach

1. **Improve Gamepad Input Handling by Introducing Event-Driven Mechanisms.**
Goal: Shift from polling-based input to event-driven handling for gamepad input, allowing for more responsive and efficient interactions.

Implementation:
Event-driven Design: Instead of continuously polling the gamepad status, we use the gamepadchange event. This event is fired when significant changes in the gamepad input occur, eliminating the need for constant polling and reducing unnecessary checks.

Threshold Logic: By implementing an axis threshold value, we only trigger events when the change exceeds a certain magnitude, ensuring that the application doesn’t react to every tiny change in the gamepad state.

Event Propagation: Ensure that each change (e.g., button press, axis movement) is dispatched with specific event details. For instance, an event might include which button was pressed, whether it was touched, or how far an axis moved.

### Solving [goal 2] with this approach.
Goal: Enhance Performance by Reducing Input Latency and Minimizing CPU Usage.

Implementation:
Decoupling Input Handling from Game Loop: By using the event-driven system (gamepadchange), we decouple the input handling from the main game loop. This ensures that input events are processed independently of frame rendering, reducing any delay between input and output.

Use lightweight data structures when storing or sending gamepad state information (e.g., avoiding unnecessary deep copies or large arrays).

Ensure that gamepad state data is updated and sent only when necessary to avoid excessive data manipulation.

### Solving [goal 3] with this approach.
Goal: Provide Flexibility for Developers to Efficiently Manage Gamepad Input Events.

Implementation:
Customizable Event Handling: Developers can set their own threshold values for button or axis changes, enabling different types of input handling (e.g., more sensitive input for precise games like racing sims, or less sensitivity for more casual games).
Developers can decide how to handle different gamepad states (pressed, released, touched) through event detail properties such as buttonSnapshot or axisSnapshot.

Developer-Defined Event Handling: By using events like gamepadchange, developers can register event listeners to define exactly how gamepad input should be processed, such as applying force feedback when a button is pressed or initiating an action when a specific button combination is detected.

Access to Raw Data: The game developer can access both raw and threshold-processed data (e.g., axis values and button states) to design input controls that suit the needs of the game, such as adjusting for gamepad types, handling different input devices, or implementing specific interactions.

## Alternatives considered

### Alternative 1: Continue Using Polling

Polling remains an option but does not address the latency and CPU issues.

### Alternative 2: Per-Frame Gamepad Snapshot Events

This approach was rejected due to potential event spam and performance concerns.

## Accessibility, Privacy, and Security Considerations
To prevent abuse and fingerprinting:
User Gesture Required:  Gamepad events won’t start firing until a user interacts with the gamepad (e.g., pressing a button). [Gamepad user gesture](https://www.w3.org/TR/gamepad/#dfn-gamepad-user-gesture)

Limit Persistent Tracking (fingerprinting): gamepadchange event will not expose device-specific identifiers. By default, no gamepad state is exposed to the tab even when gamepads are connected. [Fingerprinting in Web](https://www.w3.org/TR/fingerprinting-guidance/)

## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

Firefox: Implemented experimental support for gamepadbuttondown and gamepadbuttonup, but identified issues with event spam and lost state.

Chromium: Evaluating different approaches to event-driven gamepad input handling.[Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0)

Other Browsers: No official statements yet.

## References & acknowledgements

Thanks to the following contributors and prior work that influenced this proposal:

Firefox’s experimental implementation.
Chromium Prior discussions on improving gamepad input handling.

Many thanks for valuable feedback and advice from:
- Gabriel Brito
- Matt Reynolds
- Steve Becker

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.
- [Original Proposal](https://docs.google.com/document/d/1rnQ1gU0iwPXbO7OvKS6KO9gyfpSdSQvKhK9_OkzUuKE/edit?pli=1&tab=t.0)
