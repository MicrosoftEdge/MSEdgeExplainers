# EyeDropper API 
Authors: [Sidhika Tripathee](https://github.com/t-sitri), [McKinna Estridge](https://github.com/t-saestr), [Sammy Hannat](https://github.com/samhannat)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: this document

## Introduction
Currently on the web, creative application developers are unable to implement an eyedropper, a tool that allows users to select a color from the pixels on their screen, including the pixels rendered outside of the web page requesting the color data. This explainer proposes an API that enables developers to use a browser-supplied eyedropper in the construction of custom color pickers. 

## Problem/Motivation
Several creative applications would like to utilize the ability to pick a color from pixels on the screen. Many "native" applications, e.g. PowerPoint, have eyedropper functionality but are unable to carry it over the web.      
   
Even though some browsers have built-in eyedropper functionality into color input tags, this limits customizability and can be seen as being out of place for many applications.

## Goals 
1. Provide access to the color values of one or more user-selected pixels, including pixels rendered by different origins, or outside of the browser.
2. Provide coordinate information in addition to a color value so that web apps may utilize any data known for the selected pixel whenever the selected color is from a document having a similar origin, e.g. layering information in a painting web app.
3. Provide the set of keyboard modifiers and pointer buttons pressed while selecting a pixel so that web apps can provide differentiated actions while the eyedropper tool is active, for example, selecting the background color when the SHIFT key is held and the foreground color otherwise.
4. Allow the developer to enable and disable the eyedropper through script (subject to user activation).
5. Keep the user in control by providing the means to exit the eyedropper mode, for example, by pressing the ESC key and ensuring the event is not cancellable by the author.
6. Keep the user in control by requiring some explicit action, for example pressing a mouse button, to indicate which pixels will have color information returned to the web page.
7. Allow browser implementors the freedom to implement eyedropper pixel selection UI that best fits their platform and browser.  Note that a future version of the proposal may afford web developers more control over that UI.  One example supported by Chromium-based browsers is shown below. 

<img src= "preview.png" alt= "example eyedropper cursor" width="500"/>

## Non-Goals
1. This proposal does not currently define an object model for a color, though it seems like something that would be a good addition to the web platform. 
1. This proposal does not currently define a mechanism to allow developers to hide or show the eyedropper's pixel selection UI while remaining in eyedropoper mode, but a future version may allow that, for example, to facilitate clicking on application UI elements instead of selecting a color value.

## Privacy
Exposing endpoints allowing developers to access unrestricted pixel data from a user's machine presents security challenges. In particular any eyedropper implementation should not allow a web page to "screen scrape" information the user didn't intend to share with the web application, for example, while the user moves the mouse around the screen.

One way to mitigate this threat is to require that pixel data only be made available to the web application when the user takes some explicit action like pressing a mouse button.

Additionally, browsers should provide a clear indication as to when the user has been transitioned into an eyedropper mode, for example by changing the cursor, and provide the means for the user to exit that mode, for example, by pressing an ESC key and not allowing the behavior to be cancelled by the author.

The transition into eyedropper mode should require [consumable user activation](https://github.com/mustaqahmed/user-activation-v2), for example, clicking on a button from the web page, to help avoid unintentionally revealing pixel data.

## Solution
The API will enable web developers to incorporate an eyedropper in their web applications. The eyedropper would allow the developer to access the hex value (of the form `#RRGGBB`) of a user specified pixel, its position and modifier keys pressed when the pixel was selected.

The position of the selected color is included to facilitate scenarios where a web app using the eyedropper samples a pixel color from its own document.  The web app could, for example, include an alpha channel for the selected pixel or create a palette of colors associated with a pixel's location based on layer information known to the web app.  The color value would otherwise be the final composited color as seen by the user.

### Web IDL
```
dictionary ColorSelectEventInit : PointerEventInit {
    DOMString value = "";
};

[Exposed=Window]
interface ColorSelectEvent : PointerEvent {
    constructor(DOMString type, optional ColorSelectEventInit eventInitDict = {});
 
    readonly attribute DOMString value;
};
 
/// @event name="colorselect", type="ColorSelectEvent"
/// @event name="close", type="Event"
[Exposed=Window]
interface EyeDropper : EventTarget {
    constructor();
 
    Promise<void> open();
    void close();

    readonly attribute boolean opened;
 
    // Event handler attributes
    attribute EventHandler oncolorselect;
    attribute EventHandler onclose;
};
```

The `open` method places the web page into an "eyedropper mode" where user input is suppressed: no UI events except `colorselect` are dispatched to the web page and the `colorselect` event is only dispatched while the primary pointer is down. 

The `open` method returns a `Promise` which resolves if "eyedropper mode" was succesfully entered and rejects otherwise to facilitate any permissions prompts that a user agent may choose to implement.

The `close` method exits the "eyedropper mode".

While in "eyedropper mode", `opened` is `true`; otherwise it is `false`.

If the user presses ESC or invokes some other affordance for exiting "eyedropper mode", the `close` event will be dispatched.

The `colorselect` event's `value` is a 6-digit hex value representing the red, green and blue color components of the selected color in the form: `#RRGGBB`.

The `ColorSelectEvent` interface inherits from `PointerEvent` to provide the location of the selected pixel, the relevant view to which the location applies, and any modifier keys pressed when the pixel was selected.  If the view of the `colorselect` event is null, the selected pixel was not from a document with a similar origin and the location attributes of the event will be 0.

[getCoalescedEvents](https://w3c.github.io/pointerevents/#dom-pointerevent-getcoalescedevents) and [getPredictedEvents](https://w3c.github.io/pointerevents/#dom-pointerevent-getpredictedevents) will always return the empty set for `colorselect` events.  Other inherited members of `ColorSelectEvent` all serve a meaningful purpose and will return a value as described in the relevant specifications.

## Example Usage
```javascript
// Create an EyeDropper object
let eyeDropper = new EyeDropper();

// Enter eyedropper mode
let icon = document.getElementbyId("eyeDropperIcon")
icon.addEventListener('click', e => {
    eyeDropper.open().then(
        () => { console.log("entered eyedropper mode") },
        () => { console.log("could not enter eyedropper mode") }
    )
});
 
eyeDropper.addEventListener('colorselect', e => {
    // returns hex color value (#RRGGBB) of the selected pixel
    console.log(e.value);

    if (e.view) {
        // The selected pixel came from our own document (or a document of similar origin)
        // The selected pixel is located at:
        console.log(`${e.clientX}, ${e.clientY}`)
    }

    // close explicitly if we only want to select one color and exit eyedropper mode
    eyeDropper.close();
});

eyeDropper.addEventListener("close", e => {
    // handle the user choosing to exit eyedropper mode
})
 ```

## Feature Detection
Authors can feature detect the EyeDropper by testing for the presence of the interface on `window`: 
```javascript
if ("EyeDropper" in window) {
    // EyeDropper supported
}
else {
    // not supported
}
```

## Alternatives Considered
### Extending input[type=color]
This [WhatWG issue](https://github.com/whatwg/html/issues/5584) proposes a new eyedropper attribute on the HTMLInputElement.  This approach wasn't pursued primarily to avoid adding `open` and `close` methods to an already crowded HTMLInputElement API surface.

Having `open` and `close` methods allows the author more control over the duration of "eyedropper mode" and can enable repeated color selections by the user until they either ESC "eyedropper mode" or the author explicitly exits the mode, for example, in response to a click on a non-eyedropper tool.