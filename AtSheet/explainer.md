# `@sheet`

## Authors:

- Andy Luhrs
- Kurt Catti-Schmidt

## Participate
- [Issue tracker](https://github.com/w3c/csswg-drafts/issues/5629)
- [Discussion forum](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/AtSheet)

## Status of this Document

This document is intended as a starting point for engaging the community and
standards bodies in developing collaborative solutions fit for standardization.
As the solutions to problems described in this document progress along the
standards-track, we will retain this document as an archive and use this section
to keep the community up-to-date with the most current standards venue and
content location of future work and discussions.

* This document status: **Active**
* Expected venue: [CSS Working Group](https://www.w3.org/Style/CSS/)
* Current version: this document

## Introduction
When developing web components, web authors often encounter challenges with distributing global styles into shadow roots and sharing styles across different shadow roots. Declarative shadow DOM (DSD) enables creation of shadow DOM without JS, but adding styles to DSD requires the developer to either use JS to put a shared stylesheet into `adoptedStyleSheets`, or to duplicate the styles in a `<style>` element for each component instance.

Additionally, bundling of stylesheets is difficult for developers who are distributing web components. They either need to ship many small stylesheets, or use workarounds like `@import url("data...")` which are suboptimal for performance and don't interact well with other patterns.

We propose an enhancement to allow declaration of new stylesheets via an `@sheet` CSS block, and using existing mechanisims such as `@import` and `<link>` to apply those shared styles to DSDs without the use of Javascript.

## Goals
* Allow the reuse of styles in markup-based shadow DOM without requiring JavaScript.
* Allow reuse of styles in markup-based shadow DOM without requiring external network requests.
* Allow web authors to selectively pass in global styles from the parent document. 
* Allow component authors to bundle their CSS into a single file.
* Allow named `@sheet` references to fully integrate with existing CSS inclusion methods such as `@import` statements and `<link>` tags.


## Non-goals
Some developers have expressed interest in CSS selectors crossing through the Shadow DOM, as discussed in [issue 909](https://github.com/WICG/webcomponents/issues/909#issuecomment-1977487651). While this scenario is related to sharing styles with Shadow DOM elements, it is solving a different problem and should be addressed separately.

## Proposal - `@sheet`
Create a new `@sheet` CSS block, for separating style sheets with named identifiers.

styles1and2.css:
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

## Proposal - Importing a specific sheet via `@import`
```html
<style>
  @import sheet("styles1and2.css#sheet1");
</style>
```

This will import only this rules for "sheet1" - in this case, the rules for the `:host` selector, and will *not* import any rules from styles1and2.css outside of "sheet1".

## Proposal - Importing a specific sheet via the `<link>` tag
```html
<link rel="stylesheet" href="styles1and2.css#sheet1" />
```

This will also import only this rules for "sheet1" - in this case, the rules for the `:host` selector, and will *not* import any rules from styles1and2.css outside of "sheet1".

## Proposal - Importing a base set of inline styles into a Declarative Shadow DOM
Shadow DOM isolates styles, but fragment identifiers are global. This enables Declarative Shadow DOM to import `@sheet` references from the light DOM.

```html
<style>
@sheet sheet1 {
  * {
    font-family: sans-serif;
  }
}
</style>
<template shadowrootmode="open">
  <link rel="stylesheet" href="#sheet1" />
  <span>I'm in the shadow DOM</span>
</template>
```
or imported from JS:
```html
<script>
  import {sheet1} from './styles1and2.css' with {type: 'css'};
  ...
  shadow.adoptedStyleSheets = [sheet2];
</script>
```

## Detailed design discussion

#### Named Imports with Imperative Shadow DOM

The following examples use a stylesheet saved as `sheet.css` with the following contents:

```css
div { color: blue; } 

@sheet bar { div { color: red; } }
```

This can then be imported via Javascript as follows:

```js
import foo, { bar } from 'sheet.css' with { type: 'css' }
```

`foo` will reference style rules outside of any `@sheet` blocks as a Default Import (in this case, the `div { color: blue; } ` rule).

`bar` will reference style rules within the `@sheet bar` block as a Named Import (in this case, the `div { color: red; }  ` rule).

Named imports may be renamed as part of this import process:

```js
import foo, { bar as baz } from 'sheet.css' with { type: 'css' }
```

The default import may be omitted, importing only the named `@sheet`:

```js
import { bar } from 'sheet.css' with { type: 'css' }
```

Any of these `import` examples can be then used to set the `adoptedStyleSheets` attribute on a Shadow DOM node:

```js
import { bar } from 'sheet.css' with { type: 'css' }
document.adoptedStyleSheets = [bar];
shadowRoot.adoptedStyleSheets = [bar];
```

#### Performance

This will be a performance-neutral feature, and use of it may allow for developers to reduce the number of network requests.

We should ensure that the following scenarios behave as expected:

1. Multiple imports of different sheets from the same file produce a single network request.

The following examples use a stylesheet saved as `sheet.css` with the following contents:

```css
div { color: blue; } 

@sheet foo { div { color: red; } }
@sheet bar { div { font-family: sans-serif; } }
```

```js
// The following two imports should only make a single network request.
import { foo } from 'sheet.css' with { type: 'css' };
import { bar } from 'sheet.css' with { type: 'css' }
```

```html
<style>
/* The following two imports should only make a single network request. */
@import "sheet.css#foo";
@import "sheet.css#bar";
</style>
```

```html
<!-- The following two link tags should only make a single network request. -->
<link rel="stylesheet href="sheet.css#foo" />
<link rel="stylesheet href="sheet.css#bar" />
```

#### Interaction with CSSOM


Named `@sheet` references augment the [existing](https://drafts.csswg.org/cssom/#stylesheet) `StyleSheet` interface with an optional `name` attribute reflecting the `@sheet` identifier:

```
[Exposed=Window]
interface StyleSheet {
  readonly attribute DOMString? name;
};
```
*Open issue: Should this overload the existing `title` attribute instead?*

This also expands the [existing](https://drafts.csswg.org/cssom/#cssstylesheet) CSSOM `CSSStyleSheet` definition with a `StyleSheetList` of nested `CSSStyleSheet` objects to access nested `@sheet` references:

```
[Exposed=Window]
interface CSSStyleSheet : StyleSheet {
  [SameObject] readonly attribute StyleSheetList nestedStyleSheets;
};
```
*Open issue: The name `nestedStyleSheets` is up for discussion*

## Considered alternatives

1. [Declarative CSS Modules](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ShadowDOM/explainer.md) are another mechanism for sharing styles between Declarative Shadow DOM and light DOM without the use of Javascript.

## Open Issues

1. Whether rules are applied automatically for `@sheet` definitions, or whether they need to be imported to apply. The CSS Working Group did not have a consensus.
2. Fragment-only identifiers (without a URL) should allow inline `@sheet` references on the same document to be included globally (even within shadow roots). This wasn't brought up in the CSSWG discussions at all, but is important for DSD without requiring an external file (to avoid FOUC).
3. Behavior of `@import` - should this be possible within `@sheet` at all, should it be allowed if it's the first/only statement, or should it be blocked? There was discussion of this in the CSSWG, but no conclusion was reached.
4. What happens with multiple `@sheet` definitions with the same identifier? First-definition wins, or do they get merged like `@layer`? Again, this was brought up in the CSSWG but not resolved. Note that it's possible to have a "Flash of other-styled content" if it's last-defintion-wins, as the first definition may apply, then a later definition may override it.

## References & acknowledgements
Many thanks for valuable feedback and advice from:

- Tab Atkins Jr.
- Daniel Clark
- Justin Fagnani
- Westbrook Johnson
- Alison Maher
- Tien Mai
