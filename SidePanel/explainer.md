# Side Panel

## Authors:

- [Adolf Daniel](https://github.com/adolfdaniel)
- [Hoch Hochkeppel](https://github.com/mhochk)
- [Min Ren](https://github.com/renmin)
- [Sohum Chatterjee](https://github.com/sohchatt)

## Status of this Document

This document is a starting point for engaging the community and standards
bodies in developing collaborative solutions fit for the Web. As the solutions
to problems described in this document progress along the standards-track, we
will retain this document as an archive and use this section to keep the
community up-to-date with the most current standards venue and content location
of future work and discussions.

- This document status: _Active_
- Expected venue: [W3C Web Applications Working
  Group](https://www.w3.org/2019/webapps/) |
  [w3c/manifest](https://github.com/w3c/manifest/) 
- Current version: this document

## Introduction

Modern browsers have a side panel that can be used to display additional
information about the current page or provides a way to browse side-by-side.
This proposal aims to standardize the side panel and its API. The new side panel
API will allow developers to declare support for the side panel and to control
their web content in the side panel.

## Motivation

The side panel is a new feature in Microsoft Edge that allows the user to view
additional information about the current page or browse side-by-side. The side
panel is a new way for the user to interact with the web. The side panel
currently does not allow developers to control the appearance of their web
content in the side panel. The side panel API will allow developers to control
their web content in the side panel.

![Side by side browsing](side-by-side.png)

## Goals

The goals of the side panel API are:

- To provide a way for developers to allow their web application to be promoted
  as a side-by-side web application.
- To provide a way for developers to control their web application appearance
  on the side panel via Client Hints.

## Non-Goals

The side panel API not intended to be used for:

- Displaying a web application in a side panel that is not of the same origin.

## Use Cases

The side panel API is intended to be used by web applications that want to
provide a side-by-side experience. The browsers can promote the web application
that supports the side panel API as a side-by-side web application. The browser
can also provide a way for the user to pin the web application to the side panel
so that the user can easily access the web application as a side-by-side web
application.

## Proposed Solution

### Display Mode

Add a new `side-panel` display mode which a developer can include in their
`display_override` to indicate support for the side panel.

```json
"display_override": ["side-panel"]
```

As a display mode, the developer can easily detect being rendered in this fashion
via CSS or JavaScript.

```css
@media all and (display-mode: side-panel) {
  /* Styling for when in the side panel. */
}
```

```js
if (window.matchMedia('(display-mode: side-panel)').matches) {
  // The web application is being displayed in the side panel.
}
```

And when display mode is surfaced generically via request headers, it will
be detectable there as well (see [crbug.com/1174843](https://crbug.com/1174843),
[Display Mode Client Hint](https://github.com/WICG/manifest-incubations/blob/gh-pages/display_mode-client-hint.md))

### Additional Configuration

Add a new `side_panel` manifest member which allows additional customization
specific to the side panel. The value of this property is an object with a single
optional `preferred_width` property, used to declaring the width in CSS pixels
that the developer would like the web application to be rendered. In the future,
additional optional properties may be added.

```json
{
  "name": "Side Panel Web App",
  "short_name": "Side Panel",
  "icons": [
    {
      "src": "icon/lowres.png",
      "sizes": "64x64",
      "type": "image/png"
    },
    {
      "src": "icon/hd_hi.png",
      "sizes": "128x128 256x256",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "display_override": ["side_panel"],
  "side_panel": {
    "preferred_width": 600
  }
}
```

## Security and Privacy Considerations

The side panel API does not introduce any new security or privacy
considerations.
