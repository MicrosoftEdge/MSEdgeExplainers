# Selective Clipboard Format Read

## Improving Paste Performance through Selective Clipboard Reads

**Author:**  [Abhishek Singh](https://github.com/abhishek06020)(abhisheksing@microsoft.com)

**Co-authors:**  [Rohan Raja](https://github.com/roraja)(roraja@microsoft.com), [Rakesh Goulikar](https://github.com/ragoulik)(ragoulik@microsoft.com)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [User Problem](#user-problem)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposal](#proposal)
- [Boundary Scenarios](#boundary-scenarios)
- [Pros](#pros)
- [Cons](#cons)
- [Considered Alternative: No API Signature Change but Defer Actual Read Until ClipboardItem.getType()](#considered-alternative-no-api-signature-change-but-defer-actual-read-until-clipboarditemgettype)
  - [Pros of Alternate Approach](#pros-of-alternate-approach)
  - [Cons of Alternate Approach](#cons-of-alternate-approach)
- [Appendix](#appendix)
  - [Read Time Analysis and Takeaways](#read-time-analysis-and-takeaways)
- [References and Acknowledgements](#references-and-acknowledgements)
- [Issue Tracker](#issue-tracker)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

This proposal introduces selective clipboard format reading, an enhancement to the [Asynchronous Clipboard read](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API that allows web applications to selectively read specific MIME types from the clipboard, making reads more efficient by avoiding retrieval of formats that are not needed.

```js
// Example Javascript code
const items = await navigator.clipboard.read({
  types: ['text/plain', 'text/html']  // Specify mime types to be fetched from platform clipboard
});
```

The current implementation of [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) copies all available clipboard formats from the operating system's Clipboard into the browser's memory, regardless of what the web application needs.

Letting web authors specify which formats to read (like only `["text/plain"]` or `["text/html"]`) in the [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API helps the browser avoid copying unnecessary data from the OS clipboard. This saves CPU cycles, improves perceived responsiveness in the API call, while also optimizing power usage by the browser.

## User Problem

Web applications that support rich content editing—such as document editors, email clients, and data grids—routinely deal with multiple types of clipboard payloads, including large HTML fragments, images, and custom MIME types. These apps often implement features like “Paste as plain text” or “Paste with formatting,” where only a subset of the clipboard data is needed.

However, the current [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read), that gets triggered by the paste options, indiscriminately fetches all available formats from the clipboard, regardless of what the application needs. This blanket behaviour adds significant overhead, especially when large data formats like HTML or images are present and are not required by the app.

The impact is especially pronounced in large-scale web applications—such as online spreadsheets and document editors—that collectively handle hundreds of millions of paste interactions across their user base, where maintaining responsiveness during each operation is critical. Delays caused by fetching and discarding irrelevant clipboard data degrade user experience and add avoidable memory and CPU costs.

## Goals

- Improve responsiveness in copy-paste operations, especially for large data sizes.
- Optimize performance by avoiding unnecessary data reads, especially when web authors may only need specific formats like plaintext or HTML.
- Ensure interoperability across different platforms.
- This proposal does not change the permission or security model of the Async Clipboard API ([navigator.clipboard](https://www.w3.org/TR/clipboard-apis/#clipboard)). It continues to require user activation and adhere to existing security boundaries.

## Non-Goals

- This proposal does not currently address changes to [readText()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-readtext) or [write()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-write) methods.
- It does not propose a change to how clipboard formats are written—only how they are read.
- This proposal does not define any rules for how the browser should prioritize or rank different clipboard formats internally.

## Proposal

We propose API signature changes to the [clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API that allow web authors to specify the MIME types they intend to read. This browser implementation will selectively read only the requested formats, instead of reading all available data formats as is currently done.

We propose to rename the optional argument "ClipboardUnsanitizedFormats" of [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API to `ClipboardReadOptions` and extend this object to include a new `types` property which is a list of mime types to be retrieved.

```js
// Scenario: OS clipboard contains 'text/plain' and 'text/html' data
const items = await navigator.clipboard.read({
  types: ['text/plain']
});

const item = items[0];
const availableTypes = item.types; // ['text/plain']. Note: Only available requested types are present.

const plainTextBlob = await item.getType('text/plain');
const text = await plainTextBlob.text();
```

**IDL:**
```webidl
[Exposed=Window]
interface Clipboard {
    Promise<sequence<ClipboardItem>> read(optional ClipboardReadOptions options = {});
};

dictionary ClipboardReadOptions {
    sequence<DOMString> types;        // Optional: Filter returned clipboard items by MIME types
    sequence<DOMString> unsanitized;  // Optional: Request unsanitized data for specific MIME types
};
```

## Boundary Scenarios

- The [types](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-types) property of ClipboardItem will return only those types out of provided input types which are available in the system clipboard. If a particular type is requested in the input but not present in the platform clipboard or is invalid, then the [types](https://www.w3.org/TR/clipboard-apis/#dom-clipboardreadoptions-types) value won’t include that format, and any call to [getType(type)](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) for that format will result in a rejected promise with error message "The type was not found". This way, a web author can verify if a requested type is present in the platform clipboard.
- If multiple instances of the same format are provided in the request, the duplicates will be ignored and only one instance will be considered during processing.

```js
// Scenario: OS clipboard contains 'text/plain' and 'text/html' data
const items = await navigator.clipboard.read({
  types: ['text/plain', 'text/javascript', 'text/plain'],
  unsanitized: ['text/html']
});

const item = items[0];

// Only returns types that were both requested AND available on clipboard
const availableTypes = item.types; // ['text/plain']

const plainText = await item.getType('text/plain'); // ✅ Resolves successfully
const jsText = await item.getType('text/javascript'); // ❌ Throws error: The type was not found
const html = await item.getType('text/html'); // ❌ Throws error: The type was not found
```

## Pros

 **Backward Compatible :**  
   Existing implementations and web applications that use [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) without specifying any MIME types will continue to behave as before, receiving all available clipboard formats.

## Cons

**Potential Confusion Between `[types]` and `[unsanitized]` Options :**
Adding both `[types]`and `[unsanitized]` to `[ClipboardReadOptions]` may cause confusion about how they interact. For example, what happens if a MIME type is listed in `[unsanitized]` but not in `[types]`? While the spec can clarify that `[types]` filtering applies first, this isn’t immediately obvious from the API shape and could lead to subtle bugs if misunderstood.

## Considered Alternative: No API Signature Change but Defer Actual Read Until ClipboardItem.getType()


An alternative approach defers clipboard data retrieval from the OS until the web app explicitly calls [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype). In this model, [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) returns [ClipboardItem](https://www.w3.org/TR/clipboard-apis/#clipboarditem) objects listing available MIME types, but without the data. The browser fetches the requested data only when [getType(mimeType)](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) is called, caching it to avoid repeated clipboard accesses for the same type. 

If the clipboard contents change between the call to [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) and a subsequent call to [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype), the promise may be rejected in case the requested type is no longer present in the clipboard. This behaviour is consistent with the current Clipboard API semantics.

```js
// No data is read from the clipboard after read call completes
const items = await navigator.clipboard.read(); // [text, img]
const item = items[0]; // text

// getTypes returns all available data types present at the time of read call
const allTypes = item.getTypes(); // [text, img]

const plainText = await item.getType('text/plain'); // Data is lazily fetched here
```

### Pros of Alternate Approach

- Preserves the existing [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API shape (no API changes).
- Provides the details of the available MIME types on the Clipboard.

### Cons of Alternate Approach

- This approach is not backward compatible because [ClipboardItem](https://www.w3.org/TR/clipboard-apis/#clipboarditem) no longer stores Blob data at [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) time. As a result, it can't be used as a persistent cache for clipboard contents like today, where [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) reliably returns the same data without re-reading the system clipboard.
- Another drawback of this approach is that the behavior may feel unintuitive: calling [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) suggests immediate clipboard access, but actual data retrieval is deferred until [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) is invoked.
- **Potential Hidden Latency:** Developers must anticipate possible delays when calling [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) which is not expected in today’s implementations.
- Clipboard state may change between [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) and [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) calls, leading to promise being rejected with error message 'The type was not found'.

## Appendix

### Read Time Analysis and Takeaways

We ran experiments simulating real-world clipboard usage to evaluate the performance impact of selectively reading specific clipboard formats. The results showed substantial improvements in the read time when applications read only the required formats instead of the entire clipboard. For example, in a scenario where the clipboard payload was 7.7 MB (comprising 0.7 MB of plain text and 7 MB of HTML), selectively reading just the text reduced the read time by 93%—from 179.5 ms down to 10.8 ms.

As we scaled up the data size, we observed that read times increased proportionally with payload size, reinforcing that the benefits of selective reads become more significant with larger clipboard data. Moreover, the type of format had a notable impact on performance. HTML formats consistently exhibited higher read latencies compared to plain text—even when only slightly larger in size—likely due to additional processing like browser-side sanitization for security. Avoiding unnecessary HTML reads can deliver substantial latency improvements, especially in mixed-format clipboards where the application only needs text.

**Reproducibility :**
For developers interested in reproducing these results or running similar benchmarks, we’ve published a minimal [experiment](./experiment.html) demonstrating selective clipboard format reads and associated timing comparisons.
To use live demo, open [this](https://ashishkum-ms.github.io/cr-contributions/sfr/performace_experiment.html) in a browser that supports the Selective CLipboard Format Read.

## References and Acknowledgements 
Reference : [Github discussion](https://github.com/w3c/clipboard-apis/issues/191)

Many thanks for valuable feedback and advice from:
- [Evan Stade](https://github.com/evanstade) (estade@chromium.org)
- [Daniel Clark](https://github.com/dandclark) (daniec@microsoft.com)
- [Sanket Joshi](https://github.com/sanketj)
- [Anupam Snigdha](https://github.com/snianu) (snianu@microsoft.com)

## Issue Tracker
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/SelectiveCLipboardFormatRead) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=ragoulik&labels=SelectiveCLipboardFormatRead&template=selective-clipboard-format-read.md&title=%5BSelective+Clipboard+Format+Read%5D+%3CTITLE+HERE%3E)
  
