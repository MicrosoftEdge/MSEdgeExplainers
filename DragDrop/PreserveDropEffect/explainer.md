# Explainer: Preserving dropEffect values from dragover to drop events

## Authors:
- Rohan Raja (roraja@microsoft.com)

## Participate
- Chromium Bug: [Issue 40068941](https://issues.chromium.org/issues/40068941)
- Chromium Review: [CL 6818116](https://chromium-review.googlesource.com/c/chromium/src/+/6818116)
- Spec: [HTML5 Drag and Drop Specification](https://www.w3.org/TR/2011/WD-html5-20110113/dnd.html#dndevents)
- Open new issue: [Open New Issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?labels=PreserveDropEffect&title=%5BPreserveDropEffect%5D+%3CTITLE+HERE%3E)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Motivation](#motivation)
  - [Code Example](#code-example)
    - [Before](#before)
    - [After](#after)
  - [Real-World Use Case: File Manager](#real-world-use-case-file-manager)
- [Considered Alternatives](#considered-alternatives)
  - [Alternative 1: Keeping the Current Behavior](#alternative-1-keeping-the-current-behavior)
  - [Alternative 2: Exposing Both Values](#alternative-2-exposing-both-values)
  - [Alternative 3: Making dropEffect Read-Only During Drop](#alternative-3-making-dropeffect-read-only-during-drop)
- [Security and Privacy](#security-and-privacy)
- [Performance Impact](#performance-impact)
- [Interoperability](#interoperability)
- [References and Acknowledgements](#references-and-acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

The HTML5 Drag and Drop API allows web applications to handle drag-and-drop operations through a series of events: `dragstart`, `dragenter`, `dragover`, `dragleave`, `drop`, and `dragend`. During these events, the [`dataTransfer.dropEffect`](https://www.w3.org/TR/2011/WD-html5-20110113/dnd.html#dom-datatransfer-dropeffect) property indicates which operation (copy, move, link, or none) should be performed. According to the [HTML5 specification](https://www.w3.org/TR/2011/WD-html5-20110113/dnd.html#dndevents), the `dropEffect` value set by web applications during the last `dragover` event should be preserved and available in the subsequent `drop` event.

However, Chromium-based browsers were overwriting the web application's `dropEffect` value with the browser's own negotiated operation before the `drop` event fired, breaking specification compliance and limiting developer control over drag-and-drop behavior.

## User-Facing Problem

Web developers building applications with drag-and-drop functionality need to:
- Determine which operation was requested by the user during `dragover` (copy, move, or link)
- Use this information in the `drop` event handler to perform the appropriate action
- Provide consistent user feedback throughout the drag operation

Today in Chromium-based browsers, the `dropEffect` property is being reset by the browser before the `drop` event, making it impossible for developers to reliably determine what operation should be performed. This leads to:

```javascript
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy'; // Developer sets "copy" operation
  console.log('dragover dropEffect:', e.dataTransfer.dropEffect); // Logs: "copy"
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  console.log('drop dropEffect:', e.dataTransfer.dropEffect); // Previously: "none" or unpredictable
  
  // Developer cannot reliably determine which operation to perform
  if (e.dataTransfer.dropEffect === 'copy') {
    // This code path may not execute as expected
    performCopyOperation(e.dataTransfer);
  }
});
```

This inconsistency meant:
- Developers couldn't implement spec-compliant drag-and-drop behavior
- Drop handlers couldn't determine the intended operation reliably
- User expectations (based on cursor feedback during drag) might not match the actual behavior during drop
- Custom drag-and-drop implementations were unreliable across different browsers

## Goals

The goal of this feature is to ensure that the `dropEffect` value set by web applications during `dragover` event handlers is preserved and correctly reflected in the `drop` event, in compliance with the HTML5 specification. Specifically:

1. **Preserve Developer Intent**: Maintain the `dropEffect` value set by the web application during the last `dragover` or `dragenter` event through to the `drop` event
2. **Spec Compliance**: Align browser behavior with the HTML5 specification requirement that states: _"dropEffect will be set to the action that was desired, which will be the value dropEffect had after the last dragenter or dragover event"_
3. **Enable Consistent Behavior**: Allow developers to build reliable drag-and-drop interactions where the operation indicated during hover matches the operation available during drop

What developers can do with preserved `dropEffect`:

1. **Implement Operation-Specific Drop Logic**
   - Differentiate between copy, move, and link operations in the drop handler
   - Execute different code paths based on the user's intended operation
   - Provide appropriate feedback and confirmations based on the operation

2. **Build Consistent User Experiences**
   - Ensure the cursor feedback during drag matches the actual operation performed
   - Implement visual indicators that accurately reflect what will happen on drop
   - Build file managers, code editors, and other applications with reliable drag-and-drop

3. **Comply with Platform Conventions**
   - Respect modifier keys (Ctrl/Cmd for copy, etc.) properly
   - Match native application behavior for drag-and-drop operations
   - Provide familiar interactions for users

## Non-goals

This feature does not:
- Change the way [`effectAllowed`](https://www.w3.org/TR/2011/WD-html5-20110113/dnd.html#dom-datatransfer-effectallowed) is negotiated or processed
- Modify the cursor feedback during drag operations
- Alter the security model or permissions for drag-and-drop
- Add new drag-and-drop events or properties
- Change behavior for dragging between different windows or applications

## Motivation

The HTML5 specification clearly states that `dropEffect` should reflect the value set during the last `dragover` or `dragenter` event when the `drop` event fires. However, Chromium's implementation was overwriting this value with the browser's internal negotiated operation, breaking the specification and making it impossible for developers to build reliable drag-and-drop interactions.

This feature addresses:
- **Spec Compliance**: Aligns with the HTML5 Drag and Drop specification
- **Developer Control**: Returns control of the `dropEffect` property to web applications
- **Predictable Behavior**: Ensures the operation indicated during drag matches the operation available during drop
- **Cross-Browser Consistency**: Provides consistent behavior that developers can rely on

### Code Example

#### Before

```javascript
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy'; // Developer wants copy operation
  console.log('dragover dropEffect:', e.dataTransfer.dropEffect); // Logs: "copy"
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  console.log('drop dropEffect:', e.dataTransfer.dropEffect); // Logs: "none" (WRONG!)
  
  // Cannot determine the intended operation
  if (e.dataTransfer.dropEffect === 'copy') {
    performCopyOperation(e.dataTransfer); // This doesn't execute!
  } else if (e.dataTransfer.dropEffect === 'move') {
    performMoveOperation(e.dataTransfer);
  }
});
```

#### After

```javascript
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy'; // Developer wants copy operation
  console.log('dragover dropEffect:', e.dataTransfer.dropEffect); // Logs: "copy"
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  console.log('drop dropEffect:', e.dataTransfer.dropEffect); // Logs: "copy" (CORRECT!)
  
  // Can now reliably determine the intended operation
  if (e.dataTransfer.dropEffect === 'copy') {
    performCopyOperation(e.dataTransfer); // This executes as expected!
  } else if (e.dataTransfer.dropEffect === 'move') {
    performMoveOperation(e.dataTransfer);
  }
});
```

### Real-World Use Case: File Manager

```javascript
// Example: Building a web-based file manager
const fileManager = document.getElementById('fileManager');

fileManager.addEventListener('dragover', (e) => {
  e.preventDefault();
  
  // Check for modifier keys and set appropriate operation
  if (e.ctrlKey || e.metaKey) {
    e.dataTransfer.dropEffect = 'copy';
  } else if (e.shiftKey) {
    e.dataTransfer.dropEffect = 'move';
  } else if (e.altKey) {
    e.dataTransfer.dropEffect = 'link';
  } else {
    e.dataTransfer.dropEffect = 'move'; // Default operation
  }
  
  // Update UI to show which operation will be performed
  updateDropIndicator(e.dataTransfer.dropEffect);
});

fileManager.addEventListener('drop', (e) => {
  e.preventDefault();
  
  const files = Array.from(e.dataTransfer.files);
  
  // NOW we can reliably use dropEffect to determine what to do
  switch (e.dataTransfer.dropEffect) {
    case 'copy':
      copyFiles(files, e.target);
      showNotification('Files copied');
      break;
    case 'move':
      moveFiles(files, e.target);
      showNotification('Files moved');
      break;
    case 'link':
      createShortcuts(files, e.target);
      showNotification('Shortcuts created');
      break;
  }
});
```

## Considered Alternatives

### Alternative 1: Keeping the Current Behavior
This would continue to violate the HTML5 specification and limit developer capabilities. Developers would need to implement workarounds, such as:
- Storing the `dropEffect` value in a global variable during `dragover`
- Using custom data attributes to track the intended operation
- Abandoning the native `dropEffect` property entirely

**Rejected because**: This forces developers to work around the platform rather than use the standard API as designed.

### Alternative 2: Exposing Both Values
We could expose both the developer-set value and the browser-negotiated value through separate properties (e.g., `dataTransfer.requestedDropEffect` and `dataTransfer.actualDropEffect`).

**Rejected because**: This adds complexity without clear benefit. The specification already defines the expected behavior, and adding new properties would create additional interoperability challenges.

### Alternative 3: Making dropEffect Read-Only During Drop
We could make `dropEffect` read-only during the `drop` event to prevent confusion.

**Rejected because**: The specification allows reading `dropEffect` during drop, and making it read-only would break existing code that might check this value.

## Security and Privacy

This proposal has no known impact on security or privacy:

- **No New Data Exposure**: The `dropEffect` property already exists; this change only ensures its value is preserved correctly
- **No Permission Changes**: The drag-and-drop security model remains unchanged
- **Scoped to Web Content**: This only affects how web applications receive the `dropEffect` value; it does not change cross-origin or cross-application drag-and-drop behavior
- **User Control Maintained**: Users still control the drag-and-drop operation through modifier keys and drop location

The feature simply ensures that the value web applications set is the value they receive, without introducing new security surfaces.

## Performance Impact

This feature introduces minimal overhead:

- **No Additional Computation**: The browser already tracks the `dropEffect` value; this change only preserves it instead of overwriting it
- **Single Property Transfer**: Only one additional property value needs to be passed from the `dragover` handler to the `drop` event
- **No New Allocations**: No additional objects or data structures are created

## Interoperability

This feature improves interoperability by:

- **Aligning with the HTML5 Specification**: Implements the behavior defined in the [HTML5 Drag and Drop specification](https://www.w3.org/TR/2011/WD-html5-20110113/dnd.html#dndevents)
- **Reducing Browser Inconsistencies**: Provides consistent behavior that developers can rely on across browsers
- **Following Web Standards**: Respects the intent of the specification that web applications should control the `dropEffect` property

Web developers can now write drag-and-drop code that works consistently according to the specification, rather than working around browser-specific quirks.

## References and Acknowledgements

- [HTML5 Drag and Drop Specification](https://www.w3.org/TR/2011/WD-html5-20110113/dnd.html#dndevents)
- [Chromium Bug 40068941](https://issues.chromium.org/issues/40068941)
- [Chromium Code Review 6818116](https://chromium-review.googlesource.com/c/chromium/src/+/6818116)
- [MDN: DataTransfer.dropEffect](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect)

Many thanks for valuable feedback and code reviews from:
- [Avi Drissman](https://github.com/avi)
- [Kent Tamura](https://github.com/tkent-google)
- [Pranav Modi](https://github.com/pranavmodi)

---
