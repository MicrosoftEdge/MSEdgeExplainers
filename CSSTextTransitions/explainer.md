# CSS Text Transitions & Animations

## Author

- [Kevin Babbitt](https://github.com/kbabbitt) (Microsoft)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues)
- [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CSS Text Transitions \& Animations](#css-text-transitions--animations)
  - [Author](#author)
  - [Participate](#participate)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [User-Facing Problem](#user-facing-problem)
    - [Goals](#goals)
  - [Proposed Approach](#proposed-approach)
    - [Scenario 1: Flowing in text](#scenario-1-flowing-in-text)
  - [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

This explainer proposes new CSS properties to allow for transitions and
animations to be applied progressively to units of text (such as words) within a
given element.

## User-Facing Problem

AI Chat interfaces have adopted animation effects to introduce response text. An
example is to apply staggered fade-ins to each successive word, so that the text
flows in smoothly at a steady rate.

<img src="images/text-stream.gif">

One challenge with such an approach is that the unit of currency for animations
on the Web is the element. Effects such as the one depicted above require
authors to split each word into its own element, such as a `<span>`, and apply
effects individually to each such element. Doing so introduces considerable
overhead into the DOM, style calculation, and layout, compared to having simple
paragraphs of text.

Additionally, it puts the requirement on Web authors to perform the text
splitting. JavaScript `string.split()` can work when the desired unit is the
word, and packages such as
[GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/) do exist to
stagger animations on character, word, or line units. But the browser engine
needs to do these things anyway to perform layout, so there's an opportunity to
reuse that logic for animation purposes.

### Goals

- Provide a means of animating text at sub-element units.

<!--
### Non-goals

[If there are "adjacent" goals which may appear to be in scope but aren't,
enumerate them here. This section may be fleshed out as your design progresses and you encounter necessary technical and other trade-offs.]

[[None yet.]]
-->

<!--
## User research

[If any user research has been conducted to inform the design choices presented,
discuss the process and findings.
We strongly encourage that API designers consider conducting user research to
verify that their designs meet user needs and iterate on them,
though we understand this is not always feasible.]

[[TBD; we need to validate this approach with interested partners.]]
-->

## Proposed Approach

We introduce 4 new CSS properties:

```
transition-text-interval: <time [0s,∞]>#
transition-text-unit: [ none | character | word | line ]#
animation-text-interval: <time [0s,∞]>#
animation-text-unit: [ none | character | word | line ]#
```

These properties take lists of values to integrate with existing support for
animating multiple properties in CSS Transitions and Animations. They follow the
same list behaviors as `transition-duration`, `transition-delay`,
`transition-timing-function`, etc.

<!--
### Dependencies on non-stable features

[If your proposed solution depends on any other features that haven't been either implemented by
multiple browser engines or adopted by a standards working group (that is, not just a W3C community
group), list them here.]

[[No such dependencies.]]
-->

### Scenario 1: Flowing in text

Authors could achieve a flow-in animation as follows:

```html
<style>
  .fade-in-text {
    opacity: 1;
    transition: opacity 600ms;
    transition-text-interval: 6ms;
  }
  @starting-style {
    .fade-in-text {
      opacity: 0;
    }
  }
</style>
<!-- ... -->
<p class="fade-in-text">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
  nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
  eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
  in culpa qui officia deserunt mollit anim id est laborum.
</p>
```

<!--
### Solving [goal 2] with this approach

[If some goals require a suite of interacting APIs, show how they work together to achieve the goals.]

[etc.]
-->

<!--
## Alternatives considered

[This should include as many alternatives as you can,
from high level architectural decisions down to alternative naming choices.]

### [Alternative 1]

[Describe an alternative which was considered,
and why you decided against it.
This alternative may have been part of a prior proposal in the same area,
or it may be new.
If you did any research in making this decision, discuss it here.]

### [Alternative 2]

[You may not have decided about some alternatives.
Describe them as open questions here, and adjust the description once you make a decision.]

### [Alternative 3]

[etc.]

[[TBD.]]
-->

## Accessibility, Internationalization, Privacy, and Security Considerations

Accessibility: On some platforms, users may express preferences for reduced
animation effects. In CSS, this preference may be exposed via the
`prefers-reduced-motion` media feature. Authors may use this media feature to
adjust their animation effects accordingly.

No internationalization, privacy, or security implications have been reported
against this feature.

<!--
## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

- [Implementor A] : Positive
- [Stakeholder B] : No signals
- [Implementor C] : Negative

[If appropriate, explain the reasons given by other implementors for their concerns.]

[[TBD.]]
-->

<!--
## References & acknowledgements

[Your design will change and be informed by many people; acknowledge them in an ongoing way! It helps build community and, as we only get by through the contributions of many, is only fair.]

[Unless you have a specific reason not to, these should be in alphabetical order.]

Many thanks for valuable feedback and advice from:

- [Person 1]
- [Person 2]
- [etc.]

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [Framework 1]
- [Project 2]
- [Proposal 3]
- [etc.]

[[TBD.]]
-->
