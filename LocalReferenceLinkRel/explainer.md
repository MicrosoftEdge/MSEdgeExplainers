# Local References In <link> Tags

## Authors:

- Kurt Catti-Schmidt
- Noam Rosenthal

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/LRLR)
- [Discussion forum](https://github.com/whatwg/html/issues/11019)

## Status of this Document

This document is intended as a starting point for engaging the community and
standards bodies in developing collaborative solutions fit for standardization.
As the solutions to problems described in this document progress along the
standards-track, we will retain this document as an archive and use this section
to keep the community up-to-date with the most current standards venue and
content location of future work and discussions.

* This document status: **Active**
* Expected venue: [WHAT Working Group](https://whatwg.org/)
* Current version: this document

## Introduction
Modern web development practices have converged towards building reusable components instead of building monolithic documents. Frameworks such as React and Angular have popularized this approach, which has made its way natively to the web platform via Web Components. 

Web Components allow for defining custom elements, and these custom elements often rely on Shadow DOM for ID encapsulation. But Shadow DOM doesn't just encapsulate ID's - it encapsulates style as well. The current preferred approach
for styling elements under a Shadow DOM is through `<link>` tags, but these tags have several downsides, namely that they must be an external file or a dataURI. The performance of an external file and developer ergonomics of generating a dataURI make them difficult to use. Because of that, developers using Custom Elements have expressed strong interest in addressing these issues.
situation are not ideal, and developers using Custom Elements have expressed strong interest in addressing these issues.

This explainer proposes a solution to this situation by allowing another option for sharing styles via the `<link>` tag - local references to `<style>` elements.

## Goals
* Allow developers to share styles defined in the Light DOM document into Shadow DOM trees.
* Allow developers to define their CSS up-front in the same document as their HTML when using Shadow DOM.
* Define a mechanism that will allow for more selective style sharing via CSS `@sheet`.
* Allow for inline styles to be defined but not applied <a href="https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AtSheet/explainer.md">via `@sheet`</a>.

## Non-goals
* Anything specific to `@sheet` should be discussed in its dedicated <a href="https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AtSheet/explainer.md">proposal</a>.
* Modifications to Shadow DOM scoping behaviors. This proposal depends on existing Shadow DOM behavior as currently defined. Styles defined in Shadow DOM will remain inaccessible to the Light DOM.

## Proposal - Local References for Link Rel Tags

We propose supporting fragment identifiers that reference the `id` attribute of a `<style>` or `<link>` tag:

```html
<style id="inline_styles">
  p { color: blue; }
</style>
<p>Outside Shadow DOM</p>
<template shadowrootmode="open">
  <link rel="inline-stylesheet" href="#inline_styles">
  <p>Inside Shadow DOM</p>
</template>
```
With this functionality, the text "Inside Shadow DOM" will by styled blue, due to the `<link rel="inline-stylesheet" href="#inline_styles">` node's stylesheet applying (along with the `color: blue` rule applying via the `p` selector in that stylesheet).

A new value for the `rel` attribute is used here to prevent legacy engines from performing an unnecessary fetch with this markup. The name `inline-stylesheet` is preliminary and open to discussion.

### Linking to another `<link>` tag

```html
<link rel="stylesheet" href="foo.css" id="inline_styles">
<p>Outside Shadow DOM</p>
<template shadowrootmode="open">
  <link rel="inline-stylesheet" href="#inline_styles">
  <p>Inside Shadow DOM</p>
</template>
```

Developers may want to link to styles pulled into another `<link>` tag. These `<link>` references may be internal files (via `inline-stylesheet`), or external files. Loop detection may be necessary for references to another `inline-stylesheet`. 

### Scoping

```html
<p>Outside Shadow DOM</p>
<template shadowrootmode="open">
  <style id="inline_styles_from_shadow">
    p { color: blue; }
  </style>
  <p>Inside Shadow DOM</p>
</template>
<link rel="stylesheet" href="foo.css" id="#inline_styles_from_shadow">
<p>Outside Shadow DOM. Styles defined inside the Shadow Root are not applied, so this text is not blue.</p>
```

Due to existing Shadow DOM scoping behaviors, `<style>` tags defined inside the Shadow DOM cannot be accessed from the Light DOM.

## Detailed design discussion

### Deep Clone vs Reference

`<link>` tags referencing external files are always treated as separate instances, even when they refer to the same file. This also occurs through CSS `@import` https://www.w3.org/TR/css-cascade-3/#import-processing.

However, in this situation, it might make more sense to behave like SVG `<use>` (and other reference-based SVG elements) by behaving as if it's a reference to the original stylesheet instead of a deep copy. This will allow for styles to stay in sync when the stylesheet changes.
This behavior could improve developer ergonomics and provide memory savings.

#### Specific Changes to HTML and CSS

This proposal augments the HTML `<link>` tag in two ways:
1. A new value for the `<link>` tag's `rel` attribute for `inline-stylesheet`.
2. Fragment identifiers to same-document `<style>` tags are supported in the `href` attribute when the `rel` attribute is `inline-stylesheet`.

## Considered alternatives

1. [Declarative CSS Modules](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ShadowDOM/explainer.md) are another mechanism for sharing styles between Declarative Shadow DOM and light DOM without the use of JavaScript.
2. External CSS files in `<link>` tags - these are always asychronous (which may not be desired), and may have negative performance implications due to the need to fetch another resource.
3. CSS-encoded DataURI references in `<link>` tags - this approach avoids some of the issues with 2), but has poor developer ergonomics due to dataURI encoding. Furthermore, there is no ability to automatically synchronize dataURI values.

## Open Issues

1. "Deep Clone vs Reference" listed above is the biggest outstanding issue.
2. The name `inline-stylesheet` can be refined (or revisited if  it's not necessary to define a new `rel` value).

## References & acknowledgements
Many thanks for valuable feedback and advice from:

- Alison Maher
- Andy Luhrs
- Daniel Clark
- Kevin Babbitt
- Noam Rosenthal
