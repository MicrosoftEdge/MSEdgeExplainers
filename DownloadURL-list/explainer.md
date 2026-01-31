# Explainer: Drag Multiple Virtual Files Out of Browser

Author: [Joone Hur](https://github.com/joone) (Microsoft)

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
- [Proposed Solution: a new drag type `DownloadURL-list`](#proposed-solution-a-new-drag-type-downloadurl-list)
  - [`DownloadURL-list` data format](#downloadurl-list-data-format)
  - [Why JSON?](#why-json)
- [Future Considerations](#future-considerations)
- [Security & UX Considerations](#security--ux-considerations)
  - [Drag Bomb](#drag-bomb)
  - [Limit Download Requests](#limit-download-requests)
  - [Single-click button to delete all downloaded files](#single-click-button-to-delete-all-downloaded-files)
- [Acknowledgements](#acknowledgements)
- [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Introduction

The `DownloadURL` drag type is a Chromium‑specific drag‑and‑drop mechanism historically used to enable dragging a resource from a web page into the operating system as a file. However, it is limited to supporting only a single file per drag-and-drop operation. To support more robust workflows, we propose a new `DownloadURL-list` drag type to allow multiple files to be dragged simultaneously.

# Goals

Enable users to drag multiple files from Chromium to a desktop folder on Windows using the `DownloadURL-list` drag type.

# Non-goals

Support drag‑and‑drop of files that require authentication or session validation to download; such flows are out of scope for this proposal.

# Problem: The Single-File Limitation

The existing DownloadURL drag type encodes only a single file as:
```
<mimeType>:<filename>:<url>
```
This prevents multi‑file workflows and forces users to drag each item individually.

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

# Proposed Solution: a new drag type `DownloadURL-list`

To support multi-file drag-and-drop, we propose a new `DownloadURL` drag type within the HTML Drag and Drop API to carry information for multiple files.

## `DownloadURL-list` data format
The `DownloadURL-list` data format will support an array of a file URL, serialized as a JSON string. Each object within this JSON array will represent a single file, containing its essential properties: `mimeType`, `filename`, and `url`.

**Example JavaScript Implementation:**
```js
function dragstart(event) {
  // JSON array for multiple files drag-and-drop.
  const files = [
    {
      mimeType: 'image/png',
      filename: 'file2.png',
      url: 'http://example.com/file2.png'
    },
    {
      mimeType: 'image/jpeg',
      filename: 'file1.jpg',
      url: 'http://example.com/file1.jpg'
    }
  ];
  // Set the new drag type with JSON data
  event.dataTransfer.setData('DownloadURL-list', JSON.stringify(files));
}
```

This new format allows representing multiple files in a structured and extensible manner.

## Why JSON?

JSON is chosen for the new format because it is structured, extensible, widely supported, and robust. It reduces the risk of parsing errors and security issues compared to custom string formats. JSON also makes it easier to add future metadata (such as file size, description, or permissions) without breaking compatibility.

# Future Considerations

The `DownloadURL` drag type was originally introduced in WebKit ([bug 31090](https://bugs.webkit.org/show_bug.cgi?id=31090)) and later adopted by Chromium, but it was never standardized because Firefox chose not to implement it ([bug 570164](https://bugzilla.mozilla.org/show_bug.cgi?id=570164)), treating it as a Chrome‑specific feature. Despite the lack of standardization, it has been widely used in mail applications such as Outlook and GMail within Chromium‑based browsers, enabling users to drag mail attachments out of the browser for many years.
Proposing a new `DownloadURL-list` drag type as a web standard provides a more extensible and interoperable solution. It also opens the door to additional scenarios, including drag‑and‑drop between browsers and native applications like WebView based applications, or file managers.

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
Many thanks for valuable feedback and advice from:
- Lingling Becker
- Mike Jackson
- Alex Russell
- Daniel Cheng (Google)
- Lily Chen (Google)
- Min Qin (Google)

# References
* [Design: Enabling Multi‑File Drag‑and‑Drop in Chromium on Windows](https://docs.google.com/document/d/1nHPDuEE876RMKwYBVzWgPvsek-9X1NhZuFyY5Q5Z6YU/edit?usp=sharing)
* [Chromium Issue](https://issues.chromium.org/issues/40736398)
* [[whatwg] Proposal to drag virtual file out of browser](https://lists.whatwg.org/pipermail/whatwg-whatwg.org/2009-August/022121.html)
* [HTML Drag and Drop API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
* [Ryan Seddon | Drag out files like Gmail](https://ryanseddon.com/html5/gmail-dragout/)
* [HTML Standard: 6.11 Drag and drop](https://html.spec.whatwg.org/multipage/dnd.html)
* [Case Study - Drag and Drop Download in Chrome | web.dev](https://web.dev/case-studies/box-dnd-download)
