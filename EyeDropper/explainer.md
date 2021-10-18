# EyeDropper API 
Authors: [Sidhika Tripathee](https://github.com/t-sitri), [McKinna Estridge](https://github.com/t-saestr), [Sammy Hannat](https://github.com/samhannat)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **ARCHIVED**
* Current venue: [W3C Web Incubator Community Group](https://wicg.io/) | [WICG/eyedropper-api](https://github.com/WICG/eyedropper-api) | ![GitHub issues](https://img.shields.io/github/issues/WICG/eyedropper-api)
* Current version: [EyeDropper API Explainer](https://github.com/WICG/eyedropper-api/blob/main/README.md)

## Introduction
Currently on the web, creative application developers are unable to implement an eyedropper, a tool that allows users to select a color from the pixels on their screen, including the pixels rendered outside of the web page requesting the color data. This explainer proposes an API that enables developers to use a browser-supplied eyedropper in the construction of custom color pickers. 

## Problem/Motivation
Several creative applications would like to utilize the ability to pick a color from pixels on the screen. Many "native" applications, e.g. PowerPoint, have eyedropper functionality but are unable to carry it over the web.      
   
Even though some browsers have built-in eyedropper functionality into color input tags, this limits customizability and can be seen as being out of place for many applications.

## Goals 
1. Provide access to the color value of one user-selected pixel, including pixels rendered by different origins, or outside of the browser.
2. Allow the developer to enable the eyedropper through script (subject to user activation).
3. Keep the user in control by providing the means to exit the eyedropper mode, for example, by pressing the ESC key and ensuring the event is not cancellable by the author.
4. Keep the user in control by requiring some explicit action, for example pressing a mouse button, to indicate which pixel will have color information returned to the web page.
5. Allow browser implementors the freedom to implement eyedropper pixel selection UI that best fits their platform and browser.  Note that a future version of the proposal may afford web developers more control over that UI.  One example supported by Chromium-based browsers is shown below.

<img src= "preview.png" alt= "example eyedropper cursor" width="500"/>

## Non-Goals
1. This proposal does not currently define an object model for a color, though it seems like something that would be a good addition to the web platform. 
2. This proposal does not currently define a mechanism to allow developers to hide or show the eyedropper's pixel selection UI while remaining in eyedropoper mode, but a future version may allow that, for example, to facilitate clicking on application UI elements instead of selecting a color value.
3. This proposal does not provide a mechanism for capturing data other than the selected pixel, such as coordinates of the selected pixel.

## Privacy
Exposing endpoints allowing developers to access unrestricted pixel data from a user's machine presents security challenges. In particular any eyedropper implementation should not allow a web page to "screen scrape" information the user didn't intend to share with the web application, for example, while the user moves the mouse around the screen.

One way to mitigate this threat is to require that pixel data only be made available to the web application when the user takes some explicit action like pressing a mouse button.

Additionally, browsers should provide a clear indication as to when the user has been transitioned into an eyedropper mode, for example by changing the cursor, and provide the means for the user to exit that mode, for example, by pressing an ESC key and not allowing the behavior to be cancelled by the author.

The transition into eyedropper mode should require [consumable user activation](https://github.com/mustaqahmed/user-activation-v2), for example, clicking on a button from the web page, to help avoid unintentionally revealing pixel data.

## Solution
The API will enable web developers to incorporate an eyedropper in their web applications. The eyedropper would allow the developer to access the hex value (of the form `#RRGGBB`) of a user specified pixel.

Since the representation of color on the web is in transition and the [Color on the Web Community Group](https://w3c.github.io/ColorWeb-CG) is already working on better representing colors, to avoid competing with other efforts this API will initially provide a single color string which is gamut mapped to the sRGB color space. It is expected that a color object will be the primary mechanism by which authors will access sampled color data in the future and that it will have the facilities to map between color spaces.

### Web IDL
```
dictionary ColorSelectionResult {
    DOMString sRGBHex;
};
 
[Exposed=Window]
interface EyeDropper {
    constructor();
 
    Promise<ColorSelectionResult> open();
};
```

The `open` method places the web page into an "eyedropper mode" where user input is suppressed: no UI events are dispatched to the web page.

The `open` method returns a `Promise` which resolves if the user has successfully selected a color based on existing onscreen colors and rejects otherwise to facilitate any scenario where the user has exited the "eyedropper mode" without selecting a color.

The `ColorSelectionResult` contains the result of calling `open()`. It contains one member, `sRGBHex`, which is a 6-digit hex value representing the red, green and blue color components of the selected color in the form: `#RRGGBB`.

If the user presses ESC or invokes some other affordance for exiting "eyedropper mode", the `Promise` is going to be rejected.

## Example Usage
```javascript
// Create an EyeDropper object
let eyeDropper = new EyeDropper();

// Enter eyedropper mode
let icon = document.getElementbyId("eyeDropperIcon")
icon.addEventListener('click', e => {
    eyeDropper.open()
    .then(colorSelectionResult => {
        // returns hex color value (#RRGGBB) of the selected pixel
        console.log(colorSelectionResult.sRGBHex);
    })
    .catch(error => {
        // handle the user choosing to exit eyedropper mode without a selection
    });
});
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