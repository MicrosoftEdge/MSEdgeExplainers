# Title Bar Customization for Web Apps

## Table of Contents
 - [Introduction](#introduction)
 - [Examples of title bar customization on desktop apps](#examples-of-title-bar-customization-on-desktop-apps)
 - [Problem to solve: PWA Title bar area is system reserved](#problem-to-solve-pwa-title-bar-area-is-system-reserved)
 - [Goals](#goals)
 - [Proposal](#proposal)
   - [Overlaying Caption Controls](#overlaying-caption-controls)
   - [Working Around the Caption Control Overlay](#working-around-the-caption-control-overlay)
   - [Defining Draggable Regions in Web Content](#defining-draggable-regions-in-web-content)
 - [Example](#example)
 - [Privacy Considerations](#privacy-considerations)
 - [Open Questions](#open-questions)

## Introduction 

PWAs hosted within a user agent (UA) frame are able to declare which browser display mode best meets the needs of the application via the manifest file's [`display` member](https://developer.mozilla.org/en-US/docs/Web/Manifest/display). Currently, there are 4 supported values and their behaviors on Chromium browsers are described below:
- `fullscreen`: All of the available display is used and no UA chrome is shown. This is implemented only for mobile devices running Android or iOS.
- `standalone`: The web app looks like a standalone application. The title bar includes the title of the application, a web app menu button, and caption control buttons (minimize, maximize/restore, close). 
- `minimal-ui`: Similar to `standalone`, except it also contains a back and refresh button. 
- `browser`: Currently, the same as `minimal-ui`

Developers targeting non-mobile devices will find that none of the display modes above offer the ability to create an immersive, native-like title bar for their application. Instead, they must shift content down below the reserved title bar area, which can create a cramped application space especially on portable devices with smaller screens.

This explainer will examine different techniques that could be developed to provide more control of the title bar area to developers while still protecting the rights of users to manage the app window.

## Examples of title bar customization on desktop apps

The title bar area of desktop applications is customized in many popular applications. The title bar area refers to the space to the left or right of the caption controls (minimize, maximize, close etc.) and often contains the title of the application. On Windows, this area can be customized by the developer and apps based on Electron often reclaim this title bar space for frequently used UI like a search box, profile icon, new message icon etc.

### Visual Studio Code
Visual Studio Code is a popular code editor built on Electron that ships on multiple desktop platforms.

This screen shot shows how VS Code uses the title bar to maximize available screen real estate. They include the file name of the currently opened file and the top-level menu structure within the title bar space.

![Visual Studio Code title bar](VSCode.png)

### Spotify
Popular streaming music service Spotify is also built on Electron and they use the title bar space to maximize screen real estate to show the currently signed in user account, a search box and forward/back buttons designed specifically for the Spotify experience.

![Spotify title bar](Spotify.png)

### Microsoft Teams
Workplace collaboration and communication tool Microsoft Teams, also based on Electron for portability, customize the title bar in a similar fashion to Spotify, providing user information, a search and command bar and their own back/forward in-app navigation controls. 

![Microsoft Teams title bar on Mac](MSTeamsMac.png)

## Problem to solve: PWA Title bar area is system reserved

Contrast the above examples of popular desktop applications with the current limitation in the `standalone` display mode in Chromium based desktop PWAs.

![PWA Title bar not available for content](TwitterStandalone.png)

- The UA supplied title bar is styled by the browser (with input from the developer via the manifest's [`"display"`](https://developer.mozilla.org/en-US/docs/Web/Manifest/display) and [`"theme_color"`](https://developer.mozilla.org/en-US/docs/Web/Manifest/theme_color))
- The 3-dot menu is displayed beside the caption controls

None of this area is available to application developers. This is a problem where 
- screen real estate is at a premium when windowed apps have reduced viewport
- the developer is forced to make another area underneath the title bar for the application controls they'd like most prominently displayed
- UA supplied controls cannot be styled or hidden which takes away a developer's ability to fully control the app experience 

## Goals

- Provide a declarative way for developers to have the UA host their installed web app with the title bar area available for their content  
- Ensure accessible user control of the app window is maintained (at minimum - UA supplied minimize, close and drag caption controls)
- The UA respects the caption controls design of the host operating system while adapting to the applications color/theme 


## Proposal

The solution proposed in this explainer is in multiple parts
1. A new display modifier option for the web app manifest - `"caption-controls-overlay"`
2. New APIs for developers to query the bounding rects and other states of the UA provided caption controls overlay which will overlay into the web content area through a new object on the `window.navigator` property called `controlsOverlay`
3. A standards-based way for developers to define system drag regions on their content

### Overlaying Caption Controls
To provide the maximum addressable area for web content, the User Agent (UA) will create a frameless window removing all UA provided chrome except for a caption controls overlay.

The caption controls overlay ensures users can minimize, maximize or restore, and close the application, and also provides access to relevant browser controls via the web app menu. For Chromium browsers displayed in left-to-right (LTR) languages, the content will flow as follows, starting from the left/inner edge of the overlay:
- A draggable region that is the same width and height of each of the caption buttons
- The "Settings and more" three-dot button which gives users access to extensions, security information about the page, access to cookies, etc.
- The caption control buttons minimize, maximize/restore, and close. On operating systems that only support full screen windows, the maximize/restore button will be omitted.

![Caption Controls Overlay on an empty PWA](CaptionControlsOnly.png)

Additionally, there are two scenarios where other content will appear in the caption controls overlay. When these show or hide, the overlay will resize to fit, and a `resize` event will be fired on the `window` object. 
- When a PWA is launched, the origin of the page will display to the left of the three-dot button for a few seconds, then disappear.
- If a user interacts with an extension via the "Settings and more" menu, the icon of the extension will appear in the overlay to the left of the three-dot button. After clicking out of the modal dialog, the icon is removed from the overlay.

![Caption Controls Overlay with origin text displayed](CaptionControlsWithOrigin.png)

![Caption Controls Overlay with extension visible](CaptionControlsWithExtension.png)

For Chromium browsers displayed in right-to-left (RTL) languages, the order within the caption controls overlay will be flipped, and the overlay will appear in the upper-left corner of the client area. 

The caption controls overlay will always be on top of the web content's Z order and will accept all user input without flowing it through to the web content. See [Coordinate System](#coordinate-system).

If the OS and browser support a colored title bar, the caption controls overlay would use the `"theme_color"` from the manifest as the background color. When hovered over and clicked, the controls should honor the operating system design behavior. If a colored title bar is not supported, the caption controls overlay will be drawn in the theme supported by the OS and browser.

The desire to place content into the title bar area and use an overlay for the caption controls will be declared within the web app manifest by adding the `caption-controls-overlay` display modifier and setting display mode to `standalone`. This display modifier will be ignored on Android and iOS or when used in conjunction with any other `display` modes.

```json
{
  "display": "standalone",
  "display_modifiers": ["caption-controls-overlay"]
}
```

### Working Around the Caption Control Overlay
Web content will need to be aware of the UA reserved area of the caption controls overlay and ensure those areas aren't expecting user interaction. This overlay can be worked around similar to the way developers work around notches in a phone screen.

In the example of Windows operating systems, caption controls are either drawn on the upper right or upper left of the frame depending on which system language is in use:
- Left to right languages - close button shown on the upper right of the frame
- Right to left languages - close button shown on the upper left of the frame

The bounding rectangle of the caption controls overlay will need to be made available to the web content, as well as a property that describes the visibility of the overlay.

To accommodate these requirements, this explainer proposes a new object on the `window.navigator` property called `controlsOverlay`.

`controlsOverlay` would make available the following objects:
* `getBoundingRect()` which would return a [`DOMRectReadOnly`](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly) that represents the area under the caption controls overlay. Interactive web content should not be displayed beneath the overlay.
* `visible` a boolean to determine if the caption controls overlay has been rendered

For privacy, the `controlsOverlay` will not be accessible to iframes inside of a webpage. See [Privacy Considerations](#privacy-considerations) below

Whenever the overlay is resized, a `resize` event will be fired on the `window` object to notify the client that it should recalculate the layout based on the new bounding rect of the overlay. 

### Defining Draggable Regions in Web Content
Web developers will need a standards-based way of defining which areas of their content within the general area of the title bar should be treated as draggable. The proposed solution is to standardize the existing CSS property: `-webkit-app-region`. 

Chromium based browsers have a prefixed, non-standard CSS property `-webkit-app-region: drag` and `-webkit-app-region: no-drag` that allows developers to markup rectangular regions of their content as draggable. This property is used for full customization of the title bar for Electron based applications [referenced here](https://electronjs.org/docs/api/frameless-window#draggable-region).

Per the Electron documentation, text selection can accidentally occur within draggable regions, so it's recommended to also use the CSS property `user-select: none` on the element to avoid accidental text selection. 

Both of these webkit prefixed properties have been shipping in Chromium for some years and could be leveraged by the UA to provide a solution to this problem. This would require standardizing the app-region property through the CSS working group. 

### Resulting Changes in Browser

#### Coordinate System
The coordinate system will not be affected by the overlay, although content my be covered by the overlay.
- The point (0,0) will be the top left corner of the viewport. This point will fall _under_ the overlay if the overlay is in the top-left corner.
- `window.innerHeight` will return the full height of the client area including the area under the overlay. On operating systems which do not include borders around the window, `window.innerHeight === window.outerHeight`
- `vh` and `vw` units would be unaffected. They would still represent 1/100th of the height/width of the viewport which is also not affected by the overlay.

#### Omnibox-anchored Dialogs
Dialogs like print `[Ctrl+P]` and find in page `[Ctrl + F]` are typically anchored to the omnibox. 

![Search in a standard Chromisum window](searchBrowser.png)

With the omnibox hidden, PWAs anchor these elements to an icon to the left of the three-dot "Settings and more" button. To maintain consistency across all PWAs, the caption controls overlay will use this pattern as well.

![Search in a Chromium PWA](searchPWA.png)

## Example

Below is an example of how these new features could be used to create a web application with a custom title bar. 

![Example code as a PWA](CustomTitleBarExample.png)

### manifest.webmanifest
In the manifest, set `"display": "standalone"` and `"display_modifiers": ["caption-controls-overlay"]`. Set the `theme_color` to be the desired color of the title bar.
```JSON
{
  "name": "Example PWA",
  "display": "standalone",
  "display_modifiers": [ 
    "caption-controls-overlay" 
  ],
  "theme_color": "#254B85"
}
```

### index.html
There are two main regions below: the `titleBarContainer` and the `mainContent`. The `titleBar` is set to be `draggable` and the search box inside is set to be `nonDraggable`. 

Inside of the `titleBarContainer`, there is a `titleBar` element representing the visible portion of the title bar area.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <title>Example PWA</title>
    <link rel="stylesheet" href="style.css">
    <link rel="manifest" href="./manifest.webmanifest">
  </head>
  <body>
    <div id="titleBarContainer">
      <div id="titleBar" class=" draggable">
        <span class="draggable">Example PWA</span>
        <input class="nonDraggable" type="text" placeholder="Search"></input>
      </div>
    </div>
    <div id="mainContent"><!-- The rest of the webpage --></div>
  </body>
</html>
```

### style.css
The draggable regions are set using `app-region: drag` and `app-region: no-drag`. 

On the `body`, margins are set to 0 to ensure the title bar reaches to the edges of the window.

The `titleBarContainer` uses `position: absolute` and `top: 0` to fix itself to the top of the page. The height is set to `safe-area-inset-top` or to fall back to `--fallback-title-bar-height` if the caption controls overlay is not visible. The background color of the `titleBarContainer` is the same as the `theme_color`. 

The visible `titleBar` also uses `position: absolute` and `top: 0` to pin it to the top of the window. By default, it consumes the full width of the window. It also sets `user-select: none` to prevent any attempts at dragging the window to be consumed instead by highlighting text inside of the div.

If the caption controls overlay is on the right, then the `rightOverlay` class is added to the `titleBar`. This fixes the `titleBar` to the left side of the window and sets the `width` to be equal to the inset of the overlay from the left side of the window, `env(unsafe-area-top-inset-left)`. 

If the caption controls overlay is on the left, then the `leftOverlay` class is added to the `titleBar`. This fixes the `titleBar` to the right side of the window and sets the `width` to be equal to the inset of the overlay from the right side of the window, `env(unsafe-area-top-inset-right)`. 

The container for the `mainContent` of the webpage is also fixed in place with `position: absolute`. It sets `overflow-y: scroll` to allow its contents to scroll vertically within the container.

For cases where the browser does not support the caption control overlay, a CSS variable is added to set a fallback title bar height. The bounds of the `titleBarContainer` and `mainContent` are initially set to fill the entire client area, and do not need to be changed if the overlay is not supported.
```css
:root {
  --fallback-title-bar-height: 40px;
}

.draggable {
  app-region: drag;
}

.nonDraggable {
  app-region: no-drag;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
}

#titleBarContainer {
  position: absolute;
  top: 0;
  height: var(--safe-area-inset-top, var(--fallback-title-bar-height));
  width: 100%;
  background-color:#254B85;
}

#titleBar {
  position: absolute;
  top: 0;
  display: flex;
  user-select: none;
  height: 100%;
  width: 100%;

  color: #FFFFFF;
  font-weight: bold;
  text-align: center;
}

#titleBar.rightOverlay {
  left: 0;
  width: var(--unsafe-area-top-inset-left);
}

#titleBar.leftOverlay {
  right: 0;
  width: var(--unsafe-area-top-inset-right);
}

#titleBar > span {
  margin: auto;
  padding: 0px 16px 0px 16px;
}

#titleBar > input {
  flex: 1;
  margin: 8px;
  border-radius: 5px;
  border: none;
  padding: 8px;
}

#mainContent {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: env(safe-area-inset-top, var(--fallback-title-bar-height));
  overflow-y: scroll;
}
```

### app.js
The new Javascript APIs are used to get the bounds of the caption controls overlay and determine the layout of the `titleBar` element. Verify that the `controlsOverlay` APIs are supported in the browser, and return early if they are not. In CSS, the title bar was already laid out to fill the full width of the client view, so nothing more needs to be done if no overlay is displayed. If the `controlsOverlay` API is supported, then continue to lay out the UI.

Since the overlay could live either in the upper-left or upper-right corner of the viewport, the layout calculations must take into consideration both configurations. If the overlay is in the upper-right corner, the `x` coordinate of overlay will be non-zero, so `overlay.x` is used to determine whether the left and right insets should be `0` or `overlay.width`. 

After styling the `titleBar`, the top inset of the `mainContent` needs to be set as well (the rest of the insets are `0` and were already set in `style.css`). Fortunately, this just requires knowing the height of the overlay.

Since these position values are scaled when resizing the browser window--but the caption control overlay will not--each of these values will need to be reset each time the window is resized. 
```javascript
// initialize the title bar to avoid the caption control overlay which
// could be in either the top right or top left corner
const initializeTitleBar = () => {
  const titleBar = document.getElementById("titleBar");
  const rect = window.navigator.controlsOverlay.getBoundingRect();

  // rect.x will be 0 if the overlay is on the left
  if (rect.x === 0) {
    titleBar.classList.add("leftOverlay");
  } else {
    titleBar.classList.add("rightOverlay");
  }
};

if (window.navigator.controlsOverlay && window.navigator.controlsOverlay.visible) {
  initializeTitleBar();
}
```

## Security Considerations

Giving sites partial control of the title bar leaves room for developers to spoof content in what was previously a trusted, UA-controlled region. 

Currently in Chromium browsers, `standalone` mode includes a title bar which on initial launch displays the `title` of the webpage on the left, and the origin of the page on the right (followed by the "settings and more" button and the caption controls). After a few seconds, the origin text disappears. 

In RTL configured browsers, this layout is flipped such that the origin text is on the left. This open the caption controls overlay to spoofing the origin if there is insufficient padding between the origin and the right edge of the overlay. For example, the origin "evil.ltd" could be appended with a trusted site "google.com", leading users to believe that the source is trustworthy.  

![Standalone PWA in RTL format](RTL-standalone-titlebar.png) 

## Privacy Considerations

Enabling the caption control overlay and draggable regions do not pose considerable privacy concerns other than feature detection. However, due to differing sizes and positions of the caption control buttons across operating systems, the JavaScript API for `window.navigator.controlsOverlay.getBoundingRect()` will return a rect whose position and dimensions will reveal information about the operating system upon which the browser is running. Currently, developers can already discover the OS from the user agent string, but due to fingerprinting concerns there is discussion about [freezing the UA string and unifying OS versions](https://groups.google.com/a/chromium.org/forum/m/#!msg/blink-dev/-2JIRNMWJ7s/yHe4tQNLCgAJ). We would like to work with the community to understand how frequently the size of the caption controls overlay changes across platforms, as we believe that these are fairly stable across OS versions and thus would not be useful for observing minor OS versions.

Although this is a potential fingerprinting issue, it only applies to installed PWAs that use the custom title bar feature and does not apply to general browser usage. Additionally, the `controlsOverlay` API will not be available to iframes embedded inside of a PWA.

## Open Questions

### Open Questions: Overlaying Caption Controls
- Should the height of the title bar be customizable?
- If so, a fixed set of sizes (small, medium, large) or a pixel value that is constrained by the UA?

### Open Questions: Working Around the Caption Control Overlay
- Would it be valuable to an additional member,`window.navigator.controlsOverlay.controls` which has boolean member properties to provide information on which of the caption controls are currently being rendered? This would include `maximize`, `minimize`, `restore`, `close` among other values that are implementation specific, for example a small `dragRegion` area and `settings` menu.  

### Open Questions: Defining Draggable Regions in Web Content
- Different operating systems could have requirements for draggable regions. One approach could be to have a drag region that runs 100% width but only comes down a small number of pixels from the top of the frame. This could provide a consistent area for end users to grab and drag at the cost of reducing the addressable real estate for web content. Is this desirable?
- Could a DOM property on an element be used to identify drag regions on the content?
