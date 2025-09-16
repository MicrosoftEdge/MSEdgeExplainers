# Explainer: [`InputEvent.dataTransfer`](https://w3c.github.io/input-events/#dom-inputevent-datatransfer) Feature For [`Contenteditable`](https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable) Host


## Authors:
- Pranav Modi (pranavmodi@microsoft.com)

## Participate
- Feature request: [InputEvent#dataTransfer is null for contenteditable host and insertFromPaste input](https://issues.chromium.org/issues/401593412)
- Spec: [Input Event Types](https://w3c.github.io/input-events/#overview)
- Issue Tracker: [Issue Tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/DataTransferForInputEvent)
- Open new issue: [Open New Issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=pranavmodi&labels=DataTransferForInputEvent&template=data-transfer-for-input-event.md&title=%5BData+Transfer+For+Input+Event%5D+%3CTITLE+HERE%3E)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Motivation](#motivation)
- [Explainer](#explainer)
  - [What is it?](#what-is-it)
  - [Why now?](#why-now)
  - [How does it work?](#how-does-it-work)
  - [Code Example](#code-example)
    - [Before the Fix](#before-the-fix)
    - [After the Fix](#after-the-fix)
- [Considered Alternatives](#considered-alternatives)
- [Security and Privacy](#security-and-privacy)
- [Performance Impact](#performance-impact)
- [Interoperability](#interoperability)
- [References and Acknowledgements](#references-and-acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Introduction

Modern web applications rely heavily on rich text editing experiences, especially within [`contenteditable`](https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable) elements. [`InputEvent.dataTransfer`](https://w3c.github.io/input-events/#dom-inputevent-datatransfer) is a property that provides access to a [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) object during input events triggered by paste, drop, or replacement actions. It allows developers to inspect and handle the data being inserted. However, developers have long faced limitations when handling paste and drop operations due to the absence of the [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) property on [Input Event Types](https://w3c.github.io/input-events/#overview) objects. This explainer introduces a new feature that exposes [`InputEvent.dataTransfer`](https://w3c.github.io/input-events/#dom-inputevent-datatransfer) for specific input types [`insertFromPaste`, `insertReplacementText`, and `insertFromDrop`](https://w3c.github.io/input-events/#overview) within [`contenteditable`](https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable) contexts. The feature was implemented to align with the [`W3C spec`](https://www.w3.org/TR/input-events-2/).

## User-Facing Problem
A user pastes formatted content (e.g., bold text, lists, links) into a custom editor. The developers listening to the input event with inputType = "insertFromPaste" in the following example couldn’t access [`InputEvent.dataTransfer`](https://w3c.github.io/input-events/#dom-inputevent-datatransfer) — it was null.

```html
<p contenteditable="true">
  Go on, try pasting some content into this editable paragraph and see what
  happens!
</p>

<p class="result"></p>
```

```js
const editable = document.querySelector("p[contenteditable]");
const result = document.querySelector(".result");
editor.addEventListener("input", (event) => {
  result.textContent = event.dataTransfer.getData("text/html"); // Fails as error - Cannot read properties of null (reading 'getData')
  if (event.inputType === "insertFromPaste" && event.dataTransfer) { // fails on the second condition and lines 49, 50 and so on not executed.
    const html = event.dataTransfer.getData("text/html");
    const text = event.dataTransfer.getData("text/plain");
    // Use html/text for sanitization, logging, or formatting
  }
});
```
When [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) was NULL, Users

- Couldn’t access the actual content being pasted or dropped.
- Couldn’t differentiate between rich and plain text.
- Couldn’t intercept or sanitize HTML before it was rendered.
- Couldn’t process dropped files without relying on separate drop event listeners.
- Couldn’t build consistent logic across beforeinput, input, and drop events.

Exposing [`InputEvent.dataTransfer`](https://w3c.github.io/input-events/#dom-inputevent-datatransfer) bridges the gap between browser-native behavior and developer control, enabling features that were previously impossible or unreliable.

After the fix, [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) is exposed on the input event, enabling full control over `dataTransfer` attributes. The web app now has access to the data which got pasted/dropped which it can use to perform operations like formatting, sanitizing (we can avoid logging since it can raise privacy concerns). Also, we provide the missing capability to the `inputEvent` fired on drag/drop, clipboard paste etc. to have `dataTransfer` populated and web devs can use this simple event to handle input processing for all sceanarios instead of hooking to individual events like ondrop, onpaste (ontype).

## Goals
The goal of this feature is to expose the [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) property on [`InputEvent`](https://w3c.github.io/input-events/#interface-InputEvent) objects for specific input types [`insertFromPaste`, `insertReplacementText`, and `insertFromDrop`](https://w3c.github.io/input-events/#overview) in [`contenteditable`](https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable) contexts. This enables developers to access drag-and-drop and clipboard data during input events, improving support for rich text editors and other interactive content tools.
What developers can do with [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer)
1. Access Rich Clipboard Data
   - Developers can inspect dataTransfer.getData("text/html") to:
     - Sanitize pasted HTML for security.
     - Preserve formatting in custom editors.
     - Detect and block unwanted content (e.g., scripts, tracking pixels).

2. Customize Paste/Drop Behavior
   - Developers can override default behavior based on:
     - MIME types in dataTransfer.items.
     - Source metadata (e.g., URLs, app-specific formats).
     - User intent (e.g., distinguish between plain text and rich content).

3. Audit and Logging
   - Developers can log what was pasted or dropped for:
     - Accessibility tracking.
     - Undo/redo history.
     - Security audits.

4. Improve Accessibility and UX
   - For spelling corrections (insertReplacementText), developers can:
     - Track automated vs manual changes.
     - Provide visual feedback or undo options.
     - Integrate with grammar tools or custom dictionaries.

## Non-goals
This feature does not:
- Modify the behavior of form controls like [`<input>`](https://html.spec.whatwg.org/multipage/input.html#the-input-element) and [`<textarea>`](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element).
- Change the underlying drag-and-drop security model.
- Introduce new input types or event interfaces.

## Motivation
The W3C Input Events Level 2 specification requires that [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) be available for certain input types. Prior to this feature, Chromium did not expose [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) on [`InputEvent`](https://w3c.github.io/input-events/#interface-InputEvent) for [`insertFromPaste`, `insertReplacementText`, and `insertFromDrop`](https://w3c.github.io/input-events/#overview), resulting in inconsistent behavior across browsers and limiting developer capabilities.

This feature addresses:
- Spec compliance.
- Interoperability with Safari and Firefox.
- Developer needs for accessing drag-and-drop and clipboard data in editable content.

### Code Example
#### Before the Fix
```javascript
editor.addEventListener("input", (event) => {
  console.log(event.inputType); // e.g., "insertFromDrop"
  console.log(event.dataTransfer); // null
});
```

#### After the Fix
```javascript
editor.addEventListener("input", (event) => {
  console.log(event.inputType); // e.g., "insertFromDrop"
  console.log(event.dataTransfer); // non-null
  if (event.dataTransfer) {
    console.log("Dropped plain data:", event.dataTransfer.getData("text/plain"));
    console.log("Dropped html data:", event.dataTransfer.getData("text/html"));
  }
});
```
In the implementation, [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) property is attached only when the target is a [`contenteditable`](https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable) element, excluding form controls ([`input`](https://html.spec.whatwg.org/multipage/input.html#the-input-element) or [`textarea`](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)).

## Considered Alternatives
- Keeping the current behavior: This would continue to violate the spec and limit developer capabilities.
- Exposing [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) for all elements: This was rejected to preserve existing behavior for form controls and avoid unintended side effects.

## Security and Privacy
This proposal has no known impact on accessibility or privacy and does not alter the permission or security model. The [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) property is exposed only when the browser determines it is appropriate based on the input event type and context. It is scoped to [`contenteditable`](https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable) elements and does not alter drag-and-drop security model.

## Performance Impact
The feature introduces minimal overhead, as [`dataTransfer`](https://html.spec.whatwg.org/multipage/dnd.html#datatransfer) is conditionally attached only when relevant. No significant performance regressions were observed during testing.

## Interoperability
This feature aligns with the [`W3C Input Events Level 2 specification`](https://www.w3.org/TR/input-events-2/) and matches behavior in Safari and Firefox. It improves cross-browser consistency for developers.

## References and Acknowledgements 
- [Spec: Input Events Level 2](https://w3c.github.io/input-events/#dom-inputevent-datatransfer)
- [Bug: Chromium Issue 401593412](https://issues.chromium.org/issues/401593412)
- [MDN: InputEvent.dataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/dataTransfer)

Many thanks for valuable feedback and advice from:
- [Rohan Raja](https://github.com/roraja)
- [Rakesh Goulikar](https://github.com/ragoulik)
- [Samba Murthy Bandaru](https://github.com/sambandaru)
---
