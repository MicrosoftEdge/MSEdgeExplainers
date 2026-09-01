# Declarative Shadow DOM Style Sharing

## Authors

- Kurt Catti-Schmidt
- Daniel Clark
- Tien Mai
- Alison Maher
- Andy Luhrs

## Participate

- [Web Components CG discussion](https://github.com/WICG/webcomponents/issues/939)
- [Issue tracker for declarative Shadow DOM style sharing](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/DeclarativeShadowDOMStyleSharing)

## Status of this Document

This document is intended as a starting point for engaging the community and
standards bodies in developing collaborative solutions fit for standardization.
As the solutions to problems described in this document progress along the
standards-track, we will retain this document as an archive and use this section
to keep the community up-to-date with the most current standards venue and
content location of future work and discussions.

- This document status: **Active**
- Expected venues: [WHATWG](https://whatwg.org/) and the
  [CSS Working Group](https://www.w3.org/Style/CSS/)
- Current version: this document

## Introduction

Modern web development practices have converged on reusable components rather
than monolithic documents. [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
provides style isolation for those components, and
[Declarative Shadow DOM (DSD)](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom)
makes them practical for server-rendered markup. In practice, however, that
isolation can cause the same CSS to be duplicated across many shadow roots.

[CSS module scripts](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script)
let JavaScript import a stylesheet as a `CSSStyleSheet` object that can be
applied to multiple tree scopes. Import maps can declaratively control how
module specifiers resolve, but the platform currently requires imperative
JavaScript to apply the resulting stylesheet to each scope.

This explainer proposes a declarative way to resolve a module specifier, fetch
the result as a CSS module, and apply the resulting shared stylesheet to a tree
scope using `<link rel="stylesheet" import="...">`.

## Problem and use cases

Authors can place a `<style>` element in each declarative shadow root, but a
page containing many instances of a component must then transmit and parse the
same CSS many times. This increases payload size, CPU cost, and memory use.

Classic `<link rel="stylesheet">` elements avoid duplicating the CSS source in
the HTML and can use the HTTP cache, but each element has its own associated
stylesheet. Constructed stylesheets and CSS module scripts can share one
stylesheet object, but applying them currently requires JavaScript and can
produce the same delayed styling problem.

These limitations are especially costly for streaming server-side rendering.
Nested and sibling components can arrive incrementally and may need the same
base styles, even though their shadow roots cannot directly reference one
another. A module specifier resolved through the document's module map gives
all of those scopes a common, declarative reference.

## Goals

- Allow developers to declaratively apply the same CSS module stylesheet to
  multiple tree scopes.
- Allow the CSS to reside in an externally cacheable resource while reusing the
  CSS module instance for the same resolved URL and module type within the
  relevant module map.
- Avoid patterns that would cause measurable performance regressions, such as
  stylesheet duplication that cannot be deduplicated.

## Non-goals

- Defining or exporting inline declarative CSS modules. That can be developed
  independently from the import mechanism proposed here.
- Allowing selectors to cross a shadow boundary or otherwise weakening Shadow
  DOM encapsulation.
- Making import links identical in every respect to classic
  `<link rel="stylesheet">` elements,
  `<link rel="modulepreload">` elements, `<style>` elements, or
  `adoptedStyleSheets` usage.

## Proposal: The `import` attribute on `<link rel="stylesheet">`

We propose an `import` attribute for `<link rel="stylesheet">`. In browsers
that support this attribute, its value is resolved as a module specifier
through import map processing, using the `<link rel="stylesheet">` element's
base URL. The resolved URL is imported as a CSS module. Once the module has
loaded, its stylesheet is applied to the link element's tree scope.

The existing `href` attribute can be supplied alongside `import` as a fallback.
A browser that supports `import` uses the imported CSS module, while an
unsupported browser ignores the unknown `import` attribute and loads `href` as
a classic stylesheet. This provides progressively enhanced stylesheet sharing
without preventing older browsers from styling the content.

For clarity, this explainer calls the existing form a *classic link* and the
proposed form an *import link*.

```html
<script type="importmap">
  {
    "imports": {
      "foo": "https://example.com/foo.css"
    }
  }
</script>
<my-element>
  <template shadowrootmode="open">
    <link rel="stylesheet" import="foo">
    <p>Inside Shadow DOM</p>
  </template>
</my-element>
```

Here, `https://example.com/foo.css` contains:

```css
p { color: blue; }
```

In a supporting browser, the text inside the shadow root is styled blue. The
`import` value is resolved as a module specifier using the import map, the
resolved URL is fetched as a CSS module, and the resulting stylesheet is
applied to the shadow root. The shared `CSSStyleSheet` appears in the shadow
root's `styleSheets` collection.

### The underlying stylesheet is shared between tree scopes

Within a module map, import links whose `import` values resolve to the same URL
use the same module map entry, keyed by that URL and the CSS module type. They
therefore apply the same `CSSStyleSheet` object.

The following example applies one module stylesheet to the document tree and
to two distinct shadow roots:

```html
<html>
  <head>
    <script type="importmap">
      {
        "imports": {
          "foo": "https://example.com/foo.css"
        }
      }
    </script>
    <link rel="stylesheet" import="foo">
  </head>
  <body>
    <p>Text in the document tree</p>
    <first-element>
      <template shadowrootmode="open">
        <link rel="stylesheet" import="foo">
        <p>Inside the first shadow root</p>
      </template>
    </first-element>
    <second-element>
      <template shadowrootmode="open">
        <link rel="stylesheet" import="foo">
        <p>Inside the second shadow root</p>
      </template>
    </second-element>
  </body>
</html>
```

Once all three import links have loaded in a supporting browser, importing
the same module resolves to the existing module map entry without another
fetch:

```js
const foo = (await import("foo", { with: { type: "css" } })).default;
foo.replaceSync("p { color: green; }");
```

The update changes the text in all three scopes to green because every
import link applies the same underlying `CSSStyleSheet` object.

### Import Maps Are Not Necessary

An import map is only needed to remap a module specifier. As with a JavaScript
module import, a relative URL can be used directly and is resolved against the
base URL of the import link.

The following example applies `./foo.css` to two shadow roots without an import
map:

```html
<first-element>
  <template shadowrootmode="open">
    <link rel="stylesheet" import="./foo.css">
    <p>Inside the first shadow root</p>
  </template>
</first-element>
<second-element>
  <template shadowrootmode="open">
    <link rel="stylesheet" import="./foo.css">
    <p>Inside the second shadow root</p>
  </template>
</second-element>
```

Each `import` resolves `./foo.css` against its link element's base URL. When
both imports resolve to the same URL, they use the same CSS module map entry
and apply the same underlying `CSSStyleSheet` object. A JavaScript import that
resolves to that URL and module type also reuses the entry:

```js
const foo = (await import("./foo.css", { with: { type: "css" } })).default;
foo.replaceSync("p { color: green; }");
```

After the update, the text in both shadow roots is green.

### Imported stylesheets appear in `styleSheets`

Although the underlying `CSSStyleSheet` object is shared, it is deliberately
exposed through `styleSheets` instead of `adoptedStyleSheets`. Exposing a
declaratively linked sheet through `adoptedStyleSheets` would allow script to
remove or reorder the entry independently of its corresponding module link,
breaking synchronization between DOM order and the applied stylesheet list.

The presence and state of qualifying import links instead control
membership in the read-only `styleSheets` collection, and their tree order
controls the order of its entries. This distinction concerns the mutability of
collection membership; the shared `CSSStyleSheet` object itself remains
mutable, as shown above. The proposal therefore extends the CSSOM definition
of which sheets are represented by `styleSheets` to include a constructed
stylesheet associated with one or more DOM link elements.

### Compatibility with classic `<link rel="stylesheet">` behavior

Classic stylesheet links and import links share fundamental `HTMLLinkElement`
behavior, but they cannot be identical because import links apply a shared,
constructed stylesheet using module fetch semantics in supporting browsers.

With the new `import` attribute, a fallback URL can be provided via `href` that
does not go through import map processing. When both attributes are present, a
supporting browser ignores `href` and performs only the module fetch for the
value of `import`. An unsupported browser doesn't recognize `import` and
processes `href` normally.

#### Fundamental `HTMLLinkElement` behavior

Existing behaviors that are not inherently tied to classic stylesheet fetches
or one-to-one stylesheet ownership will also apply to import links. For
example, the `nonce` attribute and the `load` and `error` events apply to
import links.

#### Constructed stylesheet behavior

Because the proposal builds on CSS module script imports, the associated
stylesheet is constructed. Existing constructed stylesheet behavior
produces several differences from classic stylesheet links:

- CSS module scripts do not support CSS `@import` rules.
- A constructed stylesheet always has a `null` `ownerNode`.
- An empty-prelude `@scope` rule normally derives its scoping root from the
  stylesheet's `ownerNode`. A constructed sheet cannot derive that root from
  a module link, so rule matching differs from a classic stylesheet link in
  this case.

Import links use the existing constructed stylesheet behavior in each case.

#### Per-link attributes and shared state

Classic stylesheet links have a one-to-one association with their
`CSSStyleSheet` objects. Import links deliberately allow many elements to
share one object. Attributes such as `media` and `title` therefore cannot be
mapped directly to the shared stylesheet when different import links
specify different values.

For this proposal, we will ignore the `title` attribute because its alternate
stylesheet behavior depends on browser UI that does not cleanly scale to a
many-to-one mapping. This browser UI is also no longer present in most browsers.

The `media` attribute can instead gate whether the shared stylesheet is applied
by each link element, without changing the shared stylesheet's `media`
property. This differs from classic `<link>` stylesheet behavior but is similar
to how the `<source>` element works.

These attributes retain their classic behaviors when an unsupported browser
processes the `href` attribute as fallback.

#### Module fetch and decoding semantics

Classic stylesheet and CSS module fetches differ. A classic stylesheet link
creates a potential-CORS request that uses `no-cors` mode by default; its
`crossorigin` attribute can opt into CORS. Module script requests use `cors`
mode, so a cross-origin response must pass a CORS check.

Their decoding also differs. Classic stylesheets can use response-provided or
legacy encoding information, while module script responses are always decoded
as UTF-8. In supporting browsers, import links use the stricter
module script fetch and decoding semantics. In unsupported browsers, the
`href` fallback uses classic stylesheet fetch and decoding semantics.

## Alternate proposals

### The `shadowrootadoptedstylesheets` attribute

This proposal originally introduced a `shadowrootadoptedstylesheets` attribute
on the `<template>` element, which accepts a space-separated list of
module specifiers and adds the corresponding CSS module exports to the shadow
root's `adoptedStyleSheets` list.

```html
<script type="importmap">
  {
    "imports": {
      "foo": "https://example.com/foo.css"
    }
  }
</script>
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    <p>Inside Shadow DOM</p>
  </template>
</my-element>
```

This design closely maps to the imperative `adoptedStyleSheets` API and avoids
adding a link node for each stylesheet. Based on feedback, this proposal now uses
existing link semantics, exposes load and error events at the point of use, and
keeps stylesheet membership and ordering synchronized with the DOM.

### Local references in `<link rel="stylesheet">`

[Local References in Link Rel](../LocalReferenceLinkRel/explainer.md) allow a
shadow root to reference a stylesheet definition found through tree-scoped
lookup. They use existing ID-reference concepts and can share a light-DOM
stylesheet with descendant shadow roots, but they do not provide module
specifier resolution or allow a definition in one shadow root to be exported
to unrelated roots.

### `@sheet`, `adoptStyles`, and CSS layers

The [`@sheet` proposal](../AtSheet/explainer.md) defines multiple named sheets
in CSS, while the
[`adoptStyles` proposal](https://github.com/w3c/csswg-drafts/issues/10176#issuecomment-2021514454)
would let a shadow root inherit selected styles or layers. These approaches
integrate more directly with CSS, but their identifiers are tree-scoped unless
additional cross-shadow behavior is defined. Nested shadow roots would need to
pass styles through each level, which does not address all streaming SSR cases.

### Updates to module map keys and local-reference schemes

Inline module definitions could instead change module map keys from
`(URL, module type)` pairs to `(string, module type)` pairs, require fragment
identifiers, or introduce a local-reference URL scheme. Those options create
new interactions with import maps, document base URLs, fragment navigation,
shadow-tree scoping, and custom scheme handlers. The primary proposal avoids
those changes by resolving `import` with the existing module system.

## References and acknowledgements

For specific details on each part of the proposal and how it is expected to
work, please see the [planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w)

This consolidated explainer includes work, feedback, and advice from:

- Alison Maher
- Alex Russell
- Andy Luhrs
- Anne van Kesteren
- Daniel (Dan) Clark
- Emilio Cobos Álvarez
- Hoch Hochkeppel
- Jake Archibald
- Jeffrey Yasskin
- Justin Fagnani
- Keith Cirkel
- Kurt Catti-Schmidt
- Lea Verou
- Mason Freed
- Noam Rosenthal
- Steve Orvell
- Tien Mai
