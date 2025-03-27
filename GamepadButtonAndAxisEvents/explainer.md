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

The current Gamepad API relies on constant polling to detect input changes, which can introduce input latency and increase CPU usage. This proposal adopts a hybrid approach that combines event-driven input handling with frame-based state consolidation, reducing unnecessary polling while maintaining responsiveness.

- Event-Driven Input Handling: Immediate events (buttondown, buttonup) fire when discrete inputs like button presses or releases occur.

- Frame-Based Consolidation: A gamepadchange event aggregates all input changes per frame, preventing event spam and improving efficiency.

- Threshold-Based Polling for Analog Inputs: Analog inputs, such as joystick movements, are polled at a reduced frequency and only trigger updates when they exceed a defined threshold, ensuring meaningful changes are captured.

By integrating these techniques, this approach minimizes CPU overhead while ensuring low-latency input processing, providing developers with a more efficient and flexible way to handle gamepad interactions. This proposal builds upon earlier work by Chromium developers while refining the hybrid model for improved performance.

## User-Facing Problem

The Gamepad API does not natively support event-driven input handling, and applications must rely on continuous polling for updates, which:

- Introduces input latency, as polling intervals may not align with the precise timing of input changes.

- Increases CPU usage, particularly when polling at high frequencies.

- Lacks efficiency in handling gamepad input changes, as it does not account for meaningful input variations, leading to unnecessary events being triggered.

### Goals

1) **Enhance gamepad input handling** by transitioning from continuous polling to event-driven mechanisms, improving responsiveness.

2) **Optimize performance** by reducing input latency and minimizing CPU overhead through a hybrid approach of event handling and threshold-based polling.

3) **Provide flexibility for developers** by allowing efficient management of gamepad input events, enabling granular control over when and how input changes are processed.

### Non-goals

Deprecating the existing polling mechanism: The polling mechanism will not be fully deprecated, as it is still necessary for detecting small input changes that events alone may not address.

## User research

Research and experimental implementations in Firefox suggest that event-driven input handling can significantly improve responsiveness and efficiency. Based on this research, the following challenges with prior implementations have been identified and addressed:

- Inadequate handling of analog button states: Previous implementations only triggered events when the button's pressed state changed, without accounting for changes in the button's numeric value or "touched" state. This hybrid approach ensures that both meaningful value changes and touch states are captured.

- Potential loss of gamepad state before event listeners execute: In high-speed input scenarios, if a button is quickly pressed and released, the Gamepad’s button state may indicate that the button is already unpressed by the time the listener is invoked. By combining polling with event-driven updates, this issue is mitigated by ensuring the most recent state is captured and events are triggered only when there are significant changes.

- Unintuitive event targets: Previous event systems fired on the global window object, which was counterintuitive. The windows object is not directly tied to a specific gamepad instance and since multiple gamepads can be connected, handleing events at the gamepad level will be more logical. Most input APIs like KeyboardEvent and MouseEvent dispatch events on the relevant input device not the global window. Gamepad events on window break this consistency.
With the new proposal, events will be triggered directly on the Gamepad object that generated the event, providing a clearer and more developer-friendly experience.

- Event spam from per-frame axis updates: When multiple axes update in a single frame, firing an event for each change could lead to excessive event firing, creating unnecessary CPU load and potential latency. By introducing thresholds for axis and button changes, this approach reduces unnecessary events, ensuring that only significant input changes are processed, thus optimizing performance.

## Proposed Approach
To address the challenges of handling gamepad input efficiently while ensuring real-time responsiveness, a hybrid approach is proposed to event-driven input handling along with frame-based state consolidation. This approach combines event-based triggers with thresholding and controlled polling for axes and analog inputs, offering a balance between responsiveness and minimizing CPU usage.

**Key Considerations**
Event-Driven Mechanisms: Gamepad inputs are inherently event-based (e.g., button presses and axis movements). We'll leverage events to notify game developers only when significant changes occur, such as a button being pressed, released, or an axis moving beyond a threshold. This reduces unnecessary event firing and improves performance.

**Polling with Thresholding:** While events are suitable for discrete actions like button presses and releases, analog inputs (such as joystick movements) require continuous monitoring. We can use polling for these inputs in combination with a threshold. This ensures that only meaningful changes trigger events, and small, irrelevant fluctuations are ignored. This thresholding prevents event spam while still allowing for real-time responsiveness.

**Event Types and Behavior**:
buttondown / buttonup: These events fire only when a button is pressed or released. Events are triggered for discrete actions, reducing CPU usage and avoiding unnecessary checks.

axischange: Fires when an axis value moves beyond a defined threshold (e.g., when a joystick moves a significant amount or the trigger is pressed beyond a certain value). This helps to minimize event spam by ensuring only notable changes trigger events, reducing overhead while maintaining responsiveness.

**How This Works with Thresholding:**
Button Events:
- For buttondown and buttonup events, the browser will still trigger these events based on button state changes (e.g., pressed or released).
- These events can happen as soon as the state changes, without needing to wait for polling, because buttons are discrete (either pressed or not).

Axis Changes:
- The axischange event will fire only when the axis value exceeds a predefined threshold (like 0.2 or -0.2, customizable), which helps to prevent unnecessary axis events if there’s just minor, non-meaningful input fluctuation.
- Polling occurs at a lower frequency to reduce CPU usage, but when an axis value changes meaningfully, it triggers the event.

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

// When an axis changes and crosses a threshold.
axischange {
  "type": "axischange",
  "gamepadIndex": 0,
  "axisIndex": 1,
  "axisSnapshot": -0.65,
  "gamepadTimestamp": 1234.567
}

```

### Proposed IDL for GamepadButtonEvent and GamepadAxisEvent

```
interface GamepadButtonEvent : Event {
    readonly attribute long gamepadIndex;
    readonly attribute long buttonIndex;
    readonly attribute GamepadButton buttonSnapshot;
    readonly attribute DOMHighResTimeStamp gamepadTimestamp;
};

interface GamepadAxisEvent : Event {
    readonly attribute long gamepadIndex;
    readonly attribute long axisIndex;
    readonly attribute double axisSnapshot;
    readonly attribute DOMHighResTimeStamp gamepadTimestamp;
};
```

2) **Frame-Based Consolidated Event**: 

This approach consolidates all state changes that occur within a single frame into one event, reducing the number of events fired and preventing event spam. This is especially important for analog inputs and buttons that may change frequently within a single frame.

- gamepadchange event: will fire once per frame, and will include all the changes (buttons and axes) that happened within that frame. This ensures that input is captured with minimal overhead while maintaining responsiveness.

**Handling Analog Button States**

To address issues such as inadequate handling of analog button states (e.g., button pressure or touch sensitivity), this proposal introduces improvements in the gamepadchange event, providing richer data and more precise control for developers.

- Enhanced gamepadchange Event: The gamepadchange event will include not just basic button states (pressed/released), but also information about whether a button was touched and its analog value (pressure). This ensures that analog buttons are represented with more granular data, providing developers with full control over button behavior, including pressure sensitivity and touch detection.

- Consolidate button state changes within a single event structure: Instead of firing a separate event for each button state change (pressed/released, touched, value), all these changes will be consolidated into one gamepadchange event per frame. This prevents event spam and improves the efficiency of event handling.

- This will also reduce CPU overhead, as the browser will fire fewer events overall, and game developers will get all necessary button information in a single event.

```js
// Example gamepadchange Event:
gamepadchange {
  type: "gamepadchange",
  gamepadIndex: 0,
  // Timestamp for the event.
  gamepadTimestamp: 1234.567,  
  changes: {
    buttons: [
      {
        // The index of the button that has changed.
        buttonIndex: 2,  
        buttonSnapshot: {
          // Whether the button is pressed.
          pressed: true, 
          // Whether the button is touched.
          touched: true,
          // The analog value of the button (e.g., pressure).
          value: 0.85
        }
      }
    ],
    axes: [
      {
        // Index of the axis that changed.
        axisIndex: 1,
        // The new value of the axis after change.
        axisSnapshot: 0.5
      }
    ]
  }
}

```

```
// Web IDL for the gamepadchange event


in progress
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

### Solving goal 1 with this approach

Goal: Improve Gamepad Input Handling by Introducing Event-Driven Mechanisms.

Event-based Mechanisms: For discrete inputs such as button presses, we will rely on event-driven updates (e.g., buttondown, buttonup). These events will be triggered based on changes to button states (pressed, released, etc.).

Event Propagation: Ensure that each change (e.g., button press, axis movement) is dispatched with specific event details. For instance, an event might include which button was pressed, whether it was touched, or how far an axis moved.

Threshold-based Polling for Analog Inputs: For continuous inputs such as joystick movements, we will use polling with thresholds. If the movement exceeds a certain threshold (e.g., 0.2), the event will fire to notify the application. This ensures that only meaningful changes in input are captured while reducing the need for continuous polling.

Implementation Details
Polling at Intervals: Instead of polling the gamepad's state every frame, poll at a reduced frequency (e.g., every 50ms). This minimizes CPU usage while maintaining real-time responsiveness.

Event Handling with Thresholding:
We will only fire events for significant changes in button or axis states. For analog inputs, this will involve checking if the change exceeds a threshold value before triggering an event. For buttons, this includes checking if the pressed or value exceeds a certain threshold. For axes, this means checking whether the movement exceeds a predefined value.

```js
// Sample Code for Event Handling with Thresholding
```

### Solving goal 2 with this approach.

Goal: Enhance Performance by Reducing Input Latency and Minimizing CPU Usage.
Thresholding for Analog Inputs: To optimize performance and minimize CPU usage, thresholding will be used to ensure that only significant input changes are processed. This helps avoid unnecessary polling of small, insignificant movements or fluctuations.

Threshold Example: A threshold of 0.2 will be applied to both buttons and axes, which means that an event or update is only triggered if the value changes by more than 0.2.

Polling Intervals: Polling will occur at controlled intervals (e.g., every 50ms) instead of continuously on every frame. This reduces CPU overhead by avoiding constant polling when there is no meaningful change.

### Solving goal 3 with this approach.
Goal: Provide Flexibility for Developers to Efficiently Manage Gamepad Input Events.

Customizable Event Handling: Developers can set their own threshold values for button or axis changes, enabling different types of input handling (e.g., more sensitive input for precise games like racing sims, or less sensitivity for more casual games).
Developers can decide how to handle different gamepad states (pressed, released, touched) through event detail properties such as buttonSnapshot or axisSnapshot.

Developer-Defined Event Handling: By using events like gamepadchange, developers can register event listeners to define exactly how gamepad input should be processed, such as applying force feedback when a button is pressed or initiating an action when a specific button combination is detected.

Access to Raw Data: The game developer can access both raw and threshold-processed data (e.g., axis values and button states) to design input controls that suit the needs of the game, such as adjusting for gamepad types, handling different input devices, or implementing specific interactions.

## Alternatives considered

### Alternative 1: Continue Using Polling

Polling remains an option but does not address the latency and CPU issues.

### Alternative 2: Per-Frame Gamepad Snapshot Events

This approach by it self was rejected due to potential event spam and performance concerns.

### Alternative 3: getIntermediateEvents
Captures fine-grained input changes (such as axis movements or button states) that don't fit into the normal event cycle. Rather than having the browser fire events for every intermediate state, the game developer manually checks for significant changes and fires events when needed. The threshold mechanism replaces the need for getIntermediateEvents in this proposal.

## Accessibility, Privacy, and Security Considerations
To prevent abuse and fingerprinting:
User Gesture Required:  Gamepad events won’t start firing until a user interacts with the gamepad (e.g., pressing a button). [Gamepad user gesture](https://www.w3.org/TR/gamepad/#dfn-gamepad-user-gesture)

Limit Persistent Tracking (fingerprinting): gamepadchange event will not expose device-specific identifiers. By default, no gamepad state is exposed to the tab even when gamepads are connected. [Fingerprinting in Web](https://www.w3.org/TR/fingerprinting-guidance/)

## Stakeholder Feedback / Opposition
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
