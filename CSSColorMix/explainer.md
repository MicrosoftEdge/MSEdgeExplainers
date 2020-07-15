# CSS color-mix() function

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to
problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the
most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [CSSWG](https://drafts.csswg.org/)
* Current version: this document

## Introduction

Quoting from the [editor's draft](https://drafts.csswg.org/css-color-5/#intro):
> Web developers, design tools and design system developers often use color functions to assist in scaling the design of their component color relations. With the increasing
usage of design systems that support multiple platforms and multiple user preferences, like the increased capability of Dark Mode in UI, this becomes even more useful to not
need to manually set color, and to instead have a single source from which schemes are calculated.

> Currently Sass, calc() on HSL values, or PostCSS is used to do this. However, preprocessors are unable to work on dynamically adjusted colors; all current solutions are
restricted to the sRGB gamut and to the perceptual limitations of HSL (colors are bunched up in the color wheel, and two colors with visually different lightness, like yellow
and blue, can have the same HSL lightness).

## Goals

* Allow authors to blend colors directly in CSS, in color gamuts beyond sRGB and in dynamic scenarios.

## Use Cases

One example application of `color-mix()` is tinting. The css-color-5 spec also proposes `color-adjust()`, which can adjust the lightness of a color up or down. This is
analagous to adjusting the tint of a paint color by mixing it with a pure white or pure black paint. The `color-mix()` function provides greater flexibility, by allowing for
adjustment using colors other than pure white or pure black. Doing so can provide "warmth" or "coolness" to a color palette, as seen in
[this example](https://alistapart.com/article/mixing-color-for-the-web-with-sass/#section5) using Sass.

## Proposed Solution

Proposed syntax for `color-mix()` function is specified in [css-color-5](https://drafts.csswg.org/css-color-5/#color-mix). In brief:
- Two (or more) `<color>`s are accepted as input.
- The author selects a color space for mixing (defaults to lch if not specified, but this is predicated on support from the user agent).
- The author specifies the relative weights of each input color, on a channel-by-channel basis.

### Example 1: Tinting

This example tints the borders of two elements using off-white and off-black adjustments, in sRGB colorspace, to create a simple customized 3D effect:

``` html
<style>
:root {
  --tint-color: rgb(242, 234, 138);
  --shade-color: rgb(54, 52, 31);
}
.first {
  --base-color: rgb(134, 146, 191);
}
.second {
  --base-color: rgb(191, 134, 134);
}
.square {
  width: 50px;
  height: 50px;
  border: 25px solid;
  display: inline-block;
  margin: 5px;
  background-color: var(--base-color);
  --highlight-color: color-mix(var(--base-color) var(--tint-color) 25% srgb);
  --shadow-color: color-mix(var(--base-color) var(--shade-color) 25% srgb);
  border-left-color: var(--highlight-color);
  border-top-color: var(--highlight-color);
  border-right-color: var(--shadow-color);
  border-bottom-color: var(--shadow-color);
}
</style>
<div class="first square"></div>
<div class="second square"></div>
```

Here's what the custom tinted output looks like:

![Rendered markup of squares tinted with color-mix](color-mix-squares.png)

Contrast with adjustment using pure white and black:

![Rendered markup of squares tinted with pure white and black](pure-tint-squares.png)

### Example 2: Dynamic tinting

This example uses a CSS Animation that adjusts the tint color to generate a "sunrise" effect.

``` html
<script>
  window.CSS.registerProperty({
  name: '--sun-color',
  syntax: '<color>',
  inherits: true,
  initialValue: 'rgb(0, 0, 0)',
});
</script>
<style>
@keyframes sunrise {
  0% { --sun-color: rgb(0, 0, 0); }
  50% { --sun-color: rgb(255, 129, 0); }
  100% { --sun-color: rgb(255, 240, 232); }
}
.container {
  display: flex;
  align-items: center;
  font-size: 48px;
  --base-color: rgb(134, 146, 191);
  animation: sunrise 5s infinite linear;
}
.container div {
  margin: 5px;
}
.square {
  width: 100px;
  height: 100px;
}
.sun {
  background-color: var(--sun-color);
}
.sample {
  background-color: var(--base-color);
}
.result {
  background-color: color-mix(var(--base-color) var(--sun-color) 25% srgb);
}
</style>
<div class="container">
  <div class="sun square"></div>
  <div>+</div>
  <div class="sample square"></div>
  <div>=</div>
  <div class="result square"></div>
</div>
```

Here's the rendered result:

![Rendered markup of squares tinted with animated "sun" color](sunrise.gif)


## Privacy and Security Considerations

### Privacy

* Evaluating a `color-mix()` function may have a higher computational cost than using a directly specified color, especially if gamut conversions are required. Combining this
feature with `:visited` rules may allow for a timing attack that exposes the user's browsing history.

### Security

There are no known security impacts of this feature.
