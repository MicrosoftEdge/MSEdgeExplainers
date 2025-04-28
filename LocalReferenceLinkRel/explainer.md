# Local References In `<link>` Tags

## Authors

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

- This document status: **Active**
- Expected venue: [WHAT Working Group](https://whatwg.org/)
- Current version: this document

## Introduction

Modern web development practices have converged towards building reusable
components instead of building monolithic documents. Frameworks such as React
and Angular have popularized this approach, which has made its way natively to
the web platform via Web Components.

Web Components allow for defining custom elements, and these custom elements
often rely on Shadow DOM for ID encapsulation. But Shadow DOM doesn't just
encapsulate ID's - it encapsulates style as well. The current preferred approach
for styling elements under a Shadow DOM is through `<link>` tags, but these tags
have several downsides, namely that they must be an external file or a dataURI.
The performance of an external file and developer ergonomics of generating a
dataURI make both of these options difficult to use. Because of that, developers
using Custom Elements have expressed strong interest in addressing these issues.

This explainer proposes a solution to this situation by allowing another option
for sharing styles via the `<link>` tag - local references to `<style>`
elements.

## Goals

- Allow developers to share styles defined in the Light DOM document into Shadow
  DOM trees.
- Allow developers to define their CSS up-front in the same document as their
  HTML when using Shadow DOM.
- Define a mechanism that will allow for more selective style sharing via CSS
  `@sheet`.
- Provide a foundation for allowing inline styles to be defined but not applied
  <a href="https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AtSheet/explainer.md">via
  `@sheet`</a>.

## Non-goals

- Anything specific to `@sheet` should be discussed in its dedicated
  <a href="https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AtSheet/explainer.md">proposal</a>.
- Modifications to Shadow DOM scoping behaviors. This proposal depends on
  existing Shadow DOM behavior as currently defined. Styles defined in a Shadow
  DOM will remain inaccessible to the Light DOM and other Shadow DOMs.

## Proposal - Local References for Link Rel Tags

We propose supporting fragment identifiers that reference the `id` attribute of
a `<style>` or `<link>` tag:

```html
<style id="inline_styles">
  p {
    color: blue;
  }
</style>
<p>Outside Shadow DOM</p>
<template shadowrootmode="open">
  <link rel="stylesheet" href="#inline_styles" />
  <p>Inside Shadow DOM</p>
</template>
```

With this functionality, the text "Inside Shadow DOM" will by styled blue, due
to the `<link rel="stylesheet" href="#inline_styles">` node's stylesheet
applying (along with the `color: blue` rule applying via the `p` selector in
that stylesheet).

### Scoping

```html
<template shadowrootmode="open">
  <style id="inline_styles_from_shadow">
    p {
      color: blue;
    }
  </style>
  <p>Inside Shadow DOM</p>
</template>
<link rel="stylesheet" href="#inline_styles_from_shadow" />
<p>
  Outside Shadow DOM. Styles defined inside the Shadow Root are not applied, so
  this text is not blue.
</p>
```

Due to existing Shadow DOM scoping behaviors, `<style>` tags defined inside the
Shadow DOM cannot be accessed from the Light DOM.

This means that `<style>` tags defined within a Shadow DOM are only accessible from
the shadow root where they are defined, as illustrated by the following examples:

```html
<template shadowrootmode="open">
  <style id="inline_styles_from_shadow">
    p {
      color: blue;
    }
  </style>
  <p>Inside Shadow DOM</p>
    <template shadowrootmode="open">
      <link rel="stylesheet" href="#inline_styles_from_shadow" />
      <p>Inside Nested Shadow DOM</p>
    </template>
</template>
```

<p>
  Styles defined inside the parent Shadow Root are not applied, so "Inside Nested Shadow DOM" is not blue.
</p>

```html
<template shadowrootmode="open">
  <style id="inline_styles_from_shadow">
    p {
      color: blue;
    }
  </style>
  <p>Inside Shadow DOM</p>
</template>
<template shadowrootmode="open">
  <link rel="stylesheet" href="#inline_styles_from_shadow" />
  <p>Inside Sibling Shadow DOM</p>
</template>
```

<p>
  Styles defined inside the sibling Shadow Root are not applied, so "Inside Sibling Shadow DOM" is not blue.
</p>

## Detailed design discussion

### Deep Clone vs Reference

`<link>` tags referencing external files are always treated as separate
instances, even when they refer to the same file. This also occurs with CSS
`@import` statements as defined in
https://www.w3.org/TR/css-cascade-3/#import-processing.

However, in this situation, it might make more sense to behave like SVG `<use>`
(and other reference-based SVG elements) by behaving as if it's a reference to
the original stylesheet instead of a deep copy. This will allow for styles to
stay in sync when the stylesheet changes. This behavior could improve developer
ergonomics by keeping stylesheets in sync. This approach could also provide
memory savings due to the fact that there would only be one stylesheet in memory
instead of many copies.

#### Specific Changes to HTML and CSS

This proposal augments the HTML `<link>` tag by supporting fragment identifiers to
same-document `<style>` tags in the `href` attribute when the `rel` attribute is
`stylesheet`.

## Considered alternatives

1. [Declarative CSS Modules](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ShadowDOM/explainer.md)
   are another mechanism for sharing styles between Declarative Shadow DOM and
   Light DOM without the use of JavaScript.
2. External CSS files in `<link>` tags - these are always asychronous (which may
   not be desired), and may have negative performance implications due to the
   need to fetch another resource.
3. CSS-encoded DataURI references in `<link>` tags - this approach avoids some
   of the issues with 2), but has poor developer ergonomics due to dataURI
   encoding. Furthermore, there is no ability to automatically synchronize
   dataURI values.

## Open Issues

1. "Deep Clone vs Reference" listed above is the biggest outstanding issue.

2. Should there be a way for Shadow DOM roots to export style ID's for sharing?

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- Alison Maher
- Andy Luhrs
- Daniel Clark
- Kevin Babbitt
- Rob Glidden
