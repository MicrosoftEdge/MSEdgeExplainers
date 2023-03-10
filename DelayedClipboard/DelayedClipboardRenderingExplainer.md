
# Delayed Clipboard Rendering

Authors: [Ana Sollano Kim](https://github.com/anaskim), [Anupam Snigdha](https://github.com/snianu), [Sanket Joshi](https://github.com/sanketj)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **`ACTIVE`**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: this document**

## Introduction

Delayed clipboard rendering is the ability to delay the generation of a particular payload until it is needed by the target applications. It is useful when source applications support several clipboard formats, some or all of which are time-consuming to render. Currently, delayed rendering is supported in Linux, Mac OS X, and Windows.

## Background

In web applications, the clipboard can be accessed via the Data Transfer and Asynchronous Clipboard APIs, which provide methods to read and write supported formats from and to the system clipboard. Data Transfer APIs can only be accessed via JS events that block the main thread. If the clipboard payload is huge, performance is affected. The Asynchronous Clipboard API solves this by allowing asynchronous copy/paste operations, thus not blocking the main thread. In this document we will focus on the Asynchronous Clipboard API.

Quoting from the [editor's draft](https://w3c.github.io/clipboard-apis/#clipboard-item-interface):
> A clipboard item is conceptually data that the user has expressed a desire to make shareable by invoking a "cut" or "copy" command. A clipboard item serves two purposes. First, it allows a website to read data copied by a user to the system clipboard. Second, it allows a website to write data to the system clipboard.

A clipboard item may have multiple representations described by a MIME type. A target application, usually in response to the user performing a paste operation, will read one or more representations from the clipboard. The source application typically does not know where the user intends to paste the content at the time of copy, so the author must produce several formats when writing to the clipboard to prepare for many possible target applications. The generation of some or all representations may take enough time that it is noticeable to the user and it is unlikely that the target application will need all produced representations.

The ability to delay the generation of clipboard data until it is needed is important for applications that support data types that are _expensive to generate_. In this context, _expensive to generate_ refers to the time and resources needed to process and produce the clipboard payload in the client side. Web applications may need to make calls to the server, encode or decode a large amount of data, serialize HTML, produce web custom formats, etc. in order to provide a high fidelity copy/paste experience to the user. Source applications would be able to wait until the target application attempts to access a particular representation before generating data for it, as opposed to producing all formats at once when attempting to write to the clipboard.

## Goal

Leverage the existing Async Clipboard API to allow web applications to exchange large data payloads and improve their performance by only producing clipboard payload when it’s needed by target applications.

## Non-Goals

* Modify the Data Transfer API

## Proposed solution: Add a callback to `ClipboardItemData`

In this proposal, web authors decide which formats they want to delay render and which ones they want to provide immediately in the `ClipboardItem` constructor. The advantages of this approach is that it provides better developer ergonomics and it's easier to differentiate formats that will be written immediately to the clipboard from those that, at the web author's discretion, will be produced on-demand with delayed rendering.

An example of the usage is shown below:

```js
const textBlob = new Blob(['Hello, World!'], {type: 'text/plain'});
const clipboardItemInput = new ClipboardItem({
                            'text/plain': Promise.resolve(textBlob), 
                            'web application/x-custom-format-clipboard-format': Promise.resolve(generateExpensiveCustomFormatBlob),
                           });
navigator.clipboard.write([clipboardItemInput]);
```
where the callback `generateExpensiveCustomFormatBlob` is defined as follows:
```js
function generateExpensiveCustomFormatBlob() {
  // TODO: Provide an example on how a custom format can be expensive to generate.
  var inputData = ...;
  return new Blob([inputData], {type: 'web application/x-custom-format'});
}
```
In this example, plain text is written immediately to the clipboard, while the custom format is delayed rendered. `generateExpensiveCustomFormatBlob` returns a [Blob](https://w3c.github.io/FileAPI/#blob-section). The blob constructor takes in the content that will be written to the clipboard and its type.

### IDL changes to `ClipboardItemData`

```
typedef (DOMString or Blob) ClipboardItemValue;
callback ClipboardItemValueCallback = ClipboardItemValue();
typedef Promise<(ClipboardItemValue or ClipboardItemValueCallback)> ClipboardItemData;

[SecureContext, Exposed=Window]
interface ClipboardItem {
  constructor(record<DOMString, ClipboardItemData> items,
              optional ClipboardItemOptions options = {});

  readonly attribute PresentationStyle presentationStyle;
  readonly attribute FrozenArray<DOMString> types;

  Promise<Blob> getType(DOMString type);
};
```

## Considered alternative 1: Map of MIME type to callback in `ClipboardItem` constructor

An alternative to our proposal is to add a new argument to the `ClipboardItem` constructor which takes a map of a MIME type to a callback. Authors should still be able to produce some formats immediately, so they may define the usual map with a MIME type as the key and a Blob as the value for formats that they don’t want to be delayed rendered. The disadvantage of this approach is that web authors may need to provide redundant format information to the callback map, which can also create confusion to UAs if the same format(s) appear(s) in both the promise `ClipboardItem` map and callback map. An example is shown below:

```js
const textBlob = new Blob(['Hello, World!'], {type: 'text/plain'});
const delayedCallbacksMap = {
  'web application/x-custom-format-clipboard-format': generateExpensiveCustomFormatBlob
};
const clipboardItemInput = new ClipboardItem({'text/plain': textBlob}, delayedCallbacksMap);
navigator.clipboard.write([clipboardItemInput]);
```
where the callback `generateExpensiveCustomFormatBlob` is defined as follows:
```js
function generateExpensiveCustomFormatBlob() {
  // TODO: Provide an example on how a custom format can be expensive to generate.
  var inputData = ...;
  return new Blob([inputData], {type: 'web application/x-custom-format'});
}
```
Similarly to the example in the proposed solution, plain text is written immediately to the clipboard, while the custom format is delayed rendered. `generateExpensiveCustomFormatBlob` returns a [Blob](https://w3c.github.io/FileAPI/#blob-section). The blob constructor takes in the content that will be written to the clipboard and its type.

### IDL changes to `ClipboardItem`

```
typedef (DOMString or Blob) ClipboardItemValue;
callback ClipboardDelayedCallback = ClipboardItemValue();
typedef Promise<ClipboardItemValue> ClipboardItemData;

[SecureContext, Exposed=Window]
interface ClipboardItem {
  constructor(record<DOMString, ClipboardItemData> items,
              record<DOMString, ClipboardDelayedCallback> callbacks,
              optional ClipboardItemOptions options = {};

  readonly attribute PresentationStyle presentationStyle;
  readonly attribute FrozenArray<DOMString> types;

  Promise<Blob> getType(DOMString type);
};
```


## Considered alternative 2: Map of MIME type to promise in new method

Another alternative to this is to use a new method, called `addDelayedWriteCallback`, that takes in a map of formats to callbacks. As the `ClipboardItem` constructor remains the same, web authors that want to adopt delayed clipboard rendering in their web applications will be able to move the generation of data to the callbacks map and pass it to `addDelayedWriteCallback`, without needing to change the existing `ClipboardItem` constructor. If the web author doesn't provide a delayed rendering callback or data, then an error is thrown in the source application and the write operation fails. The disadvantages of this approach are that it adds overhead to the web author (it is a new function for them to learn) and it can create the same confusion as the first considered alternative when having the same format(s) repeated in both the `ClipboardItem` constructor and in `addDelayedWriteCallback`'s map. An example of this proposal is shown below:

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

## Privacy and Security Considerations

### Privacy

No considerable privacy concerns are expected, but we welcome community feedback.

### Security

This feature works with mandatory data types and custom formats, it does not change the sanitization (or lack thereof) of the clipboard's payload. A user gesture requirement (transient user activation) and existing async clipboard API security measures (focus document, permission prompts) will remain as they are.

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
