# Ambient Pen Events API Explainer

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/) 
* Current version: this document

## Motivation:
Some digital pens and pencils can not only provide input through their interaction with a digitizer but can also pair with a device so that additional signals can be received when a button is pressed. In some cases, the signal may relate to the pen or pencil but come from another source, e.g. a charger may send a signal that the pen or pencil has been docked or undocked.  Native applications can use these signals to customize their behavior, but no corresponding events are available to web applications.

Native applications use these signals in a variety of ways; here are some inspirational use cases:

 * Clicking the button on a Surface Pro pen can advance to the next slide in a slide show
 * Double tapping the side of an Apple Pencil can switch drawing tools
 * Removing a pen from the dock on a Surface Hub prompts the user to enter the whiteboard app

Providing these new pen event primitives would enable web applications to achieve parity with native applications.

## Proposed Events

|Event Type | Interface | Target | Bubbles | Cancelable | Composed | Default Action
|--         |--         |--      |--       |--          |--        |--              
| penbuttonclick | PenButtonEvent | PenEventTarget | No | No | No | None
| penbuttondblclick | PenButtonEvent | PenEventTarget | No | No | No | None
| penbuttonpressandhold | PenButtonEvent | PenEventTarget | No | No | No | None
| pendockchange | PenDockChangeEvent | PenEventTarget | No | No | No | None

### PenEventTarget Webidl
```  
dictionary PenEventDescriptor {
    required DOMString type;
    sequence<long> buttons;
}

[Exposed=Window]
interface PenEventTarget : EventTarget {
    constructor(sequence<PenEventDescriptor> descriptors);

    Promise<void> connect();
    void disconnect();
};
```
The `PenEventTarget` is the `EventTarget` for `PenButtonEvent`s and `PenDockChangeEvent`s.  

The `PenEventTarget` constructor accepts a sequence of `PenEventDescriptor`s which indicate the events to be handled.

The `connect` method will perform any necessary registration such that the events can be delivered to the web app.  `connect` returns a `Promise` which resolves if any such registration is successful and rejects otherwise.

The `disconnect` method allows the author to stop handling the events.

Note that any connected `PenEventTarget` will receive pen events only while its relevant window is active.

### PenButtonEvent Webidl
```  
dictionary PenButtonEventInit {
    readonly attribute long pointerId = 0;
    readonly attribute long button = 0;
};

[Exposed=Window]
interface PenButtonEvent : UIEvent {
    constructor(DOMString type, optional PenButtonEventInit eventInitDict);

    readonly attribute long pointerId;
    readonly attribute long button;
};
 ```
### penbuttonclick, penbuttondblclick, penbuttonpressandhold Events
A PenButtonEvent named for the gesture the user has performed with the pen button must be dispatched to the set of connected `PenEventTarget`s associated with the active window.  Corresponding down/up events are not proposed because of hardware limitations, e.g. the Microsoft Surface Pen produces a signal describing the gesture, not the state transitions of the actual button.  

The `pointerId` property identifies the pen which triggered the event and should follow the rules for assigning a `pointerId` in accordance with the procedures in the [PointerEvents](https://www.w3.org/TR/pointerevents2/#pointerevent-interface) spec.

The `button` property indicates which button has been pressed.  The numeric value of the button indicating which button triggered the event is taken from the recommendations made in the [existing PointerEvent specification](https://www.w3.org/TR/pointerevents2/#button-states).

### PenDockChangeEvent Webidl
```
dictionary PenDockChangeEventInit {
    readonly attribute long pointerId = 0;
    readonly bool docked = false;
};

[Exposed=Window]
interface PenDockChangeEvent : UIEvent {
    constructor(DOMString type, optional PenDockChangeEventInit eventInitDict);

    readonly attribute long pointerId;
    readonly bool docked;
};
 ```

### pendockchange Event
A PenDockEvent must be fired to the set of connected `PenEventTarget`s associated with the active window when a pen is returned to, or removed from, a dock on hardware which supports detecting these transitions of the pen.

The `pointerId` property identifies the pen which triggered the event and should follow the rules for assigning a `pointerId` in accordance with the procedures in the [PointerEvents](https://www.w3.org/TR/pointerevents2/#pointerevent-interface) spec.

The `docked` property identifies whether the pen has transitioned to a docked state (the docked property is true) or an undocked state (the docked property is false).

## System Interactions
Note on some operating systems, pen events may trigger a default action.  For example, on Windows, the shell provides configurable behavior for launching frequently used inking applications when pen button interactions are detected. Applications may register with the system to provide alternative behaviors and suppress the default behavior from the OS.  

For web applications, only active windows that have a connected `PenEventTarget` can override the system behavior.  As a result, any internal registration required to ensure that a web app receives the proper events should take place any time the active window changes, or the set of connected `PenEventTarget`s change for the active window.  The set of events to register is the unioned set of all events described by the `PenEventDescriptor`s of the connected `PenEventTarget`s for the currently active window.

## Sample Code
```javascript
// Construct a PenEventTarget to listen for a set of pen events.
let pet = new PenEventTarget([
    { 
        type: "click",
        // Because a future pen may have multiple buttons with independent system-wide actions 
        // that can be independently overridden, list buttons the author intends to handle explicitly.
        buttons: [5]
    },
    { 
        type: "dblclick",
        buttons: [5]
    },
    { 
        type: "pressandhold",
        buttons: [5]
    },
    { 
        type: "dockchange"
    }
])

// Connect to receive the events whenever this window is focused
pet.connect().then(
    () => { console.log("ready to receive events") },
    () => { console.log("could not connect") }
)

// Event handlers
pet.addEventListener("click", (e) => {
    if (e.button == 5) {
        // handle pen click for button 5
    }
})

pet.addEventListener("dblclick", (e) => {
    if (e.button == 5) {
        // handle pen dblclick for button 5
    }
})

pet.addEventListener("pressandhold", (e) => {
    if (e.button == 5) {
        // handle pen pressandhold for button 5
    }
})

pet.addEventListener("dockchange", (e) => {
    if (!e.docked) {
        // handle the pen being undocked
    } else {
        // handle the pen being docked
    }
})

// If you're done listening for events call disconnect
pet.disconnect()
```
## Alternatives Considered
### Dispatching a KeyboardEvent
On Windows, the `click`, `dblclick` and `pressandhold` actions on the pen are sent as hotkeys from the OS to the active app.  One option would be to dispatch this OS-specific representation of the event as a `KeyboardEvent` to the `activeElement`.

This option isn't currently being pursued for two reasons:

1. Devices with a stable `pointerId` can benefit from correlating the button events with subsequent `PointerEvent`s that are generated from the same device.  For example, clicking the eraser may put the device into an eraser mode while a double click may switch from pencil to pen.  `KeyboardEvent` doesn't have a `pointerId` property, so this approach wouldn't facilitate these scenarios.
2. The Windows "hotkeys" for pen interactions F18 through F20 are more of an implementation detail and fail to convey any semantic meaning about what the user is doing.  In contrast, a `dblclick` event on a `PenEventTarget` seems like a good fit for an Apple Pencil double-tap, so the current proposal has broader device applicability.

### Dispatching Additional PointerEvents
Currently `PointerEvent`s are named as such because the common trait of all devices that generate `PointerEvent`s is that they point at some location on the screen.  Specifically for pens, a `PointerEvent` represents a "button" of the pen coming into contact with the digitizer (or being moved near the digitizer) at a specific location.

Because the actions represented by the proposed events don't relate to a particular location, generating a `PointerEvent` seems semantically wrong.  As a result, this option is not being pursued.

### Dispatching of Existing PointerEvents
It may seem, at first glance, like dispatching existing `click` and `dblclick` `PointerEvent`s would be a good fit for this proposal, but because the action of clicking the top button of the pen and moving the pen around while the top button is in contact with the screen (the latter being what is currently covered by existing `PointerEvent` specification) are two very different operations, they should not be described by the same event.  As a result, this option is not being pursued.

## Open Questions:
1. Microsoft Surface Hubs have more than one pen and more than one dock to hold those pens.  Should a dock identifier be considered so that web apps could, for example, position drawing UI nearby the location of the dock which generated the event?
1. Is an API needed to query the docked state of a pen, or is it sufficient to wait for the event to signal a transition?  The current thinking is that the transition between docked and undocked is what's interesting to web apps, but not the current state - primarily because the current state gives the app less information.  For example, querying for current state and finding the pen undocked could mean the user is holding the pen or could mean there's no pen.  In contrast, undocking the pen means the user has just taken the pen in hand.
1. Should the API be more generic and not pen specific?  The current thinking is that the specific event is needed because it allows a clear signal to be sent to the OS so that system behaviors can be overridden.  Combining the event into something that may be for a penbuttonclick or may be for something else would require that an additional API be provided for authors to indicate when the system behavior is to be overridden.  On Windows that declaration must happen in order for the app to receive the event (the decision can't wait until the author calls preventDefault since that could introduce unacceptable latency between the click and the system's response).
1. Should penbuttonup/down events be defined and synthesized for devices that don't support that fidelity?
1. Degree of cross-platform compatibility: According to [Apple documentation](https://developer.apple.com/documentation/uikit/pencil_interactions/handling_double_taps_from_apple_pencil) a double-tap on the pencil barrel is delivered in a way that would make it compatible with the penbuttondblclick event in this proposal.  Investigation is still pending for Android and Chrome OS devices.

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Pen%20Events) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BPen%20Events%5D)
