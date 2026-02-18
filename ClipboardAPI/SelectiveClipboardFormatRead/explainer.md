# Selective Clipboard Format Read

## Improving Paste Performance through Selective Clipboard Reads

**Author:**  [Abhishek Singh](https://github.com/abhishek06020)

**Co-authors:**  [Ashish Kumar](https://github.com/ashishkum-ms), [Rakesh Goulikar](https://github.com/ragoulik), [Rohan Raja](https://github.com/roraja), [Shweta Bindal](https://github.com/shwetabin)

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/SelectiveClipboardFormatRead)
- [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=ragoulik&labels=SelectiveClipboardFormatRead&template=selective-clipboard-format-read.md&title=%5BSelective+Clipboard+Format+Read%5D+%3CTITLE+HERE%3E)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [User Problem](#user-problem)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Approach 1: API signature change with `types` parameter](#approach-1-api-signature-change-with-types-parameter)
  - [Proposed IDL](#proposed-idl)
  - [Boundary Scenarios](#boundary-scenarios)
  - [Pros](#pros)
  - [Cons](#cons)
- [Approach 2: Defer actual data read until ClipboardItem.getType()](#approach-2-defer-actual-data-read-until-clipboarditemgettype)
  - [Boundary Scenarios](#boundary-scenarios-1)
  - [Pros](#pros-1)
  - [Cons](#cons-1)
- [Preferred Approach](#preferred-approach)
- [Accessibility, Privacy, and Security Considerations](#accessibility-privacy-and-security-considerations)
- [Appendix](#appendix)
  - [Read Time Analysis and Takeaways](#read-time-analysis-and-takeaways)
- [References and Acknowledgements](#references-and-acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

This proposal introduces selective clipboard format reading, an enhancement to the [Asynchronous Clipboard Read](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API that enables web applications to read only the clipboard formats they need, making reads more efficient by avoiding retrieval of unnecessary data, resulting in performance gains and reduced memory footprint.

The current implementation of [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) copies all available clipboard formats from the operating system's clipboard into the browser's memory, regardless of what the web application needs.

This proposal explores two approaches to enable selective clipboard reading:
- **Approach 1**: Modifying the `read()` API signature to accept a `types` parameter specifying which MIME types to fetch.
  ```js
  const items = await navigator.clipboard.read({ types: ['text/plain'] });
  ```
- **Approach 2**: Deferring actual data retrieval until `getType()` is called, making the read operation lazy.
  ```js
  const items = await navigator.clipboard.read(); // No data fetched yet

  const text = await items[0].getType('text/plain'); // Only 'text/plain' data fetched here
  ```

## User Problem

Web applications that support rich content editing, such as document editors, email clients, and data grids, routinely deal with multiple types of clipboard payloads, including large HTML fragments, images, and custom MIME types. These apps often implement features like “Paste as plain text” or “Paste with formatting,” where only a subset of the clipboard data is needed.

However, the current [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read), that gets triggered by the paste options, indiscriminately fetches all available formats from the clipboard, regardless of what the application needs. This blanket behaviour adds significant overhead, especially when large data formats like HTML or images are present and are not required by the app.

The impact is especially pronounced in large-scale web applications, such as online spreadsheets and document editors, that collectively handle hundreds of millions of paste interactions across their user base, where maintaining responsiveness during each operation is critical. Delays caused by fetching and discarding irrelevant clipboard data degrade user experience and add avoidable memory and CPU costs. (refer [Appendix](#read-time-analysis-and-takeaways) for an example read-time analysis demonstrating performance impact in a representative scenario)

## Goals

- Improve copy-paste responsiveness for large data by avoiding unnecessary reads, especially when only specific formats like plaintext or HTML are needed by web authors.
- Ensure interoperability across different platforms.

## Non-Goals

- Modifying clipboard writing or other clipboard APIs such as [readText()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-readtext).
- This proposal does not define any rules for how the browser should prioritize or rank different clipboard formats internally.

## Approach 1: API signature change with `types` parameter

This approach proposes API signature changes to the [clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API that allow web authors to specify the MIME types they intend to read, and to rename the optional argument [`ClipboardUnsanitizedFormats`](https://www.w3.org/TR/clipboard-apis/#dictdef-clipboardunsanitizedformats) to `ClipboardReadOptions` and extend it with a new `types` property—a list of MIME types to retrieve. The browser will selectively read only the requested formats.

Existing implementations and web applications that use [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) will continue to behave as before when `types` is `undefined`, receiving all available clipboard formats.

If a MIME type is provided in [`unsanitized`](https://www.w3.org/TR/clipboard-apis/#dom-clipboardunsanitizedformats-unsanitized) but not requested in `types`, the clipboard content for the provided type will not be read from the OS clipboard and hence will be unavailable in the clipboard read response.

**Example:**
```js
// Scenario: OS clipboard contains 'text/plain' and 'text/html' data
const items = await navigator.clipboard.read({
  types: ['text/plain']
});

const item = items[0];
const availableTypes = item.types; // ['text/plain']. Only requested types that are available.

const plainTextBlob = await item.getType('text/plain');
const text = await plainTextBlob.text();
```

### Proposed IDL
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

### Boundary Scenarios

- The [types](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-types) property of ClipboardItem returns only the intersection of requested types and types available in the system clipboard. If a requested type is not present or invalid, [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) will reject with "The type was not found".
- If multiple instances of the same format are provided in the request, the duplicates will be ignored and only one instance will be considered during processing.
- If `types` is `undefined`, all available formats are returned (current behavior). If `types` is an empty array, no formats are returned.

### Pros
- This approach is backward compatible.
- Web developers have explicit control over which formats to read.

### Cons

- Adding both `types` and `unsanitized` to `ClipboardReadOptions` may cause confusion about how they interact.
- Requires web developers to explicitly opt-in by modifying their code to pass the `types` parameter. Websites without dedicated teams or proper incentives may not adopt this optimization, limiting the benefits.

## Approach 2: Defer actual data read until `ClipboardItem.getType()`

This approach defers clipboard data retrieval from the OS until the web app explicitly calls [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype). In this model, [navigator.clipboard.read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) returns [ClipboardItem](https://www.w3.org/TR/clipboard-apis/#clipboarditem) objects listing available MIME types, but without the data. The browser fetches the requested data only when [getType(mimeType)](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) is called, and caches it to avoid repeated clipboard accesses for the same type. 

If the clipboard contents change between the call to [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) and a subsequent call to [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype), the promise will be rejected with an appropriate DOMException (e.g., `NotSupportedError`).

**Example: Reading formats selectively**
```js
// Scenario: OS clipboard contains 'text/plain', 'text/html', and 'image/png' data
const items = await navigator.clipboard.read();
const item = items[0];

const availableTypes = item.types; // ['text/plain', 'text/html', 'image/png']

// Only fetch the format needed
const htmlBlob = await item.getType('text/html'); // Only 'text/html' data fetched
const html = await htmlBlob.text();
// 'text/plain' and 'image/png' data never read from OS clipboard
```

**Example: Caching behavior for repeated access**
```js
// Scenario: OS clipboard contains 'text/plain', 'text/html', and 'image/png' data
const items = await navigator.clipboard.read();
const item = items[0];

// First call fetches data from OS clipboard
const blob1 = await item.getType('text/plain'); // Data fetched and cached

// Subsequent calls return cached data without re-reading OS clipboard
const blob2 = await item.getType('text/plain'); // Returns cached data
```

**Example: Requesting unavailable type**
```js
// Scenario: OS clipboard contains 'text/plain' data only
const items = await navigator.clipboard.read();
const item = items[0];

const availableTypes = item.types; // ['text/plain']

// ✅ Resolves successfully
const plainText = await item.getType('text/plain');

// ❌ Throws error: The type was not found
const html = await item.getType('text/html');
```

### Boundary Scenarios

- The [types](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-types) property of ClipboardItem reflects all MIME types available on the clipboard at the time of the `read()` call, but no data is fetched until `getType()` is invoked.
- If the clipboard contents change between `read()` and `getType()` calls, the `getType()` promise will be rejected due to stale data.
- Once data is fetched via `getType()`, it is cached in the ClipboardItem. Subsequent `getType()` calls for the same type return the cached data, unless the clipboard has changed.

```js
// Scenario: Clipboard changes between read() and subsequent getType() calls
const items = await navigator.clipboard.read();
const item = items[0];

const availableTypes = item.types; // ['text/plain', 'text/html']

// ✅ First getType() succeeds - clipboard unchanged since read()
const plainTextBlob = await item.getType('text/plain');
const text = await plainTextBlob.text();

// User or another app performs a copy/write operation, changing clipboard contents
await navigator.clipboard.writeText('new content');

// ❌ Subsequent getType() on same ClipboardItem is rejected
// Clipboard data has changed since read() was called
const htmlBlob = await item.getType('text/html'); // Throws NotSupportedError
```

### Pros

- Preserves the existing [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) API shape (no API changes required).
- Automatic optimization for all web applications without requiring code changes or opt-in from developers.
- Already implemented in Safari, demonstrating real-world viability and cross-browser alignment potential.
- Only websites that explicitly need to hold clipboard data in memory pay the memory cost; others benefit automatically.

### Cons

- Changes the semantic meaning of [ClipboardItem](https://www.w3.org/TR/clipboard-apis/#clipboarditem) from a data snapshot to a lazy fetcher. It can't be used as a persistent cache for clipboard contents like today, where [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) reliably returns the same data without re-reading the system clipboard.
- Developers must anticipate potential latency when calling [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) which contrasts with today’s expectation of immediate access.
- Clipboard state may change between [read()](https://www.w3.org/TR/clipboard-apis/#dom-clipboard-read) and [getType()](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-gettype) calls, leading to a rejected promise due to stale data.

## Preferred Approach

Based on discussions in the [W3C Clipboard APIs Working Group](https://github.com/w3c/clipboard-apis/issues/240), [Lazy getType approach](#approach-2-defer-actual-data-read-until-clipboarditemgettype) is the preferred solution for the following reasons:

1. **Automatic benefits for all users**: Unlike [Approach 1](#approach-1-api-signature-change-with-types-parameter), which requires web developers to explicitly adopt the `types` parameter, [Approach 2](#approach-2-defer-actual-data-read-until-clipboarditemgettype) provides performance benefits automatically to all web applications. As noted in the working group discussions, developers "will likely not bother opting in unless they have large teams and the proper incentives."

2. **No API surface changes**: [Approach 2](#approach-2-defer-actual-data-read-until-clipboarditemgettype) preserves the existing `read()` API signature, avoiding the complexity of introducing new parameters and their interactions (e.g., how `types` and `unsanitized` interact).

3. **Cross-browser alignment**: Safari has already implemented lazy `getType()` behavior, where data is fetched only when `getType()` is called. Firefox has indicated willingness to adopt this approach if the specification changes. This creates an opportunity for browser convergence without API changes.

4. **Memory efficiency by default**: Snapshotting the entire clipboard entry for each call to `read()` is wasteful. With [Approach 2](#approach-2-defer-actual-data-read-until-clipboarditemgettype), only websites that explicitly need to hold clipboard data in memory pay for it, while others benefit from reduced memory usage automatically.

5. **Complementary event support**: The [clipboardchange event](https://www.w3.org/TR/clipboard-apis/#clipboard-event-clipboardchange) enables web applications to be notified when the clipboard has changed, helping them handle scenarios where clipboard data changes after a `read()` call.

While [Approach 2](#approach-2-defer-actual-data-read-until-clipboarditemgettype) does change the semantic behavior of `ClipboardItem`, the working group consensus is that this trade-off is acceptable given the benefits for end users across the web platform.

## Accessibility, Privacy, and Security Considerations

This proposal has no known impact on accessibility or privacy and does not alter the permission or security model of the Async Clipboard API ([navigator.clipboard](https://www.w3.org/TR/clipboard-apis/#clipboard)). A user gesture requirement (transient user activation) and existing async clipboard API security measures (focus document, permission prompts) will remain as they are.

With the [lazy getType() approach](#approach-2-defer-actual-data-read-until-clipboarditemgettype), security checks (transient user activation, document focus, and clipboard-read permission) are performed when `read()` is called. Once `read()` resolves successfully, subsequent `getType()` calls on the returned `ClipboardItem` objects do not re-validate these conditions. This is acceptable because `getType()` already checks whether the clipboard contents have changed since `read()` was called, and rejects the promise if they have. Since clipboard data cannot be accessed if it has been modified, the security guarantee is preserved—any attempt to access stale or externally modified clipboard data will fail, regardless of the current permission or focus state.

## Appendix

### Read Time Analysis and Takeaways

We ran experiments simulating real-world clipboard usage to evaluate the performance impact of selectively reading specific clipboard formats. The results showed substantial improvements in the read time when applications read only the required formats instead of the entire clipboard. For example, in a scenario where the clipboard payload was 7.7 MB (comprising 0.7 MB of plain text and 7 MB of HTML), selectively reading just the text reduced the read time by 93%—from 179.5 ms down to 10.8 ms.

As we scaled up the data size, we observed that read times increased proportionally with payload size, reinforcing that the benefits of selective reads become more significant with larger clipboard data. Moreover, the type of format had a notable impact on performance. HTML formats consistently exhibited higher read latencies compared to plain text, even when only slightly larger in size, likely due to additional processing like browser-side sanitization for security. Avoiding unnecessary HTML reads can deliver substantial latency improvements, especially in mixed-format clipboards where the application only needs text.

**Reproducibility :**
For developers interested in reproducing these results or running similar benchmarks, we’ve published a minimal [experiment](./experiment.html) demonstrating Selective Clipboard Format Read and associated timing comparisons.
To use live demo, open [this](https://ashishkum-ms.github.io/cr-contributions/sfr/performace_experiment.html) in a browser that supports the Selective Clipboard Format Read.

## References and Acknowledgements 
References :
- [Github discussion](https://github.com/w3c/clipboard-apis/issues/191)
- [Clipboard APIs spec issue](https://github.com/w3c/clipboard-apis/issues/240)

Many thanks for valuable feedback and advice from:
- [Anupam Snigdha](https://github.com/snianu)
- [Daniel Clark](https://github.com/dandclark)
- [Evan Stade](https://github.com/evanstade)
- [Sanket Joshi](https://github.com/sanketj)
