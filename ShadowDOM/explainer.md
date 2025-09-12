# Declarative shadow DOM style sharing

## Authors

- Kurt Catti-Schmidt
- Daniel Clark
- Tien Mai
- Alison Maher
- Andy Luhrs

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
* Expected venue: [Web Components CG](https://w3c.github.io/webcomponents-cg/)
* Current version: this document
## Table of Contents
- [Declarative shadow DOM style sharing](#declarative-shadow-dom-style-sharing)
  - [Authors](#authors)
  - [Participate](#participate)
  - [Status of this Document](#status-of-this-document)
  - [Table of Contents](#table-of-contents)
  - [Background](#background)
  - [Problem](#problem)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
  - [Use case](#use-case)
    - [Media site control widgets](#media-site-control-widgets)
    - [Anywhere web components are used](#anywhere-web-components-are-used)
    - [Streaming SSR](#streaming-ssr)
  - [Alternatives to using style in DSD](#alternatives-to-using-style-in-dsd)
    - [Constructable Stylesheets](#constructable-stylesheets)
    - [Using `rel="stylesheet"` attribute](#using-relstylesheet-attribute)
    - [CSS `@import` rules](#css-import-rules)
  - [Proposal: Inline, declarative CSS module scripts](#proposal-inline-declarative-css-module-scripts)
    - [Scoping](#scoping)
    - [`<script>` vs `<style>` For CSS Modules](#script-vs-style-for-css-modules)
    - [Behavior with script disabled](#behavior-with-script-disabled)
    - [Syntactic Sugar For Import Maps with DataURI](#syntactic-sugar-for-import-maps-with-datauri)
    - [Detailed Parsing Workflow](#detailed-parsing-workflow)
    - [Use with Imperative Module Scripts](#use-with-imperative-module-scripts)
    - [Use with Import Maps](#use-with-import-maps)
  - [Other declarative modules](#other-declarative-modules)
  - [Alternate proposals](#alternate-proposals)
    - [Updates to Module Map Key](#updates-to-module-map-key)
    - [Using A Link Tag To Adopt Stylesheets](#using-a-link-tag-to-adopt-stylesheets)
    - [Local References For Link Rel](#local-references-for-link-rel)
    - [Key Differences Between This Proposal And Local References For Link Rel](#key-differences-between-this-proposal-and-local-references-for-link-rel)
    - [Layer and adoptStyles](#layer-and-adoptstyles)
    - [`@Sheet`](#sheet)
    - [Id-based `adoptedstylesheet` attribute on template](#id-based-adoptedstylesheet-attribute-on-template)
  - [Polyfills](#polyfills)
  - [Future work](#future-work)
  - [Summary](#summary)
  - [Open issues](#open-issues)
  - [References and acknowledgements](#references-and-acknowledgements)


## Background
With the use of web components in web development, web authors often encounter challenges in managing styles, such as distributing global styles into shadow roots and sharing styles across different shadow roots. Markup-based shadow DOM, or [Declarative shadow DOM (DSD)](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom), is a new concept that makes it easier and more efficient to create a shadow DOM definition directly in HTML, without needing JavaScript for setup. [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) provides isolation for CSS, JavaScript, and HTML. Each shadow root has its own separate scope, which means styles defined inside one shadow root do not affect another or the main document.

We're currently investigating this and [@sheet](/AtSheet/explainer.md) in parallel, and anticipate that we'll be prioritizing only one of these two in the immediate future.

## Problem
Sites that make use of Declarative Shadow DOM (DSD) have reported that the lack of a way to reference repeated stylesheets creates large payloads that add large amounts of latency. Authors have repeatedly asked for a way to reference stylesheets from other DSD instances in the same way that frameworks leverage internal data structures to share constructable style sheets via `adoptedStyleSheets`. This Explainer explores several potential solutions.

Relying on JavaScript for styling is not ideal for DSD for several reasons:
* One of the main goals of DSD is to not rely on JavaScript [for performance and accessibility purposes](https://web.dev/articles/declarative-shadow-dom).
* Adding stylesheets via script may cause an FOUC (Flash of Unstyled Content).
* The current `adoptedStyleSheets` property only supports Constructable Stylesheets, not inline stylesheets or stylesheets from <link> tags [(note that the working groups have recently decided to lift this restriction)](https://github.com/w3c/csswg-drafts/issues/10013#issuecomment-2165396092).

While referencing an external file via the <link> tag for shared styles in DSD works today [(and is currently recommended by DSD implementors)](https://web.dev/articles/declarative-shadow-dom#server-rendering_with_style), it is not ideal for several reasons:
* If the linked stylesheet has not been downloaded and parsed, there may be an FOUC.
* External stylesheets are considered “render blocking”, and Google’s Lighthouse guidelines for high-performance web content recommends [using inline styles instead](https://developer.chrome.com/docs/lighthouse/performance/render-blocking-resources#how_to_eliminate_render-blocking_stylesheets).
* Google’s Lighthouse guidelines recommend minimizing network requests for best performance. Stylesheets included via <link> tags are always external resources that may initiate a network request (note that the network cache mitigates this for repeated requests to the same file).

This example shows how a developer might use DSD to initialize a shadow root without JavaScript.

```html
  <article-card>
    <template shadowrootmode="open">
       <style>
         :host {
            border: 1px solid #e0e0e0;
          }
       </style>
    </template>
  </article-card>
```
While this approach is acceptable for a single component, a rich web application may define many `<template>` elements. Since pages often use a consistent set of visual styles, these `<template>` instances must each include `<style>` tags with duplicated CSS, leading to unnecessary bloat and redundancy.

This document explores several proposals that would allow developers to apply styles to DSD without relying on JavaScript and avoiding duplication.

## Goals
* Allow the reuse of styles in markup-based shadow DOM without requiring JavaScript
* Allow reuse of styles in markup-based shadow DOM without requiring external network requests
* Ensure styles don't automatically apply to the main document or any shadow root
* Allow web authors to selectively pass in global styles from the parent document

## Non-goals
Some developers have expressed interest in CSS selectors crossing through the Shadow DOM, as discussed in [issue 909](https://github.com/WICG/webcomponents/issues/909#issuecomment-1977487651). While this scenario is related to sharing styles with Shadow DOM elements, it is solving a different problem and should be addressed separately.

## Use case
### Media site control widgets
Consider a media site that uses control widgets such as play/pause buttons, volume sliders, and progress bars that are implemented as web components with shadow roots. The site might want to share styles between the top-level document and the shadow roots to provide a cohesive look and feel throughout all the site's controls.

```html
<head>
    <style>
        /* Global styles for the parent document */
        ...
    </style>
</head>
```
Meanwhile, the styles defined within the Shadow DOM are specific to the media control widget. These styles ensure that the widget looks consistent and isn't affected by other styles on the page.
```js
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  // Shared stylesheet for all <media-control> elements.
  ...
`);

class MediaControl extends HTMLElement {
    constructor() {
        super();

        const shadow = this.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets.push(sheet);

        // Initialize content from template here.
    }
}
customElements.define("media-control", MediaControl);
document.body.appendChild(document.createElement("media-control"));
```
Both the controls in the parent document and the controls inside the media control widget are able to share the same base styles through `adoptedStyleSheets`.

### Anywhere web components are used
When asked about pain points in [Web Components](https://2023.stateofhtml.com/en-US/features/web_components/), the number one issue, with 13% of the vote, is styling and customization. Many respondents specifically mentioned the difficulty of style sharing issues within the shadow DOM:
* "I want to use shadow DOM to keep the light DOM tidy and use slots, but I don't always want style isolation"
* "Inheriting/passing CSS styles from the main DOM to a shadow DOM"
* "Shadow dom is a nightmare due to inability to style with global styles"
* "I love to write my custom web components. It is supper easy to write, maintain. It organizes project structure in some small chunks. But I don't use shadow dom, because of css styles which i don't know how to share between web components"
* "Shadow DOM encapsulation is too much. E.g. No way to adopt form styling from the surrounding page for common elements (buttons, inputs, etc) unless I'm willing to put them in light DOM"

For additional use cases, please see issue [939](https://github.com/WICG/webcomponents/issues/939).

### Streaming SSR

With Server-Side-Rendering (SSR), servers emit HTML markup to the client's web browser. When this markup is emitted as a stream, the full document's DOM structure may not have been determined ahead of time. Standard DOM scoping
behaves such that Shadow DOM nodes can only access identifiers in their own shadow root and in the light DOM. This situation makes it impossible to share styles between shadow roots, leading to duplication of style rules and markup.
This duplication is especially painful for SSR scenarios, which are typically heavily optimized for performance.

The proposed global scope for declarative CSS Modules is essential to this scenario because it allows nested shadow roots to share a global set of styles. Standard DOM scoping rules would not work here, as demonstrated by the following example:

```html
<template shadowrootmode="open" shadowrootadoptedstylesheets="my-component-styles">
  <!-- Emit styles that might need to be shared later. -->
  <style type="module" specifier="my-component-styles">...</style>
  <div>...component content...</div>
  <!-- A child component is emitted that needs the same set of shared styles. Since the shared styles were already emitted above, they can be re-used with `shadowrootadoptedstylesheets`. -->
  <template shadowrootmode="open" shadowrootadoptedstylesheets="my-component-styles">
    <!-- Styles are shared from the parent shadow root (this would not work with standard DOM scoping, which can only access identifiers in this shadow root and the light DOM). -->
    <div>...component content...</div>
  </template>
</template>
<!-- Sibling component with shared styles. Again, since shared styles were already emitted, they can be re-used via `shadowrootadoptedstylesheets`. -->
<template shadowrootmode="open" shadowrootadoptedstylesheets="my-component-styles">
  <!-- Styles are shared from the sibling shadow root (this would also not work with standard DOM scoping). -->
  <div>...component content...</div>
</template>
```

## Alternatives to using style in DSD
### Constructable Stylesheets
Developers can create stylesheets that can be applied to multiple shadow roots, using existing JavaScript, as outlined by the example below.

Step 1: Create a new Constructable Stylesheet:
```js
const constructableStylesheet = new CSSStyleSheet();
```
Step 2: Add styles to the Constructable Stylesheet:
```js
constructableStylesheet.replaceSync(`
  .my-button {
    background-color: #0074D9;
  }
`);
```
Step 3: Attach the Constructable Stylesheet to the shadow root:
```js
shadow.adoptedStyleSheets = [constructableStylesheet];
```
The downside of this approach is a potential FOUC, where the element is initially painted without styles, and then repainted with the Constructable Stylesheet.

### Using `rel="stylesheet"` attribute
Using `<link rel="stylesheet">` to share styles across Shadow DOM boundaries helps maintain consistent design, reducing style duplication and potentially shrinking component sizes for faster load times. However, it can cause redundant network requests since each component that uses `<link rel="stylesheet">` within its Shadow DOM may trigger an expensive operation such as a network request or a disk access.

### CSS `@import` rules
Global styles can be included in a single stylesheet, which is then importable into each shadow root to avoid redundancy. Inline `<style>` blocks do not support `@import` rules, so this approach must be combined with either of the aforementioned Constructable Stylesheets or `<link rel>` approaches. If the stylesheet is not already loaded, this could lead to an FOUC.

## Proposal: Inline, declarative CSS module scripts
This proposal builds on [CSS module scripts](https://web.dev/articles/css-module-scripts), enabling authors to declare a CSS module inline in an HTML file and link it to a DSD using its [module specifier](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#:~:text=The-,module%20specifier,-provides%20a%20string). A `type=”module”` attribute on the `<style>` element would define it as a CSS module script and the specifier attribute would add it to the module cache as if it had been imported. This allows the page to render with the necessary CSS modules attached to the correct scopes without needing to load them multiple times. Note that [module maps](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) are global, meaning that modules defined in a Shadow DOM will be accessible throughout the document context.
```js
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>
```
Given this `<style>` tag, the styles could be applied to a DSD as follows:
```html
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    ...
  </template>
</my-element>
```

The shadow root will be created with its `adoptedStyleSheets` array containing the `"foo"` [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script). This single [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) can be shared by any number of shadow roots.

An inline CSS module script could also be imported in a JavaScript module in the usual way:
```html
import styles from 'foo' with { type: 'css' };
```
Another advantage of this proposal is that it can allow multiple module specifiers in the `shadowrootadoptedstylesheets` property:
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
    ...
  </template>
</my-element>
```

Due to the global nature of `specifier` in this context, it could be called `exportspecifier`, to emphasize the fact that it has effects outside the shadow root.

### Scoping

The [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) exists today as a global registry per document, not scoped to a particular shadow root. Many developers have expressed interest in such a global map for sharing stylesheets, as it allows for nested shadow roots to access a base set of shared styles without needing to redefine them at each level of shadow root nesting.

A global map does come with some tradeoffs, particularly when names collide. With a global map, nested shadow roots could override entries from parent shadow roots, which could be undesirable.

### `<script>` vs `<style>` For CSS Modules

Earlier versions of this document used the `<script>` tag for declaring CSS Modules, which would be more consistent with the current set of module types (as they are all script-related). Developer feedback has shown a strong preference for using the `<style>` tag when declaring CSS Modules, so this proposal has been updated accordingly. This concept of using a non-`<script>` tag for defining Declarative CSS Modules could be expanded for future declarative modules such as HTML and SVG. The `<script>` tag remains a natural wrapper for [other declarative modules](#other-declarative-modules) that are script-based, such as JavaScript, JSON, and WASM.

### Behavior with script disabled

User agents allow for disabling JavaScript, and declarative modules should still work with JavaScript disabled. However, the module graph as it exists today only functions with script enabled. Browser engines should confirm whether this is feasible with their current implementations. Chromium has been verified as compatible, but other engines such as WebKit and Gecko have not been verified yet.

### Syntactic Sugar For Import Maps with DataURI

The simplest approach for Declarative CSS Modules is to treat them as syntactic sugar that generates an Import Map entry containing a specifier and a dataURI containing the module contents.

For example, a Declarative CSS Module defined as follows:
```html
<style type="module" specifier="foo">
  #content { color: red; }
</style>
```

...would be syntactic sugar for:

```html
<script type="importmap">
{
  "imports": {
    "foo": "data:text/css,#content { color: red; }"
  }
}
</script>
```

...and importing the module declaratively like this:

```html
<template shadowrootmode="open" shadowrootadoptedstylesheets="foo">...</template>
```

...could be syntactic sugar for:

```html
<script type="module">
const shadowRoot = ...;
import("foo", {with:{ type: "css" }}).then(foo=>shadowRoot.adoptedStyleSheets.push(foo));
</script>
```

This approach is much simpler than other proposals and avoids nearly all of the issues associated with other proposals because it builds on existing concepts.

This approach does have a few limitations though:
- The `<style>` definition *must* occur before it is imported, otherwise the import map will not be populated. Based on developer feedback, this is not a major limitation.
- Since Import Maps have no knowledge of an underlying type for their mappings, declarative modules with the same specifier (e.g. "foo"), but differing types (e.g. one Javascript module with a specifier of "foo" and one CSS module with a specifier of "foo") would create separate entries in the generated import map, and only the first definition would actually be mapped. There are a few possible solutions to this issue. The simplest is that developers could be instructed to avoid name collisions for declarative modules of different types (for example, using the type as a prefix). Another option is for a type prefix to automatically be added as part of the syntatic sugar for declarative modules, but this would require developers to manually add the prefix when mixing declarative and imperative definitions. Alternatively, the JSON defintion for Import Maps could support an underlying `type` property when a dataURI is specified, mapping the dataURI type to supported Module Record types. For example, "text/css" could be mapped to a "CSS" module type, and likewise, "text/javascript" could be mapped to a Javascript module type. This approach would require adding several special cases for Import Map resolution for each of the module types.


### Detailed Parsing Workflow

In the following example:

```html
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    ...
  </template>
</my-element>
```

Upon parsing the `<style>` tag above, an [import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) is generated with JSON containing a [map](https://infra.spec.whatwg.org/#ordered-map) with a key of "imports". The [value](https://infra.spec.whatwg.org/#map-value) associated with this key is another JSON [map](https://infra.spec.whatwg.org/#ordered-map) with a single entry with a [key](https://infra.spec.whatwg.org/#map-key) containing the value of the `specifier` attribute on the `<style>` tag (in this case, "foo"). The [value](https://infra.spec.whatwg.org/#map-value) associated with this key is a [dataURI](https://www.rfc-editor.org/rfc/rfc2397) with a [scheme](https://url.spec.whatwg.org/#concept-url-scheme) of "data", a [media type](https://www.rfc-editor.org/rfc/rfc2397) of "text/css", and [data](https://www.rfc-editor.org/rfc/rfc2397) consisting of a [UTF-8 percent encoded](https://url.spec.whatwg.org/#utf-8-percent-encode) value of the [text content](https://html.spec.whatwg.org/#get-the-text-steps) of the `<style>` tag.

 This generated [import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) then performs the [parse an map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) algorithm as a typical [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) would be processed.

When the `<template>` element is constructed, the `shadowrootadoptedstylesheets` attribute is evaluated. Each space-separated identifier in the attribute performs an [import](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-module-system) of that specifier with a [module type](https://html.spec.whatwg.org/multipage/webappapis.html#module-type-from-module-request) of "css". If the result of that import is successful, the associated [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script)'s default export of type [CSSStyleSheet](https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface) is added to the `adoptedStyleSheets` backing list associated with the `<template>` element's [shadow root](https://www.w3.org/TR/cssom-1/#dom-documentorshadowroot-adoptedstylesheets) in specified order, as defined in [CSS Style Sheet Collections](https://www.w3.org/TR/cssom-1/#css-style-sheet-collections). This would allow for importing both Declarative CSS Modules and previously-fetched imperative CSS Modules via the `shadowrootadoptedstylesheets` attribute.

As with existing `<style>` tags, if the CSS contains invalid syntax, error handling follows the rules specified in [error handling](https://www.w3.org/TR/css-syntax-3/#error-handling).

Styles would not be applied in reversed order, as in the following example:

```html
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    ...
  </template>
</my-element>
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>
```

When the `<template>` element is parsed, an [import](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-module-system) of "foo" with a [module type](https://html.spec.whatwg.org/multipage/webappapis.html#module-type-from-module-request) of "css". This import is unsuccessful, as the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) does not contain an entry with a specifier of "foo".

When the `<style>` element's `specifier` attribute is parsed, an [import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) is generated with JSON containing the contents as a dataURI as specified above. Since the `adoptedStyleSheets` (backing list)[https://www.w3.org/TR/cssom-1/#dom-documentorshadowroot-adoptedstylesheets] associated with the `<template>` element's [shadow root](https://www.w3.org/TR/cssom-1/#dom-documentorshadowroot-adoptedstylesheets) was not populated, no styles are applied to the [shadow root](https://dom.spec.whatwg.org/#interface-shadowroot).

This replacement always occurs when the first instance of a given `specifier` is encountered, because the [merge module specifier maps algorithm](https://html.spec.whatwg.org/multipage/webappapis.html#merge-module-specifier-maps) enforces that only the first specifier with a given URL is mapped.

For example, with the following markup:

```html
<style type="module" specifier="foo">
  #content {
    color: red;
  }
</style>
<style type="module" specifier="foo">
  #content {
    color: blue;
  }
</style>
<my-element>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="foo">
    ...
  </template>
</my-element>
```

The contents of the first Declarative CSS Module with `specifier="foo"` (with `color: red`) are first parsed and the [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) is created as specified above.

Upon parsing the second Declarative CSS Module with `specifier="foo"` (with `color: blue`), an [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) is created as specified above. Per the [merge module specifier maps algorithm](https://html.spec.whatwg.org/multipage/webappapis.html#merge-module-specifier-maps), only the first specifier with a given URL is mapped.

The `<template>` with `shadowrootadoptedstylesheets="foo"` will use the first definition (with `color: red`).

This scenario may also occur when the `<style>` element is a child of the `<template>` that adopts it, as shown in the following example:

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

In this example, the `<template>` element is parsed first. When the `<template>` element is parsed, an [import](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-module-system) of "foo" with a [module type](https://html.spec.whatwg.org/multipage/webappapis.html#module-type-from-module-request) of "css". This import is unsuccessful, as the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) does not contain an entry with a specifier of "foo".

The contents of the Declarative CSS Module with `specifier="foo"` (with `color: red`) are then parsed and an [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) is created as specified above. Since the `<template>` element failed to import a module, the `color: red` styles will not be applied, although subsequent `<template>` elements could adopt a stylesheet with `specifier="foo"` now that it has been defined.

### Use with Imperative Module Scripts

Declarative CSS Modules can be used with imperative module scripts from within a static import.

Consider the following example:

```html
<style type="module" specifier="foo">
  ...
</style>
```

Script can later insert this module into an `adoptedStyleSheets` array as follows:

```js
import sheet from "foo" with { type: "css" };
shadowRoot.adoptedStyleSheets = [sheet];
```

...assuming that "foo" hasn't been used as the key of an [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) that redirects it to a URL. If "foo" has used as a key of an [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) that redirects to a URL, that URL will be fetched instead of locating the declarative version.

If a module is imported imperatively in this fashion and the Declarative CSS Module is not in the [module map](https://html.spec.whatwg.org/#module-map), the import fails, even if it is added declaratively at a later time.

## Other declarative modules
An advantage of this approach is that it can be extended to solve similar issues with other content types. Consider the case of a declarative component with many instances stamped out on the page. In the same way that the CSS must either be duplicated in the markup of each component instance or set up using script, the same problem applies to the HTML content of each component. We can envision an inline version of [HTML module scripts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md) that would be declared once and applied to any number of shadow root instances:

```html
<template type="module" specifier="foo">
<!-- This template defines an HTML module whose contents are given by the markup
     placed here, inserted into the module map with the specifier "foo" -->
...
</template>
<my-element>
<!-- The `shadoowroothtml` attribute causes the `<template>` to populate the shadow root by
cloning the contents of the HTML module given by the "foo" specifier, instead of
parsing HTML inside the <template>. -->
  <template shadowrootmode="open" shadowroothtml="foo"></template>
</my-element>
```

In this example we’ve leveraged [import map](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) to implement declarative template refs.

This approach could also be expanded to SVG modules, similar to the HTML Modules example above.

```html
<template type="module" specifier="foo">
<!-- This template defines an SVG module whose contents are given by the SVG markup
     placed here, inserted into the module map with the specifier "foo" -->
...
</template>
<my-element>
<!-- The `shadoowroothtml` attribute causes the `<template>` to populate the shadow root by
cloning the contents of the SVG module given by the "foo" specifier, instead of
parsing SVG inside the <template>. -->
  <template shadowrootmode="open" shadowroothtml="foo"></template>
</my-element>
```
SVG makes heavy use of IDREF's, for example `href` on `<use>` and SVG filters. Per existing Shadow DOM behavior, these IDREF's would be scoped per shadow root.

CSS Modules are not the only type of module - there are also JavaScript, JSON, SVG, HTML, and WASM that need to be considered.

| Module type    | Script Module                                            | Declarative Module                                                        |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------|
| JavaScript     | `import { foo } from "./bar.js";`                        | `<script type="module" specifier="bar"></script>`                         |
| CSS            | `import foo from "./bar.css" with { type: "css" };`      | `<style type="module" specifier="bar"></style>`                           |
| JSON           | `import foo from "./bar.json" with { type: "json" };`    | `<script type="json-module" specifier="bar"></script>`                    |
| HTML           | `import {foo} from "bar.html" with {type: "html"};`      | `<template type="html-module" specifier="bar"></template>`                |
| SVG            | `import {foo} from "bar.svg" with {type: "svg"};`        | `<template type="svg-module" specifier="bar"></template>`                 |
| WASM           | `import {foo} from "bar.wasm" with {type: "wasm"};`      | `<script type="wasm-module" specifier="bar"></script>`                    |

Modules that support declarative content (such as CSS Modules and HTML Modules) need both a declarative export mechanism (`<style type="module">` for CSS Modules) and a declarative import mechanism (the `adoptedstylesheets` attribute and/or the `<link>` tag for CSS Modules), while purely script-based modules types (such as JavaScript, JSON, and WASM) only require a declarative export mechanism, as they are expected to be imported via script.  

The following example demonstrates how a JavaScript module could be exported declaratively and imported imperatively:

```html
<script type="module" specifier="foo">
  export const magic_number = 42;
</script>
<script type="module">
  import {magic_number} from "foo";
  console.log(magic_number);
</script>
```

...and likewise for a JSON module:

```html
<script type="json-module" specifier="foo">
{"people": [{"craft": "ISS", "name": "Oleg Kononenko"}, {"craft": "ISS", "name": "Nikolai Chub"}], "number": 2, "message": "success"}
</script>
<script type="module">
  import people_in_space from "foo" with { type: "json" };
  console.log(people_in_space.message);
</script>
```

## Alternate proposals

### Updates to Module Map Key

An alternative proposal involves modifying the [module map](https://html.spec.whatwg.org/#module-map) to be keyed by a string instead of a URL (the current key is a (URL, module type) pair, which would be changed to a (string, module type) pair). A string is a superset of a URL, so this modification would not break existing scenarios. 

This requirement could be avoided by instead requiring a declarative specifier to be a [URL fragment](https://url.spec.whatwg.org/#concept-url-fragment), but we believe this would introduce several potentially confusing and undesirable outcomes:

1. The [Find a potential indicated element](https://html.spec.whatwg.org/#find-a-potential-indicated-element) algorithm only searches the top-level document and does not query shadow roots. While this proposal does not require the [find a potential indicated element](https://html.spec.whatwg.org/#find-a-potential-indicated-element) to function (the indicated element in this case is the `<style>` element that is directly modifying the module map, so there is no element to find), it could be confusing to introduce a new fragment syntax intended for use in shadow roots that violates this principle.
2. [Import maps](https://html.spec.whatwg.org/#import-map) remap URL's, which allows relative and bare URL's to map to a full URL. It's not clear if there is a use case for remapping same-document references with import maps that cannot be accomplished by adjusting the local reference's identifier. If import maps are performed on a same-document URL reference, an import map entry intended for an external URL could unintentially break a local reference. [Import map resolution](https://html.spec.whatwg.org/#resolving-a-url-like-module-specifier) could be adjusted to skip same-document references, but it could be confusing to have a URL identifier that does not participate in the [resolved module set](https://html.spec.whatwg.org/#resolved-module-set).
3. HTML documents are already using fragments for many different concepts, such as [fragment navigations](https://html.spec.whatwg.org/#navigate-fragid), [history updates](https://html.spec.whatwg.org/#url-and-history-update-steps), [internal resource links](https://html.spec.whatwg.org/#process-internal-resource-links), [SVG href targets](https://www.w3.org/TR/SVG2/struct.html#UseElement), and more. Although these use cases are very different, a common factor between them is that they all reference elements in the main document, and cannot refer to elements within a shadow root. An important piece of this proposal is that nested shadow roots can modify the global module map. Introducing a new scoping behavior for fragments that does not fit this model could be confusing to authors.
4. URL's that consist only of a fragment resolve to a [relative URL](https://url.spec.whatwg.org/#relative-url-string), with the base url defined as the source document per [the URL parsing algorithm](https://url.spec.whatwg.org/#url-parsing). This means that using a fragment-only syntax (which would be desired in this scenario) could break if a [`<base>` element](https://html.spec.whatwg.org/#the-base-element) exists that remaps the document's base URL.

Another alternative could be to define a new [scheme](https://url.spec.whatwg.org/#concept-url-scheme) for local references. This is a potential solution, however, since the containing HTML document already has a scheme, this option would require developers to always specify the [scheme](https://url.spec.whatwg.org/#concept-url-scheme) per [absolute URL with fragment string](https://url.spec.whatwg.org/#absolute-url-with-fragment-string) processing, rather than just the fragment (a fragment-only URL is valid due to the way [relative URL](https://url.spec.whatwg.org/#relative-url-string) processing applies). Developers might find it cumbersome to specify the scheme for local references versus an approach that requires only an identifier (for example, `localid://foo` versus `#foo` or `foo`). A new scheme could also imply scoping behaviors that are not supported, such as [external-file references](https://www.w3.org/TR/SVG2/linking.html#definitions) that are valid in SVG, or potentially even imply that module identifiers can span between `<iframe>` documents. A new scheme may also not be compatible with existing [custom scheme handlers](https://html.spec.whatwg.org/#custom-handlers).

### Using A Link Tag To Adopt Stylesheets

The samples listed use a proposed `shadowrootadoptedstylesheets` attribute on the `<template>` tag with a space-separated list of specifiers. This closely maps to the existing Javascript `adoptedStyleSheets` property.

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

While this approach doesn't map as closely to the existing `adoptedStyleSheets` API, it more closely follows existing HTML semantics. It also allows for a rich set of [features](https://html.spec.whatwg.org/#the-link-element) offered by the `<link>` element, such as media queries. However, a small disadvantage is that the `<link>` element has many additional properties that would not apply in this scenario, such as `crossorigin`, `fetchpriority`, `referrerpolicy`.

The `shadowrootadoptedstylesheets` attribute as specified accepts a list a stylesheets. Multiple stylesheets can be added to a shadow root's adopted stylesheet list with the `<link>` proposal by including multiple `<link>` tags.

Looking forward, the `<link>` approach is directly compatible with the proposed CSS `@sheet` feature, which allows a single CSS file to contain multiple stylesheets. This allows developers to specify a single named stylesheet that is applied from the CSS definition, rather than applying the global contents of the entire sheet, as illustrated by the following example:

```html
<style type="module" specifier="foo">
  @sheet my_cool_sheet {
    ...
  }
  @sheet my_other_sheet {
    #content {
    ...
    }
  }
  #content {
    ...
  }
</style>

<my-element>
  <template shadowrootmode="open">
    <link rel="adoptedstylesheet" specifier="foo" sheet="my_cool_sheet">
  </template>
</my-element>
```

Only the contents of `my_cool_sheet` would be applied, due to the `sheet` attribute on the `<link>` tag specifying that named sheet.

### [Local References For Link Rel](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/LocalReferenceLinkRel/explainer.md)

This proposal extends the existing `<link>` tag to support local `<style>` tag references as follows:

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

This allows for sharing styles defined in the Light DOM across Shadow Roots. Due to scoping behaviors, it will not allow for styles defined in a Shadow DOM
to be accessed in any other Shadow Root. This limitation could be addressed with extensions on Shadow DOM scoping suggested in 
[this thread](https://github.com/whatwg/html/issues/11364).

### Key Differences Between This Proposal And Local References For Link Rel

Both this proposal and [Local References For Link Rel](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/LocalReferenceLinkRel/explainer.md)
allow authors to share inline CSS with Shadow Roots. There are some key differences in both syntax and
behaviors, as illustrated in the following table:

| | Local Reference Link Rel | Declarative CSS Modules | 
| :---: | :---: | :---: |
| Scope | ⚠️ [Standard DOM scoping](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/LocalReferenceLinkRel/explainer.md#Scoping) | Global scope |
| Identifier syntax | Standard HTML IDREF | Module identifier |
| Attribute used | Standard HTML `href` | New attribute for `identifier` |
| Uses existing HTML concepts | ✅ Yes | ❌ No |
| Uses existing module concepts | ❌ No | ✅ Yes |
| Extensibility | Clean @sheet integration, scope expansion could apply to SVG references | More declarative module types (HTML, SVG, etc.) |

### [Layer and adoptStyles](https://github.com/w3c/csswg-drafts/issues/10176#proposal)
This proposal adds the  `adoptStyles` attribute to the template element, enabling its shadow root to adopt styles from outside of the shadow DOM.

Here is an example that shows how the proposed `adoptStyles` is used declaratively:
```html
<!-- Define styles in the outer context -->
<style>
  @layer base {
    body {
      font-family: Arial, sans-serif;
    }
  }

  @layer theme {
    .button {
      color: white;
      background-color: blue;
    }
  }

</style>

<!-- Define a custom element that adopts styles from the outer context page style -->
<custom-element >
  <template shadowroot="open" adoptstyles="inherit.theme, inherit.base">
    <style>
      ...
    </style>
    <button class="button shadow-button">Click Me</button>
  </template>
</custom-element>
```
In this example, the `adoptstyles` attribute on the `<template>` specifies that the shadow DOM should inherit styles from two outer context layers, using a list of style references, `inherit.theme` and `inherit.base`.

A similar `adoptstyles` JavaScript API can set and return a `styleReferenceList`, which is a list of style references associated with the shadow root. This list can be set and retrieved, with specific formats for inheriting, renaming, or reverting styles.

The method aims to support both declarative and imperative shadow trees and work seamlessly with existing CSS features like `@layer` and `@scope`. However, there may be a FOUC issue with loading external stylesheets.

Since CSS is scoped per Shadow Root, nested Shadow DOM elements would need to inherit at each level.

### [`@Sheet`](https://github.com/w3c/csswg-drafts/issues/5629#issuecomment-1407059971)
This proposal builds on [using multiple sheets per file](https://github.com/w3c/csswg-drafts/issues/5629#issuecomment-1407059971) that introduces a new `@sheet` rule to address the difficulties arising when using JavaScript modules to manage styles. The main idea is to enhance the way CSS is imported, managed, and bundled in JavaScript by allowing multiple named stylesheets to exist within a single CSS file. We can expand on this proposal to allow stylesheets being directly specified within the HTML markup using `shadowrootadoptedstylesheets` property without requiring JavaScript:

```html
<style>
  @sheet sheet1 { *: background-color: gray; }
  @sheet sheet2 { *: color: blue; }
</style>

<template shadowrootmode="open" shadowrootadoptedstylesheets="sheet1 sheet2">
  <span>I'm in the shadow DOM</span>
</template>
 ```

In this example, developers could define styles in a `<style>` block using an `@sheet` rule to create named style sheets. The `adoptedStyleSheets` property allows Shadow DOMs to specify which stylesheets they want to adopt without impacting the main document, improving ergonomics.

The JavaScript version of this could also support CSS modules:
```css
@sheet sheet1 {
  :host {
    display: block;
    background: red;
  }
}

@sheet sheet2 {
  p {
    color: blue;
  }
}
```
```html
<script>
import {sheet1, sheet2} from './styles1and2.css' assert {type: 'css'};
...
shadow.adoptedStyleSheets = [sheet1, sheet2];
</script>
```
This approach could be combined with other approaches listed in this document.

The specification of `@sheet` could be modified to split the *definition* of stylesheets from the *application* of the style rules. With this modification, `@sheet` would *define* a stylesheet with its own set of rules, but not  *apply* the rules automatically. This would allow for defining stylesheets in a light DOM context and applying them only to the shadow roots.

With this behavior, the following example would have a gray background and blue text only within the Shadow DOM:
```html
<style>
  @sheet sheet1 { *: background-color: gray; }
  @sheet sheet2 { *: color: blue; }
</style>
<span>I am in the light DOM</span>
<template shadowrootmode="open" shadowrootadoptedstylesheets="sheet1 sheet2">
  <span>I'm in the shadow DOM</span>
</template>
 ```

The light DOM could opt into particular stylesheets defined by `@sheet` via existing mechanisms such as `@import`:

```html
<style>
  @sheet sheet1 { *: background-color: gray; }
  @sheet sheet2 { *: color: blue; }
  @import sheet("sheet1");
  @import sheet("sheet2");
</style>
 ```

A similar mechanism for `@sheet` was proposed in [this](https://github.com/w3c/csswg-drafts/issues/5629#issuecomment-2016582527) comment.

Stylesheets defined via `@sheet` are not global - they are scoped per shadow root. Nested shadow roots may share stylesheets between shadow roots by passing down the identifier at each layer via `shadowrootadoptedstylesheets` and using `@import` to apply the stylesheet, as illustrated in the following example:

```html
<style>
  @sheet sheet1 { *: color: blue; }
</style>
<span>I am in the light DOM</span>
<template shadowrootmode="open" shadowrootadoptedstylesheets="sheet1">
  <style>
    @import sheet("sheet1");
  </style>
  <span>I'm in the first layer of the shadow DOM and my text should be blue</span>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="sheet1">
    <style>
      @import sheet("sheet1");
    </style>
    <span>I'm in the second layer of the shadow DOM and my text should be blue</span>
    <template shadowrootmode="open">
      <span>I'm in the third layer of the shadow DOM and my text should not be blue because this layer doesn't have `shadowrootadoptedstylesheets`</span>
    </template>
  </template>
  <template shadowrootmode="open" shadowrootadoptedstylesheets="sheet1">
    <span>I'm also in the second layer of the shadow DOM and my text should not be blue because I didn't `@import` the adopted stylesheet, even though I specified it via `shadowrootadoptedstylesheets`</span>
  </template>
</template>
 ```
Text within both shadow roots in the above example should be blue due to the `shadowrootadoptedstylesheets` at each Shadow DOM layer. Note that it is not currently possible to export stylesheets *out* of shadow roots, which is a deal-breaker for the [Streaming SSR](#streaming-ssr) example outlined above.

An alternative to this entire proposal would be to make `@sheet` identifiers cross shadow boundaries, which would also allow for sharing styles across shadow roots. However, without a way to import inline `<style>` blocks into shadow roots, as proposed in [Local References in Link Tags](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/LocalReferenceLinkRel/explainer.md#local-references-in-link-tags), this behavior would be limited to external .css files. Due to DOM scoping, [Local References in Link Tags](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/LocalReferenceLinkRel/explainer.md#local-references-in-link-tags) would not work as required in a [Streaming SSR](#streaming-ssr) scenario.

### [Id-based `shadowrootadoptedstylesheets` attribute on template](https://github.com/WICG/webcomponents/issues/939#issue-971914425)
This proposal will add a new markup-based `shadowrootadoptedstylesheets` property that closely matches the existing JavaScript property. The behavior would be just like the `adoptedStyleSheet` property that already exists in JavaScript, except it would accept a list of id attributes instead of a `ConstructableStylesheet` JavaScript object.
```html
<style type="css" id="shared_shadow_styles">
    :host {
      color: red
    }
</style>
```

or

```html
<link rel=”stylesheet” href=”styles.css” id=”external_shared_shadow_styles”>
```
Web authors can use the `shadowrootadoptedstylesheets` property on the `<template>` element to associate the stylesheets with a declarative shadow root.
```html
<template shadowrootmode="open" shadowrootadoptedstylesheets="shared_shadow_styles external_shared_shadow_styles">
      <!-- -->
</template>
```
One requirement of this approach is that the current `adoptedStyleSheets` JavaScript property would need to lift the “constructable” requirement for `adoptedStyleSheets`. This was recently agreed upon by the CSSWG but has not been implemented yet: [ Can we lift the restriction on constructed flag for adoptedStyleSheets?](https://github.com/w3c/csswg-drafts/issues/10013#issuecomment-2165396092)

One limitation of this approach is that shared styles that need to be applied exclusively to shadow roots (and not the main document) will need to include a CSS `:host` selector. This is not necessary for JavaScript-based adoptedStylesheets but will be necessary for declarative stylesheets, as there is currently no way in HTML to create stylesheets without applying them to the document they are defined in. This could also be addressed via a new type value on `<style>` tags and rel value on `<link>` tags, potentially `“adopted-css”`.

A challenge that arises is dealing with scopes and idrefs. If a declarative stylesheet can only be used within a single scope, it ends up being as limited as a regular `<style>` tag since it would need to be duplicated for every scope. A cross-scope idref system would enable nested shadow roots to access global stylesheets. This proposal recommends adding a new cross-scope ID `xid` attribute that SSR code would generate to be used with the first scope and referenced in later scope. See example in [Declarative CSS Module Scripts](https://github.com/WICG/webcomponents/issues/939#issue-971914425)

The script version of this already exists via the [adoptedStyleSheets](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets) property:
```html
import sheet from './styles.css' assert { type: 'css' }; // or new CSSStyleSheet();
shadowRoot.adoptedStyleSheets = [sheet];
```

## Polyfills

Web developers often seek polyfills to allow them to use new web platform features while falling back gracefully in user agents where such features are not supported. A common strategy is to use JavaScript for polyfills. An example of this could be the following:

```html
<script>
  function supportsDeclarativeAdoptedStyleSheets() {
    return document.createElement('template').shadowRootAdoptedStyleSheets != undefined;
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

## Future Work

This proposal expands the concept of [module specifiers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#:~:text=The-,module%20specifier,-provides%20a%20string) to allow content in <style> elements to create named [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) entries without referencing an external file. This concept could also apply to the `<script>` tag when [inline module scripts](https://html.spec.whatwg.org/multipage/webappapis.html#fetch-an-inline-module-script-graph) are specified, giving the ability for these scripts to [export](https://tc39.es/ecma262/#sec-exports) values, something they are not currently capable of (see [this issue](https://github.com/whatwg/html/issues/11202)).

```js
<script type="module" specifier="exportsfoo">
const foo = 42;
export {foo};
</script>
<script type="module">
import {foo} from "exportsfoo";
...
</script>
```

## Summary
The following table compares pros and cons of the various proposals: 

| | Proposal | Currently supported in DSD? | Can hit network? | FOUC | Can apply styles only to shadow? | Can export styles to parent document ?|
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Inline, declarative CSS Module Scripts | ❌ No | ✅ No | ✅ No (unless module is imported from a separate file) | Yes, on a **per-sheet** basis | ✅ Yes |
| 2 | `<link rel>` | ✅ Yes | ❌ Yes | ❌ Yes | Yes, on a **per-sheet** basis | ❌ No |
| 3 | `@layer` + `importStyles` | ❌ No | ✅ No | ✅ No (unless `@imports` is used) | Yes, on a **per-sheet** basis | ❌ Not currently, but could be specified. |
| 4 | `@Sheet` | ❌ No | ✅ No | ✅ No | Yes, on a **per-sheet** basis | ❌ Not currently, but could be specified. |
| 5 | `adoptedstylesheets` attribute | ❌ No | ✅ No | ✅ No | Yes, on a **per-sheet** basis | ❌ No |

## Open issues
* What happens if a `<template shadowrootadoptedstylesheets="">` references a specifier that was imported as a non-inline CSS module whose fetch hasn’t completed yet?
  Leading idea: Disallow any non-declarative imports on `<template shadowrootadoptedstylesheets="">`. This is the simplest approach that will minimize the possibility of an FOUC and non-deterministic behavior based on network timing, at the expense of flexibility. If mixing imperative and declarative CSS modules is a scenario we want to support, an alternative way of handling this case is that non-declarative imports are skipped when processing declarative shadow roots if their status is still "pending" at the time that the declarative shadow root is parsed. Otherwise they are applied in the same way as a declarative import.
* Should Declarative CSS Modules behave in a "one-and-done" fashion like JavaScript modules? This would mean that the first module parsed is always applied when referenced with its specifier, which differs from the steps described in [Detailed Parsing Workflow](#detailed-parsing-workflow). There are a few implications of this behavior, including that modifying the contents of the `<style type="module">` element wouldn't update the associated stylesheet in the module map, subsequent Declarative CSS Modules with the same specifier won't override the existing entry in the module map, and that a specifier on a `<style type="module">` element can never be changed. This behavior would bring CSS Modules more in line with JavaScript modules, but less in line with how the `<style>` tag currently behaves. If we proceed with this approach, one option for making these behaviors explicit is to remove the `<style type="module">` element from the DOM once it has been entered into the module map, which is similar to how `<template>` elements with declarative shadow DOM work. Removing the `<style>` element from the DOM would make most of the disallowed behaviors in a "one and done" scenario no longer possible.
* Should the stylesheet for a declarative CSS module be accessible via JavaScript from the `<style type="module">` element? In regular `<style>` tags, it would be accessible and modifiable through the [LinkStyle interface](https://www.w3.org/TR/cssom-1/#the-linkstyle-interface). We may not want to allow this, particularly if the CSS Module approach is decided to be "one and done".

## References and acknowledgements
Many thanks for valuable feedback and advice from other contributors:
- Alison Maher
- Alex Russell
- Justin Fagnani
- Steve Orvell
