# ElementInternals.type

## Authors:

- [Sanket Joshi](https://github.com/sanketj)
- [Alex Keng](https://github.com/alexkeng)

## Participate
  - [OpenUI issue tracking initial discussions and WHATWG resolution to accept `elementInternals.type = 'button'`](https://github.com/openui/open-ui/issues/1088)

## Introduction

Web component authors often seek to create custom elements that inherit the behaviors and properties of native HTML elements (ie. customized built-in elements). This allows them to leverage the built-in functionality of standard elements while extending their capabilities to meet specific needs. Some of the use cases enabled by customized built-ins are listed below.

- Custom buttons can provide unique styles and additional functionality, such as split or toggle button semantics, while still maintaining [native button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-button) behavior such as being a [popover invoker](https://html.spec.whatwg.org/multipage/popover.html#popoverinvokerelement).
- Custom buttons can extend native [submit button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-submit) behavior so that the custom button can implicitly [submit forms](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-submit) when activated. Similarly, custom buttons that extend native [reset button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-reset) behavior can implicitly [reset forms](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-reset) when activated.
- Custom labels can provide additional functionality, such as tooltips and icons, while still supporting associations with [labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label) via the `for` attribute.

### Goals

- [A bulleted list of goals can help with comparing proposed solutions.]

### Non-goals

[If there are "adjacent" goals which may appear to be in scope but aren't,
enumerate them here. This section may be fleshed out as your design progresses and you encounter necessary technical and other trade-offs.]

## Proposed Approach

[Explain the proposed solution or approach to addressing the identified problem.
Do not include WebIDL in this section.
Show example code using your approach.]

[Where necessary, provide links to longer explanations of the relevant pre-existing concepts and API.
If there is no suitable external documentation, you might like to provide supplementary information as an appendix in this document, and provide an internal link where appropriate.]

[If this is already specced, link to the relevant section of the spec.]

[If spec work is in progress, link to the PR or draft of the spec.]

### Dependencies on non-stable features

[If your proposed solution depends on any other features that haven't been either implemented by
multiple browser engines or adopted by a standards working group (that is, not just a W3C community
group), list them here.]

### Solving [goal 1] with this approach

```js
// Provide example code - not IDL - demonstrating the design of the feature.

// If this API can be used on its own to address a user need,
// link it back to one of the scenarios in the goals section.

// If you need to show how to get the feature set up
// (initialized, or using permissions, etc.), include that too.
```

### Solving [goal 2] with this approach

[If some goals require a suite of interacting APIs, show how they work together to achieve the goals.]

[etc.]

## Alternatives considered

A partial solution for this problem already exists today. Authors can specify the `extends` option when [defining a custom element](https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-define). Authors can then use the `is` attribute to give a built-in element a custom name, thereby turning it into a customizable built-in element.

Both `extends` and `is` are supported in Firefox and Chromium-based browsers today. However, this solution does have limitations, such as not being able to attach shadow trees to (most) customizable built-in elements. Citing these limitations, Safari doesn't plan to support customizable built-ins in this way and have shared their objections here: https://github.com/WebKit/standards-positions/issues/97#issuecomment-1328880274. As such, `extends` and `is` are not on a path to full interoperability today.

The `elementInternals.type` proposal addresses many of the limitations with `extends`/`is`, including allowing customized built-ins to support shadow DOM. The proposal also has support from the WHATWG and members from multiple browser (including Safari) as noted by a WG resolution here: https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455.


## Accessibility, Privacy, and Security Considerations

[Highlight any accessibility, security, and privacy implications that have been taken into account
during the design process.]

## Stakeholder Feedback / Opposition

- Chromium : Positive
- WebKit : Positive based on https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455
- Gecko : No official signal, but no objections shared in the discussion here: https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455

[WHATWG resolution to accept `elementInternals.type = 'button'`](https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455)

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Chris Holt](https://github.com/chrisdholt)