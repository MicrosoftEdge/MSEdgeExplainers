# Style Module Imports via `<link>` Tags

## Authors

- Kurt Catti-Schmidt

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/LinkTagImport)

## Status of this Document

This document is intended as a starting point for engaging the community and
standards bodies in developing collaborative solutions fit for standardization.
As the solutions to problems described in this document progress along the
standards-track, we will retain this document as an archive and use this section
to keep the community up-to-date with the most current standards venue and
content location of future work and discussions.

- This document status: **Active**
- Expected venues: [WHATWG](https://whatwg.org/), [CSS Working Group](https://www.w3.org/Style/CSS/)
- Current version: this document

## Introduction

Modern web development practices have converged towards building reusable
components instead of building monolithic documents. Technologies such as
Shadow DOM allow for style isolation between components, but in practice this
isolation can lead to duplication and inefficiencies when styling components.

CSS module scripts let JavaScript import a stylesheet as a `CSSStyleSheet`
object that can be adopted into multiple shadow roots. Import maps can
declaratively control how the module specifiers used by those JavaScript
imports resolve, but the platform currently requires imperative JavaScript to
adopt the resulting stylesheet into each root.

This explainer proposes a declarative way to resolve a module specifier, fetch
the result as a CSS module, and apply the resulting shared stylesheet to
multiple tree scopes using the `<link>` element.

## Goals

- Allow developers to declaratively apply the same CSS module stylesheet to
  multiple document and shadow tree scopes.
- Allow the CSS to reside in an externally cacheable resource while reusing the
  CSS module instance for the same resolved URL and module type within the
  relevant module map.
- Avoid patterns that would cause measurable performance regressions, such as
  stylesheet duplication that cannot be deduplicated.
- Define rendering behavior that lets authors avoid additional flashes of
  unstyled content (FOUC) and layout shifts.

## Non-goals

- Exporting declarative styles (addressed in [Declarative CSS Modules](../ShadowDOM/explainer.md)).
- Making module links identical in every respect to classic
  `<link rel="stylesheet">`, `<link rel="modulepreload">`, `<style>`, or
  `adoptedStyleSheets` usage.

## Proposal: Module Stylesheet Links

We propose a new module-stylesheet mode for `<link rel="stylesheet">`, selected
by `type="module"`, and a new `specifierimport` attribute. The value of
`specifierimport` is resolved as a module specifier through import-map
processing, using the link element's base URL. The resolved URL is then fetched
as a CSS module.

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
    <link rel="stylesheet" type="module" specifierimport="foo">
    <p>Inside Shadow DOM</p>
  </template>
</my-element>
```

Here, `https://example.com/foo.css` contains the following CSS:

```css
p { color: blue; }
```

With this functionality, the text "Inside Shadow DOM" will be styled blue. The
`specifierimport` attribute is resolved using the import map,
`https://example.com/foo.css` is fetched as a CSS module, and the resulting
stylesheet is applied to the shadow root. The shared `CSSStyleSheet` appears in
the shadow root's `styleSheets` collection.

Although the underlying object is shared, exposing it through `styleSheets` is
intentional. Exposing declaratively linked sheets through `adoptedStyleSheets`
would allow script to remove or reorder entries independently of the
corresponding `<link>` elements, breaking synchronization between the DOM and
the applied stylesheet list. The presence and state of qualifying `<link>`
elements instead control membership in the read-only `styleSheets` collection,
and their tree order controls the order of its entries. This distinction
concerns the mutability of the collection's membership; the shared
`CSSStyleSheet` object itself remains mutable, as shown below. This proposal
therefore extends the CSSOM definition of which sheets are represented by
`styleSheets`, introducing the concept of a DOM-associated constructed
stylesheet.

### Underlying Stylesheet Is Shared Between Tree Scopes

The intended invariant is that links which resolve to the same URL and CSS
module type in the same module map apply the same `CSSStyleSheet` object. Each
link controls whether that object applies to its own tree scope. The following
example applies one module stylesheet to the document and to two distinct
shadow roots:

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
    <link rel="stylesheet" type="module" specifierimport="foo">
  </head>
  <body>
    <p>Text in the document tree</p>
    <first-element>
      <template shadowrootmode="open">
        <link rel="stylesheet" type="module" specifierimport="foo">
        <p>Inside the first shadow root</p>
      </template>
    </first-element>
    <second-element>
      <template shadowrootmode="open">
        <link rel="stylesheet" type="module" specifierimport="foo">
        <p>Inside the second shadow root</p>
      </template>
    </second-element>
  </body>
</html>
```

As a result, modifying the shared stylesheet updates every tree scope to which
it is applied. If all three module stylesheet links have loaded successfully,
the following script resolves to the existing CSS module instance in the
document's module map:

```js
const foo = (await import("foo", { with: { type: "css" } })).default;
foo.replaceSync("p { color: green; }");
```

The import can reuse the existing module-map entry without initiating another
fetch and will update all of the text in the example to green because each link
applies the same `CSSStyleSheet` object.

This capability is not possible with a regular `<link rel="stylesheet">`,
where each link normally has its own associated stylesheet and owner node. The
proposal intentionally extends the link-associated stylesheet model: each link
associates the same `CSSStyleSheet` object with its tree scope, and that object
appears in each scope's `styleSheets` collection.

### Compatibility With Existing `<link>` Tag Capabilities

This proposal is intended to be compatible with many existing capabilities,
such as `nonce` and `integrity`.

However, not all features supported by `<link rel="stylesheet">` apply in the
same way to a CSS module. Several fundamental differences affect multiple
existing link behaviors.

CSS module script creation produces a constructed stylesheet. Because this
proposal reuses the same CSS module instance, the stylesheet exposed through
each link is constructed even though it is associated with one or more
`<link>` elements. This differs from classic `<link rel="stylesheet">`
behavior in several ways. For example, a constructed stylesheet has a null
`ownerNode`. CSS modules also currently skip `@import` rules rather than
loading the imported stylesheets.

Current `<link rel="stylesheet">` elements have a one-to-one association with
their `CSSStyleSheet` objects. This proposal deliberately allows multiple link
elements to share one `CSSStyleSheet`. As a result, attributes such as `media`
and `title` cannot be mapped directly to the shared stylesheet because each
link can apply the same `CSSStyleSheet` object with different per-link state.

Classic stylesheet links and CSS module script fetches also differ. A classic
stylesheet link creates a potential-CORS request that uses `no-cors` mode by
default; its `crossorigin` attribute can opt into CORS. Module script requests
use `cors` mode, so a cross-origin response must pass a CORS check. Their
decoding also differs. Classic external CSS can use encoding information from
the response, a recognized leading byte sequence that resembles an `@charset`
declaration, or a legacy environment encoding. Module script responses are
always decoded as UTF-8.

For a full list of differences and a discussion on options, please see
the [planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).

## Considered alternatives

1. [Declarative CSS Modules](../ShadowDOM/explainer.md)
   are another mechanism for sharing styles between Declarative Shadow DOM and
   the document tree without JavaScript. That proposal introduces
   `shadowrootadoptedstylesheets`, which serves a similar purpose. Feedback
   from working group participants favors a `<link>`-based approach over a new
   attribute.
2. [Local References In Link Rel](../LocalReferenceLinkRel/explainer.md) allow
   shadow roots to reference stylesheet definitions that are visible through
   tree-scoped lookup. They do not provide module-specifier resolution or allow
   a stylesheet definition inside one shadow root to be exported to unrelated
   roots.
3. CSS-encoded data URI references in `<link>` tags. This approach avoids some
   of the issues with 2), but has poor developer ergonomics due to data URI
   encoding. Furthermore, the platform provides no mechanism to synchronize
   duplicated data URI values automatically.

## Open Issues

1. What is the full list of differences from `<link rel="stylesheet">`? This is
   currently being tracked in the [planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).
2. Which existing `<link rel="stylesheet">` behaviors should module stylesheet
   links preserve? Syntax compatibility, fetch-related attributes, CSSOM
   behavior, and per-link stylesheet features may require different answers
   because of the fundamental differences between classic and module
   stylesheets. The primary differences involve the existing one-to-one
   association between a `<link>` element and its stylesheet, CSS module
   fetch requirements, and the behavior of constructed stylesheets.
3. How should a DOM-associated constructed stylesheet affect CSSOM concepts
   that currently assume a single owner node or association?
4. Should module stylesheet links use `type="module"` and `specifierimport`, or
   different syntax and names?

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- Alison Maher
- Dan Clark
- Emilio Cobos Álvarez
- Hoch Hochkeppel
- Jake Archibald
- Justin Fagnani
- Keith Cirkel
- Lea Verou
- Mason Freed
- Noam Rosenthal
- Steve Orvell
