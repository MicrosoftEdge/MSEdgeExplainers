# CSS Mixins

## Authors

- [Kevin Babbitt](https://github.com/kbabbitt)
- [John Jansen](https://github.com/thejohnjansen)

## Status of this Document

This explainer summarizes the CSS Working Group's evolving design for reusable
CSS rule blocks. It is a guide to the proposal, not normative specification
text.

* This document status: **Draft**
* Current venue: [W3C CSS Working Group](https://www.w3.org/Style/CSS/)
* Current Editor's Draft: [CSS Custom Functions and Mixins](https://drafts.csswg.org/css-mixins/)
* Current design discussion: [CSSWG issue 14243](https://github.com/w3c/csswg-drafts/issues/14243)

The Editor's Draft currently defines custom functions, but does not yet define
mixins. The CSSWG's August 2026 resolutions on the mixin authoring model are
being worked into the design and its open issues. The feature is experimental
and evolving; this document does not imply browser availability or
interoperability.

## Participate

* [CSSWG mixin issues](https://github.com/w3c/csswg-drafts/issues?q=is%3Aissue+label%3Acss-mixins-2)
* [Feedback on this explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BCSS%20Mixins%5D%20)

## Table of Contents

* [Introduction](#introduction)
* [User-facing problem](#user-facing-problem)
* [Goals](#goals)
* [Non-goals](#non-goals)
* [Proposed author-facing model](#proposed-author-facing-model)
* [Alternatives considered](#alternatives-considered)
* [Accessibility, internationalization, privacy, and security](#accessibility-internationalization-privacy-and-security)
* [Resolved design choices](#resolved-design-choices)
* [Remaining questions and status](#remaining-questions-and-status)
* [References](#references)

## Introduction

Stylesheets often repeat the same group of declarations across components:
button treatments, visually hidden patterns, layout recipes, and other
component styles. Sass, Less, and other preprocessors have long offered mixins
for defining and reusing such groups, and developers have extensive experience
with that model. The [ChromeStatus feature entry](https://chromestatus.com/feature/406935599)
also records positive developer interest, consistent with this long-standing use.

CSS custom properties help reuse individual values, but they do not package a
whole style block for reuse. Preprocessor mixins can generate CSS at build time,
but that output is fixed before the browser applies the cascade. A native CSS
mechanism could reuse declarations and nested rules while working with CSS
values and the context in which styles are applied.

## User-facing problem

This is primarily an authoring feature: people using a website would not
invoke mixins themselves. But when a site repeats a component's styling in
several places, a later change can miss one copy. For example, the border
of one card may be updated for clarity while an otherwise identical card
keeps the old treatment. Sharing the recipe makes consistent updates easier.
Mixins do not themselves make a site accessible or guarantee a faster site;
authors still need to choose usable styles, and the performance of evaluating
mixins needs assessment.

## Goals

* Let authors define and apply reusable, parameterized groups of CSS rules.
* Let those rules use values provided at the application site, including
  custom properties from the element receiving the mixin.
* Provide a way to keep intermediate custom properties local, avoiding
  accidental name collisions or exposing implementation details.
* Fit into CSS's existing authoring model rather than require a separate
  preprocessing step.

## Non-goals

* Replace preprocessors for general-purpose programming, loops, or
  build-time code generation.
* Turn CSS into an imperative language. A mixin describes CSS; it is not a
  script that runs arbitrary logic.
* Replace custom properties for sharing individual values, or custom
  functions for producing values. Mixins address reuse at the style-rule
  level.

## Proposed author-facing model

A mixin is declared with `@mixin` and included in a style rule with `@apply`.
Its body is the style content to apply. Parameters can provide values to that
body.

Consider a site with cards in several themes. Today, the site could repeat
the card's color, background, and border declarations for each theme, and
update all those copies whenever the treatment changes. With a mixin, the
shared recipe lives in one place and each card supplies its background:

```css
@mixin --surface(--background <color>) {
  @private {
    --outline-color: color-mix(in srgb, var(--background), black 20%);
  }

  color: white;
  background: var(--background);
  border: 1px solid var(--outline-color);
}

.card {
  @apply --surface(rebeccapurple);
}

.featured-card {
  @apply --surface(darkgreen);
}
```

Here the mixin supplies several related declarations from one reusable
definition. Its parameter provides the background color, while the private
custom property is an intermediate value used to compute the border. In the
model resolved for further specification work, `@private` is nested in a style
rule and provides lexically scoped local custom properties; those names are
hygienically rewritten so they do not collide with ordinary custom properties.
Changing the shared border treatment would update both card variants without
editing each call site. Authors remain responsible for checking text contrast
with any supplied background.

Mixins can also reuse conditional styles. For example, a centered layout could
start with a flex fallback and switch to grid where it is supported, without
repeating both branches for each component:

```css
@mixin --center-content {
  display: flex;
  align-items: center;
  justify-content: center;

  @supports (display: grid) {
    display: grid;
    place-items: center;
  }
}

.dialog { @apply --center-content; }
.empty-state { @apply --center-content; }
```

These examples illustrate the design direction, not a guarantee that every
detail of the syntax or processing model is final. In particular, mixins do not
use an `@result` block: the rest of the mixin body is its emitted result. The
CSSWG also resolved to keep a single `@mixin` concept rather than a separate
`@macro` construct.

This is different from a custom function, which computes a CSS value for use
inside a property value. A mixin operates at the style-rule level and can
provide multiple declarations and nested CSS rules. It can therefore express
reusable styling that a single custom property cannot; unlike a preprocessor,
it is intended to work in the browser's CSS environment rather than only
produce static output during a build.

## Alternatives considered

* **Repeat the declarations or share classes.** This works today with no new
  CSS feature, but repeated declarations must be updated in every copy.
  Shared classes can reuse fixed styles, though passing a value to a recipe
  or reusing nested rules in different selectors is less direct.
* **Use custom properties or custom functions.** These are useful for sharing
  individual values and calculations. They do not, on their own, insert a
  group of declarations and nested rules at an application site.
* **Use Sass, Less, or another preprocessor.** These already provide mixins,
  but require a build step and expand their output before the browser can
  resolve the cascade and other runtime CSS conditions.
* **Keep separate `@macro` and `@mixin` rules or require `@result`.** Those
  earlier designs distinguished forms of reuse or explicitly marked the
  output block. The [CSSWG design discussion](https://github.com/w3c/csswg-drafts/issues/14243)
  instead favored one author-facing construct, with `@private` marking only
  the local values and the remaining body supplying the styles.

## Accessibility, internationalization, privacy, and security

Mixins can help keep accessibility-related styles consistent, but they do not
enforce contrast, focus visibility, or other accessibility requirements. They
do not introduce new language-specific syntax for content, but reusable styles
must still work for different writing modes and text sizes. This proposal is
not intended to expose new user data or grant access to resources outside
CSS's existing styling model. Privacy and security implications of the final
lookup, scoping, and evaluation rules, as well as runtime cost, need assessment
as those rules are specified. No completed impact assessment or interop
conclusion is claimed here.

## Resolved design choices

The CSSWG discussed CSS mixins in 2025 and continued design work at its August
2026 face-to-face meeting. The August resolutions establish a direction for
`@private`, removal of `@result`, and using `@mixin` instead of `@macro`; they
do not mean those changes are already incorporated into the Editor's Draft.
See the [design convergence issue](https://github.com/w3c/csswg-drafts/issues/14243)
and these decisions:

* [Lexically scoped locals and `@private`](https://github.com/w3c/csswg-drafts/issues/14004)
* [Using the mixin body as the result](https://github.com/w3c/csswg-drafts/issues/13524)
* [One `@mixin` concept, not `@macro`](https://github.com/w3c/csswg-drafts/issues/13680)
* [Dropping the earlier scoped-rule restriction on mixins](https://github.com/w3c/csswg-drafts/issues/13727)
* [`!important` is invalid in function bodies, function and mixin arguments,
  and `@private` blocks](https://github.com/w3c/csswg-drafts/issues/14212)

## Remaining questions and status

Details of [how arguments and local values resolve on elements](https://github.com/w3c/csswg-drafts/issues/13454)
remain under discussion, as does [mixin lookup across shadow trees](https://github.com/w3c/csswg-drafts/issues/12671).
These are not settled by the authoring-model decisions above.

The feature is tracked in [ChromeStatus](https://chromestatus.com/feature/406935599)
and [Chromium](https://issues.chromium.org/issues/406935599). A
[TAG design-review request](https://github.com/w3ctag/design-reviews/issues/1290)
was opened on October 1, 2026. A review request is not an endorsement by the
TAG or a CSSWG resolution.

## References and acknowledgements

This proposal builds on Miriam Suzanne's [earlier work](https://css.oddbird.net/sasslike/mixins-functions/). Many thanks for starting this conversation and driving CSS forward. 

* [CSS Custom Functions and Mixins Editor's Draft](https://drafts.csswg.org/css-mixins/)
* [Miriam Suzanne's CSS mixins and functions explainer](https://css.oddbird.net/sasslike/mixins-functions/) (archived background; its earlier authoring examples predate the resolutions above)
* [CSSWG discussion, August 20, 2025](https://www.w3.org/2025/08/20-css-minutes.html)
* [CSSWG issue 5798: author use cases and interest](https://github.com/w3c/csswg-drafts/issues/5798)
