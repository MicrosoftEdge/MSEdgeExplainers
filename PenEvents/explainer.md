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
| penbuttonclick | PenButtonEvent | Window | No | No | No | None
| penbuttondblclick | PenButtonEvent | Window | No | No | No | None
| penbuttonpressandhold | PenButtonEvent | Window | No | No | No | None
| pendockchange | PenDockChangeEvent | Window | No | No | No | None

### PenButtonEvent Webidl
```  
dictionary PenButtonEventInit {
    readonly attribute long pointerId = 0;
    readonly attribute long button = 0;
};

[
    Constructor(DOMString type, optional PenButtonEventInit eventInitDict),
    Exposed=Window
]
interface PenButtonEvent : UIEvent {
    readonly attribute long pointerId;
    readonly attribute long button;
};
 ```
### penbuttonclick, penbuttondblclick, penbuttonpressandhold Events
A PenButtonEvent named for the gesture the user has performed with the pen button must be fired to the active window when the pen button gesture is detected. Corresponding down/up events are not proposed because of hardware limitations, e.g. the Microsoft Surface Pen produces a signal describing the gesture, not the state transitions of the actual button.  

The pointerId property identifies the pen which triggered the event and should follow the rules for assigning a pointerId in accordance with the procedures in the [PointerEvents](https://www.w3.org/TR/pointerevents2/#pointerevent-interface) spec.

The button property indicates which button has been pressed.  The numeric value of the button indicating which button triggered the event is taken from the recommendations made in the [existing PointerEvent specification](https://www.w3.org/TR/pointerevents2/#button-states).

### PenDockChangeEvent Webidl
```
dictionary PenDockChangeEventInit {
    readonly attribute long pointerId = 0;
    readonly bool docked = false;
};

[
    Constructor(DOMString type, optional PenDockChangeEventInit eventInitDict),
    Exposed=Window
]
interface PenDockChangeEvent : UIEvent {
    readonly attribute long pointerId;
    readonly bool docked;
};
 ```

### pendockchange Event
A PenDockEvent must be fired to the active window when a pen is returned to, or removed from, a dock on hardware which supports detecting these transitions of the pen.

The pointerId property identifies the pen which triggered the event and should follow the rules for assigning a pointerId in accordance with the procedures in the [PointerEvents](https://www.w3.org/TR/pointerevents2/#pointerevent-interface) spec.

The docked property identifies whether the pen has transitioned to a docked state (the docked property is true) or an undocked state (the docked property is false).

## System Interactions
Note on some operating systems, adding or removing the event listener may cause side-effects.  For example, on Windows, the shell provides configurable behavior for launching frequently used inking applications when pen button interactions are detected. Applications may register with the system to provide alternative behaviors and suppress the default behavior from the OS.  For web applications, it is expected that only active documents that have a registered event listener can override the system behavior.

These side effects are one reason why new events are proposed instead of reusing existing events like `pointerdown`, `pointerup` and `click`.  Sites which listen to these existing events don't intend to override system behavior.  In contrast, listening to a `penbuttonclick` is well aligned with the event that generates the specialized behavior for pens on Windows and serves as a clear signal that the web app intends to provide its own behavior to replace the default system action.


## Sample Code

### PenButtonEvent Example
```javascript
document.addEventListener('penbuttonclick', event => {
  if (event.button === 5) {
      // eraser button clicked; move to next slide in the slide show
  }
});
document.addEventListener('penbuttonpressandhold', event => {
  if (event.button === 5) {
      // eraser button held; move to previous slide in the slide show
  }
});
```

### PenDockChangeEvent Example
```javascript
document.addEventListener('pendockchange', event => {
  if (event.docked) {
    // the pen is docked, handle it, e.g. by transitioning out of drawing mode
  }
  else {
    // the pen has been undocked; drawing may be imminent; deploy color palettes!
  }
});
```
## Alternatives Considered
### Dispatching a KeyboardEvent
On Windows, the click, dblclick and pressandhold actions on the pen are sent as hotkeys from the OS to the active app.  One option would be to dispatch this OS-specific representation of the event as a KeyboardEvent to the activeElement.

This option isn't currently being pursued for a two reasons:

1. Devices with a stable pointerId can benefit from correlating the button events with subsequent PointerEvents that are generated from the same device.  For example, clicking the eraser may put the device into an eraser mode while a double click may switch from pencil to pen.  KeyboardEvent doesn't have a pointerId property, so this approach wouldn't facilitate these scenarios.
2. The Windows "hotkeys" for pen interactions F18 through F20 are more of an implementation detail and fail to convey any semantic meaning about what the user is doing.  In contrast, a penbuttondblclick event seems like a good fit for an Apple Pencil double-tap, so the current proposal has broader device applicability.

### Dispatching Additional PointerEvents
Currently PointerEvents are named as such because the common trait of all devices that generate PointerEvents is that they point at some location on the screen.  Specifically for pens, a PointerEvent represents a "button" of the pen coming into contact with the digitizer (or being moved near the digitizer) at a specific location.

Because the actions represented by the proposed events don't relate to a particular location, generating a PointerEvent seems semantically wrong.  As a result, this option is not being pursued.

## Open Questions:
1. Microsoft Surface Hubs have more than one pen and more than one dock to hold those pens.  Should a dock identifier be considered so that web apps could, for example, position drawing UI nearby the location of the dock which generated the event?
1. Is an API needed to query the docked state of a pen, or is it sufficient to wait for the event to signal a transition?  The current thinking is that the transition between docked and undocked is what's interesting to web apps, but not the current state - primarily because the current state gives the app less information.  For example, querying for current state and finding the pen undocked could mean the user is holding the pen or could mean there's no pen.  In contrast, undocking the pen means the user has just taken the pen in hand.
1. Should the API be more generic and not pen specific?  The current thinking is that the specific event is needed because it allows a clear signal to be sent to the OS so that system behaviors can be overridden.  Combining the event into something that may be for a penbuttonclick or may be for something else would require that an additional API be provided for authors to indicate when the system behavior is to be overridden.  On Windows that declaration must happen in order for the app to receive the event (the decision can't wait until the author calls preventDefault since that could introduce unacceptable latency between the click and the system's response).
1. Should penbuttonup/down events be defined and synthesized for devices that don't support that fidelity?
1. Degree of cross-platform compatibility: According to [Apple documentation](https://developer.apple.com/documentation/uikit/pencil_interactions/handling_double_taps_from_apple_pencil) a double-tap on the pencil barrel is delivered in a way that would make it compatible with the penbuttondblclick event in this proposal.  Investigation is still pending for Android and Chrome OS devices.

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Pen%20Events) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BPen%20Events%5D)
