# CSS Gap Decorations Level 1

## Authors

- [Kevin Babbitt](https://github.com/kbabbitt)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/CSSGapDecorations)

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
    - [Width, style, and color](#width-style-and-color)
    - [Segmentation](#segmentation)
    - [Extending segments into gap intersections](#extending-segments-into-gap-intersections)
    - [Segmentation shorthand](#segmentation-shorthand)
    - [Logical properties for flex containers](#logical-properties-for-flex-containers)
    - [Z ordering](#z-ordering)
    - [Bi-directional shorthands](#bi-directional-shorthands)
  - [Key scenarios](#key-scenarios)
    - [Scenario 1: Horizontal lines between CSS grid rows](#scenario-1-horizontal-lines-between-css-grid-rows)
    - [Scenario 2: Lines dividing items in both directions of a grid](#scenario-2-lines-dividing-items-in-both-directions-of-a-grid)
    - [Scenario 3: Defining different lines for different gaps; controlling segment length](#scenario-3-defining-different-lines-for-different-gaps-controlling-segment-length)
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
  apply to grid and flex in addition to multi-column containers.
* Introduce row-direction gap decorations on CSS grid and flex containers.
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
* Complex segmentation of gap decorations. Other proposals such as the one in
  Alternative 1 present ideas such as generating multiple decorations per gap
  that follow the spans of neighboring items in various ways. However, none of
  the use cases known to the author call for more complexity than a single
  segment within each gap, or a single segment between each pair of gap
  intersections. Syntax enabling these scenarios is designed with intent of
  expanding to more complex segmentation in a future level of the feature.
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

Unless otherwise noted, properties and grammar productions whose names start
with `row-` in this explainer should be assumed to have corresponding properties
or grammar productions respectively, whose names start with `column-` and whose
syntax is identical apart from substituting `row` for `column`. Maintaining
symmetry between `row-` and `column-` properties is important for responsive
flex scenarios.

### Width, style, and color

In addition to replicating the existing column-rule properties in the row
direction, we expand the syntax of both sets of properties to allow for multiple
definitions. Authors may use familiar syntax from CSS Grid such as `repeat()`
and `auto` to create patterns of line definitions.

Like column rules in multi-column layout, gap decorations in grid and flex
containers do not take up space and do not affect the layout of items in the
container. Conceptually, gap decorations are considered after layout has
completed, and in particular after the full extent of the implicit grid is
known. Thus, the `repeat()` grammar, while modeled after the `grid-template`
properties, is simpler for gap decorations as there are fewer unknowns to
consider.

If the number of specified values (after expanding any repeats) in a given list
is less than the number of tracks in the same direction in the [implicit
grid](https://drafts.csswg.org/css-grid-2/#implicit-grid) (or analogs for
flex/multi-column), the list cycles back to the beginning. This behavior,
inspired by CSS Transitions and Animiations, preserves backward compatibility
with existing `column-rule` declarations that only specify single values. It
also enables authors to specify simple repeating patterns such as:

```css
.alternate-red-blue {
    row-rule: 1px solid:
    row-rule-color: red blue;
}

.alternate-heavy-light {
    row-rule: 2px solid black, 1px solid gray;
}
```

The properties are defined as follows:

```css
row-rule-width: <line-width-list> | <auto-line-width-list>
row-rule-style: <line-style-list> | <auto-line-style-list>
row-rule-color: <line-color-list> | <line-auto-color-list>

<line-width-list>        = [ <line-width> | <line-width-repeat> ]+

<auto-line-width-list>   = [ <line-width> | <line-width-repeat> ]+
                           <auto-line-width-repeat>
                           [ <line-width> | <line-width-repeat> ]+

<line-width-repeat>      = repeat( [ <integer [1,∞]> ] , [ <line-width> ]+ )

<auto-line-width-repeat> = repeat( auto , [ <line-width> ]+ )
```
In the grammar above, the style and color components have similar productions to
those for width components.

Shorthands are defined as follows:

```css
row-rule: <row-rule-list> | <auto-row-rule-list>

<row-rule-list>        = [ <row-rule-value> | <row-rule-repeat> ]#

<auto-row-rule-list>   = [ [ <row-rule-value> | <row-rule-repeat> ]# ]?
                         <auto-row-rule-repeat>
                         [ , [ <row-rule-value> | <row-rule-repeat> ]# ]?

<row-rule-repeat>      = repeat( [ <integer [1,∞]> ] , [ <row-rule-value> ]# )

<auto-row-rule-repeat> = repeat( auto , [ <row-rule-value> ]# )

<row-rule-value>       = [ <'row-rule-width'> || <'row-rule-style'> || <'row-rule-color'> ]
```

### Segmentation

These properties allow authors to control where gap decorations start and end
relative to container contents.

In grid containers, the author may specify any grid line based placement, as in
[the 'grid-row-start', 'grid-row-end', 'grid-column-start', and
'grid-column-end'
properties](https://drafts.csswg.org/css-grid-2/#line-placement).

In flex and multi-column containers, these properties currently have no effect.

```css
row-rule-segment-start: <grid-line>
row-rule-segment-end: <grid-line>
```

The initial values for `row-rule-segment-start` and `row-rule-segment-end` are
`1` and `-1` respectively, defining a single segment spanning the entire
container.

If both `row-rule-segment-start` and `row-rule-segment-end` are `auto`, then a
segment will be generated between each pair of intersections with gaps in the
cross axis. If only one of `row-rule-segment-start` and `row-rule-segment-end`
is `auto`, then `auto` will be treated as the initial value for that property.

### Extending segments into gap intersections

```css
row-rule-segment-start-offset: <offset-into-intersection>
row-rule-segment-end-offset: <offset-into-intersection>
row-rule-segment-offset: <'row-rule-segment-start-offset'> [ / <'row-rule-segment-end-offset'> ]?

<offset-into-intersection> = none | center | full | <length-percentage>
```
Positive values for these properties extend into the intersection; negative
values recede from it. The percentage basis is the width of the gap in the cross
axis. Keywords are defined follows:
- `none` computes to `0%`
- `center` computes to `50%`
- `full` computes to `100%`

These offsets can also be applied at the edges of the container to extend into
the padding area.

### Segmentation shorthand

```css
row-rule-segment: [ <'row-rule-segment-start'> || <'row-rule-segment-start-offset'> ]
                  [ / <'row-rule-segment-end'> || <'row-rule-segment-end-offset'> ]?
```

### Logical properties for flex containers

These are designed to enable scenarios where authors wish to switch
`flex-direction` based on space constraints or other factors.

| Property         | `flex-direction: row` | `flex-direction: column` |
|------------------|-----------------------|--------------------------|
| main-rule-width  | row-rule-width        | column-rule-width        |
| main-rule-style  | row-rule-style        | column-rule-style        |
| main-rule-color  | row-rule-color        | column-rule-color        |
| main-rule        | row-rule              | column-rule              |
| cross-rule-width | column-rule-width     | row-rule-width           |
| cross-rule-style | column-rule-style     | row-rule-style           |
| cross-rule-color | column-rule-color     | row-rule-color           |
| cross-rule       | column-rule           | row-rule                 |

And so on for other properties.

For flex containers, the logical properties map based on flex direction
following the convention above.

For grid containers, `main` maps to `row`, and `cross` maps to `column`.

For multi-column containers, `main` maps to `column`, and `cross` maps to `row`.

### Z ordering

When row and column gap decorations overlap, authors should be able to control
their painting order.

```css
gap-rule-paint-order: [ row-over-column | column-over-row | main-over-cross | cross-over-main ]
```

The `main-over-cross` and `cross-over-main` values are logical alternates for
`row-over-column` and `column-over-row`. They map similarly to properties
described in the previous section.

The initial value for gap-rule-paint-order is `main-over-cross`.

In any case, as with existing [column rules in
multi-column](https://drafts.csswg.org/css-multicol-1/#column-gaps-and-rules),
gap decorations are painted just above the border of the container.

### Bi-directional shorthands

These shorthands expand to the `main` and `cross` logical longhands in order to
continue ergonomic support for responsive flex containers.

```css
gap-rule-width: <'main-rule-width'> [ / <'cross-rule-width'> ]?
gap-rule-style: <'main-rule-style'> [ / <'cross-rule-style'> ]?
gap-rule-color: <'main-rule-color'> [ / <'cross-rule-color'> ]?

gap-rule: [ <'gap-rule-paint-order'> ] || [ <'row-rule'> [ / <'column-rule'> ]? ]
```
For any of these shorthands, if the cross value is omitted, the main value is
used for both main and cross rules.

## Key scenarios

### Scenario 1: Horizontal lines between CSS grid rows

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-446379068, which
links to: https://codepen.io/urlyman/pen/yGNOya

> The desired effect is a line appearing only between the grid rows, and
> extending unbroken across the column gaps.
>
> Note that I don't want a line to appear above or beneath all rows, only in the
> gaps between rows.

<image src="images/csswg-drafts-issues-2748-issuecomment-446379068.png">

```css
.container {
    row-rule: 1px solid #ccc;
}
```

### Scenario 2: Lines dividing items in both directions of a grid

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-595663212

<image src="images/csswg-drafts-issues-2748-issuecomment-595663212.png">

```css
.container {
    gap-rule: thick solid green;
}
```

### Scenario 3: Defining different lines for different gaps; controlling segment length

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-595889781

<image src="images/csswg-drafts-issues-2748-issuecomment-595889781.png">

```css
.container {
    gap-rule-style: solid:
    gap-rule-color: lightgray;
    column-rule-width: 1px repeat(auto, 2px) 1px;
    column-rule-segment: 2 / -1;
    row-rule-width: 0px repeat(auto, 2px 1px);
    row-rule-segment: 2 / -1;
}
```

### Scenario 4: Responsive Flex layout

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-1765376966

> My use case for this is a left-and-right view in landscape that becomes a
> top-and-bottom view in portrait – with a divider in the middle (think split
> screen on a phone). Currently I have to use border-right in landscape, and
> switch to border-bottom in portrait. I would prefer setting a gap rule so the
> line automatically adjusts depending on the flex-direction.

<image src="images/csswg-drafts-issues-2748-issuecomment-1765376966-1.png">
<image src="images/csswg-drafts-issues-2748-issuecomment-1765376966-2.png">

```css
.container {
    cross-gap-rule: 1px solid black;
}
```

### Scenario 5: Segmented gap decorations

https://github.com/w3c/csswg-drafts/issues/2748#issuecomment-446781218 - last
example

<image
src="images/csswg-drafts-issues-2748-issuecomment-446781218-last-example.png">

```css
.container {
    gap-rule: 1px solid black;
    column-rule-segment: auto;
}
```

## Open questions

- How do gap decorations apply to subgrids?

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
