# The `shadowrootadoptedstylesheets` Attribute for Declarative Shadow DOM

## Authors

- Kurt Catti-Schmidt
- Hoch Hochkeppel
- Daniel Clark
- Alison Maher

## Participate
- [Discussion forum](https://github.com/WICG/webcomponents/issues/939)
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/DeclarativeShadowDOMStyleSharing)

## Status of this Document

This document is intended as a starting point for engaging the community and
standards bodies in developing collaborative solutions fit for standardization.
As the solutions to problems described in this document progress along the
standards-track, we will retain this document as an archive and use this section
to keep the community up-to-date with the most current standards venue and
content location of future work and discussions.

* This document status: **Active**
* Expected venue: [WHATWG](https://html.spec.whatwg.org/)
* Current version: this document

## Table of Contents
- [The `shadowrootadoptedstylesheets` Attribute for Declarative Shadow DOM](#the-shadowrootadoptedstylesheets-attribute-for-declarative-shadow-dom)
  - [Authors](#authors)
  - [Participate](#participate)
  - [Status of this Document](#status-of-this-document)
  - [Table of Contents](#table-of-contents)
  - [Background](#background)
  - [Proposal: The `shadowrootadoptedstylesheets` attribute](#proposal-the-shadowrootadoptedstylesheets-attribute)
    - [Relationship to `<style type="module">`](#relationship-to-style-typemodule)
    - [Basic usage](#basic-usage)
    - [Multiple specifiers](#multiple-specifiers)
    - [How the attribute is evaluated](#how-the-attribute-is-evaluated)
    - [Declarative modules are not applied retroactively](#declarative-modules-are-not-applied-retroactively)
    - [Fetch Behavior For External Specifiers](#fetch-behavior-for-external-specifiers)
    - [Template element reflection](#template-element-reflection)
  - [Alternate proposals](#alternate-proposals)
    - [Using A Link Tag To Adopt Stylesheets](#using-a-link-tag-to-adopt-stylesheets)
  - [Polyfills](#polyfills)
  - [Open issues](#open-issues)
  - [References and acknowledgements](#references-and-acknowledgements)


## Background
This explainer is split from the [Declarative adoptedStyleSheets for Sharing Styles In Declarative Shadow DOM](../ShadowDOM/explainer.md) explainer. That document covers both proposed features for declarative style sharing in [Declarative Shadow DOM (DSD)](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom):

1. **`<style type="module" specifier="...">`** — Inline, declarative CSS module scripts that define reusable styles and add them to the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map).
2. **`shadowrootadoptedstylesheets`** — An attribute on the `<template>` tag that adopts CSS modules into a shadow root's `adoptedStyleSheets` list.

This document focuses exclusively on the `shadowrootadoptedstylesheets` attribute (feature #2). While both features work best together, they can be released independently. For the full problem statement, goals, use cases, and details on `<style type="module">`, please see the [parent explainer](../ShadowDOM/explainer.md).

## Proposal: The `shadowrootadoptedstylesheets` attribute

The `shadowrootadoptedstylesheets` attribute on the `<template>` element is a declarative analog to the imperative [adoptedStyleSheets](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets) property. It accepts a space-separated list of module specifiers, and adopts the corresponding [CSS module scripts](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) into the shadow root's `adoptedStyleSheets` list.

### Relationship to `<style type="module">`

`<style type="module">` allows for declaratively creating CSS Module Scripts that can be applied via `shadowrootadoptedstylesheets`. See the [parent explainer](../ShadowDOM/explainer.md#proposal-inline-declarative-css-module-scripts) for details on how CSS modules are defined and registered.

### Basic usage

Given a CSS module defined with `<style type="module">` (see [parent explainer](../ShadowDOM/explainer.md#proposal-inline-declarative-css-module-scripts)), the styles can be applied to a DSD as follows:

```html
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>

<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    <div id="content">styled text</div>
  </template>
</my-element>
```

The shadow root will be created with its `adoptedStyleSheets` array containing the `"foo"` [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script). This single CSS module script can be shared by any number of shadow roots.

### Multiple specifiers

The `shadowrootadoptedstylesheets` attribute accepts a space-separated list, allowing multiple stylesheets to be adopted:

```html
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>

<style type="module" specifier="bar">
  #content {
    font-family: sans-serif;
  }
</style>

<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo bar">
    <div id="content">styled text</div>
  </template>
</my-element>
```

### How the attribute is evaluated

When the `<template>` element is parsed, the `shadowrootadoptedstylesheets` attribute is evaluated. Each space-separated identifier is resolved using the following rules:

1. **Specifier is already in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map):** The associated [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script)'s default export of type [CSSStyleSheet](https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface) is added to the `adoptedStyleSheets` backing list associated with the `<template>` element's [shadow root](https://www.w3.org/TR/cssom-1/#dom-documentorshadowroot-adoptedstylesheets).
2. **Specifier resolves to a URL but is not in the module map:** A fetch is initiated and an empty placeholder is inserted into the `adoptedStyleSheets` list at the corresponding position. Once the fetch completes, the placeholder is replaced with the fetched stylesheet. See [Fetch Behavior For External Specifiers](#fetch-behavior-for-external-specifiers).
3. **Specifier does not resolve to a URL (e.g. a bare specifier with no import map entry):** The fetch attempt fails. An empty placeholder entry remains in the `adoptedStyleSheets` list and no styles are applied for that specifier. Developer tools should warn in this scenario.

Stylesheets are added in specified order, and applied as defined in [CSS Style Sheet Collections](https://www.w3.org/TR/cssom-1/#css-style-sheet-collections). The attribute does **not** retroactively pick up inline modules that are added to the module map after parsing `shadowrootadoptedstylesheets` (see [Declarative modules are not applied retroactively](#declarative-modules-are-not-applied-retroactively) for examples and details). However, external URL specifiers **may be** eventually applied — they trigger a fetch when not present in the module map, so styles will arrive once the fetch completes (with an associated FOUC).

This design allows for adopting both declarative and imperative CSS Modules via the `shadowrootadoptedstylesheets` attribute.

As with existing `<style>` tags, if the CSS contains invalid syntax, error handling follows the rules specified in [error handling](https://www.w3.org/TR/css-syntax-3/#error-handling).

### Declarative modules are not applied retroactively

Declarative modules (defined via `<style type="module">`) must be present in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) at the time the `<template>` element is parsed — they are **not** applied retroactively.

In the following example, no styles are applied because the inline CSS module is defined after the `<template>`:

```html
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    ...
  </template>
</my-element>
<!-- This module definition comes too late — `shadowrootadoptedstylesheets` has already been processed. -->
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>
```

When the `<template>` element is parsed, a fetch for the specifier "foo" with a [module type](https://html.spec.whatwg.org/multipage/webappapis.html#module-type-from-module-request) of "css" is attempted. Because "foo" is a [bare specifier](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier), it does not resolve to a URL unless an [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) provides a mapping for it. Without such a mapping, the fetch fails and the placeholder entry remains empty. The later `<style>` element populates the module map, but since the attribute is not revisited after parsing, the `adoptedStyleSheets` list remains empty. Developer tools should warn in this scenario.

Similarly, when the `<style>` element is a child of the `<template>` that adopts it, the styles will not be applied to the shadow root:

```html
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    <style type="module" specifier="foo">
      #content {
        color: red;
      }
    </style>
    ...
  </template>
</my-element>
```

The `<template>` element is parsed first and attempts to fetch "foo", which fails because the module map does not yet contain it. The child `<style>` element is parsed afterwards and populates the module map, but the attribute is not revisited. Subsequent `<template>` elements could adopt "foo", because after this point, it has been defined and is available in the module map.

For more details on the parsing workflow, including how `<style type="module">` populates the module map via import map entries, see the [Detailed Parsing Workflow](../ShadowDOM/explainer.md#detailed-parsing-workflow) section in the parent explainer.

### Fetch Behavior For External Specifiers

When a specifier in `shadowrootadoptedstylesheets` is not present in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) at parse time and the specifier resolves to a URL, the attribute initiates a fetch for that URL. An empty placeholder [CSSStyleSheet](https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface) entry is inserted into the `adoptedStyleSheets` array at the position corresponding to the specifier in `shadowrootadoptedstylesheets`. Once the fetch completes successfully, the placeholder is replaced with the fetched [CSSStyleSheet](https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface), and the shadow root's styles are updated accordingly.

This means the following example will work, even without a preceding `<link rel="modulepreload">`:

```html
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="./foo.css">
    <div id="content">styled text</div>
  </template>
</my-element>
```

The shadow root is initially rendered without the styles from "foo.css". Once the fetch completes, the styles are applied. This will cause a FOUC (Flash of Unstyled Content) — the element is first painted without the external styles and then repainted once the fetch completes.

Developers should pre-fetch external CSS using [`<link rel="modulepreload">`](https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload) to ensure it's in the module map before the `<template>` is parsed, avoiding FOUC and providing error handling:

```html
<head>
  <link rel="modulepreload" as="style" href="./foo.css" onerror="handleError()">
</head>
...
<div>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="./foo.css">
    ...
  </template>
</div>
<div>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="./foo.css">
    ...
  </template>
</div>
```

Note that the second `<template>` tag doesn't need a corresponding `<link rel="modulepreload">` — this only needs to happen once per external module, per document, to attempt to pre-populate the module map before `shadowrootadoptedstylesheets` is parsed.

#### Limitations

The fetch fallback has an important limitation: **there is no way to catch fetch errors or provide a fallback**. If the fetch fails (e.g. a 404 response or network error), the placeholder entry remains empty and no styles are applied for that specifier. There is no mechanism for the developer to detect this failure or substitute alternative styles declaratively.

For this reason, developer tools should surface a warning when `shadowrootadoptedstylesheets` triggers a fetch, recommending that developers either:
1. Define the styles inline using `<style type="module" specifier="...">` (a [Declarative CSS Module](../ShadowDOM/explainer.md#proposal-inline-declarative-css-module-scripts)) so the styles are available synchronously, or
2. Use `<link rel="modulepreload">` to pre-fetch the module, which supports error handling via the `onerror` event and can be combined with [`blocking="render"`](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#blocking-attributes) to avoid FOUC.

The order of `shadowrootadoptedstylesheets` reflects the order in the underlying `adoptedStyleSheets` array, which may impact the final application of CSS rules, as they are applied [in array order](https://drafts.csswg.org/cssom/#css-style-sheet-collections). Since fetch completion order may not match the specified order, each fetch completion could trigger a separate FOUC.

### Template element reflection

The `<template>` element that declares a Declarative Shadow DOM is consumed by the HTML parser — the parser creates the shadow root directly and the `<template>` element does not appear in the resulting DOM tree. This means that the `shadowrootadoptedstylesheets` attribute is no longer accessible via standard DOM APIs after parsing. To support reflection, a new `shadowRootAdoptedStyleSheets` DOM property should be added to the [`HTMLTemplateElement`](https://html.spec.whatwg.org/multipage/scripting.html#htmltemplateelement) interface.

This property would reflect the initial value of the `shadowrootadoptedstylesheets` attribute as it was specified at parse time. It would return the space-separated string of specifiers that were originally provided, regardless of whether those specifiers resolved successfully. This is consistent with how other `shadowroot*` attributes on `<template>` are reflected (e.g. [`shadowRootMode`](https://html.spec.whatwg.org/multipage/scripting.html#dom-template-shadowrootmode)).

```js
const template = document.createElement('template');
template.setAttribute('shadowrootadoptedstylesheets', 'foo bar');
console.log(template.shadowRootAdoptedStyleSheets); // "foo bar"
```

This reflection is important for several reasons:
* **Polyfills** need to inspect the attribute value to apply fallback behavior in user agents that do not natively support `shadowrootadoptedstylesheets`.
* **Developer tools** can use the reflected value to display diagnostic information about which specifiers were requested.
* **Serialization** scenarios (e.g. [`getHTML()`](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-gethtml)) need the attribute value to produce correct markup when serializing a shadow root back to HTML.

## Alternate proposals

For a comprehensive list of alternate proposals for declarative style sharing (including Updates to Module Map Key, Local References For Link Rel, Layer and adoptStyles, and `@Sheet`), see the [Alternate proposals](../ShadowDOM/explainer.md#alternate-proposals) section of the parent explainer. The following alternate proposals are specific to the mechanism used for adopting stylesheets into shadow roots.

### Using A Link Tag To Adopt Stylesheets

The samples listed use a proposed `shadowrootadoptedstylesheets` attribute on the `<template>` tag with a space-separated list of specifiers. This closely maps to the existing JavaScript `adoptedStyleSheets` property.

Another option is to instead use existing HTML concepts for applying stylesheets into shadow roots, such as the `<link>` tag, as demonstrated by the following example:

```html
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>

<my-element>
  <template shadowrootmode="open">
    <link rel="adoptedstylesheet" specifier="foo">
  </template>
</my-element>
```

While this approach doesn't map as closely to the existing `adoptedStyleSheets` DOM API, it more closely follows existing HTML semantics. It also allows for a rich set of [features](https://html.spec.whatwg.org/#the-link-element) offered by the `<link>` element, such as error handling and media queries. However, there are several downsides to this approach.

One challenge of this approach is in ordering. Multiple stylesheets can be added to a shadow root's adopted stylesheet list with this proposal by including multiple `<link>` tags. `<link>` tags can be moved around in the DOM, which would imply that the order of `adoptedStyleSheets` would be updated accordingly. This could be complicated to keep in order if the underlying `adoptedStyleSheets` array is also modified externally. Alternatively, the `adoptedStyleSheets` array could not be re-ordered in response to these types of DOM changes, but that could be seen as confusing, because stylesheets applied by the existing `<link rel="stylesheet">` tag are applied in DOM order. The `shadowrootadoptedstylesheets` attribute as specified accepts a fixed list of stylesheets, and thus is not subject to re-ordering complexity due to DOM mutations.

Another tradeoff with this approach is DOM bloat. Each adopted stylesheet would introduce another `<link>` tag in the DOM. With many stylesheets and many shadow roots, this could result in hundreds of extra DOM nodes, which the `shadowrootadoptedstylesheets` approach avoids entirely.

This approach could also introduce confusion for developers. There are already `<link>` tags used for styling via `<link rel="stylesheet">`, and stylesheet modules can already be preloaded via `<link rel="modulepreload" as="style">`. Adding a third variation on top of these existing patterns could add to this complexity.

For the Id-based alternate proposal (using HTML id attributes instead of module specifiers), see [Id-based `shadowrootadoptedstylesheets` attribute on template](../ShadowDOM/explainer.md#id-based-shadowrootadoptedstylesheets-attribute-on-template) in the parent explainer.

## Polyfills

Web developers often seek polyfills to allow them to use new web platform features while falling back gracefully in user agents where such features are not supported. A common strategy is to use JavaScript for polyfills. An example of this could be the following:

```html
<script>
  function supportsDeclarativeAdoptedStyleSheets() {
    return document.createElement('template').shadowRootAdoptedStyleSheets !== undefined;
  }

  if (!supportsDeclarativeAdoptedStyleSheets()) {
    // AdoptedStyleSheets is not supported on <template> - apply polyfill. This polyfill could be an injected <link> tag.
  }
</script>
```

There was also a [suggestion](https://github.com/whatwg/html/issues/10673#issuecomment-2453512552) for adding browser support to enable falling back to a normal `<link>` tag without the use of script, by binding the `<link>` tag's `href` attribute value to the CSS module identifier and adding a new attribute (`noadoptedstylesheets`) to avoid double-applying stylesheets.

This suggestion looks like the following:

```html
<my-element>
   <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
       <link rel="stylesheet" href="/foo.css" noadoptedstylesheets> <!-- no-op on browsers that support shadowrootadoptedstylesheets on <template> tags -->
   </template>
</my-element>
```

This would behave similarly to `shadowrootadoptedstylesheets`, but without support for declarative modules.

## Open issues
* ~~How can developers check for and polyfill `shadowrootadoptedstylesheets`, given that the template element disappears from the DOM?~~ **Resolved:** The proposed `shadowRootAdoptedStyleSheets` reflection property on `HTMLTemplateElement` (see [Template element reflection](#template-element-reflection)) enables feature detection by creating a fresh `<template>` element and checking for the property.
* How should this proposal work if non-constructable stylesheets are adopted for `adoptedstylesheets`? See https://github.com/w3c/csswg-drafts/issues/10013.
* Is it possible to define an intentional race between an async preload of an external stylesheet and a just-in-time definition of a declarative module and only apply the one that wins? This might not be possible due to the fact that specifiers are unique.
* ~~What should the behavior be when a fetch initiated by `shadowrootadoptedstylesheets` races with a `<link rel="modulepreload">` for the same specifier? Should both fetches be deduplicated, or should the first to complete win?~~ **Resolved:** The [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) already deduplicates fetches for the same specifier, so concurrent fetches for the same URL are coalesced by the existing spec infrastructure.
* Should there be a mechanism (e.g. a new event or attribute) for developers to detect when a fetch initiated by `shadowrootadoptedstylesheets` fails?

For additional open issues related to `<style type="module">` and the broader declarative style sharing proposal, see the [Open issues](../ShadowDOM/explainer.md#open-issues) section of the parent explainer.

## References and acknowledgements
Many thanks for valuable feedback and advice from other contributors:
- Alison Maher
- Alex Russell
- Justin Fagnani
- Steve Orvell