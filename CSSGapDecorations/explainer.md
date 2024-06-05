# CSS Gap Decorations Level 1

## Authors

- [Kevin Babbitt](https://github.com/kbabbitt)

## Participate

- [Issue
  tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/CSSGapDecorations)

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

## Table of Contents

<!-- [You can generate a Table of Contents for markdown documents using a tool like [doctoc](https://github.com/thlorenz/doctoc).] -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CSS Gap Decorations Level 1](#css-gap-decorations-level-1)
  - [Authors](#authors)
  - [Participate](#participate)
  - [Status of this Document](#status-of-this-document)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
  - [User research](#user-research)
  - [Properties](#properties)
    - [Placement of gap decorations](#placement-of-gap-decorations)
      - [Grid](#grid)
      - [Flex, multi-column, and masonry](#flex-multi-column-and-masonry)
    - [Width, style, and color](#width-style-and-color)
    - [Extending or shortening gap decoration segments](#extending-or-shortening-gap-decoration-segments)
    - [Interaction with spanning items in grid](#interaction-with-spanning-items-in-grid)
    - [Logical properties for flex and masonry containers](#logical-properties-for-flex-and-masonry-containers)
    - [Paint order](#paint-order)
    - [Bi-directional shorthands](#bi-directional-shorthands)
  - [Key scenarios](#key-scenarios)
    - [Scenario 1: Horizontal lines between CSS grid rows](#scenario-1-horizontal-lines-between-css-grid-rows)
    - [Scenario 2: Lines dividing items in both directions of a grid](#scenario-2-lines-dividing-items-in-both-directions-of-a-grid)
    - [Scenario 3: Defining different lines for different gaps, applied to a sub-area of the grid](#scenario-3-defining-different-lines-for-different-gaps-applied-to-a-sub-area-of-the-grid)
    - [Scenario 4: Responsive Flex layout](#scenario-4-responsive-flex-layout)
    - [Scenario 5: Segmented gap decorations](#scenario-5-segmented-gap-decorations)
  - [Open questions](#open-questions)
  - [Considered alternatives](#considered-alternatives)
    - [Alternative 1: 2021 draft specification](#alternative-1-2021-draft-specification)
  - [References \& acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

CSS multi-column containers allow for
[rules](https://drafts.csswg.org/css-multicol-1/#cr) to be drawn between
columns. Applying similar styling to other container layouts such as grid and
flex has been widely sought after, as seen in the discussion for CSS Working
Group issue [2748](https://github.com/w3c/csswg-drafts/issues/2748) and in
several StackOverflow questions (
[[1]](https://stackoverflow.com/questions/45884630/css-grid-is-it-possible-to-apply-color-to-grid-gaps)
[[2]](https://stackoverflow.com/questions/59899641/is-it-possible-to-draw-all-css-grid-lines-as-dotted-borders-or-outlines-if-js-i)
[[3]](https://stackoverflow.com/questions/47882924/preventing-double-borders-in-css-grid)
[[4]](https://stackoverflow.com/questions/67479163/css-border-doubling-with-flex)
). Currently, developers seeking to draw such decorations must resort to
non-ergonomic workarounds such as these examples:

- https://www.smashingmagazine.com/2017/09/css-grid-gotchas-stumbling-blocks/#how-do-i-add-backgrounds-and-borders-to-grid-areas
- https://x.com/geddski/status/1004731709764534274

## Goals

* Extend CSS [column rule
  properties](https://drafts.csswg.org/css-multicol-1/#column-gaps-and-rules) to
  apply to grid, flex, and masonry in addition to multi-column containers.
* Introduce row-direction gap decorations on CSS grid, flex, and masonry
  containers.
* Allow gap decorations to vary over a given container to handle cases such as
  alternating row separators.

## Non-goals

* Gap decorations on CSS Tables. The [CSS Tables
  specification](https://drafts.csswg.org/css-tables-3/) is currently Not Ready
  for Implementation, and there are interoperability differences among engines.
  Additionally, authors can achieve many of the scenarios covered by this
  explainer in a table already using cell borders.
* Row-direction gap decorations on multi-column containers. This is
  theoretically feasible for cases where an element [spans across multiple
  columns](https://drafts.csswg.org/css-multicol-1/#spanning-columns), but
  currently [row gaps do not apply to multi-column
  containers](https://drafts.csswg.org/css-align-3/#gap-multicol), so there is
  nowhere to put such a decoration. Support for row-gap on multi-column
  containers was proposed in issue
  [6746](https://github.com/w3c/csswg-drafts/issues/6746); discussion in that
  issue also notes the potential for multi-column to gain block-direction
  overflow with a corresponding gap. This non-goal could become a goal if either
  of these ideas are adopted.
* Images in gap decorations. Compared to, say, border-image, gap decoration
  images need to cover significantly more cases such as T intersections. See
  [this
  comment](https://github.com/w3c/csswg-drafts/issues/5080#issuecomment-1526585163)
  for more detail. Further exploration is needed into the best way to handle
  these, so this scenario is left to a future level of the feature.

## User research

Use cases in this explainer were collected from the discussion in issue
[2748](https://github.com/w3c/csswg-drafts/issues/2748). Additional inspiration
was drawn from discussions in issues
[5080](https://github.com/w3c/csswg-drafts/issues/5080),
[6748](https://github.com/w3c/csswg-drafts/issues/6748), and
[9482](https://github.com/w3c/csswg-drafts/issues/9482).

## Properties

Unless otherwise noted, corresponding `row-` and `column-` properties should be
assumed to have identical syntax. Maintaining symmetry between `row-` and
`column-` properties is important for responsive flex and masonry scenarios.

For property grammar details, please see the [draft specification](draft-spec/index.html).

### Placement of gap decorations

These properties allow authors to specify where gap decorations start and end
within a container.

An author may specify more than one such region and apply a different set of gap
decorations to each. Within this document, we refer to such a region as a *gap
decoration area*. Much like CSS Transitions and Animations, all gap decoration
properties may take a comma-delimited list of values. Each entry in such a list
is applied to the corresponding entry in the list of gap decoration areas. If a
given property's list length is shorter than the gap decoration area list
length, the shorter list cycles back to the beginning as needed.

Gap decoration area properties are defined per container type.

#### Grid

In grid containers, the author may specify any grid line based placement, as in
[the 'grid-row-start', 'grid-row-end', 'grid-column-start', and
'grid-column-end'
properties](https://drafts.csswg.org/css-grid-2/#line-placement). The
corresponding width-style-color gap decoration tuples in the row and column
directions will apply in that area. The initial value is `1 / 1 / -1 / -1` to
cover the entire grid.

```css
.grid-multiple-decoration-areas {
  display: grid;
  grid-template-rows: [top] 30px [main-top] repeat(6, 30px) [bottom];
  grid-template-columns: [left] 100px [main-left] repeat(3, 100px) [right];
  grid-gap: 10px;
  grid-row-rule-area: left / top / main-left / bottom,
                      main-left / main-top / right / bottom;
  row-rule: 1px solid lightblue,
            1px solid black;
  grid-column-rule-area: main-left / top / main-left / bottom;
  column-rule: 1px solid lightblue;
}
```

<image src="images/example-multiple-areas.png">

#### Flex, multi-column, and masonry

Gap decoration area properties for these container types are not yet defined.

### Width, style, and color

In addition to replicating the existing column-rule properties in the row
direction, we expand the syntax of both sets of properties to allow for multiple
definitions. Authors may use familiar syntax from CSS Grid such as `repeat()`
and `auto` to create patterns of line definitions that apply within a given gap
decoration area. Note that while `repeat()` and `auto` are inspired by CSS Grid,
they may also be used to create patterns of decorations in flex, multi-column,
and masonry containers.

If the number of specified values (after expanding any repeats) in a given list
is less than the number of gaps in the corresponding direction in the gap
decoration area, the list cycles back to the beginning. This cycling applies
*within* a given gap decoration area, in contrast to the cycling described
previously which applies different sets of values to *multiple* gap decoration
areas. Having a second level of cycling preserves backward compatibility with
existing `column-rule` declarations that only specify single values, while also
enabling authors to specify simple alternating patterns.

Shorthands are also available to combine the width, style, and color properties.

```css
.alternate-red-blue {
  display: grid;
  grid-template: repeat(auto-fill, 30px) / repeat(3, 100px);
  grid-gap: 10px;
  row-rule: 1px solid;
  row-rule-color: red blue;
}
```
<image src="images/example-red-blue.png">

```css
.alternate-heavy-light {
  display: grid;
  grid-template: repeat(auto-fill, 30px) / repeat(3, 100px);
  grid-gap: 10px;
  row-rule: 2px solid black / 1px solid lightgray;
}
```
<image src="images/example-heavy-light.png">

Like column rules in multi-column layout, gap decorations in other layout
containers do not take up space and do not affect the layout of items in the
container. Conceptually, gap decorations are considered after layout has
completed, and in particular after we already know the full extent of the
[implicit grid](https://drafts.csswg.org/css-grid-2/#implicit-grid) in grid
layout, or the number of lines in flex layout, or the number of columns in
multi-column layout, or the number of tracks in masonry layout. Thus, the
`repeat()` grammar, while modeled after the `grid-template` properties, is
simpler for gap decorations as there are fewer unknowns to consider.

```css
.varying-widths {
  dispay: grid;
  grid-template: repeat(auto-fill, 30px) / repeat(3, 100px);
  row-gap: 9px;
  row-rule: 5px solid black / repeat(auto, 1px solid black) / 3px solid black;
}
.item {
  height: 30px;
  padding: 5px;
  border: 1px dotted lightgray;
}
```

<image src="images/example-width-style-color.png">

### Extending or shortening gap decoration segments

By default, gap decorations are painted as continuous segments that extend as
far as possible along the centerline of a given gap. The decoration is painted
from one gap T intersection to another, with both endpoints at the centers of
the T crossings and the decoration proceeding along the stems of both Ts. In
grid layout, row decorations are painted on top of column decorations by
default; changing this behavior is covered in a later section of this document.

```css
.grid-with-spans {
  display: grid;
  grid-template: repeat(4, 100px) / repeat(4, 100px);
  gap: 20px;
  row-rule: 6px solid red;
  column-rule: 6px solid blue;
}
```

<image src="images/example-grid-with-spans.png">

```css
.flex {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  width: 500px;
  row-rule: 6px solid red;
  column-rule: 6px solid blue;
}
```
<image src="images/example-flex.png">

Authors may specify that decorations are instead segmented between all gap
intersections. In such cases, each segment starts at the edge of a given gap
intersection and proceeds to the edge of the next gap intersection. The
endpoints may be offset from those endpoints using the segment outset
properties.

```css
row-rule-outset: [ <length-percentage> | join ]#
column-rule-outset: [ <length-percentage> | join ]#
```

The initial value is `join` which "joins together" segments to give the default
"T intersections" behavior. Any other value gives the "all intersections"
behavior. Positive values extend into the neighboring intersection; negative
values recede from it. The percentage basis is the width of the gap in the
perpendicular direction. These offsets also apply at the edges of the container,
where negative values may extend into the padding area.

To facilitate animation of segment outset values, `join` computes to `50%`.

```css
.segment-outset-0px {
  row-rule: 3px solid purple;
  column-rule: 3px solid green;
  column-rule-outset: 0px;
}
```

<image src="images/example-segment-outset-0px.png">

```css
.segment-outset-plus-5px {
  row-rule: 3px solid purple;
  column-rule: 3px solid green;
  column-rule-outset: 5px;
}
```

<image src="images/example-segment-outset-plus-5px.png">

```css
.segment-outset-minus-5px {
  row-rule: 3px solid purple;
  column-rule: 3px solid green;
  column-rule-outset: -5px;
}
```

<image src="images/example-segment-outset-minus-5px.png">

### Interaction with spanning items in grid

For grid containers, authors may control how gap decorations interact with
spanning items within a given gap decoration area.

```css
grid-row-rule-break: [ none | span ]#
grid-column-rule-break: [ none | span ]#
grid-rule-break: [ none | span ]#
```

The initial value is `span` which can give either the "T intersections" or "all
intersections" behavior described previously, depending on the value of the
corresponding `rule-outset` property. A value of `none` causes gap decorations
to cross behind spanning items and receive the "T intersection" behavior at the
edges of the gap decoration area.

In any case, as with existing [column rules in
multi-column](https://drafts.csswg.org/css-multicol-1/#column-gaps-and-rules),
gap decorations are painted just above the border of the container, and
specifically below any items placed within the container.

```css
.rule-break-none {
  grid-rule-break: none;
}
```

<image src="images/example-rule-break-none.png">

### Logical properties for flex and masonry containers

These are designed to enable scenarios where authors wish to switch
`flex-direction` or `masonry-direction` based on space constraints or other
factors.

| Property         | row or row-reverse direction | column or column-reverse direction |
|------------------|------------------------------|------------------------------------|
| main-rule-width  | row-rule-width               | column-rule-width                  |
| main-rule-style  | row-rule-style               | column-rule-style                  |
| main-rule-color  | row-rule-color               | column-rule-color                  |
| main-rule        | row-rule                     | column-rule                        |
| cross-rule-width | column-rule-width            | row-rule-width                     |
| cross-rule-style | column-rule-style            | row-rule-style                     |
| cross-rule-color | column-rule-color            | row-rule-color                     |
| cross-rule       | column-rule                  | row-rule                           |

And so on for other properties.

For flex and masonry containers, the logical properties map based on
`flex-direction` or `masonry-direction` following the convention above.

For grid containers, `main` maps to `row`, and `cross` maps to `column`.

For multi-column containers, `main` maps to `column`, and `cross` maps to `row`.

### Paint order

When row and column gap decorations overlap, authors can control their painting
order.

```css
gap-rule-paint-order: [ row-over-column | column-over-row | main-over-cross | cross-over-main ]#
```

The `main-over-cross` and `cross-over-main` values are logical alternates for
`row-over-column` and `column-over-row`. They map similarly to properties
described in the previous section.

The initial value for gap-rule-paint-order is `main-over-cross`.

```css
.row-over-column {
  row-rule: 6px solid red;
  column-rule: 6px solid blue;
  gap-rule-paint-order: row-over-column;
}
```
<image src="images/example-row-over-column.png">

```css
.column-over-row {
  row-rule: 5px solid red;
  column-rule: 5px solid blue;
  gap-rule-paint-order: column-over-row;
}
```
<image src="images/example-column-over-row.png">

### Bi-directional shorthands

These shorthands apply the same values in both the `main` and `cross`
directions.

```css
gap-rule-width: [ <'main-rule-width'> ]#
gap-rule-style: [ <'main-rule-style'> ]#
gap-rule-color: [ <'main-rule-color'> ]#

gap-rule: [ <'main-rule'> ]#

grid-gap-rule-area: [ <'grid-row-rule-area'> ]#
```

## Key scenarios

### Scenario 1: Horizontal lines between CSS grid rows

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-446379068, which
links to: https://codepen.io/urlyman/pen/yGNOya

> The desired effect is a line appearing only between the grid rows, and
> extending unbroken across the column gaps.
>
> Note that I don't want a line to appear above or beneath all rows, only in the
> gaps between rows.

```css
.container {
  row-rule: 1px solid #ccc;
}
```

<image src="images/csswg-drafts-issues-2748-issuecomment-446379068.png">

### Scenario 2: Lines dividing items in both directions of a grid

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-595663212

```css
.container {
  gap-rule: thick solid green;
}
```

<image src="images/csswg-drafts-issues-2748-issuecomment-595663212.png">

### Scenario 3: Defining different lines for different gaps, applied to a sub-area of the grid

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-595889781

```css
.container {
  gap-rule-style: solid:
  gap-rule-color: lightgray;
  column-rule-width: 1px repeat(auto, 2px) 1px;
  row-rule-width: 0px repeat(auto, 2px 1px);
  grid-gap-rule-area: 2 / 2 / -1 / -1;
}
```

<image src="images/csswg-drafts-issues-2748-issuecomment-595889781.png">

### Scenario 4: Responsive Flex layout

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-1765376966

> My use case for this is a left-and-right view in landscape that becomes a
> top-and-bottom view in portrait – with a divider in the middle (think split
> screen on a phone). Currently I have to use border-right in landscape, and
> switch to border-bottom in portrait. I would prefer setting a gap rule so the
> line automatically adjusts depending on the flex-direction.

```css
.container {
  display: flex;
  cross-gap-rule: 1px solid black;
}
```

<image src="images/csswg-drafts-issues-2748-issuecomment-1765376966-1.png">
<image src="images/csswg-drafts-issues-2748-issuecomment-1765376966-2.png">

### Scenario 5: Segmented gap decorations

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-446781218 - last
example

```css
.container {
  gap-rule: 1px solid black;
  column-rule-outset: 0px;
}
```

<image
src="images/csswg-drafts-issues-2748-issuecomment-446781218-last-example.png">

## Open questions

- How do gap decorations apply to subgrids?
- Can we construct an all-encompassing `gap-rule` shorthand? The challenge here
  is that `/` is already heavily loaded in the longhands.

## Considered alternatives

### Alternative 1: 2021 draft specification

In 2021, Mats Palmgren from Mozilla posted a [draft
specification](https://matspalmgren.github.io/css-gap-decorations/Overview.html)
for gap decorations. We believe the proposal in this explainer improves on
developer ergonomics by (a) reusing concepts from grid layout such as repeat and
grid lines, and (b) simplifying the model for fine-tuning segment placement. We
also believe the proposal in this explainer offers developers more flexibility
even absent support for gap decoration images; see Scenario 3 for one example.

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- Alison Maher
- Ian Kilpatrick
- Kurt Catti-Schmidt
