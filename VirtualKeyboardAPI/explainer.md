# Virtual Keyboard API

Authors: [Daniel Libby](https://github.com/dlibby-), [Zouhir Chahoud](https://github.com/Zouhir)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/) 
* Current version: this document

## Introduction

Today on the web, User Agents respond to the presence of the virtual (software) keyboard, without any exposure of this information to the web page. This document proposes a new web API surface for virtual keyboards that developers can use to enable better customization of their webpage's content and experiences.

## Motivation

Virtual keyboards are typically invoked when a user interacts with an editable area via touch input. In order for users to effectively use the virtual keyboard to input text, the editable area must be remain visible. To try to ensure this happens across the web today, there are two User Agent behaviors associated with the appearance of a docked virtual keyboard:

- The entire application is resized, which ends up affecting the layout of the page. Once the resize is completed, the focused element is scrolled into view.

- A visual viewport is applied to the web contents, as an inset that matches the size of the virtual keyboard. Once the visual viewport is applied, the focused element is scrolled into view.

![Figure showing touch-screen device in 3 states: virtual keyboard hidden, virtual keyboard shown with window resize, and a new way ](single-touch-screen-device.png)

Rich editing applications have no way to determine what behavior they will get today, and in fact may not want any action taken by the user agent, but instead desire to only reposition certain aspects of their view. This becomes increasingly important with dual screen devices where the virtual keyboard does not necessarily need to occupy the entire width of the viewport. Native applications have the ability to listen for events from the underlying OS and we believe web developers also can use this information to bring enhanced experiences to the web.

![Figure showing virtual keyboard on dual screen device](dual-screen-device.png)

## Non Goals

This proposal is currently scoped to exposing information about *docked* virtual keyboards. Floating virtual keyboards are typically put into that configuration explicitly by users, and therefore the user is able to adjust the keyboard and/or window layout as appropriate to unblock themselves. With that in mind, we decided to not extend `overlaygeometrychange` event to the floating keyboards because we believe it is not practical or useful for the app to process and reflow continually as the keyboard is dragged around.

## Proposal

To enable these scenarios and ensure backward site compatibility, we propose a mechanism for developers to opt-into a different behavior when the virtual keyboard appears: a docked virtual keyboard will occlude content along with providing JavaScript events when the virtual keyboard overlay geometry changes.

### Allowing Virtual Keyboard to Occlude Content

The first new feature is an additional `virtualKeyboard` attribute on `Navigator` that exposes a new object. This object (via the `VirtualKeyboard` interface) will contain a boolean attribute `overlaysContent` which enables developers to enable the new behavior of the virtual keyboard overlaying page content, instead of performing the UA default action of resizing viewport, as described in the Motivation section.

```javascript
window.navigator.virtualKeyboard.overlaysContent = true;
```

![Figure showing virtual keyboard overlaying page content](keyboard-occluding-content.png)


### Listening and Responding to Virtual Keyboard Visibility Change

Additionally, the `VirtualKeyboard` interface is an `EventTarget` which can be targeted by the `geometrychange` event. The user agent will fire this event when the virtual keyboard is shown in a docked state, and the virtual keyboard overlays the web content. Additionally it will fire when the virtual keyboard transitions from overlayed to hidden, or is moved to no longer intersect with the web content.

The `geometrychange` event provides a `boundingRect` object with four read-only properties `top, left, width, height, bottom, right` to help developers reason about the virtual keyboard size and geometry. These values are in CSS pixels, and are in the client coordinate system. This `boundingRect` is also available in `virtualKeyboard` object that is stored in `navigator`.

### Virtual Keyboard Visibility Change CSS environment variables 

We propose the addition of 6 pre-defined CSS environment variables safe-keyboard-area-inset-top, safe-keyboard-area-inset-right, safe-keyboard-area-inset-bottom, safe-keyboard-area-inset-left, safe-keyboard-area-inset-width, safe-keyboard-area-inset-height. Web developers can utilize those variables to calculate the Virtual keyboard size at both landscape and portrait orientations.

The values of these variables are CSS pixels, and are relative to the layout viewport (i.e. are in the client coordinates, as defined by CSSOM Views). When evaluated when not in one of the spanning states, these values will be treated as if they don't exist, and use the fallback value as passed to the env() function.

### Syntax
```css
env(safe-area-inset-top);
env(safe-area-inset-right);
env(safe-area-inset-bottom);
env(safe-area-inset-left);
```

### Example
```css

.search-box {
  position: absolute;
  bottom: env(safe-keyboard-area-inset-bottom);
}
```

### API Availability in iframe Context

iframes will not be able to set or change the virtual keyboard behaviour via `navigator.virtualKeyboard.overlaysContent`, the root page is responsible for setting this policy. However, the `overlaygeometrychange` event will fire in the focus chain of the element that triggered the virtual keyboard visibility (i.e. the frame in which the focused element lives, along with its ancestor frames).

We must also note that virtual keyboard's `boundingRect` (geometry) exposed to the iframe via the `overlaygeometrychange` event are relative to the iframe's client coordinates and not the root page or in other words the `boundingRect` exposed represents the intersection between the virtual keyboard and the iframe element.

![Figure showing virtual keyboard geometry exposed to an iframe and the root page](keyboard-occluding-content.png)

## Example

### A map application that presents a map on one window segment and search results on another

![Foldable with the left segment of the window containing a map and the right segment containing list of search results](example.png)


```css
.map {
  position: relative;
  ...
}

.search-box {
  position: absolute;
  bottom:  15px;
}
```

```javascript
window.navigator.virtualKeyboard.overlaysContent = true;

navigator.virtualKeyboard.addEventListener("overlaygeometrychange", (evt) => {
  let { width, height } = evt.boundingRect;
  if( width !== 0 && height !== 0 ) {
    console.log('virtual keyboard is now visible!')
  }
  document.querySelector(".search-box").style.bottom = `${height + 15}px`;
});
```
