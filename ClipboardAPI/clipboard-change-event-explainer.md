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
  - [2.1 Scenario: Sync clipboard with a remote desktop](#21-scenario-sync-clipboard-with-a-remote-desktop)
  - [2.2 Scenario: Show available paste formats in web based editors](#22-scenario-show-available-paste-formats-in-web-based-editors)
    - [2.2.1 Copy multiple cells should show multiple paste options in Excel online](#221-copy-multiple-cells-should-show-multiple-paste-options-in-excel-online)
    - [2.2.2 Copy plain text should show only single paste option in Excel online](#222-copy-plain-text-should-show-only-single-paste-option-in-excel-online)
    - [2.2.3 Multiple paste options in Google sheets](#223-multiple-paste-options-in-google-sheets)
- [3. Motivation - Alternative to inefficient polling of clipboard](#3-motivation---alternative-to-inefficient-polling-of-clipboard)
- [4. Example javascript code for detecting clipboard changes:](#4-example-javascript-code-for-detecting-clipboard-changes)
- [5. Event spec details and open questions](#5-event-spec-details-and-open-questions)
  - [5.1 User permission requirement](#51-user-permission-requirement)
    - [5.1.1 Approach 1 - clipboard-read permission required to listen to clipboardchange event](#511-approach-1---clipboard-read-permission-required-to-listen-to-clipboardchange-event)
      - [Pros](#pros)
      - [Cons](#cons)
    - [5.1.2 Approach 2 - No permission required](#512-approach-2---no-permission-required)
      - [Pros](#pros-1)
      - [Cons](#cons-1)
    - [5.1.3 Conclusion](#513-conclusion)
  - [5.2 Page focus requirement](#52-page-focus-requirement)
    - [5.2.1 Approach 1 - Page required to be in focus to receive event](#521-approach-1---page-required-to-be-in-focus-to-receive-event)
      - [Pros](#pros-2)
      - [Cons](#cons-2)
    - [5.2.2 Approach 2 - No focus requirement](#522-approach-2---no-focus-requirement)
      - [Pros:](#pros)
      - [Cons:](#cons)
    - [5.2.3 Approach 3 - Transient user activation](#523-approach-3---transient-user-activation)
      - [Pros:](#pros-1)
      - [Cons:](#cons-1)
    - [5.2.4 Conclusion](#524-conclusion)
  - [5.3 Event details](#53-event-details)
- [6. Detailed design discussion](#6-detailed-design-discussion)
  - [6.1 Listen to clipboard change directly from the OS](#61-listen-to-clipboard-change-directly-from-the-os)
      - [Pros:](#pros-2)
      - [Cons:](#cons-2)
  - [6.2 Considered alternative: Given the page focus restrictions, check clipboard hash change when page regains focus](#62-considered-alternative-given-the-page-focus-restrictions-check-clipboard-hash-change-when-page-regains-focus)
      - [Pros:](#pros-3)
      - [Cons:](#cons-3)
- [7 Appendix](#7-appendix)
  - [7.1 APIs provided by all OS to listen to clipboardchange event:](#71-apis-provided-by-all-os-to-listen-to-clipboardchange-event)
  - [7.2 Platform support for getting clipboard SequenceNumber/Version number](#72-platform-support-for-getting-clipboard-sequencenumberversion-number)
- [8. References & acknowledgements](#8-references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 1. Introduction

The clipboardchange event fires whenever the system clipboard contents are changed. This allows web-apps like remote desktop clients to be notified and respond to changes to the system clipboard. It provides an efficient alternative to polling the clipboard for changes.

## 2. User scenarios

### 2.1 Scenario: Sync clipboard with a remote desktop
When a user copies text or an image on their local machine, the web-based remote desktop application can detect that clipboard contents have changed by listening for the `clipboardchange` event. Upon detecting the change, the application can re-read the clipboard and send the updated clipboard content to the remote desktop environment.

![](img/sync-clipboard-scenario.png)


### 2.2 Scenario: Show available paste formats in web based editors
Web based editors like Word Online, Excel Online, Google Sheets, etc. may support paste operations in multiple formats. Within the UI, it may show the available formats like csv, image or plain text. The clipboard change event can be used to detect the change in available formats in clipboard and reflect the same on the UI as soon as it is changed.

#### 2.2.1 Copy multiple cells should show multiple paste options in Excel online
![](img/paste-format-1.png)

#### 2.2.2 Copy plain text should show only single paste option in Excel online
![](img/paste-format-2.png)

#### 2.2.3 Multiple paste options in Google sheets
![](img/google-sheets.png)

## 3. Motivation - Alternative to inefficient polling of clipboard
Today, a web-app can monitor the system clipboard by polling and reading the clipboard through async clipboard API at regular intervals.
However, polling is not efficient and this feature aims to introduce an efficient way of notifying web apps when clipboard changes.
Additionally we must ensure that we monitor the clipboard only when absolutely required, that is, there is at least one document having required permissions and is listening to the clipboard change event. This will be described in design details.

## 4. Example javascript code for detecting clipboard changes:

```javascript
  function callback(event) {
      // Read clipboard contents using navigator.clipboard
      navigator.clipboard.readText().then(text => console.log(text));
  }
  // Start listening to the clipboardchange event
  navigator.clipboard.addEventListener("clipboardchange", callback);
```

## 5. Event spec details and open questions

### 5.1 User permission requirement

#### 5.1.1 Approach 1 - clipboard-read permission required to listen to clipboardchange event
Since the clipboard contains privacy-sensitive data, we should protect access to the clipboard change event using a user permission - clipboard-read. The web author should ensure that the site has the permission before it starts listening to this event otherwise the provided event handler won't be invoked whenever the clipboard changes. To check if the current user has clipboard-read permissions for the site, the [query](https://www.w3.org/TR/permissions/#query-method) method of the [Permissions API](https://www.w3.org/TR/permissions/#permissions-api) can be used. We should consider logging a warning message if the web author starts listening to clipboardchange without acquiring the permissions since web developers might miss integrating the permissions flow into their user experience.

Web apps can request for the clipboard-read permissions by performing a read operation using one of [read](https://w3c.github.io/clipboard-apis/#dom-clipboard-read) or [readText](https://w3c.github.io/clipboard-apis/#dom-clipboard-readtext) methods of the [Async clipboard API](https://w3c.github.io/clipboard-apis/#async-clipboard-api). 

In future, we may have additional ways of prompting the user for permissions - 1) By explicitly requesting for "clipboard-read" permission, the API for this is still under discussion (https://github.com/w3c/permissions/issues/158). 2) The user can be prompted for permissions as soon as the "addEventListener" method is called with "clipboardchange" in case the permissions are not already granted. This is still open for discussion as it is not a common pattern to prompt user for permissions when attaching event listeners.

##### Pros
1. This approach aligns with the security model for other clipboard APIs and similar APIs that allow access to sensitive information.
2. Ensures user consent before accessing clipboard data.

##### Cons
1. This approach imposes a small restriction on web authors as they have to call a clipboard read API method before starting to listen for the clipboardchange event.

#### 5.1.2 Approach 2 - No permission required
Since no data is being sent as part of the clipboardchange event, it can be argued that we don't need any permission to simply know when clipboard contents change. This will simplify the user flow as they don't need to explicitly ask for permissions before listening to the event.

##### Pros
1. Simpler implementation and user experience

##### Cons
1. Open to privacy attacks which simply monitor clipboard changes without user consent.

#### 5.1.3 Conclusion
We favour Approach 1 i.e. having clipboard-read permission required to listen to clipboardchange event, because it has more provisions which safegaurds user privacy.

### 5.2 Page focus requirement
As per the [current spec](https://www.w3.org/TR/clipboard-apis/#clipboard-event-clipboardchange), we should not fire "clipboardchange" event when a page is not is focus. This is in-line with the current behavior where async clipboard API is not accessible unless the given page is in focus. We do fire "clipboardchange" event when the page regains focus, incase the clipboard contents had changed when the page was out of focus. Note that even if the clipboard had changed multiple times while the page was out of focus, we will only fire a single "clipboardchange" event when the page regains focus. This is because the event is designed to indicate that the clipboard contents are different from what they were when the page lost focus, rather than tracking every individual change that occurred while the page was out of focus.

#### 5.2.1 Approach 1 - Page required to be in focus to receive event

##### Pros
1. This is in-line with current async clipboard focus APIs which require focus to access.
2. Can simplify implementation since browsers can simply check for clipboard change on page focus. However, this needs to be further investigated.

##### Cons
1. Might restrict web app scenarios which need to listen to clipboardchange events in the background.
2. Could result in a less responsive user experience if clipboard changes are detected with a delay - if clipboard got changed when the browser was in background, the event is fired only when the browser regains focus. The delay here is the duration between actual copy of contents to clipboard and firing of the clipboardchange event in browser.

#### 5.2.2 Approach 2 - No focus requirement

##### Pros:
1. Opens possibility for more user scenarios - e.g. For example, a web app can make network calls in the background when a specific clipboard item is updated - before pasting an image, a web app might want to check the image for embedded malicious content using a remote service. If the app can be notified about a clipboard change in background, it can trigger the necessary network operations while the user is in another page or application. When the user returns, the web app is ready with the results, reducing the wait time.

##### Cons:
1. Might be open to misuse - a web app will be able to monitor the clipboard even when the user is interacting with other applications / pages.
2. May not be useful unless the page focus requirement is also removed from the async read/write clipboard API.
3. Could lead to higher resource consumption due to continuous monitoring. E.g. if a large number of pages are listening to the clipboardchange event, when the clipboard is changed, then all the pages will receive the event at once, which might put load on the system.

#### 5.2.3 Approach 3 - Transient user activation
This approach allows the clipboardchange event to be fired for a short duration after the user loses page focus, such as up to 5 seconds. This ensures that clipboard changes occurring immediately after focus loss are still captured, enhancing user experience without compromising security.

##### Pros:
1. Clipboard changes occurring immediately after the user loses focus are still captured, ensuring the web app can respond promptly when the user returns.
Example: A web app can pre-process clipboard data while the user is in another application, reducing wait time when the user comes back.
2. Limits the duration for which clipboard monitoring is allowed after focus loss, reducing the risk of prolonged unauthorized access.

##### Cons:
1. The short duration might not be sufficient for some use cases where clipboard changes occur after the specified time.
2. Still requires monitoring for a brief period after focus loss, which could lead to resource usage if many pages implement this.
Example: Multiple tabs monitoring clipboard changes for 5 seconds could still cause a temporary spike in resource usage.

#### 5.2.4 Conclusion
We favour Approach 1 - Page required to be in focus to receive event, since this approach is inline with the current Async clipboard APIs and also reduces the possibility of misusing the clipboard change event in privacy related attacks.

### 5.3 Event details 
Since the clipboardchange event is not triggered by a user action and the event is not associated to any DOM element, hence this event doesn't bubbles and is not cancellable.

There are two ways to get the changed clipboard data within the event handler:

1. Async Clipboard API - The [read](https://w3c.github.io/clipboard-apis/#dom-clipboard-read) or [readText](https://w3c.github.io/clipboard-apis/#dom-clipboard-readtext) methods of the [Async clipboard API](https://w3c.github.io/clipboard-apis/#async-clipboard-api) can be used to get the current contents of the system clipboard.

2. DataTransfer API - The clipboardchange event is a [ClipboardEvent](https://www.w3.org/TR/clipboard-apis/#clipboard-event-interfaces) that includes a [DataTransfer](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) object. This keeps the interface of this event consistent with other clipboard related events like [cut](https://w3c.github.io/clipboard-apis/#clipboard-event-cut), [copy](https://w3c.github.io/clipboard-apis/#clipboard-event-copy) or [paste](https://w3c.github.io/clipboard-apis/#clipboard-event-paste) events. The [getData](https://html.spec.whatwg.org/multipage/dnd.html#dom-datatransfer-getdata) method of DataTransfer interface can be used to retrieve the clipboard contents of a specific format.

## 6. Detailed design discussion

### 6.1 Listen to clipboard change directly from the OS
In this approach, a singleton service within the browser listens to clipboard change events using OS-specific APIs. If the platform doesn't provide any OS-specific APIs, polling can be used to detect clipboard changes.

The service can then forward the clipboard change event to all interested pages and fire the event after performing the necessary focus and user permissions checks. If the page is out of focus, the event won't be dispatched immediately but an internal flag will be set to dispatch a "clipboardchange" event as soon as the page regains focus.

To optimize for pages out of focus, we can stop listening to clipboard change events from the OS when the page loses focus. Upon regaining focus, we first check if the clipboard has changed by comparing clipboard hashes using the [SequenceNumber API](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getclipboardsequencenumber). If the hash is different from the previously stored one, a clipboardchange event is fired. We then restart listening to clipboard change events from the OS. This reduces system resource consumption since the browser won't need to process every clipboard change event occurring in the OS while the browser is not in focus.

Additionally, we ensure to only listen to the OS clipboard when there is at least one page interested in the event.

##### Pros:
1. Will provide clipboard change events with minimal resource consumptions since we are using OS level APIs to monitor the clipboard.
2. Will cover all cases that can trigger a system clipboard change since we are monitoring clipboard at the OS level.

##### Cons:
1. Might need polling for some OS like MacOS which can lead to higher resource consumption due to continuous monitoring

### 6.2 Considered alternative: Given the page focus restrictions, check clipboard hash change when page regains focus
For clipboard changes occurring within the browser, we should be able to detect and fire 'clipboardchange' event. For clipboard changes occurring from a different application, we simply need to ensure that the 'clipboardchange' event is fired when the web page regains focus. On page focus event, we can check the current hash of the clipboard (using a [SequenceNumber API](https://learn.microsoft.com/en-us/windows/win31/api/winuser/nf-winuser-getclipboardsequencenumber)) and compare it with the previously stored hash to infer if the clipboard changed and subsequently fire the event. However, in case the web app is currently in focus and the system clipboard is changed in background from a native application, then the web app won't be notified about it. Hence the previous design approach (6.1) is preferred for implementation. 

##### Pros:
1. Less dependency on OS level APIs, no need for polling where OS level API for clipboard change event is not provided.
2. Reduces the need for continuous monitoring, saving system resources.
3. Simplifies cross-platform implementation by relying on browser events.

##### Cons:
1. Doesn't capture all cases where a system clipboard can be changed.
2. Page focus event can happen frequently, checking clipboard hash/sequence number might have perf impact even though checking the sequence number should be a constant time operation. Accurate performance analysis of this approach is a TODO.
3. Dependency on page focus requirement - if we remove the page focus requirement in future, then we would need to re-implement a different design for monitoring system clipboard. Hence during the implementation, we need to ensure that the OS clipboard change detection module is decoupled from the rest of the modules.

## 7 Appendix

### 7.1 APIs provided by all OS to listen to clipboardchange event:

| OS            | API                                                                                                                                                                                                                                                                                                                         |
|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Windows       | We can use the [AddClipboardFormatListener](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-addclipboardformatlistener) function (winuser.h) which posts a [WM_CLIPBOARDUPDATE](https://learn.microsoft.com/en-us/windows/win32/dataxchg/wm-clipboardupdate) message whenever the clipboard changes. |
| MacOS         | No API provided, need to poll OS clipboard for changes                                                                                                                                                                                                                                                                      |
| Linux         | TBD                                                                                                                                                                                                                                                                                                                         |
| ChromeOS      | TBD                                                                                                                                                                                                                                                                                                                         |
| Android / iOS | TBD                                                                                                                                                                                                                                                                                                                         |

### 7.2 Platform support for getting clipboard SequenceNumber/Version number
For Mac and Windows, sequence number is represented by a system-provided signature of the clipboard and on ChromeOS, Linux and Android, a new number is generated every time the system clipboard changes. Chromium already has an [internal cross-platform implementation to retrieve clipboard sequence number](https://source.chromium.org/chromium/chromium/src/+/main:ui/base/clipboard/clipboard.h;drc=3c3f08441ba5bf5d49fbdb51410b28e54c4753fb;l=154).

## 8. References & acknowledgements

Many thanks for valuable feedback and advice from:

- Luke Klimek (zgroza@chromium.org)
- Prashant Nevase (pnevase@microsoft.com)
- Rakesh Goulikar (ragoulik@microsoft.com)
- Sanket Joshi (sajos@microsoft.com)
