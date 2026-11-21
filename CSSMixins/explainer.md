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

The CSSWG's August 2026 resolutions on the mixin authoring model are being
worked into the design and its open issues.

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
* [References](#references-and-acknowledgements)

## Introduction

Stylesheets often repeat the same group of declarations across components:
button treatments, visually hidden patterns, layout recipes, and other
component styles. Sass, Less, and other preprocessors have long offered mixins
for defining and reusing such groups.

CSS custom properties reuse individual values, but cannot package declarations 
and nested rules. Preprocessor mixins expand before the browser knows the 
element and computed CSS values, so each variant must be generated ahead of time. 
Native mixins let the engine apply one reusable rule block in the cascade 
and conditional context of each application site, using that site’s 
values and custom properties without a preprocessing step.

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

Here the mixin supplies several related declarations from one reusable definition. Its parameter provides the background color, while the private custom property is an intermediate value used to compute the border. The specification defines @private as a way to create lexically scoped private custom properties within a style rule and its nested rules. References to their names are rewritten to unique private names, so they do not collide with same-named ordinary custom properties. Changing the shared border treatment would update both card variants without editing each call site. Authors remain responsible for checking text contrast with any supplied background.

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
  Shared classes can reuse fixed styles but aren't as easy to parameterize.
* **Use custom properties or custom functions.** These are useful for sharing
  individual values and calculations. They do not, on their own, insert a
  group of declarations and nested rules at an application site.
* **Use Sass, Less, or another preprocessor.** These already provide mixins,
  but require a build step and expand their output before the browser can
  resolve the cascade and other runtime CSS conditions.
* **Require a separate `@macro` rule for simple, unscoped reuse.** Earlier 
  models distinguished `@mixin` from `@macro`, even though authors would invoke 
  both with `@apply` for essentially the same purpose. Once mixins no longer 
  require special output wrapping, a separate construct adds a concept and 
  forces authors to choose between nearly identical forms. Keeping one `@mixin` 
  construct reduces that terminology and decision burden while covering both 
  fixed and parameterized reuse.
* **Put emitted styles inside an `@result` block.** A required `@result` 
  adds an extra nesting level that provides no information when the mixin 
  has no local values, and it separates computation from the nested styles 
  that consume it. Treating the body as the result makes the common case shorter 
  and preserves the natural shape of a CSS style rule. `@private` 
  marks only the exceptional declarations that are local.

The resolved model optimizes the common case and makes special behavior explicit: 
ordinary body contents are the emitted styles, 
while only private computation requires extra syntax.

## Accessibility, internationalization, privacy, and security

No specific accessibility, internationalization, privacy, 
or security concerns have been identified.

## References and acknowledgements

This proposal builds on Miriam Suzanne's [earlier work](https://css.oddbird.net/sasslike/mixins-functions/). Many thanks for starting this conversation and driving CSS forward. 

* [CSS Custom Functions and Mixins Editor's Draft](https://drafts.csswg.org/css-mixins/)
* [CSSWG discussion, August 20, 2025](https://www.w3.org/2025/08/20-css-minutes.html)
* [CSSWG issue 5798: author use cases and interest](https://github.com/w3c/csswg-drafts/issues/5798)
