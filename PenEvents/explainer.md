# Ambient Pen Events API Explainer

## Motivation:
Some digital pens and pencils can not only provide input through their interaction with a digitizer but can also pair with a device so that additional signals can be received when a button is pressed. In some cases, the signal may relate to the pen or pencil but come from another source, e.g. a charger may send a signal that the pen or pencil has been docked or undocked.  Native applications can use these signals to customize their behavior, but no corresponding events are available to web applications.
This could be useful when an app may want to position the color palette at the specific location or to enable "drawing mode". 

Providing pen events primitives would enable web authors looking to explore inking and pen related editing scenarios to gain feature parity with its desktop counterparts. 


## Goals:
The goal of this document is to standardize the method by which pen or pencil-related events for buttons (or equivalent) and docking events can be delivered to web applications.

## Proposal:
This proposal aims to communicate "pen intent" to a web developer before pen touches the screen. By pen intent, we mean a hint that can be shared with a web developer that pen became active so he/she can adjust application UI, for example.
Our proposal is to create a number of new events - ``pendockchange`` tracking docked state of a pen and pen button related events: ``penbuttonclick``, ``penbuttondblclick`` and ``penbuttonpressandhold``. These will give a web developer an opportunity to react to these events to build a desired behavior on the page. Events will be dispatched as soon as a browser receives them from an operating system, without waiting for pen to touch the screen. These events are meant to have no implicit target, hence the reference to ambience in the explainer. Details on other event attributes are described in the Web IDL section.

Our thought process was influenced by the hardware capabilities. Though not exhaustive, here is the list of things that we kept in mind in our decision making: 

* API Events:
  * Dock/undock events, if hardware supports it;
  * Respective button interactions.
  
* Events characteristics and properties:
  * Ability to query for the list of available button events on pen device;
  * All events should come with a timestamp;
  * o	Events should provide mouse-like experience through series of penbuttondown/up events to communicate information about button states: {pressed, released, etc.}, where hardware supports;

### Use cases
Developers can handle the events in similar fashion as they do today.

dock/undock example:
```javascript
document.addEventListener('pendockchange', event => {
  if (event.docked === false) {
    // handle undocking event
  }
  else {
    // handle docking event
  }
});
```

pen button example:
```javascript
document.addEventListener('penbuttonclick', event => {
  // handle eraser button click event
  if (event.button === 5) {
    // use event.pointerId
  }
  else {
    // handle other buttons if any
  }
});
document.addEventListener('penbuttondblclick', event => {
  // handle eraser button double-click event
  if (event.button === 5) {
    // use event.pointerId
  }
  else {
    // handle other buttons if any
  }
});
document.addEventListener('penbuttonpressandhold', event => {
  // handle eraser button press and hold event
  if (event.button === 5) {
    // use event.pointerId
  }
  else {
    // handle other buttons if any
  }
});
```

Note: When event listener is registered to an element or window associated with a focused element, the UA will dispatch this event. However, there may be cases where system components (e.g. Windows shell) can piggyback of the event dispatched by the hardware and make changes to the user experience in the OS as well.

## Alternatives:
As there there hasn't been any precedent in firing these types of events, alternatives are scarce.

## Open Questions:
1. A new API should be able to support multiple devices. For example, Microsoft Surface Hub that will have pens on both side of the screen. (this is currently a limitation on some hardware and maybe out of scope in v1)
1. The API should be able to locate the pen at any point of time in (x,y,z) with respect to the docking station or a screen.
1. Should the API be more generic and not pen specific?

## Additional Material:
[Events Details](eventdetails.md)

[Design Doc]()
