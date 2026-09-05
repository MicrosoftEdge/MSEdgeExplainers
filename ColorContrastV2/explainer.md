# CSS Contrast Color Expansion

## Authors:

- [Diego Gonzalez](https://github.com/diekus)
- [Adam Argyle](https://observablehq.com/@argyleink) (Author of the original proposal)

## Participate
- [Issue tracker]
- [Discussion forum]

## Table of Contents [if the explainer is longer than one printed page]

[You can generate a Table of Contents for markdown documents using a tool like [doctoc](https://github.com/thlorenz/doctoc).]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

CSS Color [Module Level 5](https://www.w3.org/TR/css-color-5/) introduces new features and among them is the [`contrast-color`](https://www.w3.org/TR/css-color-5/#contrast-color) functions. This feature returns a `<color>` of either `white` or `black` depending which has better contrast with the color input as a parameter.

While this is useful for dynamic theming, real world use cases often require more complex color combinations than only `black` and `white`.

This explainer proposes to expand the `contrast-color` function to add advanced color contrast testing.

## User-Facing Problem

The importance of contrast in web content readability cannot be overstated. With more web applications relying on some sort of smart or dynamic theming, ensuring readability of said content is paramount to making sure the content remains accessible to everyone, including users with visual impairments or color blindness. 

### Goals

1. Expand `contrast-color` function to more colors other than `white`/`black`.
2. Enable specifying a role for the consulted color (`background` or `foreground`). 
3. Allow a set of options for the contrast color function to choose from.
4. Offer more contrast algorithms options to developers, including setting a custom contrast ratio. 

### Non-goals

- 

### Use Cases

The goals stated above allow developers to have a deeper control over contrast in the content, maximising copy readability, and enabling richer, more accessible color palettes that follow brand guidelines with fewer code. These are some resulting use cases:

- Maximise readability for copy with custom colors.
- Smart/dynamic theming in web applications that output adaptive colors for body copy, links and UI elements.
- Making sure that pseudoelements like `::selection` and `::cue` have accessible color contrast.
- UX elements like profile avatars, chips, badges, tags, complying with good contrast.

## Proposed Approach

The proposed solution is expanding the [`contrast-color`](https://www.w3.org/TR/css-color-5/#contrast-color) function to accept more parameters that allow to customise its behavior.

The proposed syntax is as follows:

```css
contrast-color() = contrast-color(<color-role>? <color> / <contrast-target> <contrast-algorithm> <color>#{2,})
```
With these being the available parameters:

- `<color-role>`: `background` or  `foreground`. Specifies the role of the base, known color. It is also necessary for some contrst algorithms.
- `<color>`: The base color that an author is looking to contrast against.
- `<contrast-algorithm>`: Which contrast calculation method to use (`auto`, `wcap`, `lstar`, `apca`, `weber` or `michelson`). 
- `<contrast-target>`: Follows the `prefers-contrast` media query syntax.  (`auto` | `max` | `more` | `less` | `<custom-contrast-target>`). More, less and no-preference (auto) correlate with user preferences. Max is introduced to return black or white.
- `<custom-contrast-target>`: the desired contrast target ratio or a percentage. This ratio will fail or pass depending on the used algorithm to calculate contrast. Is is only used when the `<custom-contrast-target>` is set.

> The original proposal shows a [dynamic example](https://observablehq.com/@argyleink/contrast-color#cell-0) of these parameters in play.  

### Solving expanding the contrast function to more colors other than `black`/`white`, and including an optional list of colors

If a developer wanted to test contrast between a list of colors over a blue background, to make sure the copy remains as readable as possible, they would use the following code:

```css
body {
    background: blue;
    color: contrast-color(blue gold, orange, yellow);
}
```

With all the other default parameters this would return the color `gold`/`lch(87.468% 86.602 88.075)`.

### Solving adding a role for the base color and more contrast algorithms

Inclussion of different contrast algorithms (like APCA) require the distinction of foreground and background colors to enhance the results.

```css
p {
  color: blue;
  background: contrast-color(foreground blue / apca gold, orange, yellow);
}
```
With `blue` as the base color specified for the foreground, the `contrast-color` function would return `yellow`/`lch(97.607% 94.712 99.572)` as the background color using the specified APCA algorithm.

If the developer chooses to tweak the options to include a contrast target of `less`, then the resulting color is `gold`/`lch(87.468% 86.602 88.075)` instead. The corresponding snippet is written below:

```css
background: contrast-color(foreground blue / less apca gold, orange, yellow);
```

### Dynamic theming and contrasting UX elements

Given a design token background color, choose from 3 design system color tokens that best matches the user's preference.

```css
div {
  color: contrast-color(var(--surface-bg) /
    var(--text-1), var(--text-2), var(--text-3)
  );
}
```
Similarly, for UX elements and pseudoelements like `::selection` and `::cue`, using the contrast target `max` to force the result to be `black` or `white`. 

```css
::selection {
  color: contrast-color(var(--highlight) / max);
}

::cue {
  color: contrast-color(var(--cue-bg) / max);
}
```

## Alternatives considered

The color contrast is not new, following is the list of alternatives that have existed or have been considered to solve this. 

### The CSS `color-contrast` function

In 2021 Webkit included a [`color-contrast` function](https://trac.webkit.org/changeset/273683/webkit/) that allowed developers to pass as a parameter a list of color candidates to choose from. 

### Using custom colors with `contrast-color()` and `if()`

Dave Rupert has a [workaround for using custom colors](https://daverupert.com/2026/01/contrast-color-with-custom-design-tokens/) (from a design system) together with the CSS `contrast-color()` function. This relies on the [`if()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/if) function and uses Lea Verou's `--contrast-color()` workaround, and lets the developer select the correct branded text color from a design system based on button background contrast. 

The technique computes a lightness‑based black-or-white reference color, stores it in a typed custom property (`--captured-color` registered as `<color>`), and then compares that value inside an inline `if()` style query to choose between your design system’s text color tokens. This produces contrast‑appropriate, brand‑consistent text colors using only today’s vanilla CSS.

Unfortunately  browsers don’t yet support `contrast-color()` and `if()` together.

## Accessibility, Internationalization, Privacy, and Security Considerations

[Highlight any accessibility, internationalization, privacy, and security implications
that have been taken into account during the design process.]

## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

- [Implementor A] : Positive
- [Stakeholder B] : No signals
- [Implementor C] : Negative

[If appropriate, explain the reasons given by other implementors for their concerns.]

## References & acknowledgements

This work is based on a proposal made by Adam Argyle, you can see the [initial draft here](https://observablehq.com/@argyleink/contrast-color).

Many thanks for valuable feedback and advice from:

- Dave Rupert

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [CSS contrast-color() Proposal Explorer](https://observablehq.com/@argyleink/contrast-color) by Adam Argyle
- [Using your design system colors with contrast-color()](https://daverupert.com/2026/01/contrast-color-with-custom-design-tokens/) by Dave Rupert
- [On compliance vs readability: Generating text colors with CSS](https://lea.verou.me/blog/2024/contrast-color/) by Lea Verou