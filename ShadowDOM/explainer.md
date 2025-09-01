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
    - [Updates to Module Map Key](#updates-to-module-map-key)
    - [Detailed Parsing Workflow](#detailed-parsing-workflow)
    - [Use with Imperative Module Scripts](#use-with-imperative-module-scripts)
    - [Use with Import Maps](#use-with-import-maps)
  - [Other declarative modules](#other-declarative-modules)
  - [Alternate proposals](#alternate-proposals)
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

### Updates to Module Map Key

A significant piece of this proposal involves modifying the [module map](https://html.spec.whatwg.org/#module-map) to be keyed by a string instead of a URL (the current key is a (URL, module type) pair, which this proposal updates to a (string, module type) pair). A string is a superset of a URL, so this modification will not break existing scenarios. 

This proposal could avoid this requirement by instead requiring a declarative specifier to be a [URL fragment](https://url.spec.whatwg.org/#concept-url-fragment), but we believe this would introduce several potentially confusing and undesirable outcomes:

1. The [Find a potential indicated element](https://html.spec.whatwg.org/#find-a-potential-indicated-element) algorithm only searches the top-level document and does not query shadow roots. While this proposal does not require the [find a potential indicated element](https://html.spec.whatwg.org/#find-a-potential-indicated-element) to function (the indicated element in this case is the `<style>` element that is directly modifying the module map, so there is no element to find), it could be confusing to introduce a new fragment syntax intended for use in shadow roots that violates this principle.
2. [Import maps](https://html.spec.whatwg.org/#import-map) remap URL's, which allows relative and bare URL's to map to a full URL. It's not clear if there is a use case for remapping same-document references with import maps that cannot be accomplished by adjusting the local reference's identifier. If import maps are performed on a same-document URL reference, an import map entry intended for an external URL could unintentially break a local reference. [Import map resolution](https://html.spec.whatwg.org/#resolving-a-url-like-module-specifier) could be adjusted to skip same-document references, but it could be confusing to have a URL identifier that does not participate in the [resolved module set](https://html.spec.whatwg.org/#resolved-module-set).
3. HTML documents are already using fragments for many different concepts, such as [fragment navigations](https://html.spec.whatwg.org/#navigate-fragid), [history updates](https://html.spec.whatwg.org/#url-and-history-update-steps), [internal resource links](https://html.spec.whatwg.org/#process-internal-resource-links), [SVG href targets](https://www.w3.org/TR/SVG2/struct.html#UseElement), and more. Although these use cases are very different, a common factor between them is that they all reference elements in the main document, and cannot refer to elements within a shadow root. An important piece of this proposal is that nested shadow roots can modify the global module map. Introducing a new scoping behavior for fragments that does not fit this model could be confusing to authors.
4. URL's that consist only of a fragment resolve to a [relative URL](https://url.spec.whatwg.org/#relative-url-string), with the base url defined as the source document per [the URL parsing algorithm](https://url.spec.whatwg.org/#url-parsing). This means that using a fragment-only syntax (which would be desired in this scenario) could break if a [`<base>` element](https://html.spec.whatwg.org/#the-base-element) exists that remaps the document's base URL.

Another alternative could be to define a new [scheme](https://url.spec.whatwg.org/#concept-url-scheme) for local references. This is a potential solution, however, since the containing HTML document already has a scheme, this option would require developers to always specify the [scheme](https://url.spec.whatwg.org/#concept-url-scheme) per [absolute URL with fragment string](https://url.spec.whatwg.org/#absolute-url-with-fragment-string) processing, rather than just the fragment (a fragment-only URL is valid due to the way [relative URL](https://url.spec.whatwg.org/#relative-url-string) processing applies). Developers might find it cumbersome to specify the scheme for local references versus an approach that requires only an identifier (for example, `localid://foo` versus `#foo` or `foo`). A new scheme could also imply scoping behaviors that are not supported, such as [external-file references](https://www.w3.org/TR/SVG2/linking.html#definitions) that are valid in SVG, or potentially even imply that module identifiers can span between `<iframe>` documents. A new scheme may also not be compatible with existing [custom scheme handlers](https://html.spec.whatwg.org/#custom-handlers).

For these reasons, we believe that modifying the [module map](https://html.spec.whatwg.org/#module-map) to be keyed by a string instead of a URL is a more natural solution for developers, as it avoids all of these situations.

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

Upon parsing the `<style>` tag above, an entry is added to the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) whose key is the specifier `"foo"` and whose value is a new [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) created by running the steps to [create a CSS module script](https://html.spec.whatwg.org/#creating-a-css-module-script) with `source` being the text of the `<style>` tag. Note that [create a CSS module script](https://html.spec.whatwg.org/#creating-a-css-module-script) throws a script error when encountering `@import` rules, which is not possible while parsing. One option would be to fail parsing when `@import` is encountered, resulting in a null [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) being added to the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map), which is the same result as a failed fetch (per step 13.1 of the [script module fetch algorithm](https://html.spec.whatwg.org/multipage/webappapis.html#fetch-a-single-module-script)). The resulting [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) would implicitly have a [module type](https://html.spec.whatwg.org/multipage/webappapis.html#creating-a-json-module-script) of "css", given that it originated from a `<style>` tag. 

As with existing `<style>` tags, if the CSS contains invalid syntax, error handling follows the rules specified in [error handling](https://www.w3.org/TR/css-syntax-3/#error-handling).

When the `<template>` element is constructed, the `shadowrootadoptedstylesheets` attribute is evaluated. Each space-separated identifier in the attribute is looked up in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map). If an entry with that specifier
exists in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) with a type of "css" and without a status of "fetching", the associated [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script)'s default export of type [CSSStyleSheet](https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface) is added to the `adoptedStyleSheets` backing list associated with the `<template>` element's [shadow root](https://www.w3.org/TR/cssom-1/#dom-documentorshadowroot-adoptedstylesheets) in specified order, as defined in [CSS Style Sheet Collections](https://www.w3.org/TR/cssom-1/#css-style-sheet-collections). Because [module maps](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) are keyed on module type as well as URL, an entry with the same specifier but a different type would be considered a separate entry. For compatibility, non-declarative (fetched) module entries should be prioritized over declarative entries. This means that if an entry exists in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) with a status of "fetching", the processing of a corresponding entry in the declarative `adoptedstylesheets` list should be skipped. Likewise, an existing entry in the module map set to null should also be skipped when processing the declarative `adoptedstylesheets` list, indicating that the author prioritized a network request that failed. If an entry with that specifier does not exist in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map), an empty [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) object with type of "css" is inserted into the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) with the specified `specifier`.

This may also happen in reversed order, as in the following example:

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

When the `<template>` element is parsed, a [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) entry is added to the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) with the specifier of "foo" and a type of "css", whose associated [CSSStyleSheet](https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface) is  empty .

When the `<style>` element's `specifier` attribute is parsed, the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) is queried for an existing entry. Since there is an existing empty [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) with a type of "css" from the prior step, its contents are synchronously replaced, following the steps to [replace a stylesheet](https://www.w3.org/TR/cssom-1/#synchronously-replace-the-rules-of-a-cssstylesheet).

This replacement always occurs when an existing `specifier` is encountered, ensuring that the active [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) associated with a given `specifier` is always the most recently parsed entry.

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

The contents of the first Declarative CSS Module with `specifier="foo"` (with `color: red`) are first parsed and the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) is updated with a [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) with a `specifier` of "foo" and a type of "css".

Upon parsing the second Declarative CSS Module with `specifier="foo"` (with `color: blue`), the `specifier` attribute initiates querying the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map). Since there is an existing empty [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) with a key of "foo" and a type of "css" from the prior step, its contents are synchronously replaced, following the steps to [replace a stylesheet](https://www.w3.org/TR/cssom-1/#synchronously-replace-the-rules-of-a-cssstylesheet).

The `<template>` with `shadowrootadoptedstylesheets="foo"` will use the second definition (with `color: blue`).

This may also occur when the `<style>` element is a child of the `<template>` that adopts it, as shown in the following example:

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

In this example, the `<template>` element is parsed first. Upon encountering `shadowrootadoptedstylesheets` attribute, the specifier "foo" is queried in the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map). No existing entry is found in the module map, so an empty [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) is inserted into the module map with a key of "foo". Upon parsing the Declarative CSS Module, the `specifier` attribute initiates querying the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map). Since there is an existing empty [CSS module script](https://html.spec.whatwg.org/multipage/webappapis.html#css-module-script) from the prior step, its contents are synchronously replaced, following the steps to [replace a stylesheet](https://www.w3.org/TR/cssom-1/#synchronously-replace-the-rules-of-a-cssstylesheet).

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

The important factor for this scenario is that the `specifier` attribute on the `<style>` tag is explicitly *not* a URL, it is a [DOMString](https://webidl.spec.whatwg.org/#idl-DOMString) that is not [treated as a URL](https://html.spec.whatwg.org/#treated-as-a-url). This allows for disambiguating between a URL that gets fetched in this scenario or a Declarative CSS Module that is synchronously queried from the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map).

If a module is imported imperatively in this fashion and the Declarative CSS Module is not in the [module map](https://html.spec.whatwg.org/#module-map), the import fails, even if it is added declaratively at a later time.

### Use with Import Maps

[Import maps](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) allow for module script specifiers to be modified via a JSON map. Import maps would not apply to Declarative CSS Modules because the `specifier` in this scenario is not a URL, and the definition of a [valid module specifier map](https://html.spec.whatwg.org/multipage/webappapis.html#valid-module-specifier-map) requires that the values are valid URL.

For example, given the following HTML:

```html
<style type="module" specifier="foo">
  ...
</style>
<!-- Invalid import map, because "foo" is not a URL! -->
<script type="importmap">
{
  "imports": {
    "bar": "foo"
  }
}
</script>
<my-element>
  <!-- "bar" is not mapped to "foo" due to the invalid import map! -->
  <template shadowrootmode="open" shadowrootadoptedstylesheets="bar">
    ...
  </template>
</my-element>
```

The style rules from the Declarative CSS Module would first be inserted into the [module map](https://html.spec.whatwg.org/multipage/webappapis.html#module-map) with a specifier of "foo". The import map would then be processed, but since "foo" is not a valid URL, the module specifier map is invalid. When the `<template>` element's `shadowrootadoptedstylesheets` property is evaluated, the import map does not apply, and thus the `<template>` element's specified `shadowrootadoptedstylesheets` of "bar" is not located.

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

In this example we’ve leveraged the module system to implement declarative template refs.

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
* Was it ever intentional that `<script type="importmap">` works inside a shadow root?

## References and acknowledgements
Many thanks for valuable feedback and advice from other contributors:
- Alison Maher
- Alex Russell
- Justin Fagnani
