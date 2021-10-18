# Tagged PDFs support in Chromium – Explainer

Authors: [Vyankatesh Gadekar](https://github.com/vrgadekar), [Mohit Bansal](https://github.com/bansal-mohit)

## Introduction

The Portable Document Format (PDF) is a file format that is used to represent documents in a manner independent of application software, hardware, and operating systems. Unlike HTML, this document format does not contain rich information about document structure and semantics. Additional metadata is required to understand a PDF document&#39;s structure and logical order.

To provide this additional metadata, **&quot;Tagged PDFs&quot;** (Section 14.8 of [ISO PDF specification](https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf)) contain a set of structure types referred to as &quot;tags&quot;. These tags define various document elements, such as links, paragraphs, headings, lists, tables etc. Document authoring applications provide the ability to fully tag PDFs at the generation time. There are tools available to tag already existing PDFs as well. 

PDF documents which do not contain these tags are referred to as **&quot;Untagged PDFs&quot;.**

This structure information in tagged PDF files when exposed by PDF readers is used by assistive technology (AT) products such as screen readers. With the information provided by these tags, ATs can provide their users accurate information about the document's contents, and enable navigational modes such as moving by links or form fields. This is particularly useful for content containing complex structure types such as tables.

## Motivation

The primary motivation to support Tagged PDFs in Chromium are the following:

- Enhance the heuristics-based entity (paragraph, headings, inline text) detection for PDF files in Chromium. 
- Introduce support for content types like lists and tables. 
- Enable common semantic content navigation modes for AT users like moving through lists, reading and navigating through parts of a table etc.

### Comparing PDF navigation with and without tagged PDF support

To better demonstrate the motivation, we&#39;ve recorded the experience of navigating PDF document with tagged PDF support <sup>[1]</sup> and without tagged PDF support <sup>[2]</sup>.
In the first video, can see that user can understand the content of the PDF document and can navigate through table cells. Whereas in the second video with no tagged PDF support, the user cannot make sense of the contents of the document. 

## Solution proposal

The following changes are proposed to add support for tagged PDFs:

**Getting Struct Tree information from PDFium**: The logical structure of a document is described by a hierarchy of objects called the structure tree (StructTree). The StructTree information is used by PDF reader applications to interpret document&#39;s structure and to pass that on to AT clients. PDFium library exposes the StructTree dictionary via APIs such as FPDF\_StructTree\_GetForPage(). We propose to update these APIs to fetch information pertaining to each element in the StructTree, along with APIs to navigate through StructTree.

**Create PDF Accessibility Tree in Plugin process**: In current design, the accessibility tree for PDF is generated in MimeHandler process using raw text data provided via Plugin process, with some heuristics. We propose to create the PDF accessibility tree structure within Plugin process, using StructTree traversal and element information APIs mentioned above. This tree would be composed of PDF accessibility node (PDFAccNode) objects, that are similar to AxNode objects which are provided to ATs by MimeHandler process.

**Exposing PDF Accessibility tree**: We propose that the MimeHandler process will act as almost a pass through for the PDF accessibility tree generated in the Plugin process, with only PDFAccNode to AxNode conversion taking place. This accessibility tree will have nodes representing content types such as tables and lists. This tree will be exposed to ATs for enabling reading and navigation through content.

**Interaction with ATs** : MimeHandler process will possess mapping from AxNode to corresponding PDFAccNode present in Plugin process. When ATs execute any action on PDF via supported APIs, this mapping would be used to identify specific PDFAccNode object. Plugin process would then take appropriate action to update PDF document view accordingly. Any PDF document state changes would be notified back to ATs via MimeHandler process.

### Goals

We intend to support following content types through the PDF accessibility tree – Paragraphs, Lists, Tables, Headings, Links, Images, and Form fields.

### Non-goals

We do not propose any changes to the existing heuristics for detecting paragraphs and headings in untagged PDF content. Tagged PDF support will complement the existing heuristics.

## References

1.	Video of the PDF navigation experience with tagged PDF support [link](AT%20with%20tagged%20pdf%20support.mp4)
2.	Video of the PDF navigation experience without tagged PDF support [link](AT%20without%20tagged%20pdf%20support.mp4)
