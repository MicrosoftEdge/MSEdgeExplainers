# Explainer: `InputEvent.dataTransfer` Feature in Chromium

## Authors:
- Pranav Modi (pranavmodi@microsoft.com)

## Participate
Feature request: [InputEvent#dataTransfer is null for contenteditable host and insertFromPaste input](https://issues.chromium.org/issues/401593412)
Spec: [Input Event Types](https://w3c.github.io/input-events/#overview)

## Introduction
This document explains the rationale, design, and implementation of the `InputEvent.dataTransfer` feature in Chromium. It outlines how this feature improves developer experience and aligns with web standards.

## Goals
The goal of this feature is to expose the `dataTransfer` property on `InputEvent` objects for specific input types (`insertFromPaste`, `insertReplacementText`, and `insertFromDrop`) in `contenteditable` contexts. This enables developers to access drag-and-drop and clipboard data during input events, improving support for rich text editors and other interactive content tools.

## Non-goals
This feature does not:
- Modify the behavior of form controls like `<input>` and `<textarea>`.
- Change the underlying drag-and-drop security model in Chromium.
- Introduce new input types or event interfaces.

## Motivation
The W3C Input Events Level 2 specification requires that `dataTransfer` be available for certain input types. Prior to this feature, Chromium did not expose `dataTransfer` on `InputEvent` for `insertFromPaste`, `insertReplacementText`, and `insertFromDrop`, resulting in inconsistent behavior across browsers and limiting developer capabilities.

This feature addresses:
- Spec compliance.
- Interoperability with Safari and Firefox.
- Developer needs for accessing drag-and-drop and clipboard data in editable content.

## Explainer
### What is it?
`InputEvent.dataTransfer` is a property that provides access to a `DataTransfer` object during input events triggered by paste, drop, or replacement actions. It allows developers to inspect and handle the data being inserted.

### Why now?
The feature was implemented to align Chromium with the W3C spec and other major browsers. It resolves a long-standing issue tracked in [Chromium Bug 401593412](https://issues.chromium.org/issues/401593412).

### How does it work?
The implementation consists of three CLs:
- [CL 6687446](https://chromium-review.googlesource.com/c/chromium/src/+/6687446): Adds `dataTransfer` to `insertFromPaste` events.
- [CL 6830870](https://chromium-review.googlesource.com/c/chromium/src/+/6830870): Adds `dataTransfer` to `insertReplacementText` events.
- [CL 6817846](https://chromium-review.googlesource.com/c/chromium/src/+/6817846): Adds `dataTransfer` to `insertFromDrop` events.

In each case, the `dataTransfer` property is attached only when the target is a `contenteditable` element, excluding form controls.

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

## Considered Alternatives
- Keeping the current behavior: This would continue to violate the spec and limit developer capabilities.
- Exposing `dataTransfer` for all elements: This was rejected to preserve existing behavior for form controls and avoid unintended side effects.

## Security and Privacy
The `dataTransfer` property is exposed only when the browser determines it is appropriate based on the input event type and context. It is scoped to `contenteditable` elements and does not alter Chromium’s drag-and-drop security model.

## Performance Impact
The feature introduces minimal overhead, as `dataTransfer` is conditionally attached only when relevant. No significant performance regressions were observed during testing.

## Interoperability
This feature aligns Chromium with the W3C Input Events Level 2 specification and matches behavior in Safari and Firefox. It improves cross-browser consistency for developers.

## References
- [Spec: Input Events Level 2](https://w3c.github.io/input-events/#dom-inputevent-datatransfer)
- [Bug: Chromium Issue 401593412](https://issues.chromium.org/issues/401593412)
- [CL 6687446](https://chromium-review.googlesource.com/c/chromium/src/+/6687446)
- [CL 6830870](https://chromium-review.googlesource.com/c/chromium/src/+/6830870)
- [CL 6817846](https://chromium-review.googlesource.com/c/chromium/src/+/6817846)
- [MDN: InputEvent.dataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/dataTransfer)

---
