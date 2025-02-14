# clipboardchange event API explainer

## Authors:
- Rohan Raja (roraja@microsoft.com)

## Participate
Feature request: [Async Clipboard: Add support for 'clipboardchange' event [41442253] - Chromium](https://issues.chromium.org/issues/41442253)
Spec: [Clipboard API and events (w3.org)](https://www.w3.org/TR/clipboard-apis/#clipboard-event-clipboardchange)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [1. Introduction](#1-introduction)
- [2. User scenarios](#2-user-scenarios)
  - [2.1 Scenario: Show available paste formats in web based editors](#21-scenario-show-available-paste-formats-in-web-based-editors)
    - [2.2.1 Copy multiple cells should show multiple paste options in Excel online](#221-copy-multiple-cells-should-show-multiple-paste-options-in-excel-online)
    - [2.2.2 Copy plain text should show only single paste option in Excel online](#222-copy-plain-text-should-show-only-single-paste-option-in-excel-online)
    - [2.2.3 Multiple paste options in Google sheets](#223-multiple-paste-options-in-google-sheets)
  - [2.2 Scenario: Sync clipboard with a remote desktop](#22-scenario-sync-clipboard-with-a-remote-desktop)
- [3. Motivation - Alternative to inefficient polling of clipboard](#3-motivation---alternative-to-inefficient-polling-of-clipboard)
- [4. Proposed Approach](#4-proposed-approach)
  - [4.1 Example javascript code for detecting clipboard changes:](#41-example-javascript-code-for-detecting-clipboard-changes)
  - [4.2 Permissions and Interop - No user permission required](#42-permissions-and-interop---no-user-permission-required)
      - [Pros](#pros)
      - [Cons](#cons)
  - [4.3 Page focus requirement](#43-page-focus-requirement)
      - [Pros](#pros-1)
      - [Cons](#cons-1)
  - [4.4 Event bubble up and cancellation](#44-event-bubble-up-and-cancellation)
  - [4.5 Clipboard contents - Not available](#45-clipboard-contents---not-available)
  - [4.6 Clipboard data types](#46-clipboard-data-types)
- [5 Alternatives considered](#5-alternatives-considered)
  - [5.1 Transient user activation requirement](#51-transient-user-activation-requirement)
      - [Pros:](#pros)
      - [Cons:](#cons)
  - [5.2 API Signature alternate: Use DataTransfer object of ClipboardEvent class](#52-api-signature-alternate-use-datatransfer-object-of-clipboardevent-class)
- [6 Appendix](#6-appendix)
  - [6.1 APIs provided by all OS to listen to clipboardchange event:](#61-apis-provided-by-all-os-to-listen-to-clipboardchange-event)
- [7 Open issues](#7-open-issues)
  - [7.1 Future permission prompting mechanisms](#71-future-permission-prompting-mechanisms)
  - [7.2 Fencedframe](#72-fencedframe)
- [8 References & acknowledgements](#8-references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 1. Introduction

The `clipboardchange` event aims to provide an efficient and secure way of notifying web applications about changes to the system clipboard. This allows web applications to provide rich user experiences like dynamic contextual menu options based on available clipboard MIME types and ability to efficiently sync clipboard in web based virtual desktop clients.

Today, this can be achieved by web developers in Chromium based browsers by calling async clipboard read API in a polling approach (assuming clipboard-read permissions are granted). This is inefficient as clipboard read API calls are expensive and it is resource-intensive to read entire clipboard data just to infer if the clipboard has changed. Also, polling is not feasible on [Firefox](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) and [Safari](https://webkit.org/blog/10855/async-clipboard-api/) as these browser engines rely on combination of user activation and user gesture for web pages to access user clipboard contents which means there will be a 'Paste' button presented requiring user interaction on every clipboard change and making polling infeasible.

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
Today, a web-app can monitor the system clipboard by polling and reading the clipboard through async clipboard API at regular intervals.
However, polling is not efficient and this feature aims to introduce an efficient way of notifying web apps when clipboard changes.
Additionally we must ensure that we monitor the clipboard only when absolutely required, that is, there is at least one document having required permissions and is listening to the clipboard change event. This will be described in design details.

## 4. Proposed Approach

### 4.1 Example javascript code for detecting clipboard changes:

```javascript
  // Event handler for clipboardchange event which contains the data types present in clipboard
  function onClipboardChanged(event) {
    document.getElementById("text_paste_button").disabled = !(event.types.includes('text/plain'));
    document.getElementById("html_paste_button").disabled = !(event.types.includes('text/html'));
    document.getElementById("png_paste_button").disabled = !(event.types.includes('img/png'));
  }

  // This will trigger a permission popup for "clipboard-types-read" / "clipboard-read" (if choice not already provided)
  navigator.clipboard.addEventListener("clipboardchange", onClipboardChanged);
```

A sample web application which demonstrates the usage of "clipboardchange" event for showing available paste formats for rich web editors [Scenario 2.2](#21-scenario-show-available-paste-formats-in-web-based-editors) can be found [here](./clipboard-change-event-example-app.html).

### 4.2 Permissions and Interop - No user permission required 
 
Today browser engines have different approaches to clipboard API permissions. While Chromium has [this permissions model](https://github.com/w3c/clipboard-apis/blob/main/explainer.adoc#clipboard-permissions) for clipboard, [Firefox](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) and [Safari](https://webkit.org/blog/10855/async-clipboard-api/) rely on combination of user activation and user gesture for web pages to access user clipboard contents. This strict requirement is present because a user's clipboard contents are highly sensitive and can contain private data like passwords, security tokens. However, we will see that core scenarios involving clipboardchange event does not require complete user clipboard contents and hence we propose a more lenient permissions approach, that works in all browsers, for this new API. 
 
**Permission prompt in Chromium**
![](img/chrome-permission-prompt.png)

**Permission prompt in Firefox**
![](img/firefox-paste-button.png)
 
With ClipboardChange event API, event would be fired to indicate there was a change to clipboard. Without any additional data or information provided with this event, there shouldn't be any privacy concern as there is no data exposed. As no data is exposed, no permissions are needed. Now let’s consider the use cases outlined in the explainer, especially the dynamic contextual menus and buttons appearing or not appearing with different MIME types available on clipboard([Scenario 2.2](#21-scenario-show-available-paste-formats-in-web-based-editors)). For this just firing the clipboard change event is not sufficient. Developers will need to know the available MIME types on clipboard to provide such capabilities on Web Platform. And a developer can know the available types if the browser provides Clipboard MIME types as part of payload on the ClipboardChange event.

Letting the developers be informed about the presence of common data types (but not the actual data) like TEXT, PNG or HTML should not result in or add to security or privacy concern. However, same cannot be said for custom MIME types because if custom MIME types are exposed (without user consent) a web page can know which applications a user is working on and this information can be used to identify users by a malicious webpage. Hence if custom MIME types are provided in the clipboardchange event payload, the event needs to be gated by a user permission. Hence custom MIME types would not be available in the event payload. And with custom MIME types missing in the clipboardchange event payload, applications won't be able to show paste buttons related to custom MIME types for [this scenario](#21-scenario-show-available-paste-formats-in-web-based-editors).

##### Pros
1.) Simpler implementation and user experience with no permission prompts.
2.) Provides feature interop out of box without need to implement new permissions.

##### Cons
1.) No support for custom clipboard data types in the event payload which anyways is not supported on all browsers.
 
### 4.3 Page focus requirement
We favour page required to be in focus to receive event, since this approach is inline with the current Async clipboard APIs and also reduces the possibility of misusing the clipboard change event in privacy related attacks. Also the approach has relatively lower resource usage.

We do fire "clipboardchange" event when the page regains focus, incase the clipboard contents had changed when the page was out of focus. Note that even if the clipboard had changed multiple times while the page was out of focus, we will only fire a single "clipboardchange" event when the page regains focus. This is because the event is designed to indicate that the clipboard contents are different from what they were when the page lost focus, rather than tracking every individual change that occurred while the page was out of focus.

##### Pros
1. This is in-line with current async clipboard focus APIs which require focus to access.

##### Cons
1. Might restrict web app scenarios which need to listen to clipboardchange events in the background.
2. Could result in a less responsive user experience if clipboard changes are detected with a delay - if clipboard got changed when the browser was in background, the event is fired only when the browser regains focus. The delay here is the duration between actual copy of contents to clipboard and firing of the clipboardchange event in browser.

### 4.4 Event bubble up and cancellation 
Since the clipboardchange event is not triggered by a user action and the event is not associated to any DOM element, hence this event doesn't bubble up and is not cancellable.

### 4.5 Clipboard contents - Not available
Clipboard contents are not present as part of this event's payload as per the security and privacy implications discussed before. 

To get the changed clipboard data within the event handler, the [read](https://w3c.github.io/clipboard-apis/#dom-clipboard-read) or [readText](https://w3c.github.io/clipboard-apis/#dom-clipboard-readtext) methods of the [Async clipboard API](https://w3c.github.io/clipboard-apis/#async-clipboard-api) can be used, given the web page has sufficient permissions. Note that in browsers which don't have permission based access to clipboard (like Firefox), a call to async clipboard read might require user gesture like clicking paste tablet. In those browsers, web authors can instead show a "Sync" button on the UI, which can be enabled upon receiving clipboardchange event and disabled again once user clicks the "Sync" button. 

### 4.6 Clipboard data types

The interface of the ClipboardChange event handler argument looks like following:

```typescript
interface ClipboardChangeEvent{
  types: Array<string>; // MIME types available in the clipboard when the event was fired
}
```

The data types available in the clipboard (that are accessible via async clipboard read API) after the clipboardchange event can be accessed in the event payload via "event.types" property. This should not introduce any serious privacy concerns since it would be very hard to distinguish a user based on type of data copied to clipboard, except for custom formats. There is a limited subset of types(that are accessible via async clipboard read API excluding custom data types) which will be present in the payload.

```javascript
  // Event handler for clipboardchange event which contains the data types present in clipboard
  async function onClipboardChanged(event) {
    const clipboardTypes = event.types;
    document.getElementById("text_paste_button").disabled = !(clipboardTypes.includes('text/plain'));
  }

  // This will trigger a permission popup for "clipboard-types-read" / "clipboard-read" (if choice not already provided)
  navigator.clipboard.addEventListener("clipboardchange", onClipboardChanged);
```

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

  // This will trigger a permission popup for "clipboard-types-read" / "clipboard-read" (if choice not already provided)
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

## 7 Open issues

### 7.1 Future permission prompting mechanisms

In future, we may have additional ways of prompting the user for permissions - 1) By explicitly requesting for "clipboard-read"/"clipboard-types-read" permission, the API for this is still under discussion (https://github.com/w3c/permissions/issues/158). 2) The user can be prompted for permissions just before the browser dispatches the "clipboardchange" event. This way, the permissions prompt would appear only when required by the browser however web authors won't have control over when the prompt would be triggered which might not be desirable.  

### 7.2 Fencedframe

The clipboardchange event could be used as a communication channel between the host and the fencedframe, constituting a privacy threat. Hence the feasibility of this event within a fencedframe needs to be discussed.

## 8 References & acknowledgements

Many thanks for valuable feedback and advice from:

- Luke Klimek (zgroza@chromium.org)
- Mike Jackson (mjackson@microsoft.com)
- Prashant Nevase (pnevase@microsoft.com)
- Rakesh Goulikar (ragoulik@microsoft.com)
- Sanket Joshi (sajos@microsoft.com)
