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
As the solutions described in this document progress along the standards
track, we will retain this document as an archive and use this section to keep
the community up to date with the current standards venue and content.

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
scope using `<link rel="stylesheet" type="module">`.

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
  the document and to multiple shadow roots.
- Allow CSS to reside in an externally cacheable resource while reusing the
  CSS module instance for the same resolved URL and module type in a module
  map.
- Work with Declarative Shadow DOM without requiring author JavaScript to
  attach stylesheets.
- Preserve familiar `<link>` element behavior, DOM ordering, and event handling
  where those behaviors are compatible with shared CSS modules.
- Avoid stylesheet and parsing duplication.

## Non-goals

- Defining or exporting inline declarative CSS modules. That can be developed
  independently from the import mechanism proposed here.
- Allowing selectors to cross a shadow boundary or otherwise weakening Shadow
  DOM encapsulation.
- Making module `<link rel="stylesheet">` elements identical in every respect
  to classic `<link rel="stylesheet">` elements, `<link rel="modulepreload">`
  elements, `<style>` elements, or `adoptedStyleSheets` usage.

## Proposal: Module `<link rel="stylesheet">` elements

We propose a module mode for `<link rel="stylesheet">`, selected by
`type="module"`. In this mode, the value of `href` is resolved as a module
specifier through import map processing, using the module
`<link rel="stylesheet">` element's base URL. The resolved URL is imported as
a CSS module. Once the module has loaded, its stylesheet is applied to the
module `<link rel="stylesheet">` element's tree scope.

For clarity, this explainer calls the existing form a *classic*
`<link rel="stylesheet">` element and the proposed form a *module*
`<link rel="stylesheet">` element.

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
    <link rel="stylesheet" type="module" href="foo">
    <p>Inside Shadow DOM</p>
  </template>
</my-element>
```

Here, `https://example.com/foo.css` contains:

```css
p { color: blue; }
```

The text inside the shadow root is styled blue. The `href` value is resolved as
a module specifier using the import map, the resolved URL is fetched as a CSS
module, and the resulting stylesheet is applied to the shadow root. The shared
`CSSStyleSheet` appears in the shadow root's `styleSheets` collection.

### The underlying stylesheet is shared between tree scopes

Within a module map, module `<link rel="stylesheet">` elements whose `href`
values resolve to the same URL use the same module map entry, keyed by that URL
and the CSS module type. They therefore apply the same `CSSStyleSheet` object.

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
    <link rel="stylesheet" type="module" href="foo">
  </head>
  <body>
    <p>Text in the document tree</p>
    <first-element>
      <template shadowrootmode="open">
        <link rel="stylesheet" type="module" href="foo">
        <p>Inside the first shadow root</p>
      </template>
    </first-element>
    <second-element>
      <template shadowrootmode="open">
        <link rel="stylesheet" type="module" href="foo">
        <p>Inside the second shadow root</p>
      </template>
    </second-element>
  </body>
</html>
```

Once all three module links have loaded, importing the same module resolves to
the existing module map entry without another fetch:

```js
const foo = (await import("foo", { with: { type: "css" } })).default;
foo.replaceSync("p { color: green; }");
```

The update changes the text in all three scopes to green because every module
link applies the same underlying `CSSStyleSheet` object. This is not possible
with classic `<link rel="stylesheet">` elements, for which each link has its
own associated stylesheet.

### Imported stylesheets appear in `styleSheets`

Although the underlying `CSSStyleSheet` object is shared, it is deliberately
exposed through `styleSheets` instead of `adoptedStyleSheets`. Exposing a
declaratively linked sheet through `adoptedStyleSheets` would allow script to
remove or reorder the entry independently of its corresponding module link,
breaking synchronization between DOM order and the applied stylesheet list.

The presence and state of qualifying module links instead control membership
in the read-only `styleSheets` collection, and their tree order controls the
order of its entries. This distinction concerns the mutability of collection
membership; the shared `CSSStyleSheet` object itself remains mutable, as shown
above. The proposal therefore extends the CSSOM definition of which sheets are
represented by `styleSheets`, introducing a DOM-associated constructed
stylesheet.

### Compatibility with classic `<link rel="stylesheet">` behavior

Module and classic stylesheet links share fundamental `HTMLLinkElement`
behavior, but they cannot be identical because module links import a shared,
constructed stylesheet using module fetch semantics. The differences in
`href` processing between the two would make backwards compatibility
difficult.

#### Fundamental `HTMLLinkElement` behavior

Existing behaviors that are not inherently tied to classic stylesheet fetches
or one-to-one stylesheet ownership should also apply to module links. For
example, the `nonce` attribute and the `load` and `error` events apply to
module `<link rel="stylesheet">` elements.

#### Constructed stylesheet behavior

Because the proposal builds on CSS module script imports, the associated
stylesheet is constructed. Existing constructed stylesheet behavior therefore
produces several differences from classic stylesheet links:

- CSS module scripts do not support CSS `@import` rules.
- A constructed stylesheet always has a `null` `ownerNode`.
- An empty-prelude `@scope` rule normally derives its scoping root from the
  stylesheet's `ownerNode`. A constructed sheet cannot derive that root from
  a module link, so rule matching differs from a classic stylesheet link in
  this case.

Module links use the existing constructed stylesheet behavior in each case.

#### Per-link attributes and shared state

Classic stylesheet links have a one-to-one association with their
`CSSStyleSheet` objects. Module links deliberately allow many elements to share
one object. Attributes such as `media` and `title` therefore cannot be mapped
directly to the shared stylesheet when different module links specify different
values. Options include ignoring those attributes, using first-defined-wins or
last-defined-wins behavior, or representing their state per element association.
This remains an open design question.

#### Module fetch and decoding semantics

Classic stylesheet and CSS module fetches differ. A classic stylesheet link
creates a potential-CORS request that uses `no-cors` mode by default; its
`crossorigin` attribute can opt into CORS. Module script requests use `cors`
mode, so a cross-origin response must pass a CORS check.

Their decoding also differs. Classic stylesheets can use response-provided or
legacy encoding information, while module script responses are always decoded
as UTF-8. Module stylesheet links inherit the stricter module script fetch and
decoding semantics, with no option to fall back to the classic behavior.

## Alternate proposals

### The `shadowrootadoptedstylesheets` attribute

This proposal originally introduced a `shadowrootadoptedstylesheets` attribute
the `<template>` element, which accepts a space-separated list of
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
those changes by resolving `href` with the existing module system.

## Open issues

1. How should behavior be defined for the full set of differences from classic
   `<link rel="stylesheet">` elements? This is tracked in the
   [planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).
2. Is `href` the right attribute even though its value undergoes import map
   processing, or should a new attribute such as `moduleimport` be used?
3. How should the cardinality issues for attributes such as `media` and
   `title` be addressed?

## References and acknowledgements

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
