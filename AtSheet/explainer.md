# `@sheet`

## Authors:

- Andy Luhrs
- Kurt Catti-Schmidt
- TODO: Probably include Justin Fagnani? Tab Atkins? Dan and Tien? kschmi - added these names to the end.

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

==TODO: Compile and clean-up the list of behaviors from the thread ==

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

Dan's notes:
```
Early thoughts: I like this, though it might not replace CSS bundlers in some really performance-sensitive cases. There is still one fetch incurred for the import {sheet1, sheet1} from './styles1and2.css' assert {type: 'css'}; statement that would be eliminated by bundling. If the perf benefit of eliminating this last extra fetch is greater than the perf benefit of parsing everything directly as CSS [1], then there might not be a performance win for using this instead of a bundler.

But, it reduces the cost of using CSS modules in production to just 1 extra fetch, which is down from N extra fetches for N stylesheets. So for the cost of the one fetch, you cut out one part of the build/bundling process, get some perf benefit from parsing CSS directly without passing it through the JS parser, and the resulting production code will be easier to read and reason about than production code that had CSS bundled in the JS.

[1] Last year I did some rough experiments to try to measure this potential perf benefit. I observed real differences in both time and memory, although you need a lot of iterations before it starts to be really observable: https://dandclark.github.io/json-css-module-notes/#css-module-performancememory-examples
```

#### @import DataURI
```TODO
a more convenient way to write @import url("data:...");, with the potential to hook into CSS Modules a little better.
```


#### Interaction with CSSOM

This expands the CSSOM `CSSStyleSheet` definition with a dictionary of nested `CSSStyleSheet` objects, keyed by name.

TODO: Add IDL for this.

### Tab's questions
```TODO
I assume that the top-level import is still the overall stylesheet containing the @sheet rules, yeah? We just additionally specify that the @sheet rules produce additional exported sheets in the module object, keyed to their name?
The @sheet contents are independent, as if they were @import url("data:...");, right? The example in the preceding comment would indeed work (layer names are shared across all sheets already) but it wouldn't, say, see a @namespace rule in the outer sheet (and presumably could contain a @namespace rule of its own).
What's the behavior of @media (...) { @sheet {...} }? I presume the answer needs to be "it's invalid", and @sheet objects are required to be top-level.
Can you nest @sheets tho? If so, does the top-level import expose them all as a flat list, or do you just get the top-level ones, and have to go find the lower ones yourself?
If you have multiple @sheet foo rules, do we only take one and treat the rest as invalid (and then do we take first or last?)? Or do we merge their contents as if they were a single sheet?
```

```TODO
Yes.
Independent. While there could be something interesting about additional work around @import @sheet sheetName in order to share across the single file, the goal is to keep the various @sheet entries separate from each other, but bound to the single file download.
Invalid. @sheet should be top level.
Invalid. @sheet should be top level.
CSS rules say last definition wins. JS rules say multiple consts throw errors. CSS doesn't really throw errors, so keep towards the CSS rules here.
1 and 4 in concert beg the question of what is returned at import styles from './styles.css' assert { type: 'css' }; when the file does have @sheet specifiers? In the JS space, you'd hope for something more of an object with the other sheets on in { sheet1: CSSStyleSheet, sheet2: CSSStyleSheet, ...etc }, however, I'd expect we'd need to actually accept a CSSStyleSheet with its cssRules array including CSSStyleSheets, instead of rules. This could be a bit surprising to JS users, but clarifies the fact that 4 is not possible. If there were some magic way to get more of a JS import out of the the CSS assertion, it would be interesting to push for nested sheets to
```


```TODO
since @sheet is meant to emulate an @import with a data url, should we let it take the same import restrictions - a MQ, a SQ, a layer? Or is it okay to expect these to be translated into rules inside the @sheet wrapping everything?
```
### [Tricky design choice #1]

[Talk through the tradeoffs in coming to the specific design point you want to make.]

```js
// Illustrated with example code.
```

[This may be an open question,
in which case you should link to any active discussion threads.]

### [Tricky design choice 2]

[etc.]

## Considered alternatives

1. [Declarative CSS Modules](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ShadowDOM/explainer.md) are another mechanism for sharing styles between Declarative Shadow DOM and light DOM without the use of Javascript.

## Open Issues

1. Whether rules are applied automatically for `@sheet` definitions. The CSS Working Group did not have a consensus.
2. Fragment-only identifiers (without a URL) should allow inline `@sheet` references on the same document to be included globally (even within shadow roots). This wasn't brought up in the CSSWG discussions.
3. Behavior of `@import` - should this be possible within `@sheet` at all, should it be allowed if it's the first/only statement, or should it be blocked? There was discussion of this in the CSSWG, but no conclusion was reached.
4. What happens with multiple `@sheet` definitions with the same identifier? First-definition wins, or do they get merged like `@layer`? Again, this was brought up in the CSSWG but not resolved.

## References & acknowledgements

[Your design will change and be informed by many people; acknowledge them in an ongoing way! It helps build community and, as we only get by through the contributions of many, is only fair.]

[Unless you have a specific reason not to, these should be in alphabetical order.]

Many thanks for valuable feedback and advice from:

- Tab Atkins Jr.
- Daniel Clark
- Justin Fagnani
- Westbrook Johnson
- Alison Maher
- Tien Mai
- [etc.]