# clipboardchange event API explainer

## Authors:
- Rohan Raja (roraja@microsoft.com)

## Participate
Feature request: [Async Clipboard: Add support for 'clipboardchange' event [41442253] - Chromium](https://issues.chromium.org/issues/41442253)
Spec: [Clipboard API and events (w3.org)](https://www.w3.org/TR/clipboard-apis/#clipboard-event-clipboardchange)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [clipboardchange event API explainer](#clipboardchange-event-api-explainer)
  - [Authors:](#authors)
  - [Participate](#participate)
  - [Table of Contents](#table-of-contents)
  - [1. Introduction](#1-introduction)
  - [2. User scenarios](#2-user-scenarios)
    - [2.1 Scenario: Show available paste formats in web based editors](#21-scenario-show-available-paste-formats-in-web-based-editors)
      - [2.2.1 Copy multiple cells should show multiple paste options in Excel online](#221-copy-multiple-cells-should-show-multiple-paste-options-in-excel-online)
      - [2.2.2 Copy plain text should show only single paste option in Excel online](#222-copy-plain-text-should-show-only-single-paste-option-in-excel-online)
      - [2.2.3 Multiple paste options in Google sheets](#223-multiple-paste-options-in-google-sheets)
    - [2.2 Scenario: Sync clipboard with a remote desktop](#22-scenario-sync-clipboard-with-a-remote-desktop)
  - [3. Motivation - Alternative to inefficient polling of clipboard](#3-motivation---alternative-to-inefficient-polling-of-clipboard)
  - [4. Proposed Approach](#4-proposed-approach)
    - [4.1 Proposed IDL and example javascript code:](#41-proposed-idl-and-example-javascript-code)
      - [4.1.1 IDL changes](#411-idl-changes)
      - [4.1.2 Sample JS code](#412-sample-js-code)
    - [4.2 Clipboard data types - Available in event payload](#42-clipboard-data-types---available-in-event-payload)
    - [4.3 Clipboard contents - Not available in event payload](#43-clipboard-contents---not-available-in-event-payload)
    - [4.4 Permissions and Interop - No user permission required](#44-permissions-and-interop---no-user-permission-required)
        - [Pros](#pros)
        - [Cons](#cons)
    - [4.5 Page focus requirement](#45-page-focus-requirement)
        - [Pros](#pros-1)
        - [Cons](#cons-1)
    - [4.6 Event bubble up and cancellation](#46-event-bubble-up-and-cancellation)
  - [5 Alternatives considered](#5-alternatives-considered)
    - [5.1 Transient user activation requirement](#51-transient-user-activation-requirement)
        - [Pros:](#pros-2)
        - [Cons:](#cons-2)
    - [5.2 API Signature alternate: Use DataTransfer object of ClipboardEvent class](#52-api-signature-alternate-use-datatransfer-object-of-clipboardevent-class)
  - [6 Appendix](#6-appendix)
    - [6.1 APIs provided by all OS to listen to clipboardchange event:](#61-apis-provided-by-all-os-to-listen-to-clipboardchange-event)
    - [6.2 Permission prompt mechanism in various browsers](#62-permission-prompt-mechanism-in-various-browsers)
    - [6.3 Reading clipboard contents within the clipboardchange event handler](#63-reading-clipboard-contents-within-the-clipboardchange-event-handler)
    - [6.4 Custom clipboard data types and clipboardchange event](#64-custom-clipboard-data-types-and-clipboardchange-event)
  - [7 Open issues](#7-open-issues)
    - [7.1 Fencedframe](#71-fencedframe)
  - [8 References \& acknowledgements](#8-references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 1. Introduction

The `clipboardchange` event aims to provide an efficient and secure way of notifying web applications about changes to the system clipboard. This allows web applications to provide rich user experiences like dynamic contextual menu options based on available clipboard MIME types and ability to efficiently sync clipboard in web based virtual desktop clients.

Today, this can be achieved in Chromium by calling async clipboard read API in a polling approach (assuming clipboard-read permissions are granted) which is obviously inefficient. Also, polling is not feasible on [Firefox](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) and [Safari](https://webkit.org/blog/10855/async-clipboard-api/) as these browsers rely on combination of user activation and user gesture for reading clipboard through async API.

Hence `clipboardchange` event is being proposed. This event will be fired, in a secure manner by firing only when document is in focus and requiring that clipboard contents are not part of this event.

## 2. User scenarios

### 2.1 Scenario: Show available paste formats in web based editors
Web-based editors like Word Online, Excel Online, Google Sheets, and similar applications support paste operations in multiple formats, such as CSV, images, HTML, and plain text. These editors may have separate paste functionality depending on the data type which is pasted, hence the web UI might have different paste buttons for each data type. The clipboard change event can be used to detect the change in available formats in clipboard and reflect the same on the UI as soon as it is changed.

**Example scenario with clipboardchange event**: Imagine a user working on a report in Word Online. They copy a table from Excel, which is available in multiple formats: plain text, HTML, and CSV. As soon as the user copies the table, the `clipboardchange` event fires, and Word Online's UI updates to show buttons for "Paste as Text," "Paste as HTML," and "Paste as CSV." The user can then choose the most suitable format for their report with a single click, streamlining their workflow. 

**Scenario without clipboardchange event**: If the user copies plain text then without clipboardchange notification, the web page would continue showing the "Paste as HTML" and "Paste as image" options. Clicking on "Paste as image" would require the web page to show some kind of error message. This unnecessary error scenario can be avoided by monitoring the clipboard and disabling the un-needed data type buttons upon clipboard change, which would prevent user clicking the invalid type button in the first place.

#### 2.2.1 Copy multiple cells should show multiple paste options in Excel online
![](img/paste-format-1.png)

#### 2.2.2 Copy plain text should show only single paste option in Excel online
![](img/paste-format-2.png)

#### 2.2.3 Multiple paste options in Google sheets
![](img/google-sheets.png)

### 2.2 Scenario: Sync clipboard with a remote desktop
When a user copies text or an image on their local machine, a web-based remote desktop application can detect that clipboard contents have changed by listening for the `clipboardchange` event. Upon detecting the change (which happens when 'clipboardchange' event is triggered on the web app when the page regains focus), the application can re-read the clipboard and send the updated clipboard content to the remote desktop environment.

![](img/sync-clipboard-scenario.png)


## 3. Motivation - Alternative to inefficient polling of clipboard
Today, a web-app can monitor the system clipboard by polling and reading the clipboard through async clipboard API at regular intervals. However, polling is not efficient. Moreover, browsers like Firefox and Safari [require user gesture](#63-reading-clipboard-contents-within-the-clipboardchange-event-handler) for reading clipboard which makes polling infeasible in those browsers. This feature aims to introduce an efficient way of notifying web apps when clipboard changes which works in all browsers.
Additionally we must ensure that we monitor the clipboard only when absolutely required, that is, there is at least one document having required permissions and is listening to the clipboard change event. This will be described in design details.

## 4. Proposed Approach

### 4.1 Proposed IDL and example javascript code:

#### 4.1.1 IDL changes
```typescript
interface ClipboardChangeEvent : Event {
  readonly attribute FrozenArray<DOMString> types;
};
```

#### 4.1.2 Sample JS code
```javascript
  // Event handler for clipboardchange event which contains the data types present in clipboard
  function onClipboardChanged(event) {
    document.getElementById("text_paste_button").disabled = !(event.types.includes('text/plain'));
    document.getElementById("html_paste_button").disabled = !(event.types.includes('text/html'));
    document.getElementById("png_paste_button").disabled = !(event.types.includes('img/png'));
  }

  navigator.clipboard.addEventListener("clipboardchange", onClipboardChanged);
```

A sample web application which demonstrates the usage of "clipboardchange" event for showing available paste formats for rich web editors [Scenario 2.2](#21-scenario-show-available-paste-formats-in-web-based-editors) can be found [here](./clipboard-change-event-example-app.html).

### 4.2 Clipboard data types - Available in event payload

The ClipboardChange event object will have a types member that lists all the available native formats available on the clipboard. [Custom formats](#64-custom-clipboard-data-types-and-clipboardchange-event) will not be included in this list to minimize fingerprinting risk.

```typescript
interface ClipboardChangeEvent{
  types: Array<string>; // MIME types available in the clipboard when the event was fired
}
```
The types member can be used to detect available data types present on the clipboard and then reflect the same on the UI as per [this scenario](#21-scenario-show-available-paste-formats-in-web-based-editors).

### 4.3 Clipboard contents - Not available in event payload
[Clipboard contents](#63-reading-clipboard-contents-within-the-clipboardchange-event-handler) are not present as part of this event's payload as it can contain user sensitive data like passwords/security tokens.

### 4.4 Permissions and Interop - No user permission required 

Listening to the 'clipboardchange' event should not require any user permissions. Just knowing when the clipboard has changed, that too only when the page is in focus, should not pose any privacy concern. Letting the developers be informed about the presence of only the native data types (but not the actual data) also should not add to any security or privacy concern.
 
##### Pros
1.) Simpler implementation and user experience with no permission prompts / user gesture requirements.
2.) Provides feature interop out of box without need to implement new permissions.

##### Cons
1.) No support for custom clipboard data types in the event payload which anyways is not supported on all browsers.
 
### 4.5 Page focus requirement

The clipboardchange event will not fire if the target document is not focused. If clipboard changes occur while the document is not in focus, a single clipboardchange event will be fired when the document comes back into focus. Historical clipboard change information will not be available, only the available types when the page gained focus will be included in the types member.

##### Pros
1. This is in-line with current async clipboard focus APIs which require focus to access.

##### Cons
1. Might restrict web app scenarios which need to listen to clipboardchange events in the background.
2. Could result in a less responsive user experience if clipboard changes are detected with a delay - if clipboard got changed when the browser was in background, the event is fired only when the browser regains focus. The delay here is the duration between actual copy of contents to clipboard and firing of the clipboardchange event in browser.

### 4.6 Event bubble up and cancellation 
Since the clipboardchange event is not triggered by a user action and the event is not associated to any DOM element, hence this event doesn't bubble up and is not cancellable.

## 5 Alternatives considered

### 5.1 Transient user activation requirement
This approach allows the clipboardchange event to be fired for a short duration after the user loses page focus, such as up to 5 seconds. This ensures that clipboard changes occurring immediately after focus loss are still captured, enhancing user experience without compromising security.

##### Pros:
1. Clipboard changes occurring immediately after the user loses focus are still captured, ensuring the web app can respond promptly when the user returns.
Example: A web app can pre-process clipboard data while the user is in another application, reducing wait time when the user comes back.
2. Limits the duration for which clipboard monitoring is allowed after focus loss, reducing the risk of prolonged unauthorized access.

##### Cons:
1. The short duration might not be sufficient for some use cases where clipboard changes occur after the specified time.
2. Still requires monitoring for a brief period after focus loss, which could lead to resource usage if many pages implement this.
Example: Multiple tabs monitoring clipboard changes for 5 seconds could still cause a temporary spike in resource usage.

### 5.2 API Signature alternate: Use DataTransfer object of ClipboardEvent class

The clipboardchange event can be considered a [ClipboardEvent](https://www.w3.org/TR/clipboard-apis/#clipboard-event-interfaces) which includes a [DataTransfer](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) object as "clipboardData" property. This is similar to other clipboard related events like [cut](https://w3c.github.io/clipboard-apis/#clipboard-event-cut), [copy](https://w3c.github.io/clipboard-apis/#clipboard-event-copy) or [paste](https://w3c.github.io/clipboard-apis/#clipboard-event-paste) events. The clipboard types can be read using "clipboardData.types" property. However, methods to access actual clipboard data like "getData" won't be accessible. Calling these inaccessible methods would return an "undefined" or equivalent null value.  

```javascript
  // Event handler for clipboardchange event which contains the data types present in clipboard
  async function onClipboardChanged(event) {
    const clipboardTypes = event.clipboardData.types;
    document.getElementById("text_paste_button").disabled = !(clipboardTypes.includes('text/plain'));
  }

  navigator.clipboard.addEventListener("clipboardchange", onClipboardChanged);
```
One clear issue with this approach is that we are providing all the methods of DataTransfer API as part of this event even though only "types" property of DataTransfer is needed by this event.

## 6 Appendix

### 6.1 APIs provided by all OS to listen to clipboardchange event:

| OS            | API                                                                                                                                                                                                                                                                                                                         |
|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Windows       | We can use the [AddClipboardFormatListener](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-addclipboardformatlistener) function (winuser.h) which posts a [WM_CLIPBOARDUPDATE](https://learn.microsoft.com/en-us/windows/win32/dataxchg/wm-clipboardupdate) message whenever the clipboard changes. |
| MacOS         | No API provided, need to poll OS clipboard for changes                                                                                                                                                                                                                                                                      |
| Linux         | TBD                                                                                                                                                                                                                                                                                                                         |
| ChromeOS      | TBD                                                                                                                                                                                                                                                                                                                         |
| Android / iOS | TBD                                                                                                                                                                                                                                                                                                                         |

### 6.2 Permission prompt mechanism in various browsers

Today browser engines have different approaches to clipboard API permissions. While Chromium has [this permissions model](https://github.com/w3c/clipboard-apis/blob/main/explainer.adoc#clipboard-permissions) for clipboard, [Firefox](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) and [Safari](https://webkit.org/blog/10855/async-clipboard-api/) rely on combination of user activation and user gesture for web pages to access user clipboard contents. This strict requirement is present because a user's clipboard contents are highly sensitive and can contain private data like passwords, security tokens. 
 
**Permission prompt in Chromium**
![](img/chrome-permission-prompt.png)

**Permission prompt in Firefox**
![](img/firefox-paste-button.png)

### 6.3 Reading clipboard contents within the clipboardchange event handler

To get the changed clipboard data within the event handler, the [read](https://w3c.github.io/clipboard-apis/#dom-clipboard-read) or [readText](https://w3c.github.io/clipboard-apis/#dom-clipboard-readtext) methods of the [Async clipboard API](https://w3c.github.io/clipboard-apis/#async-clipboard-api) can be used, given the web page has sufficient permissions. Note that in browsers which don't have permission based access to clipboard (like Firefox), a call to async clipboard read might require user gesture like clicking paste tablet. In those browsers, web authors can instead show a "Sync" button on the UI, which can be enabled upon receiving clipboardchange event and disabled again once user clicks the "Sync" button. 

### 6.4 Custom clipboard data types and clipboardchange event

Custom clipboard data types are not part of this event because if custom MIME types are exposed (without user consent) a web page can know which applications a user is working on providing fingerprinting surface for malicious sites. With custom MIME types missing in the clipboardchange event payload, applications won't be able to show paste buttons related to custom MIME types for [this scenario](#20-scenario-show-available-paste-formats-in-web-based-editors). This should be acceptable since not all browsers support custom clipboard data types.

## 7 Open issues

### 7.1 Fencedframe

The clipboardchange event could be used as a communication channel between the host and the fencedframe, constituting a privacy threat. Hence the feasibility of this event within a fencedframe needs to be discussed.

## 8 References & acknowledgements

Many thanks for valuable feedback and advice from:

- Luke Klimek (zgroza@chromium.org)
- Mike Jackson (mjackson@microsoft.com)
- Prashant Nevase (pnevase@microsoft.com)
- Rakesh Goulikar (ragoulik@microsoft.com)
- Sanket Joshi (sajos@microsoft.com)
