# Clipboardchange event explainer document

## Authors:
- Rohan Raja (roraja@microsoft.com)

## Participate
Feature request: [Async Clipboard: Add support for 'clipboardchange' event [41442253] - Chromium](https://issues.chromium.org/issues/41442253)
Spec: [Clipboard API and events (w3.org)](https://www.w3.org/TR/clipboard-apis/#clipboard-event-clipboardchange)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [1. Introduction](#1-introduction)
- [2. Motivating Use Cases and scenarios](#2-motivating-use-cases-and-scenarios)
  - [2.1 Scenario: Sync clipboard with a remote desktop](#21-scenario-sync-clipboard-with-a-remote-desktop)
  - [2.2 Scenario: Show available paste formats in web based editors](#22-scenario-show-available-paste-formats-in-web-based-editors)
  - [2.3 Alternative to inefficient polling of clipboard](#23-alternative-to-inefficient-polling-of-clipboard)
- [3. Example javascript code for detecting clipboard changes:](#3-example-javascript-code-for-detecting-clipboard-changes)
- [4. Event spec details and open questions](#4-event-spec-details-and-open-questions)
  - [4.1 User permission requirement](#41-user-permission-requirement)
    - [4.1.1 clipboard-read permission required to listen to clipboardchange event](#411-clipboard-read-permission-required-to-listen-to-clipboardchange-event)
      - [Pros](#pros)
      - [Cons](#cons)
    - [4.1.2 Considered alternative: No permission required](#412-considered-alternative-no-permission-required)
      - [Pros](#pros-1)
      - [Cons](#cons-1)
  - [4.2 Page focus requirement](#42-page-focus-requirement)
    - [4.2.1 Page required to be in focus to receive event](#421-page-required-to-be-in-focus-to-receive-event)
      - [Pros](#pros-2)
      - [Cons](#cons-2)
    - [4.2.2 Considered alternative: No focus requirement](#422-considered-alternative-no-focus-requirement)
      - [Pros:](#pros)
      - [Cons:](#cons)
  - [4.3 Event bound to](#43-event-bound-to)
  - [4.4 Event bubbles](#44-event-bubbles)
  - [4.5 Event actions](#45-event-actions)
  - [4.6 Event handler additional arguments](#46-event-handler-additional-arguments)
- [5. Detailed design discussion](#5-detailed-design-discussion)
  - [5.1 Listen to clipboard change directly from the OS](#51-listen-to-clipboard-change-directly-from-the-os)
      - [Pros:](#pros-1)
      - [Cons:](#cons-1)
    - [5.1.1 APIs provided by all OS to listen to clipboardchange event:](#511-apis-provided-by-all-os-to-listen-to-clipboardchange-event)
      - [Windows](#windows)
      - [MacOS](#macos)
      - [Linux X11/Wayland](#linux-x11wayland)
      - [Android / iOS](#android--ios)
      - [ChromeOS](#chromeos)
  - [5.2 Considered alternative: Given the page focus restrictions, check clipboard hash change when page regains focus](#52-considered-alternative-given-the-page-focus-restrictions-check-clipboard-hash-change-when-page-regains-focus)
      - [Pros:](#pros-2)
      - [Cons:](#cons-2)
- [6 References & acknowledgements](#6-references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 1. Introduction

The clipboardchange event fires whenever the system clipboard contents are changed. This allows web-apps like remote desktop clients to stay in sync with the system clipboard. It provides an efficient alternative to polling the clipboard for changes.


## 2. Motivating Use Cases and scenarios

### 2.1 Scenario: Sync clipboard with a remote desktop
When a user copies text or an image on their local machine, the web-based remote desktop application can detect this clipboard change event through the browser's Clipboard API.
Upon detecting the change, the application can automatically send the new clipboard content to the remote desktop environment.

### 2.2 Scenario: Show available paste formats in web based editors
Web based editors like Excel Online, Word Online may support paste operation in multiple formats. Within the UI, it may show the available formats on the UI (like csv, image, plain text). The clipboard change event can be used to detect the change in available formats in clipboard and reflect the same on the UI as soon as it is changed. 

Similarly UI elements which depend on clipboard state, like "Paste image from clipboard" in an web based image editor, can be enabled/disabled using the clipboardchange event based on weather correct data format is present in clipboard or not.

### 2.3 Alternative to inefficient polling of clipboard
Today, a web-app can still monitor the system clipboard by polling and reading the clipboard through async clipboard API at regular intervals. 
However, this is not efficient and this feature aims to improve the efficiency of web apps to monitor the clipboard. 
We should still monitor the clipboard only when absolutely required - i.e. there is at least one document listening to the clipboard change event and has valid permissions.


## 3. Example javascript code for detecting clipboard changes:

```javascript
  function callback(event) {
      // Read clipboard contents using navigator.clipboard
      navigator.clipboard.readText().then(text => console.log(text));
  }
```

## 4. Event spec details and open questions

### 4.1 User permission requirement

#### 4.1.1 clipboard-read permission required to listen to clipboardchange event
Since the clipboard contains privacy-sensitive data, we should protect access to the clipboard change event using a user permission - clipboard-read. The web author should ensure that the site has the permission before it starts listening to this event. We should consider logging a warning message if the web author starts listening to clipboardchange without acquiring the permissions since web developers might miss integrating the permissions flow into their user experience.

Users can request permissions in two ways:
1. By performing a read operation like read or readText using Async clipboard API.
2. By explicitly requesting "clipboard-read" permission, the API for this is still under discussion (https://github.com/w3c/permissions/issues/158)

##### Pros
1. More defensive approach, guards against potential misuse of clipboard change event.
2. Ensures user consent before accessing clipboard data.

##### Cons
1. Not a clear user flow for requesting permissions.
2. Additional complexity for both implementation and web authors.

To simply further, we can prompt user for permissions as soon as the "addEventListener" method is called with "clipboardchange" in case the permissions are not already granted. This is still open for discussion as it is not a common pattern to prompt user for permissions when attaching event listeners.

#### 4.1.2 Considered alternative: No permission required
Since no data is being sent as part of the clipboardchange event, it can be argued that we don't need any permission to simply know when clipboard contents change. This will simplify the user flow as they don't need to explicitly ask for permissions before listening to the event.

##### Pros
1. Simpler implementation and user experience

##### Cons
1. Open to privacy attacks which simply monitor clipboard changes without user consent.

### 4.2 Page focus requirement
As per the current spec, we should not fire "clipboardchange" event when a page is not is focus. This is in-line with the current behavior where async clipboard API is not accessible unless the given page is in focus. We do fire the event when a page regains focus. (incase the clipboard contents changed meanwhile)

#### 4.2.1 Page required to be in focus to receive event

##### Pros
1. More defensive and prevents background scripts from misuse of clipboardchange events.
  1.a) Example - Malicious scripts can detect when a cryptocurrency wallet address is copied to clipboard and replace it with attacker's address and that way redirect payment to attacker's account.  
  1.b) Example - Passwords / authentication keys / access tokens are frequently copied to clipboard and can be retrieved by malicious scripts reading clipboard in background.
2. Can simplify implementation since browsers can simply check for clipboard change on page focus. However, this needs to be further investigated.
3. This is in-line with current async clipboard focus APIs which require focus to access.

##### Cons
1. Might restrict web app scenarios which need to listen to clipboardchange events in the background.
2. Could result in a less responsive user experience if clipboard changes are detected with a delay - if clipboard got changed when the browser was in background, the event is fired only when the browser regains focus. The delay here is the duration between actual copy of contents to clipboard and firing of the clipboardchange event in browser.

#### 4.2.2 Considered alternative: No focus requirement

##### Pros:
1. Opens possibility for more user scenarios 

##### Cons:
1. Might be open to misuse
2. Not much useful unless page focus requirement is removed from the async read/write clipboard API.
3. Could lead to higher resource consumption due to continuous monitoring.

### 4.3 Event bound to 
Window - Since this is a system level event

### 4.4 Event bubbles
No since it is bound to document only

### 4.5 Event actions
None - this event simply communicates with a web app that the system clipboard got changed. Hence performing “preventDefault” for this event has no effect.

### 4.6 Event handler additional arguments 
None - it is expected that the web app calls Async API to read the clipboard and get the changed clipboard contents. 

## 5. Detailed design discussion

### 5.1 Listen to clipboard change directly from the OS
In this approach, the browser process can have a singleton service which listens to clipboard change event using OS specific APIs. If the platform doesn't provide any OS specific APIs, then we can consider polling to obtain the clipboard change event. 

The browser process can then forward the clipboard change event to all listening renderer processes and fire the event after performing the page focus and user permissions check.

To optimize system resource consumption, we can ensure to only listen to the OS clipboard when there is at least one renderer process interested in the event.

High level design doc available [here](https://docs.google.com/document/d/1bY2pzV6PSX56fiFcrXEgOjpFen07xaxmnsM5dqXFE1U/edit#heading=h.i1vomwqlf6kt)


##### Pros:
1. Listening to change from a single source of truth, will cover all cases
2. Immediate detection of clipboard changes, providing real-time updates.
3. Simplifies the logic for detecting changes, as it relies on the OS's native capabilities.

##### Cons:
1. Might need polling for some OS like MacOS
2. Higher resource consumption due to continuous monitoring in case of polling.

#### 5.1.1 APIs provided by all OS to listen to clipboardchange event:

##### Windows 
We can use the [AddClipboardFormatListener](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-addclipboardformatlistener) function (winuser.h) which posts a [WM_CLIPBOARDUPDATE](https://learn.microsoft.com/en-us/windows/win32/dataxchg/wm-clipboardupdate) message whenever the clipboard changes. 
##### MacOS 
No API provided, need to poll OS clipboard for changes
##### Linux X11/Wayland
TODO
##### Android / iOS
TODO
##### ChromeOS
TODO

### 5.2 Considered alternative: Given the page focus restrictions, check clipboard hash change when page regains focus
On page focus event, we can check the current hash of the clipboard (using SequenceNumber API, readily available for all OS) and compare it with the previously stored hash to infer if the clipboard changed. This is an alternative to directly using OS provided APIs for monitoring clipboard. For clipboard changes occurring within the browser, we can easily obtain the clipboard change event from the renderer process.

However, this approach will not cover all scenarios as discussed below:

##### Pros:
1. Less dependency on OS level APIs, no need for polling on problematic OS like MacOS
2. Reduces the need for continuous monitoring, saving system resources.
3. Simplifies cross-platform implementation by relying on browser events.

##### Cons:
1. In case system clipboard is changed in background from a native app, then we won't know about it until next focus.
2. Page focus event can happen frequently, checking clipboard hash/sequence number might have perf impact
3. Dependency on page focus requirement, if changed in future, complete re-implementation would be required.
4. Increased complexity since the implementation is scattered across different components - one for page focus handling and other for changes happening within the web document.

## 6 References & acknowledgements

Many thanks for valuable feedback and advice from:

- Luke Klimek (zgroza@chromium.org)
- Prashant Nevase (pnevase@microsoft.com)
- Rakesh Goulikar (ragoulik@microsoft.com)
- Sanket Joshi (sajos@microsoft.com)
