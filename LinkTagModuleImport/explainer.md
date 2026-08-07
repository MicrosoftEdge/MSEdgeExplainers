# Style Module Imports via `<link>` Elements

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
- Expected venues: [WHATWG](https://whatwg.org/),
  [CSS Working Group](https://www.w3.org/Style/CSS/)
- Current version: this document

## Introduction

Modern web development practices have converged towards building reusable
components instead of building monolithic documents. Technologies such as
Shadow DOM allow for style isolation between components, but in practice this
isolation can lead to duplication and inefficiencies when styling components.

CSS module scripts let JavaScript import a stylesheet as a `CSSStyleSheet`
object that can be applied to multiple shadow roots. Import maps can
declaratively control how the module specifiers used by those JavaScript
imports resolve, but the platform currently requires imperative JavaScript to
apply the resulting stylesheet to each tree scope.

This explainer proposes a declarative way to resolve a module specifier, fetch
the result as a CSS module, and apply the resulting shared stylesheet to
multiple tree scopes using the `<link>` element.

## Goals

- Allow developers to declaratively apply the same CSS module stylesheet to
  multiple tree scopes.
- Allow the CSS to reside in an externally cacheable resource while reusing the
  CSS module instance for the same resolved URL and module type within the
  relevant module map.
- Avoid patterns that would cause measurable performance regressions, such as
  stylesheet duplication that cannot be deduplicated.

## Non-goals

- Exporting declarative styles (addressed in
  [Declarative CSS Modules](../ShadowDOM/explainer.md)).
- Making module `<link rel="stylesheet">` elements identical in every respect
  to classic `<link rel="stylesheet">` elements, `<link rel="modulepreload">`
  elements, `<style>` elements, or `adoptedStyleSheets` usage.

## Proposal: Module `<link rel="stylesheet">` Elements

We propose a new module mode for `<link rel="stylesheet">`, selected by
`type="module"`. In this mode, the value of `href` is resolved as a module
specifier through import map processing, using the module
`<link rel="stylesheet">` element's base URL. The resolved URL is then imported
as a CSS module. Once the CSS module has loaded, its styles are applied to the
module `<link rel="stylesheet">` element's tree scope.

For clarity, this explainer calls the existing form a "classic
`<link rel="stylesheet">` element" and the proposed form a "module
`<link rel="stylesheet">` element."

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

Here, `https://example.com/foo.css` contains the following CSS:

```css
p { color: blue; }
```

With this functionality, the text "Inside Shadow DOM" will be styled blue. The
value of the `href` attribute is resolved as a module specifier using the import
map, `https://example.com/foo.css` is fetched as a CSS module, and the resulting
stylesheet is applied to the shadow root. The shared `CSSStyleSheet` appears in
the shadow root's `styleSheets` collection. For more details on why
`styleSheets` is used instead of `adoptedStyleSheets`, see the
[dedicated section](#imported-stylesheet-appears-in-stylesheets) on this
subject.

### Underlying Stylesheet Is Shared Between Tree Scopes

Within a given module map, module `<link rel="stylesheet">` elements whose
`href` values resolve to the same URL use the same module map entry, keyed by
that URL and the CSS module type, and apply the same `CSSStyleSheet` object.

The following example applies one module stylesheet to the root document tree
and to two distinct shadow roots:

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

As a result, modifying the shared stylesheet updates every tree scope to which
it is applied. Once all three module `<link rel="stylesheet">` elements have
loaded successfully, executing the following script will resolve to the
existing CSS module instance in the document's module map:

```js
const foo = (await import("foo", { with: { type: "css" } })).default;
foo.replaceSync("p { color: green; }");
```

The import will reuse the existing module map entry without initiating another
fetch and will update all of the text in the example to green because each
module `<link rel="stylesheet">` element applies the same underlying
`CSSStyleSheet` object to each tree scope.

This capability is not possible with classic `<link rel="stylesheet">`
elements, where each `<link>` element has its own associated stylesheet.
The proposal intentionally extends the stylesheet association model: each
module `<link rel="stylesheet">` element associates the same `CSSStyleSheet`
object with its tree scope, and that object appears in each scope's
`styleSheets` collection.

### Imported Stylesheet Appears in `styleSheets`

Although the underlying `CSSStyleSheet` object is shared, it is deliberately
exposed through `styleSheets` instead of `adoptedStyleSheets`. Exposing
declaratively linked sheets through `adoptedStyleSheets` would allow
script to remove or reorder entries independently of the corresponding
module `<link rel="stylesheet">` elements, breaking synchronization between DOM
order and the applied stylesheet list. The presence and state of qualifying
module `<link rel="stylesheet">` elements instead control membership in the
read-only `styleSheets` collection, and their tree order controls the order of
its entries. This distinction concerns the mutability of the collection's
membership; the shared `CSSStyleSheet` object itself remains mutable, as shown
in the examples above. This proposal therefore extends the CSSOM definition of
which sheets are represented by `styleSheets`, introducing the concept of a
DOM-associated constructed stylesheet.

### Compatibility With Classic `<link rel="stylesheet">` Element Behaviors

Adding module imports to `<link rel="stylesheet">` introduces both similarities
to and differences from classic `<link rel="stylesheet">` elements.

This section covers several broad categories of similarities and differences
between module and classic `<link rel="stylesheet">` elements, each of which
has additional implications.

For a full list of differences and discussion of the options, see the
[planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).

#### Many Fundamental `HTMLLinkElement` Behaviors Apply to Module Elements

The `<link>` element supports many fundamental behaviors that will also apply
to module imports, creating similarities between classic and module
`<link rel="stylesheet">` elements.

For instance, the `nonce` attribute and the `onload` and `onerror` event
handlers will apply to module `<link rel="stylesheet">` elements.

#### Some Classic `<link rel="stylesheet">` Element Behaviors Do Not Apply to Module Elements

However, not all features supported by classic `<link rel="stylesheet">`
elements apply in the same way to module `<link rel="stylesheet">` elements.
Several fundamental differences cause their behaviors to diverge.

##### Constructed Stylesheets Have Different Behaviors

Because this proposal builds on existing CSS module script imports, the
stylesheet associated with each module `<link rel="stylesheet">` element is
constructed. This results in behavior that differs from classic
`<link rel="stylesheet">` elements in several ways:

- CSS module scripts do not support `@import` CSS rules.
- A constructed stylesheet always has a `null` `ownerNode`.
- An empty-prelude `@scope` CSS rule normally derives its scoping root from the
  stylesheet's `ownerNode`. A constructed stylesheet's `null` `ownerNode`
  cannot identify the module `<link rel="stylesheet">` element's parent, and
  thus CSS rule matching will differ in this scenario from a classic
  `<link rel="stylesheet">` element.

In each of these cases, module `<link rel="stylesheet">` elements will apply
the existing constructed stylesheet behavior, rather than the behaviors of
classic `<link rel="stylesheet">` elements.

##### The Difference in Cardinality Changes the Behavior of Some Attributes

Classic `<link rel="stylesheet">` elements have a one-to-one association with
their `CSSStyleSheet` objects. This proposal deliberately allows multiple
module `<link rel="stylesheet">` elements to share one underlying
`CSSStyleSheet`. As a result, attributes such as `media` and `title` cannot be
mapped directly to the shared stylesheet because each module
`<link rel="stylesheet">` element can apply the same `CSSStyleSheet` object
with different per-element state. There are several potential ways to handle
this scenario, including ignoring these attributes entirely (requiring them to
be set directly on the `CSSStyleSheet` object imperatively),
first-defined-wins, or last-defined-wins, each of which comes with tradeoffs.

##### Module Fetches Are Stricter Than Classic Fetches

Fetches for classic `<link rel="stylesheet">` elements and CSS module scripts
differ. A classic `<link rel="stylesheet">` element creates a potential-CORS
request that uses `no-cors` mode by default; its `crossorigin` attribute can opt
into CORS. Module script requests use `cors` mode, so a cross-origin response
must pass a CORS check. Their decoding also differs. CSS loaded by classic
`<link rel="stylesheet">` elements can use encoding information including a
response-provided encoding, a recognized leading byte sequence that resembles
an `@charset` declaration, or a legacy environment encoding. Module script
responses are always decoded as UTF-8. In essence, module
`<link rel="stylesheet">` element fetches will inherit the stricter module
script fetch semantics, with no option to loosen these restrictions back to the
classic `<link rel="stylesheet">` element fetch behaviors.

## Considered Alternatives

1. [Declarative CSS Modules](../ShadowDOM/explainer.md) are another mechanism
  for sharing styles between Declarative Shadow DOM and the document tree
  without JavaScript. That proposal introduces `shadowrootadoptedstylesheets`,
  which serves a similar purpose. Feedback from working group participants
  favors a `<link>`-based approach using `styleSheets` over a new attribute
  that uses `adoptedStyleSheets`.
2. [Local References In Link Rel](../LocalReferenceLinkRel/explainer.md) allow
   shadow roots to reference stylesheet definitions that are visible through
   tree-scoped lookup. They do not provide module-specifier resolution or allow
   a stylesheet definition inside one shadow root to be exported to unrelated
   roots.
3. CSS-encoded data URI references in `<link>` elements. This approach avoids
   some of the issues with 2), but data URI encoding results in poor developer
   ergonomics.

## Open Issues

1. How should behavior be defined for the full list of differences from
    classic `<link rel="stylesheet">` elements? This is tracked in the
    [planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).
2. Should we attempt to make this feature backward-compatible with
    classic `<link rel="stylesheet">` elements, or are there too many
    differences?
3. Is `href` the right way to go, even though it goes through import map
    processing? Should we use a new attribute such as `moduleimport`?

## References & Acknowledgements

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
