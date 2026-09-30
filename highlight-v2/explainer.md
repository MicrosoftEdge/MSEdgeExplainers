# Custom Highlight API Extensions

## Authors:

- [Kevin Babbitt](https://github.com/kbabbitt) (Microsoft)

## Participate
- [Issue tracker]
- [Discussion forum]

## Table of Contents [if the explainer is longer than one printed page]

[You can generate a Table of Contents for markdown documents using a tool like [doctoc](https://github.com/thlorenz/doctoc).]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
  - [Goals [or Motivating Use Cases, or Scenarios]](#goals-or-motivating-use-cases-or-scenarios)
- [Proposed Approach](#proposed-approach)
  - [CSS Animations and Transitions](#css-animations-and-transitions)
  - [Per-range highlight styles](#per-range-highlight-styles)
  - [Opacity](#opacity)
  - [Imnplementing a staggered fade animation](#imnplementing-a-staggered-fade-animation)
- [Alternatives considered](#alternatives-considered)
  - [CSS Text Transitions](#css-text-transitions)
    - [Pros](#pros)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection)
  - [`::nth-letter()` and `::nth-word()` pseudo-elements](#nth-letter-and-nth-word-pseudo-elements)
    - [Pros](#pros-1)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-1)
  - [Driving staggered highlight fades through JavaScript](#driving-staggered-highlight-fades-through-javascript)
    - [Pros](#pros-2)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-2)
  - [One ::highlight() rule per animation offset](#one-highlight-rule-per-animation-offset)
    - [Pros](#pros-3)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-3)
  - [Extending `AbstractRange` with an inline `style` property](#extending-abstractrange-with-an-inline-style-property)
    - [Pros](#pros-4)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-4)
  - [Compositing `color` animations](#compositing-color-animations)
    - [Pros](#pros-5)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-5)
    - [Reason for rejection](#reason-for-rejection)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
- [References & acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

<!--
[The "executive summary" or "abstract".
Explain in a few sentences what the goals of the project are,
and a brief overview of how the solution works.
This should be no more than 1-2 paragraphs.]
-->

## User-Facing Problem

<!--
[What is the **end-user need** which this project aims to address?]
-->

### Goals [or Motivating Use Cases, or Scenarios]

<!--
- [A bulleted list of goals can help with comparing proposed solutions.]
-->

<!--
### Non-goals

[If there are "adjacent" goals which may appear to be in scope but aren't,
enumerate them here. This section may be fleshed out as your design progresses and you encounter necessary technical and other trade-offs.]
-->

<!--
## User research

[If any user research has been conducted to inform the design choices presented,
discuss the process and findings.
We strongly encourage that API designers consider conducting user research to
verify that their designs meet user needs and iterate on them,
though we understand this is not always feasible.]
-->

## Proposed Approach

We propose three enhancements to the Custom Highlight API:

1. CSS Animations and Transitions on highlight ranges.
1. Per-range styles to allow for minor variations on a given `::highlight()` rule.
1. Opacity support on highlight ranges.

### CSS Animations and Transitions

### Per-range highlight styles

A staggered text fade requires each successive word to start its animation
slightly later than the preceding word. This is technically achievable with
custom highlights today, but in ways that are poorly suited to the scenario.
Existing techniques are discussed in the "Alternatives Considered" section.

Staggering animation effects that work on a per-element basis can take advantage
of each element's inline style to achieve this effect. We propose a capability
for highlight ranges that is similar in spirit.

### Opacity

To take advantage of compositor support in modern engines, staggering animation
effects that work on a per-element basis use the `opacity` property, rather than
animating `color` from `transparent` to the desired value. Using `opacity` for
these animations also extends naturally to including non-text elements such
as images in the animation.

Trading away compositor support would curtail or even outweigh the performance
benefits of avoiding DOM manipulation in a highlight-based animation. We therefore
propose allowing `opacity` to apply to highlights.

Applying `opacity` to a highlight necessarily needs to behave differently both from
`opacity` applied to an element, and from other properties applied to a highlight:
* When applied to an element, `opacity` creates a stacking context, which influences layout.
  By contrast, highlight effects are applied post-layout.
* The currenet painting model for highlights calls for a certain degree of interleaving
  or mixing effects when highlights with different styles overlap. By contrast, composited
  opacity animations require lifting the affected content into its own layer, which can change
  the stacking order of effects across overlapping highlights.

<!--
### Dependencies on non-stable features

[If your proposed solution depends on any other features that haven't been either implemented by
multiple browser engines or adopted by a standards working group (that is, not just a W3C community
group), list them here.]
-->

### Imnplementing a staggered fade animation

```js
// Provide example code - not IDL - demonstrating the design of the feature.

// If this API can be used on its own to address a user need,
// link it back to one of the scenarios in the goals section.

// If you need to show how to get the feature set up
// (initialized, or using permissions, etc.), include that too.
```

<!--
### Solving [goal 2] with this approach

[If some goals require a suite of interacting APIs, show how they work together to achieve the goals.]

[etc.]
-->

## Alternatives considered

### CSS Text Transitions

A previous [proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/CSSTextTransitions/explainer.md)
contemplated four new CSS properties:

```css
transition-text-interval: <time [0s,∞]>#
transition-text-unit: [ none | character | word | line ]#
animation-text-interval: <time [0s,∞]>#
animation-text-unit: [ none | character | word | line ]#
```

#### Pros

* Frees authors from having to think about how to split text.
* Doing text splitting in the engine is faster than manipulating ranges in JavaScript.
* Minimal new API surface.

#### Cons / Reasons for rejection

* Does not generalize well beyond the staggered text animation scenario.
* Loses representability of intermediate values.

### `::nth-letter()` and `::nth-word()` pseudo-elements

Another previous investigation contemplated introducing `::nth-letter()`
and `::nth-word()` pseudo-element selectors. These selectors have a
[long history](https://github.com/w3c/csswg-drafts/issues/3208)
of being requested additions to CSS but come with their own
complicating factors.

#### Pros

* Frees authors from having to think about how to split text.
* Doing text splitting in the engine is faster than manipulating ranges in JavaScript.
* In contrast to Text Transitions, generalizes to non-animation scenarios.

#### Cons / Reasons for rejection

* Even though [UAX-29](https://www.unicode.org/reports/tr29/tr29-47.html) gives us *a*
  standardized way to split text on letter and word boundaries, it is not clear that
  this way is sufficiently universal across use cases to bake it into pseudo-elements.
  For example, different use cases might want to handle adjacent whitespace or punctuation
  differently.
* The same scenario may want to split different languages on different text units. For example,
  a text fade stagger might want to split English text per-word and Japanese text per-phrase.
  Tying the choice of text unit to the selector complicates the CSS that needs to be shipped,
  especially when languages are mixed on the same page.
* Does not provide a clear way to assign per-letter or per-word stagger intervals that's better
  than having lots of `::nth-word()` rules. Words can cross element boundaries, so these
  pseudo-elements cannot be made tree-abiding, which rules out the use of CSS counters.

### Driving staggered highlight fades through JavaScript

Instead of assigning per-range delays, authors could run a JavaScript loop. Once every `n`
milliseconds, where `n` is the desired stagger interval, the next range would have the desired
highlight (including animation effect) applied.

#### Pros

* Reduces need for new API surface.

#### Cons / Reasons for rejection

* Stagger animation updates are tied to the main thread event loop. Implementations frequently cap
  this loop at their own refresh cadence, such as 60 times a second (once every 16.7 ms).
  This limits the effects authors can achieve; one use case that was examined was written for
  a stagger interval of once every 6 ms, which could not be faithfully reproduced on a 16.7 ms
  refresh timer. Competing work on the main thread could also introduce jank.

### One ::highlight() rule per animation offset

Instead of assigning per-range delays, authors could specify each successive delay in its
own `::highlight()` rule.

#### Pros

* Reduces need for new API surface.

#### Cons / Reasons for rejection

* The number of text units participating in a stagger animation can be arbitrarily long.
  Assigning a unique offset per text unit for `n` text units requires maintaining `n`
  unique `::highlight()` rules. There are two ways to do this, neither of which is good:
  * Ensure a sufficient number of rules are present at the outset, which causes stylesheet bloat; or
  * Dynamically generate and add rules via CSSOM, which can cause large style recalculations to occur.

### Extending `AbstractRange` with an inline `style` property

#### Pros

* [List]

#### Cons / Reasons for rejection

* [List]

### Compositing `color` animations

#### Pros

* Avoids inconsistencies in how stacked highlights are painted when opacity is applied,
  compared to when it's not present.

#### Cons / Reasons for rejection

* Does not integrate as cleanly with non-text content that participates in a staggered fade.
  An image or other replaced element, for example, would still need to animate in using `opacity`,
  so authors would need to maintain two sets of keyframes - one for `color` and one for `opacity` -
  and assign each appropriately depending on type of unit being animated in.

* On current graphics platforms, compositing the `color` property is also less efficient than
  compsiting `opacity`. The former requires a native paint worklet running in the engine,
  whereas the latter  can be offloaded entirely to the graphics API.

#### Reason for rejection

[You may not have decided about some alternatives.
Describe them as open questions here, and adjust the description once you make a decision.]

## Accessibility, Internationalization, Privacy, and Security Considerations

As with any animation effect, user preferences expressed via `prefers-reduced-motion`
should be respected.

As with any opacity effect, user contrast preferences expressed via `prefers-contrast`
or enabling Forced Colors Mode should be respected.

In contrast to other solutions explored in this space, this approach leaves the decision
of how to segment text in the author's hands. For word-by-word animations or similar effects,
authors are encouraged to use a standards-backed splitting algorithm such as the one
exposed by `Intl.Segmenter`.

<!--
## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

- [Implementor A] : Positive
- [Stakeholder B] : No signals
- [Implementor C] : Negative

[If appropriate, explain the reasons given by other implementors for their concerns.]
-->

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- Dan Clark
- Elika Etemad
- Emilio Cobos Álvarez
- Fernando Fiori

<!--
Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [Framework 1]
- [Project 2]
- [Proposal 3]
- [etc.]
-->