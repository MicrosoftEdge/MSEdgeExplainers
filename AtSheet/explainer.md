# `@sheet`

## Authors:

- Andy Luhrs
- Kurt Catti-Schmidt

Much of this explainer is consolidating and iterating on a CSSWG discussion around [Justin Fagnani](https://github.com/justinfagnani)'s proposal for multiple stylesheets in a single file [here](https://github.com/w3c/csswg-drafts/issues/5629).

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/AtSheet)
- [Discussion forum](https://github.com/w3c/csswg-drafts/issues/5629)

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
When developing web components, web authors often encounter challenges with distributing global styles into shadow roots and sharing styles across different shadow roots. Declarative shadow DOM (DSD) enables creation of shadow DOM without JavaScript. However, adding styles to DSD requires the developer to either use JavaScript to put a shared stylesheet into `adoptedStyleSheets`, or to duplicate the styles in a `<style>` element for each component instance.

Additionally, bundling of stylesheets is difficult for developers who are distributing web components. They either need to ship many small stylesheets, or use workarounds like `@import url("data...")` which are suboptimal for performance and don't interact well with other patterns.

We propose an enhancement to allow the declaration of new stylesheets via an `@sheet` CSS block and using existing mechanisims such as `@import`, `<link>`, and CSS module script `import` to apply those shared styles to DSDs without the use of JavaScript.

We're currently investigating this and [Declarative CSS modules](/ShadowDOM/explainer.md) in parallel, and anticipate that we'll be prioritizing only one of these two in the immediate future.

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


```css
@sheet foo {
  div {
    color: red;
  }
}

@sheet bar {
  div {
    font-family: sans-serif;
  }
}

div {
  color: blue;
}
```
This stylesheet will create three CSS sheets - The default sheet, `foo`, and `bar`. All following examples will use this stylesheet with the name of `sheet.css`.

### Importing a specific sheet via `@import`
```html
<style>
  @import sheet("sheet.css#foo");
</style>
```

This will import only the rules for `foo` - in this case, the `div { color: red; }` rule. This will *not* import any rules from `sheet.css` outside of "foo".

### Importing a specific sheet via the `<link>` tag
```html
<link rel="stylesheet" href="sheet.css#foo" />
```

This will also import only this rules for "foo" - in this case, the `div { color: red; }` rule. This will *not* import any rules from `sheet.css` outside of "foo".

### Importing a base set of inline styles into a Declarative Shadow DOM
Shadow DOM isolates styles, but fragment identifiers are global. This enables Declarative Shadow DOM to import `@sheet` references from the light DOM:

```html
<style>
@sheet foo {
  div {
    color: red;
  }
}
</style>
<template shadowrootmode="open">
  <link rel="stylesheet" href="#foo" />
  <span>I'm in the shadow DOM</span>
</template>
```
or imported from JavaScript:
```html
<script>
  import {foo} from './sheet.css' with {type: 'css'};
  ...
  shadow.adoptedStyleSheets = [foo];
</script>
```

## Detailed design discussion

#### Named Imports with Imperative Shadow DOM

`sheet.JavaScript` can also be imported via JavaScript as follows:

```JavaScript
import baz, { bar } from 'sheet.css' with { type: 'css' }
```

`baz` will reference style rules outside of any `@sheet` blocks as a Default Import (in this case, the `div { color: blue; } ` rule).

`bar` will reference style rules within the `@sheet bar` block as a Named Import (in this case, the `div { color: red; }  ` rule).

Named imports may be renamed as part of this import process:

```JavaScript
import baz, { bar as renamed } from 'sheet.css' with { type: 'css' }
```

`bar` will be renamed to `renamed`.

The default import may be omitted, importing only the named `@sheet`:

```JavaScript
import { bar } from 'sheet.css' with { type: 'css' }
```

Any of these `import` examples can then be used to set the `adoptedStyleSheets` attribute on a Shadow DOM node:

```JavaScript
import { bar } from 'sheet.css' with { type: 'css' }
document.adoptedStyleSheets = [bar];
shadowRoot.adoptedStyleSheets = [bar];
```

#### Performance

This will be a performance-neutral feature, but developers can utilize this feature to reduce the number of network requests. We should ensure that multiple imports of different sheets from the same file produce a single network request. 

```JavaScript
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
<link rel="stylesheet" href="sheet.css#foo" />
<link rel="stylesheet" href="sheet.css#bar" />
```

#### Interaction with CSSOM


Named `@sheet` references augment the [existing](https://drafts.csswg.org/cssom/#stylesheet) `StyleSheet` interface with an optional `name` attribute reflecting the `@sheet` identifier:

```
[Exposed=Window]
interface StyleSheet {
  readonly attribute DOMString? name;
};
```
*Open issue: 

This also expands the [existing](https://drafts.csswg.org/cssom/#cssstylesheet) CSSOM `CSSStyleSheet` definition with a `StyleSheetList` of nested `CSSStyleSheet` objects to access nested `@sheet` references:

```
[Exposed=Window]
interface CSSStyleSheet : StyleSheet {
  [SameObject] readonly attribute StyleSheetList nestedStyleSheets;
};
```

## Considered alternatives

1. [Declarative CSS Modules](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ShadowDOM/explainer.md) are another mechanism for sharing styles between Declarative Shadow DOM and light DOM without the use of JavaScript.
2. Some additional alternatives to parts of the problems discussed here are discussed in the [Alternate proposals](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ShadowDOM/explainer.md#alternate-proposals) section of that explainer.

## Open Issues

1. Whether rules are applied automatically for `@sheet` definitions, or whether they need to be imported to apply. The CSS Working Group did not have a consensus.
2. Fragment-only identifiers (without a URL) should allow inline `@sheet` references on the same document to be included globally (even within shadow roots). This wasn't brought up in the CSSWG discussions at all, but is important for DSD without requiring an external file (to avoid FOUC).
3. Behavior of `@import` - should `@import` be possible within `@sheet` at all, should it be allowed if it's the first/only statement, or should it be blocked? There was discussion of this in the CSSWG, but no conclusion was reached.
4. What happens with multiple `@sheet` definitions with the same identifier? First-definition wins, or do they get merged like `@layer`? Again, this was brought up in the CSSWG but not resolved. Note that it's possible to have a "Flash of other-styled content" if it's last-defintion-wins, as the first definition may apply, then a later definition from an external CSS file may override it.
5. Do we want to be able to access sheets declared in shadow DOM from light DOM? For example:
```html
<template shadowrootmode="open">
  <style>
    @sheet foo {
      div {
        color: red;
      }
    }
  </style>
  <link rel="stylesheet" href="#foo" />
  <span>I'm in the shadow DOM</span>
</template>

<link rel="stylesheet" href="#foo" />
<span>I'm in the light DOM</span>
```
6. The name `nestedStyleSheets` is up for discussion.
7. Should we add `name` to the `StyleSheet` interface or  overload the existing `title` attribute instead?
8. If a stylesheet contains named `@sheet` references *and* rules outside of the `@sheet` references, what happens in all cases when a fragment identifier is *not* specified? For example:

sheet.css:

```html
@sheet foo {
  color: red;
}
color: blue;
```

```html
<style>
  @import "sheet.css" /* Does the @sheet "foo" get dropped? */
</style>
<link rel="stylesheet" href="sheet.css"> <!-- Does the @sheet "foo" get dropped? -->
```

## References & acknowledgements
Many thanks for valuable feedback and advice from:

- Alison Maher
- Daniel Clark
- Justin Fagnani
- Tab Atkins Jr.
- Tien Mai
- Westbrook Johnson
