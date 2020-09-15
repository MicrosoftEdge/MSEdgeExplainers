# Virtual Keyboard API

Authors: [Daniel Libby](https://github.com/dlibby-), [Zouhir Chahoud](https://github.com/Zouhir), [Bo Cupp](https://github.com/BoCupp-Microsoft)

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

This proposal is currently scoped to exposing information about *docked* virtual keyboards. Floating virtual keyboards are typically put into that configuration explicitly by users, and therefore the user is able to adjust the keyboard and/or window layout as appropriate to unblock themselves. With that in mind, we decided to not extend `geometrychange` event to the floating keyboards because we believe it is not practical or useful for the app to process and reflow continually as the keyboard is dragged around.

## Proposal

To enable these scenarios and ensure backward site compatibility, we propose a mechanism for developers to opt-in to a different behavior when the virtual keyboard appears: a docked virtual keyboard will overlay content (as opposed to repositioning it) and JavaScript events will be dispatched to allow the author to rearrange the layout of their document to compensate for changes in the intersection of the layout viewport with the virtual keyboard.

### Web IDL
```
partial interface Navigator {
    [SameObject] readonly attribute VirtualKeyboard virtualKeyboard;
};

[Exposed=Window]
interface VirtualKeyboard : EventTarget {
    readonly attribute DOMRectReadOnly boundingRect;
    attribute boolean overlaysContent;
    attribute EventHandler ongeometrychange;
};
```

The `overlaysContent` attribute enables the author to opt-out of resizing of the visual viewport as described in the Motivation section.

The `boundingRect` attribute reports the intersection of the virtual keyboard with the layout viewport in client coordinates.

The `ongeometrychange` event is dispatched when the intersection of the virtual keyboard and the layout viewport changes, e.g. in response to the virtual keyboard being shown or hidden or the browser window being repositioned. 

### Virtual Keyboard Visibility Change CSS environment variables 

We further propose the addition of six CSS environment variables: `keyboard-top`, `keyboard-right`, `keyboard-bottom`, `keyboard-left`, `keyboard-width`, `keyboard-height`. Web developers can utilize these variables to calculate the virtual keyboard size and position and adjust layout accordingly.

### API Availability in iframe Context

iframes will not be able to set or change the virtual keyboard behaviour via `navigator.virtualKeyboard.overlaysContent`, the root page is responsible for setting this policy. However, the `geometrychange` event will fire in the focus chain of the element that triggered the virtual keyboard visibility (i.e. the frame in which the focused element lives, along with its ancestor frames).

Note that the geometry exposed to the iframe via the `navigator.virtualKeyboard.boundingRect` property are relative to the iframe's client coordinates and not the root page; in other words, the `boundingRect` exposed represents the intersection between the virtual keyboard and the iframe element.

## Examples

### Allowing Virtual Keyboard to Occlude Content

An author must first opt-in to the new behavior (i.e. opt-out of visual viewport changes in response to visibility changes of the virtual keyboard) by setting `overlaysContent` to `true`.

```javascript
if ("virtualKeyboard" in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
}
```

The figure below shows the virtual keyboard overlaying the content of the document instead of repositioning it.

![Figure showing virtual keyboard overlaying page content](keyboard-occluding-content.png)


### Repositioning Content using CSS
To ensure content that the user needs to interact with remains visible when the virtual keyboard is displayed, the author must reposition elements of the page.  In this example a search box is repositioned using the proposed CSS environment variables.

```html
<!DOCTYPE html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    display: grid;
    margin: 8px;
    height: calc(100vh - 16px);
    grid-template: 
      "messages"  1fr
      "input"     auto
      "keyboard"  env(keyboard-height, 0px);
  }
  input[type=text]::placeholder {
    color: #444;
  }
  input[type=text] {
    padding: 10px;
    font-size: 24px;
    border: 4px solid black;
    border-radius: 4px;
    background-color: #86DBF6;
    justify-self: center;
  }
</style>
<div id="messages">...</div>
<input type="text" placeholder="type...">
<script>
    if ("virtualKeyboard" in navigator) {
        navigator.virtualKeyboard.overlaysContent = true
    }
</script>
```

### Repositioning Content using JavaScript

The `VirtualKeyboard` interface is an `EventTarget` from which the user agent will dispatch `geometrychange` events when the virtual keyboard is shown, hidden or otherwise changes its intersection with the layout viewport.

The `VirtualKeyboard` interface provides a `boundingRect` object with six read-only properties `top`, `left`, `bottom`, `right`, `width`, and `height` for web developers to use in adjusting the layout of their document. These values are in CSS pixels and are in the client coordinate system.

The figure below is a representation of a canvas-based spreadsheet that repositions the active cell when the virtual keyboard is shown.

![Spreadsheet example being offset by the virtual keyboard](spreadsheet-example.svg)

```html
<!DOCTYPE html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    display: grid;
    margin: 0;
    height: 100vh;
    grid-template:
      "controls" min-content
      "cells"    1fr;
  }
  #controls {
    height: 100px;
    background-color: #139CFF;
  }
  canvas {
    justify-self: stretch;
    align-self: stretch;
  }
</style>
<div id="controls">...</div>
<canvas></canvas>
<script type="module">
    navigator.virtualKeyboard.overlaysContent = true

    navigator.virtualKeyboard.addEventListener("geometrychange", () => {
        // Request the canvas be repainted so it can reposition
        // the active cell above the virtual keyboard.
        requestAnimationFrame(paintCanvas)
    })

    paintCanvas() {
        let keyboardRect = navigator.virtualKeyboard.boundingRect

        // Use keyboard rect in omitted code below to paint cells in the 
        // proper position accounting for the keyboard rect along with
        // any panning of the cell area that the user may have performed.
    }
</script>
```

### Repositioning Content on Foldable Devices

The figure below represents a map application that presents a map on one window segment and search results on another.

![Foldable with the left segment of the window containing a map and the right segment containing list of search results](example.png)

Note the example markup below is dependent on the proposal for Window Segments, which can be [found here](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Foldables/explainer.md).

```html
<!DOCTYPE html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @media (spanning: single-fold-vertical) {
    body {
      display: grid;
      margin: 0;
      height: 100vh;
      grid-template-columns: env(fold-left) calc(100vw - env(fold-right));
      grid-column-gap: calc(env(fold-right) - env(fold-left));
    }
    #map {
      grid-column: 1;
      grid-row: 1;
    }
    input[type=search] {
      /* overlay into same grid column as the map */
      grid-column: 1;
      grid-row: 1;

      /* position the search box at the bottom of the cell, centered */
      align-self: end;

      /* margin when keyboard not showing on left screen */
      margin: 20px;

      /* give it a little style */
      padding: 10px;
      font-size: 24px;
      border: 4px solid black;
      border-radius: 4px;
      background-color: #86DBF6;
    }
    #search-results {
      grid-column: 2;
      grid-row: 1;
    }

    @media (env(keyboard-right) <= env(fold-left)) {
      /* keyboard is on the left screen, adjust search box */
      #search {
        margin-bottom: calc(20px + env(keyboard-height));
      }
    }
  }
</style>
<div id="map">...</div>
<input type="search" placeholder="search...">
<div id="search-results">...</div>
<script type="module">
    navigator.virtualKeyboard.overlaysContent = true
</script>
```
