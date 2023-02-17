
# Delayed Clipboard Rendering

Authors: [Ana Sollano Kim](https://github.com/anaskim), [Anupam Snigdha](https://github.com/snianu)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **`ARCHIVED`**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/DelayedClipboard/DelayedClipboardRenderingExplainer.md**

## Introduction

Delayed clipboard rendering is the ability to delay the generation of a particular payload until it is needed by the target applications. It is useful when source applications support several clipboard formats, some or all of which are time-consuming to render. Delayed clipboard rendering enables web authors to specifically mark delayed rendered payloads and avoid producing them if they’re not requested by target applications. Currently, delayed rendering is supported in Linux, Mac OS X, and Windows.

## Background

In web applications, the clipboard can be accessed via the Data Transfer and Asynchronous Clipboard APIs, which provide methods to read and write supported formats from and to the system clipboard. Data Transfer APIs can only be accessed via JS events that block the main thread. If the clipboard payload is huge, performance is affected. The Asynchronous Clipboard API solves this by allowing asynchronous copy/paste operations, thus not blocking the main thread. In this document we will focus on the Asynchronous Clipboard API.

Quoting from the [editor's draft](https://w3c.github.io/clipboard-apis/#clipboard-item-interface):
> A clipboard item is conceptually data that the user has expressed a desire to make shareable by invoking a "cut" or "copy" command. A clipboard item serves two purposes. First, it allows a website to read data copied by a user to the system clipboard. Second, it allows a website to write data to the system clipboard.

A clipboard item may have multiple representations described by a MIME type. A target application, usually in response to the user performing a paste operation, will read one or more representations from the clipboard. The source application typically does not know where the user intends to paste the content at the time of copy, so the author must produce several formats when writing to the clipboard to prepare for many possible target applications. The generation of all representations may take enough time that it is noticeable to the user and it is unlikely that the target application will need all produced representations.

The ability to delay the generation of clipboard data until it is needed is important for applications that support data types that are expensive to generate. Source applications would be able to indicate which representations they support for a clipboard item and wait until the target application attempts to access a particular representation before generating the data for it.

## Goal

Leverage the existing Async Clipboard API to allow websites exchange large data payloads and improve performance by only producing clipboard payload when it’s needed by target applications.

## Non-Goals

* Modify the Data Transfer API
* Replace the current functionality of the Async Clipboard API, as delayed clipboard rendering would be used at the discretion of web authors and only in the formats of their choosing.

## Proposed solution: Map of MIME type to promise in `ClipboardItem` constructor

With this proposal, we will be adding a new argument to the `ClipboardItem` constructor which takes a map of a MIME type to a callback. Authors should still be able to produce some formats immediately, so they may define the usual map with a MIME type as the key and a Blob as the value for formats that they don’t want to be delayed rendered. An example is shown below:

```js
const textInput = '<style>p {color:blue}</style><p>Hello World</p>';
const blobInput = new Blob([textInput], {type: 'text/html'});
const delayedCallbacksMap = {
  'image/png': generateExpensiveImageBlob,
  'web application/x-custom-format-clipboard-format': generateExpensiveCustomFormatBlob
};
const clipboardItemInput = new ClipboardItem({'text/html': blobInput}, delayedCallbacksMap);
navigator.clipboard.write([clipboardItemInput]);
```

In the example, the functions `generateExpensiveImageBlob()` and `generateExpensiveCustomFormatBlob()` return a [Blob](https://w3c.github.io/FileAPI/#blob-section). The blob constructor takes in the content that will be written to the clipboard and its type.

```js
function generateExpensiveCustomFormatBlob() {
  var inputData = ...;

  // Produce expensive input data.

  return new Blob([inputData], { type: 'web application/x-custom-format'});
}
```

## Considered alternative: Map of MIME type to promise in new method

An alternative to this is to use a new method, called `addDelayedWriteCallback`, that takes in a map of formats to callbacks. As the the `ClipboardItem` constructor remains the same, web authors that want to adopt delayed clipboard rendering in their existing web applications will be able to move the generation of data to the callbacks map and pass it to `addDelayedWriteCallback`, without needing to change their existing `ClipboardItem` constructor. If the web author doesn't provide a delayed rendering callback or data, then an error is thrown in the source application and the write operation fails. An example of this proposal is shown below:

```js
const delayedFunctionsMap = {
  'image/png': generateExpensiveImageBlob,
  'text/html': generateExpensiveHTMLBlob
};
navigator.clipboard.addDelayedWriteCallback(delayedFunctionsMap);
const blobInput1 = new Blob([], {type: 'image/png'});
const blobInput2 = new Blob([], {type: 'text/html'});
const clipboardItemInput = new ClipboardItem({['image/png']: blobInput1, ['text/html']: blobInput2,});
navigator.clipboard.write([clipboardItemInput]);
```

Similarly to the proposed solution example, `generateExpensiveImageBlob` and `generateExpensiveHTMLBlob` return a [Blob](https://w3c.github.io/FileAPI/#blob-section) that should have the content that will be written to the clipboard and its type.

The disadvantage of the latter approach is that it adds overhead to the web author, as it is a new function for them to learn. **As a result, we think that adding a new argument to the `ClipboardItem` constructor is the preferred solution.**

## Privacy and Security Considerations

### Privacy

No considerable privacy concerns are expected, but we welcome community feedback.

### Security

This feature works with mandatory data types and custom formats, it does not change the sanitization (or lack thereof) of the clipboard's payload. Websites need to explicitly state which formats will be delayed rendered and provide functions to do so, legacy apps will not suffer any changes. A user gesture requirement (transient user activation) and existing async clipboard API security measures (focus document, permission prompts) will remain as they are.

## Open Questions

* What should happen if the user attempts to paste the content in a target application, but they have already closed the tab where the async data is supposed to be produced? We’ve identified three alternatives to address this issue:
  * Generate the clipboard data, which would override the author’s decision of delaying it until needed by a target application but prevents loss of information.
  * Asking the user if they would like to preserve contents on the clipboard before the app closes, which would require adding an extra step to close the tab.
  *  Throwing the contents of the clipboard away, which is in line with avoiding the production of expensive payloads that won’t be needed by a target application.
* Are there target applications or operating systems that expect data to be immediately available when the user tries to paste the content of the clipboard? If so, what should happen with the generation of data? Two main alternatives considered:
  * Ignoring the delayed formats completely and or throwing an error. This would add burden to the web authors as they would have to handle that case.
  * Producing the contents of delayed formats immediately.
* What should the result of `getType()` be? There are two main alternatives:
  * Generate the clipboard's payload. This would be consistent with the on-demand behavior of delayed clipboard rendering and with current behavior of `getType()`.
  * Return an empty blob. This would be a very strict interpretation of only producing clipboard data when a target application needs it via a paste command.
* Should we provide a way for authors to update the callbacks of the delayed rendered formats? Consider the following scenario: By the time a user tries pasting the content of the clipboard, the callback function needs data that is no longer available and/or has changed.
* Feature detection: Is it relevant to web authors to know whether the browser supports delayed rendering? If yes, how should we let them know?
  * Programatically, via an API.
  * Other media (such as articles, blog posts, etc.)

## Related discussion

[Support for delayed clipboard data](https://github.com/w3c/clipboard-apis/issues/41)
