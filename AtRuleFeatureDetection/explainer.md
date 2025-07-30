# At-Rule Feature Detection

## Authors:

- [Kevin Babbitt](https://github.com/kbabbitt) (Microsoft)

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/AtRuleFeatureDetection)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [At-Rule Feature Detection](#at-rule-feature-detection)
  - [Authors:](#authors)
  - [Participate](#participate)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [User-Facing Problem](#user-facing-problem)
    - [Goals](#goals)
    - [Non-goals](#non-goals)
  - [Proposed Approach](#proposed-approach)
    - [Detect whether an at-rule name is recognized at all](#detect-whether-an-at-rule-name-is-recognized-at-all)
    - [Detect whether an at-rule, with optional prelude and/or block, is supported](#detect-whether-an-at-rule-with-optional-prelude-andor-block-is-supported)
      - [Special case: The forgiving grammar of media queries](#special-case-the-forgiving-grammar-of-media-queries)
    - [Detect whether a given declaration is supported within an at-rule block](#detect-whether-a-given-declaration-is-supported-within-an-at-rule-block)
  - [Accessibility, Privacy, and Security Considerations](#accessibility-privacy-and-security-considerations)
  - [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
  - [References \& acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Feature detection is a [W3C TAG design principle](https://www.w3.org/TR/design-principles/#feature-detect)
and a tool that Web authors rely on for graceful degradation of their pages.

[CSS Conditional Rules](https://www.w3.org/TR/css-conditional/) introduces the `@supports` rule and API
extensions to allow authors to feature-detect CSS properties.
In this explainer, we describe an expansion to feature detection in CSS that allows authors to detect
support for at-rules, including specific features of at-rules.

## User-Facing Problem

There have been many scenarios described that call for feature detection of at-rules and sub-portions of at-rule grammar. Some examples:

- In the [Blink intent-to-ship thread for `@property`](https://groups.google.com/a/chromium.org/g/blink-dev/c/3ygpsew53a0/m/Ar_OPlthAwAJ), it was pointed out that authors need a mechanism to detect support so that they can fall back to `CSS.registerProperty()` if needed.
- A [StackOverflow question](https://stackoverflow.com/questions/44244221/is-it-possible-to-do-a-css-supports-check-on-a-media-rule) asks whether it is possible to detect support for `@media` features, for example to detect if the user agent can return a yes/no answer for `@media (pointer)`.
- A [Mastodon post](https://mastodon.social/@xro/113106213499516093) asks whether it is possible to test for style query support.
- At time of writing, several in-development CSS features propose to implement new at-rules. These include [`@sheet`](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AtSheet/explainer.md) as well as [CSS Functions and Mixins](https://css.oddbird.net/sasslike/mixins-functions/).

### Goals

Allow authors to feature-detect newly introduced at-rules.

Allow authors to feature-detect new enhancements to existing at-rules, such as:
- New media query features and other additions to at-rule preludes
- New descriptors that may be introduced to rules such as `@font-face`

At-rule feature detection should be available in all contexts where CSS allows conditioning based on support
of a feature. This includes, but is not limited to,
`@supports`, `CSS.supports()`, `@import ... supports()`, and `@when supports()`.

### Non-goals

The CSS `@charset` rule, despite its appearance, is
[not an at-rule](https://drafts.csswg.org/css-syntax/#charset-rule).
Rather, `@charset` is a marker that can appear only as the first few bytes of a stylesheet file. It signals to
the user agent what character encoding should be used to decode the contents of the stylesheet.

CSS feature detection has, since its inception, relied on the test of "does it parse successfully?" to
answer the question of whether a property-value pair is supported. Because of its special nature, user agents
may have a different parsing implementation for `@charset` compared to true at-rules, which might not be as easily
reused for feature detection.

At the same time, there is far less of a use case for feature-detecting `@charset` compared to true at-rules.
`@charset` is part of the [Baseline](https://developer.mozilla.org/en-US/docs/Web/CSS/@charset) feature set long 
supported in all major browsers. On the modern Web, the encouraged solution for character encoding issues in 
CSS is to use UTF-8.

Accordingly, this explainer does not propose making `@charset` feature-detectable using `at-rule()`.

## Proposed Approach

The `at-rule()` function can be used for feature detection in the following ways:

### Detect whether an at-rule name is recognized at all

In its simplest form, the `at-rule()` function can be passed just an at-rule name.
The result is true if the implementation would recognize it as an at-rule in any context, false otherwise.
This form is useful for detecting entire new features implemented as at-rules, including features such as
[`@starting-style`](https://www.w3.org/TR/css-transitions-2/#defining-before-change-style)
that do not appear at top-level stylesheet context.

```css
/* Use reusable styles encapsulated in @sheet if supported. */
@import "reusable-styles.css" supports(at-rule(@sheet));

/* Fall back to tooling-expanded styles if not. */
@import "expanded-styles.css" supports(not(at-rule(@sheet)));

/* ... */

/* Set up a pop-in transition with @starting-style if it's supported. */
@supports at-rule(@starting-style) {
    .card {
        transition-property: opacity, transform;
        transition-duration: 0.5s;
        @starting-style {
            opacity: 0;
            transform: scale(0);
        }
    }
}
```

It may also be useful as a shorter alternative to the second form for feature-detecting at-rules that are only 
valid when nested inside another at-rule, such as
[`@swash`](https://www.w3.org/TR/css-fonts/#font-feature-values-syntax)
and other font feature value types within `@font-feature-values`.

```css
@supports at-rule(@swash) {
    @font-feature-values Foo {
        @swash { pretty: 1; cool: 2; }
    }
    p {
        font-family: Foo;
        font-variant-alternates: swash(cool);
    }
}
@supports not(at-rule(@swash)) {
    /* Fall back to something else. */
    @font-face FooButNotAsCool {
        /* ... */
    }
    p {
        font-family: FooButNotAsCool;
    }
}
```

However, authors should consider the possibility of such an at-rule later becoming valid in a new and different
context, which may result in a false positive. For example, one might write `@supports at-rule(@top-left)` 
intending to detect support for the `@top-left` rule nested within `@page`. But later, if a new feature comes 
along that implements a nested `@top-left` at-rule for a different purpose, the feature query would return true
on implementations that *do* support this new feature but *do not* support `@page`.

### Detect whether an at-rule, with optional prelude and/or block, is supported

This form resembles existing use of feature detection in CSS. An at-rule block, including optional prelude
and/or declaration block, is passed as the function parameter. If the at-rule block is accepted by the 
implementation *without relying on
[forgiving catch-all grammar](#special-case-the-forgiving-grammar-of-media-queries)*,
the support query returns true; otherwise it returns false.

This is useful for detecting new enhancements to existing at-rules. Often it is not necessary to pass the entire
at-rule that the author intends to use; an abbreviated subset can be "close enough" to make the right decision.

```css
/* Are style queries supported at all? */
@supports at-rule(@container style(color: green)) {
    /* Yes - use them to emphasize green cards. */
    @container style(color: green) and not style(background-color: red) {
        .card {
            font-weight: bold;
            transform: scale(2);
        }
    }
}
```

The parsing test is performed as if the given at-rule block were the first and only content in a stylesheet.
That allows for at-rules with positional requirements, such as `@import`, to be tested:

```css
/* Import styles into a named layer. */
/* If the implementation does not support layer(), this at-rule will be ignored. */
@import "layered-styles.css" layer(my-layer);

/* If the implementation does not support layers, fall back to unlayered styles. */
@import "unlayered-styles.css" supports(not(at-rule(@import "test.css" layer(test))));
```

#### Special case: The forgiving grammar of media queries

"Forgiving catch-all grammar" refers to cases where it would be undesirable for an entire at-rule to be 
thrown away just because a small part of it is unrecognized. One example is in media queries:

```css
@media (max-width: 800px and not(fancy-display)) {
    /* ... */
}
```

The implementation does not recognize the `fancy-display` media feature. But since the author is testing that
the page is *not* on a fancy display, we still want the rules within the `@media` block to apply. The media query
handles this by returning an "unknown" value for `fancy-display`, which gets treated as "false" for the purpose
of evaluating the query.

Suppose an author instead wants to condition part of their stylesheet on whether an implementation recognizes 
`fancy-display` *at all*. Implementations that recognize `fancy-display`, and implementations that don't, both 
must at least parse the above media query. If feature detection were determined purely based on whether the 
at-rule parses successfully, it would not be possible to feature-detect support for `fancy-display`. The 
exception we carve out allows us to handle this situation: Implementations that recognize `fancy-display` will 
parse that feature name on their "known media features" path, and implementations that don't recognize it will 
parse it on their "forgiving catch-all" path.

```css
/* This @supports query returns true if the implementation knows what a fancy-display is. */
@supports at-rule(@media (fancy-display)) {

    /* This @media query returns true if the user is actually using a fancy-display. */
    @media (max-width: 800px and fancy-display) {
        /* ... */
    }

    /* This @media query returns true if the user is detectably not using a fancy-display. */
    @media (max-width: 800px and not(fancy-display)) {
        /* ... */
    }
}
```

### Detect whether a given declaration is supported within an at-rule block

This form allows testing support for descriptors or property declarations within a given at-rule.
Given an at-rule name and a declaration, the support query returns true if the declaration parses within
the at-rule's block, false otherwise.

```css
@supports at-rule(@property; syntax: "<color>") {
    /* declare custom properties with color syntax */
}

@supports at-rule(@position-try; box-shadow: 0px 0px) {
    /* declare rules that set different box-shadow locations for different position-areas */
}
```

Such tests could also be accomplished with the previous form, but this form allows authors to omit the prelude
and/or required declarations that are not the subject of the test.
For example, the `@font-face` rule requires `font-family` and `src` descriptors.
An author who wants to feature detect support for `font-feature-settings` using the previous form would need
to supply dummy values for `font-family` and `src` in order for the test block to parse successfully.
The query would thus be quite verbose:

```css
/* Testing as a full at-rule using the previous form */
@supports at-rule(@font-face {font-family: test; src: local(test); font-feature-settings: "hwid"} ) {
    /* ... */
}
```

With this form, the author can simplify to:

```css
/* Simpler query using this form */
@supports at-rule(@font-face; font-feature-settings: "hwid") {
    /* ... */
}
```

## Accessibility, Privacy, and Security Considerations

No accessibility, privacy, or security considerations have been identified for this feature.

## Stakeholder Feedback / Opposition

Feedback from other implementors will be collected as part of the Blink launch process.

## References & acknowledgements

This explainer describes a feature which others have already put significant work into.
Many thanks for the efforts of:

- Fuqiao Xue, who brought the original feature request to the CSSWG in Issue [#2463](https://github.com/w3c/csswg-drafts/issues/2463).
- Tab Atkins-Bittner, who proposed expansion of the grammar in Issue [#6966](https://github.com/w3c/csswg-drafts/issues/6966).
- Steinar H. Gunderson, who implemented the behavior that the CSSWG resolved on in [#2463](https://github.com/w3c/csswg-drafts/issues/2463) in Chromium behind a feature flag.
- Anders Hartvoll Ruud, who raised important clarifying questions in Issues [#11116](https://github.com/w3c/csswg-drafts/issues/11116), [#11117](https://github.com/w3c/csswg-drafts/issues/11117), and [#11118](https://github.com/w3c/csswg-drafts/issues/11118).
