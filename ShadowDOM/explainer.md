# Declarative shadow DOM style sharing 

## Authors

- Kurt Catti-Schmidt
- Daniel Clark
- Tien Mai

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
  - [Authors](#authors)
  - [Participate](#participate)
  - [Status of this Document](#status-of-this-document)
  - [Background](#background)
  - [Problem](#problem)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
  - [Use case](#use-case)
    - [Media site control widgets](#media-site-control-widgets)
    - [Anywhere web components are used](#anywhere-web-components-are-used)
  - [Alternatives to using style in DSD](#alternatives-to-using-style-in-dsd)
  - [Proposal: Inline, declarative SS module scripts](#proposal-inline-declarative-css-module-scripts)
  - [Alternate proposals](#alternate-proposals)
  - [Summary](#summary)
  - [Open issues](#open-issues)
  - [References and acknowledgements](#references-and-acknowledgements)


## Background
With the use of web components in web development, web authors often encounter challenges in managing styles, such as distributing global styles into shadow roots and sharing styles across different shadow roots. Markup-based shadow DOM, or [Declarative shadow DOM (DSD)](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom), is a new concept that makes it easier and more efficient to create a shadow DOM definition directly in HTML, without needing JavaScript for setup. [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) provides isolation for CSS, JavaScript, and HTML. Each shadow root has its own separate scope, which means styles defined inside one shadow root do not affect another or the main document. 

## Problem
Sites that make use of Declarative Shadow DOM (DSD) have reported that the lack of a way to reference repeated stylesheets creates large payloads that add large amounts of latency. Authors have repeatedly asked for a way to reference stylesheets from other DSD instances in the same way that frameworks leverage internal data structures to share constructable style sheets via `adoptedStyleSheets`. This Explainer explores several potential solutions.

Relying on JavaScript for styling is not ideal for DSD for several reasons: 
* One of the main goals of DSD is to not rely on JavaScript [for performance and accessibility purposes](https://web.dev/articles/declarative-shadow-dom).
* Adding stylesheets via script may cause an FOUC (Flash of Unstyled Content).
* The current `adoptedStylesheets` property only supports Constructable Stylesheets, not inline stylesheets or stylesheets from <link> tags [(note that the working groups have recently decided to lift this restriction)](https://github.com/w3c/csswg-drafts/issues/10013#issuecomment-2165396092). 

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
  Sharing styles between the parent document and shadow root is also fairly common for media site
  control widgets such as play/pause buttons, volume sliders, and progress bars, to share styles
  between the parent document and the shadow root in order to provide a cohesive look and feel for
  end users across different websites. Let's take a look at this simple media control widget: 
  
  ![image](images/mediacontrol.jpeg)
  
  In this example, the global styles in the parent document provide basic styling for the page
  layout and the controls. This ensures that the controls used within the shadow DOM adhere to the 
  site's overall styling.
  
```html
<head>
    <style>
        /* Global styles for the parent document */
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0;
        }
        button, input[type="range"] {
            cursor: pointer;
            margin: 5px;
        }
    </style>
</head>
```
Meanwhile, the styles defined within the Shadow DOM are specific to the media control widget. These styles ensure that the widget looks consistent and isn't affected by other styles on the page.
```js
class MediaControl extends HTMLElement {
    constructor() {
        super();
        
        // Attach a shadow root to the element.
        const shadow = this.attachShadow({ mode: 'open' });

        // Create elements

        // Style the elements within the shadow DOM
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            .media-control-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                border: 1px solid #ccc;
                padding: 16px;
                background-color: #fff;
            }
            .controls {
                margin-top: 8px;
                display: flex;
                gap: 8px;
                align-items: center;
            }
            button, input[type="range"] {
                cursor: pointer;
                margin: 5px;
            }
        `);
        shadow.adoptedStyleSheets.push(sheet);

        // Initialize content from template here
    }
}
customElements.define("media-control", MediaControl);
document.body.appendChild(document.createElement("media-control"));
```
Both the controls in the parent document and the controls inside the media control widget share the same base styles for cursor and margin. 

### Anywhere web components are used
When asked about pain points in [Web Components](https://2023.stateofhtml.com/en-US/features/web_components/), the number one issue, with 13% of the vote, is styling and customization. Many respondents specifically mentioned the difficulty of style sharing issues within the shadow DOM:
* "I want to use shadow DOM to keep the light DOM tidy and use slots, but I don't always want style isolation"
* "Inheriting/passing CSS styles from the main DOM to a shadow DOM"
* "Shadow dom is a nightmare due to inability to style with global styles"
* "I love to write my custom web components. It is supper easy to write, maintain. It organizes project structure in some small chunks. But I don't use shadow dom, because of css styles which i don't know how to share between web components"
* "Shadow DOM encapsulation is too much. E.g. No way to adopt form styling from the surrounding page for common elements (buttons, inputs, etc) unless I'm willing to put them in light DOM"

For additional use cases, please see issue [939](https://github.com/WICG/webcomponents/issues/939) 

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
This proposal builds on [CSS module scripts](https://web.dev/articles/css-module-scripts), enabling authors to declare a CSS module inline in an HTML file and link it to a DSD using its [module specifier](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#:~:text=The-,module%20specifier,-provides%20a%20string). A `type=”css-module”` attribute on the `<script>` element would define it as a CSS  module script and the specifier attribute would add it to the module cache as if it had been imported. This allows the page to render with the necessary CSS modules attached to the correct scopes without needing to load them multiple times. Note that module maps are global, meaning that modules defined in a Shadow DOM will be accessible throughout the document context. 
```js
<script type="css-module" specifier="/foo.css"> 
  #content { 
    color: red; 
  } 
</script>
```
Given this `<script>` tag, the styles could be applied to a DSD as follows:
```html
<my-element> 
  <template shadowrootmode="open" adoptedstylesheets="/foo.css"> 
    <!-- ... --> 
  </template> 
</my-element>
```

The shadow root will be created with its `adoptedStyleSheets` containing the `"/foo.css"` CSS module script’s CSSStyleSheet instance. This single `CSSStyleSheet` instance can be shared by any number of shadow roots. 

An inline CSS module script could also be imported in a JavaScript module in the usual way: 
```html
import styles from '/foo.css' with { type: 'css' };
```

An advantage of this approach is that it can be extended to solve similar issues with other content types. Consider the case of a declarative component with many instances stamped out on the page. In the same way that the CSS must either be duplicated in the markup of each component instance or set up using script, the same problem applies to the HTML content of each component. We can envision an inline version of [HTML module scripts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md) that would be declared once and applied to any number of shadow root instances: 
```html
<template type="module" specifier="/foo.html"> 
<!-- This template defines an HTML module whose contents are given by the markup 
     placed here, inserted into the module map with the specifier "/foo.html" --> 
... 
</template> 
<my-element> 
  <!-- The `shadoowroothtml` attribute causes the `<template>` to populate the shadow root by 
cloning the contents of the HTML module given by the "/foo.html" specifier, instead of 
parsing HTML inside the <template>. --> 
  <template shadowrootmode="open" shadowrootadoptedstylesheets="/foo.css" shadowroothtml="/foo.html"></template> 
</my-element>
```
In this example we’ve leveraged the module system to implement declarative template refs. 

Another advantage of this proposal is that it can allow multiple module specifiers in the `adoptedstylesheets` property: 
```html
<script type="css-module" specifier="/foo.css">  
  #content {  
    color: red;  
  }  
</script>  

<script type="css-module" specifier="/bar.css">  
  #content {  
    font-family: sans-serif;  
  }  
</script>  

<my-element>  
  <template shadowrootmode="open" adoptedstylesheets="/foo.css, /bar.css">  
    <!-- ... -->  
  </template>  
</my-element>
```

## Alternate proposals
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
      /* Shadow DOM specific styles */ 
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
This proposal builds on [using multiple sheets per file](https://github.com/w3c/csswg-drafts/issues/5629#issuecomment-1407059971) that introduces a new `@sheet` rule to address the difficulties arising when using JavaScript modules to manage styles. The main idea is to enhance the way CSS is imported, managed, and bundled in JavaScript by allowing multiple named stylesheets to exist within a single CSS file. We can expand on this proposal to allow stylesheets being directly specified within the HTML markup using `adoptedStylesheets` property without requiring JavaScript: 

```html
<style> 
  @sheet sheet1 { *: background-color: gray; } 
  @sheet sheet2 { *: color: blue; } 
</style> 

<template shadowrootmode="open" adoptedStylesheets="sheet1, sheet2"> 
  <span>I'm in the shadow DOM</span> 
</template> 
 ```

In this example, developers could define styles in a `<style>` block using an `@sheet` rule to create named style sheets. The `adoptedStylesheets` property allows Shadow DOMs to specify which stylesheets they want to adopt without impacting the main document, improving ergonomics.  

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
This approach could be combined with other approaches listed in this document. Note that `@sheet` is not implemented by any rendering engine as of September 2024. 

### [Id-based `adoptedstylesheet` attribute on template](https://github.com/WICG/webcomponents/issues/939#issue-971914425) 
This proposal will add a new markup-based `adoptedstylesheets` property that closely matches the existing JavaScript property.  The behavior would be just like the `adoptedStyleSheet` property that already exists in JavaScript, except it would accept a list of id attributes instead of a `ConstructableStylesheet` JavaScript object. 
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
Web authors can use the `adoptedstylesheets` property on the `<template>` element to associate the stylesheets with a declarative shadow root. 
```html
<template shadowrootmode="open" adoptedstylesheets="shared_shadow_styles, external_shared_shadow_styles">  
      <!-- -->  
</template>
```
One requirement of this approach is that the current `adoptedStylesheets` JavaScript property would need to lift the “constructable” requirement for `adoptedStylesheets`. This was recently agreed upon by the CSSWG but has not been implemented yet: [ Can we lift the restriction on constructed flag for adoptedStylesheets?](https://github.com/w3c/csswg-drafts/issues/10013#issuecomment-2165396092)

One limitation of this approach is that shared styles that need to be applied exclusively to shadow roots (and not the main document) will need to include a CSS `:host` selector. This is not necessary for JavaScript-based adopedStylesheets but will be necessary for declarative stylesheets, as there is currently no way in HTML to create stylesheets without applying them to the document they are defined in. This could also be addressed via a new type value on `<style>` tags and rel value on `<link>` tags, potentially `“adopted-css”`. 

A challenge that arises is dealing with scopes and idrefs. If a declarative stylesheet can only be used within a single scope, it ends up being as limited as a regular `<style>` tag since it would need to be duplicated for every scope. A cross-scope idref system would enable nested shadow roots to access global stylesheets. This proposal recommends adding a new cross-scope ID `xid` attribute that SSR code would generate to be used with the first scope and referenced in later scope. See example in [Declarative CSS Module Scripts](https://github.com/WICG/webcomponents/issues/939#issue-971914425) 

The script version of this already exists via the [adoptedStylesheets](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets) property: 
```html
import sheet from './styles.css' assert { type: 'css' }; // or new CSSStyleSheet(); 
shadowRoot.adoptedStyleSheets = [sheet];
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

  Leading idea: upon creation, the shadow root would contain an empty `CSSStyleSheet`, which is the `CSSStyleSheet` for the CSS module script. When the fetch is completed and the CSS module script is fully created, this `CSSStyleSheet` is populated. This would require some changes to how module creation works in the HTML spec.
  
* What happens if a `<template shadowrootadoptedstylesheets="">` references a specifier that hasn't been imported or declared inline yet?

  The most conservative answer would be to not create the shadow root at all, which is also what happens if the `shadowrootmode` attribute has an invalid value. 
* Render thread blocking – to avoid an FOUC, developers may want to block rendering until styles are available. There are many ways that this could be accomplished – for instance, `<link rel="..." blocking="render">`
* For declarative CSS Modules, the only way to apply styles *only* to shadow elements is via a `:host` selector. This might not be feasible for large, complex sites, and could lead to duplicated styles. A new attribute on the `<style>` tag (`type=adoptedStyles`) could address this, as would a new tag (`<adoptedStyle>`).
* `cloneNode` – there are several complications with cloneNode 

## References and acknowledgements
Many thanks for valuable feedback and advice from other contributors:
- Alison Maher
- Alex Russell
- Justin Fagnani
