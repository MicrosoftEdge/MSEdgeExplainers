# preserve-parent-color Explainer 

`preserve-parent-color` is a new value for the
[`forced-color-adjust`](https://www.w3.org/TR/css-color-adjust-1) CSS property.

## Motivation 

`forced-color-adjust` is a CSS property that allows developers to
opt out of Forced Colors Mode.

Previously, there were two supported values: `auto` and `none`, which can be
used to control whether or not an element's styles are adjusted by the UA in
Forced Colors Mode.

We introduce a third value, `preserve-parent-color`, that provides similar
behavior to `none`, except it also allows an element to inherit its parent's
used `color` value. In other words, `preserve-parent-color` provides the ability
for an element to inherit its parent's Forced Colors Mode adjusted `color`
value.

```
<style>
  body {
    background-color: #293472;
    color: #cedbe3;
  }
  
  .icon {
    color: currentColor;
  }
</style>
<body>
  <svg class="icon">[SVG stuff]</svg>
  <span>Contoso Closet</span>
</body>
```

![Figure 1: Forced Colors Mode off (top) vs. Expected behavior, Forced Colors
Mode on (middle) vs. Current behavior, Forced Colors Mode on
(bottom)](preserve-parent-color-example.png) 

The intention of `preserve-parent-color` is to get a reasonable behavior for SVG
icons that utilize `currentColor` when styling `fill` or `stroke` in Forced
Colors Mode, as described in [this
thread](https://github.com/w3c/csswg-drafts/issues/6310).

The use of `currentColor` when styling an SVG icon is a common pattern used by
authors to ensure an accessible experience in Forced Colors Mode. An author
would expect the logo to automatically adjust to use the `CanvasText` system
color for `fill` and `stroke` in Forced Colors Mode, as a result of setting each
to `currentColor`, as illustrated in Figure 1.

This behavior, however, became broken when we moved from [forcing colors at
computed value time to used value
time](https://github.com/w3c/csswg-drafts/issues/4915). Instead of inheriting
`CanvasText`, as before, the logo would inherit the computed `color` value of
its parent, as in Figure 1, resulting in a logo that is no longer cohesive in
Forced Colors Mode.

The new `preserve-parent-color` value was added to address this common SVG use
case. By changing the default value of `forced-color-adjust` for SVGs from
`none` to `preserve-parent-color`, SVG icons that make use of `currentColor`
will now inherit the used `color` value of its parent, as expected.

## Current Design 

`forced-color-adjust` supports three values:
  - `auto`: adjust the element's style by the UA in Forced Colors Mode
  - `none`: do not adjust the element's style by the UA in Forced Colors Mode
  - `preserve-parent-color`: if the `color` property inherit from its parent,
    compute to the used color of the parent's `color` value in Forced Colors
Mode.

Although this property will parse correctly in all operating systems, it will
only have a visible effect on Windows 7+, as Forced Colors Mode is only
available on these systems.
