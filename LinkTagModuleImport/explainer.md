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
- Making module stylesheet `<link>` elements identical in every respect to
  `<link rel="stylesheet">` elements, `<link rel="modulepreload">` elements,
  `<style>` elements, or `adoptedStyleSheets` usage.

## Proposal: Module Stylesheet `<link>` Elements

We propose a new module stylesheet mode for `<link rel="stylesheet">`, selected
by `type="module"`, and a new `specifierimport` attribute. The value of
`specifierimport` is resolved as a module specifier through import map
processing, using the module stylesheet `<link>` element's base URL. The
resolved URL is then fetched as a CSS module. Once the CSS module has loaded,
its styles are applied to the module stylesheet `<link>` element's tree scope.

For clarity, this explainer uses "module stylesheet `<link>` element" for the
proposed `<link rel="stylesheet" type="module">` form and
"`<link rel="stylesheet">` element" for the existing non-module form.

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
the shadow root's `styleSheets` collection. For more details on why `styleSheets`
is used instead of `adoptedStyleSheets`, see the
[dedicated section](#underlying-cssom-data-model) on this subject.

### Underlying Stylesheet Is Shared Between Tree Scopes

The result of this design is that module stylesheet `<link>` elements that
resolve to the same URL (after import map processing) and use the CSS module
type in the same module map apply the same `CSSStyleSheet` object. Each element
controls whether that object applies to its own tree scope.

The following example applies one module stylesheet to the root document tree and to
two distinct shadow roots:

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
it is applied. Once all three module stylesheet `<link>` elements have loaded
successfully, executing the following script will resolve to the existing CSS
module instance in the document's module map:

```js
const foo = (await import("foo", { with: { type: "css" } })).default;
foo.replaceSync("p { color: green; }");
```

The import will reuse the existing module map entry without initiating another
fetch and will update all of the text in the example to green because each
module stylesheet `<link>` element applies the same underlying `CSSStyleSheet`
object to each tree scope.

This capability is not possible with `<link rel="stylesheet">` elements, where
each element has its own associated stylesheet and owner node. The proposal
intentionally extends the stylesheet association model: each module stylesheet
`<link>` element associates the same `CSSStyleSheet` object with its tree scope,
and that object appears in each scope's `styleSheets` collection.

### Underlying CSSOM Data Model

Although the underlying `CSSStyleSheet` object is shared, it is deliberately
exposed through `styleSheets` instead of `adoptedStyleSheets`. Exposing
declaratively linked sheets through `adoptedStyleSheets` would allow
script to remove or reorder entries independently of the corresponding
module stylesheet `<link>` elements, breaking synchronization between DOM order
and the applied stylesheet list. The presence and state of qualifying module
stylesheet `<link>` elements instead control membership in the read-only
`styleSheets` collection, and their tree order controls the order of its
entries. This distinction concerns the mutability of the collection's
membership; the shared `CSSStyleSheet` object itself remains mutable, as shown
in the examples above. This proposal therefore extends the CSSOM definition of
which sheets are represented by `styleSheets`, introducing the concept of a
DOM-associated constructed stylesheet.

### Compatibility With Existing `<link rel="stylesheet">` Element Capabilities

This proposal is intended to be compatible with many existing capabilities of
the `<link>` element, including the `nonce` attribute and the `onload` and
`onerror` event handlers.

However, not all features supported by `<link rel="stylesheet">` elements apply
in the same way to module stylesheet `<link>` elements. Several fundamental
differences cause their behaviors to diverge:

1. **Constructed stylesheets:** Because this proposal builds on existing CSS
   module script imports, the stylesheet associated with each module stylesheet
   `<link>` element is constructed. This results in behavior that differs from
   existing `<link rel="stylesheet">` elements in several ways:
   - A constructed stylesheet always has a null `ownerNode`.
   - Constructed stylesheets currently skip `@import` rules rather than loading
     the imported stylesheets.
   - An empty-prelude `@scope` rule determines its scoping root from the
     stylesheet's owner node, which will differ with CSS module scripts because
     the owner node is null.

   In each of these cases, the behavior of module stylesheet `<link>` elements
   will match that of existing constructed stylesheets rather than the current
   behavior of `<link rel="stylesheet">` elements.

2. **Cardinality:** `<link rel="stylesheet">` elements have a one-to-one
   association with their `CSSStyleSheet` objects. This proposal deliberately
   allows multiple module stylesheet `<link>` elements to share one underlying
   `CSSStyleSheet`. As a result, attributes such as `media` and `title` cannot
   be mapped directly to the shared stylesheet because each module stylesheet
   `<link>` element can apply the same `CSSStyleSheet` object with different
   per-element state. There are several potential ways to handle this scenario,
   including ignoring these attributes entirely (requiring them to be set
   directly on the `CSSStyleSheet` object imperatively), first-defined-wins, or
   last-defined-wins, each of which comes with tradeoffs.

3. **Fetch behavior:** Fetches for `<link rel="stylesheet">` elements and CSS
   module scripts differ. A `<link rel="stylesheet">` element creates a
   potential-CORS request that uses `no-cors` mode by default; its `crossorigin`
   attribute can opt into CORS. Module script requests use `cors` mode, so a
   cross-origin response must pass a CORS check. Their decoding also differs.
   CSS loaded by `<link rel="stylesheet">` elements can use encoding information
   from the response, a recognized leading byte sequence that resembles an
   `@charset` declaration, or a legacy environment encoding. Module script
   responses are always decoded as UTF-8. In essence, module stylesheet
   `<link>` element fetches will inherit the stricter module script fetch
   semantics, with no option to loosen these restrictions back to the existing
   `<link rel="stylesheet">` fetch behaviors.

For a full list of differences and discussions on options, see the
[planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).

## Considered Alternatives

1. [Declarative CSS Modules](../ShadowDOM/explainer.md)
   are another mechanism for sharing styles between Declarative Shadow DOM and
   the document tree without JavaScript. That proposal introduces
   `shadowrootadoptedstylesheets`, which serves a similar purpose. Feedback
   from working group participants favors a `<link>`-based approach using
   `styleSheets` over a new attribute that uses `adoptedStyleSheets`.
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
  `<link rel="stylesheet">` elements? This is currently being tracked in the
   [planning document](https://docs.google.com/document/d/1SkHwxAIBW5I3uqnmmov4D71ZPbj9woouj3RdPqd3X1w).
2. Should module stylesheet `<link>` elements use `type="module"` and
   `specifierimport`, or different syntax and `href`?
3. Should we attempt to make this feature backward-compatible with
   `<link rel="stylesheet">` elements, or are there too many differences?

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
