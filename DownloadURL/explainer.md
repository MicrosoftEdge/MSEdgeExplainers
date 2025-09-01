# Explainer: Drag Multiple Virtual Files Out of Browser

Author: [Joone Hur](https://github.com/joone)

# Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/DownloadURL)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Table of Contents

- [Introduction](#introduction)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Problem: The Single-File Limitation](#problem-the-single-file-limitation)
  - [Example of Current Behavior](#example-of-current-behavior)
  - [Developer Workarounds and Limitations](#developer-workarounds-and-limitations)
    - [Using an array](#using-an-array)
    - [Using newline-delimiters](#using-newline-delimiters)
  - [UX perspective](#ux-perspective)
- [Proposed Solution: Extending the `DownloadURL` Data Format](#proposed-solution-extending-the-downloadurl-data-format)
  - [New `DownloadURL` Data Format](#new-downloadurl-data-format)
  - [Why JSON?](#why-json)
- [Backward Compatibility](#backward-compatibility)
- [Future Considerations](#future-considerations)
- [Security & UX Considerations](#security--ux-considerations)
  - [Drag Bomb](#drag-bomb)
  - [Limit Download Requests](#limit-download-requests)
  - [Single-click button to delete all downloaded files](#single-click-button-to-delete-all-downloaded-files)
- [Acknowledgements](#acknowledgements)
- [Referenecs](#referenecs)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Introduction

Chromium has supported a non-standard drag type (`DownloadURL`) that allows Windows users to drag a virtual file out of the browser. However, the `DownloadURL` drag type is limited to supporting only a single file per drag-and-drop operation. To support more robust workflows, we propose extending the DownloadURL drag type to allow multiple files to be dragged simultaneously.

# Goals

Enable users to drag multiple files from Chromium to a desktop folder on Windows using an extended `DownloadURL` drag type.

# Non-goals
This proposal does not aim to:
* Enable drag-and-drop of files into other browser contexts, whether between the same browser or different browsers.
* Standardize this behavior across browsers via W3C. The proposal is specific to Chromium and Windows environments.

# Problem: The Single-File Limitation
The current DownloadURL drag type in Chromium supports only a single file per drag-and-drop operation, which restricts more advanced workflows and user experiences.

## Example of Current Behavior
Here's a typical example demonstrating the limitation:

```js
document.getElementById('downloadLink').addEventListener('dragstart', function(e) {
  // Define the file's MIME type, name, and URL
  const mimeType = 'application/pdf';
  const fileName = 'example.pdf';
  const fileUrl = 'https://example.com/files/example.pdf';

  // Construct the downloadURL string
  const downloadUrlString = `${mimeType}:${fileName}:${fileUrl}`;

  // Set the data on the DataTransfer object
  e.dataTransfer.setData('DownloadURL', downloadUrlString);
});
```
The `DownloadURL` format requires a string with three colon-separated components:

- **MIME type:** The media type of the file (e.g., `image/jpeg`, `application/pdf`).
    
- **File name:** The desired name for the downloaded file (e.g., `my_document.pdf`).
    
- **URL:** The absolute URL from which the file will be downloaded, either remote or a data URI.
    

When [it was initially proposed](https://lists.whatwg.org/pipermail/whatwg-whatwg.org/2009-August/022121.html), it was designed for single-file use. Although multi-file support was requested, it has never been implemented.

## Developer Workarounds and Limitations
Because `DownloadURL` is a Chromium-specific feature and not part of any web standard, documentation is limited. As a result, developers have attempted to pass multiple files using arrays or newline-delimited strings, but these formats are not supported by the current implementation:

### Using an array
```js
event.dataTransfer.setData('DownloadURL', [
  'image/png:file1.png:http://foo.com/file1.png',
  'image/png:file2.png:http://foo.com/file2.png'
]);

```

### Using newline-delimiters
```js
event.dataTransfer.setData("DownloadURL", "application/pdf:file1.pdf:https://example.com/file1.pdf\napplication/pdf:file2.pdf:https://example.com/file2.pdf");
```
Naturally, neither approach works as intended.

These limitations are discussed on Stack Overflow:
* [Drag out multiple files from browser to desktop using event.dataTransfer.setData](https://stackoverflow.com/questions/42335222/drag-out-multiple-files-from-browser-to-desktop-using-event-datatransfer-setdata)
* [Download multiple files with drag and drop to folder](https://stackoverflow.com/questions/79448045/download-multiple-files-with-drag-and-drop-to-folder)

## UX perspective

This single-file constraint presents a significant inconvenience for users who frequently interact with web applications that involve multiple downloadable items. For example, users are forced to perform multiple drag-and-drop operations for each file when trying to:
* Download multiple email attachments from a webmail client (e.g., Outlook Web) to a desktop folder via a single drag gesture.
* Export multiple generated reports or images from a web-based tool.

The current implementation forces users to perform multiple drag-and-drop operations for each file, which is inefficient and cumbersome.

# Proposed Solution: Extending the `DownloadURL` Data Format

To enable multi-file drag-and-drop, we propose extending the format of the `DownloadURL` drag type within the HTML Drag and Drop API to carry information for multiple files.

## New `DownloadURL` Data Format
The `DownloadURL` data format will be extended to support an array of a file URL, serialized as a JSON string. Each object within this JSON array will represent a single file, containing its essential properties: `mimeType`, `filename`, and `url`.

**Example JavaScript Implementation:**
```js
function dragstart(event) {
  // JSON object for multiple files drag-and-drop.
  const data = [
    {
      'type': 'image/png',
      'name': 'file2.png',
      'url': 'http://example.com/file2.png'
    },
    {
      'type': 'image/jpeg',
      'name': 'file1.jpg',
      'url': 'http://example.com/file1.jpg'
    }
  ];
  event.dataTransfer.setData('DownloadURL', JSON.stringify(data));
}
```

This new format allows a single `DownloadURL` data type to represent multiple files in a structured and extensible manner.

## Why JSON?

As seen in the examples of developer attempts, we could use a simple format to represent multiple files. However, the existing format requires its own parsing code, and there's always a risk of parsing errors due to user mistakes or security attacks. Therefore, JSON will be used for the new format because it is structured, extensible, widely supported, and robust.

# Backward Compatibility

A crucial aspect of this proposal is to maintain backward compatibility with the existing `DownloadURL` single-file format. The `DownloadURL` drag type will continue to support the existing colon-delimited string format (e.g., `mime-type:file_name:URL`) alongside the new JSON array format.

# Future Considerations

The `DownloadURL` drag type was originally implemented in WebKit([bug 31090](https://bugs.webkit.org/show_bug.cgi?id=31090)) and was later adopted by Chromium. However, it never standardized—primarily because it didn’t gain support in Gecko([bug 570164](https://bugzilla.mozilla.org/show_bug.cgi?id=570164)), where it was treated as a Chrome-specific mechanism

We can find a standard way to support dragging virtual files or file URLs out of browsers. While we could use `DataTransferItemList` to set multiple URL items, and the browser could download them when dragged to the desktop, the `text/uri-list` format used for this is an older standard that only carries URL information. This is insufficient for our needs, as it doesn't support additional details like the MIME type or desired filename. Therefore, to provide this richer download information, we would need to define a new drag format for downloading, potentially using the `application/json` MIME type.

```js
function dragstart(event) {
  // Define the list of files to be dragged.
  const filesToDownload = [
    {
      "downloadUrl": "http://example.com/file1.jpg",
      "name": "image_one.jpg",
      "mimeType": "image/jpeg"
    },
    {
      "downloadUrl": "http://example.com/file2.png",
      "name": "image_two.png",
      "mimeType": "image/png"
    }
  ];

  // Add each file as a separate JSON item to the DataTransferItemList.
  for (const file of filesToDownload) {
    const jsonString = JSON.stringify(file);
    event.dataTransfer.items.add(jsonString, "application/json");
  }
}
```

# Security & UX Considerations

There was already a discussion in [the design document](https://docs.google.com/document/d/1nHPDuEE876RMKwYBVzWgPvsek-9X1NhZuFyY5Q5Z6YU/edit?usp=sharing) about security and UX concerns. Here is a summary of that discussion.

## Drag Bomb

After a user drags and drops a file, the Chrome/Edge browser shows a download bubble as a single row to indicate which file is being downloaded. When supporting multiple downloads, however, allowing a separate row for each file could enable a "drag bomb" attack, which clutters the UI and could conceal malicious items.

To prevent this, the download bubble will consolidate multiple downloads into a single row. For example, it would show: `file1.png, file2.png, ... (4)`, where the number in parentheses indicates the total count of downloaded files. This approach provides a safer and more streamlined experience for the user.

## Limit Download Requests

If the user does not consent to multiple downloads, the entire set of dragged files should be reverted. To ensure a smooth user experience, it is advisable to request consent in advance rather than prompting after each individual download.

## Single-click button to delete all downloaded files

A single-click option should be provided in the Chrome UI (download bubble and `chrome://downloads`) to allow users to easily remove all downloaded files from their device if they no longer want them or downloaded them by mistake.

# Acknowledgements
Thank you to Daniel Cheng, Lily Chen, Lingling Becker, Mike Jackson, Min Qin for their valuable feedback and input.

# Referenecs
* [Design: Enabling Multi‑File Drag‑and‑Drop in Chromium on Windows](https://docs.google.com/document/d/1nHPDuEE876RMKwYBVzWgPvsek-9X1NhZuFyY5Q5Z6YU/edit?usp=sharing)
* [Chromium Issue](https://issues.chromium.org/issues/40736398)
* [[whatwg] Proposal to drag virtual file out of browser](https://lists.whatwg.org/pipermail/whatwg-whatwg.org/2009-August/022121.html)
* [HTML Drag and Drop API \- Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
* [Ryan Seddon | Drag out files like Gmail](https://ryanseddon.com/html5/gmail-dragout/)  
* [HTML Standard: 6.11 Drag and drop](https://html.spec.whatwg.org/multipage/dnd.html)
* [Case Study \- Drag and Drop Download in Chrome  |  web.dev](https://web.dev/case-studies/box-dnd-download)
