# Highlight API Explained

## Overview

The Highlight API extends the concept of [CSS Highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo-4/#highlight-pseudos) by providing a way for web developers to style the text of arbitrary Range objects, rather than being limited to the user-agent defined ```::selection```, ```::inactive-selection```, ```::spelling-error```, and ```::grammar-error```. This is useful in a variety of scenarios, including editing frameworks that wish to implement their own selection, find-on-page over virtualized documents, multiple selection to represent online collaboration, and spellchecking frameworks.

Current browsers do not provide this functionality which forces web developers and framework authors to modify the underlying structure of the DOM tree in order to achieve the rendering they desire. This can quickly become complicated in cases where the desired highlight/selection spans elements across multiple subtrees, and requires DOM updates to the view in order to adjust highlights as they change. The Highlight API provides a programmatic way of adding and removing highlights that do not affect the underlying DOM structure, but instead applies styles to text based on Range objects.

## Example usage

The following code uses the ```::highlight``` pseudo-element to apply a yellow background and blue foreground color to the text ```One two```. It does so by adding a **HighlightRangeGroup** to the **HighlightsMap** (both of these are new concepts introduced by this proposal). The HighlightRangeGroup will contain a Range whose boundary points surround the text ```One two```.

```html
<style>
:root::highlight(example-highlight) {
    background-color: yellow;
    color:blue;
}
</style>
<body><span>One </span><span>two </span><span>three...</span>
<script>
    let highlightsRange = new Range();
    highlightsRange.setStart(document.body, 0);
    highlightsRange.setEnd(document.body, 2);

    let highlightRangeGroup = new HighlightRangeGroup(highlightsRange);

    CSS.highlights.set("example-highlight", highlightRangeGroup);
</script>
```

The next example achieves the same result by using the style property on the HighlightRangeGroup object. The style property allows for programmatic manipulation of the style separate from the declarative model of the ::highlight pseudo-element.

```html
<body><span>One </span><span>two </span><span>three...</span>
<script>
    let highlightsRange = new Range();
    highlightsRange.setStart(document.body, 0);
    highlightsRange.setEnd(document.body, 2);

    let highlightRangeGroup = new HighlightRangeGroup(highlightsRange);
    highlightRangeGroup.style.backgroundColor = "yellow";
    highlightRangeGroup.style.color = "blue";

    CSS.highlights.set("inline-highlight", highlightRangeGroup);
</script>
```

CSS.highlights is a **HighlightsMap**. The **HighlightsMap** is a [maplike](https://heycam.github.io/webidl/#idl-maplike) object that maps a name to a HighlightRangeGroup object. The presence of a HighlightRangeGroup in the highlight map enables the text within the contained Ranges to be styled – a HighlightRangeGroup not added to the HighlightsMap will have no effect on rendering. **HighlightRangeGroup** represents a set of Ranges and exposes a [setlike](https://heycam.github.io/webidl/#idl-setlike) interface. The text content of the contained Ranges will be styled according to the HighlightRangeGroup’s `style` property (which is a CSSStyleDeclaration). HighlightRangeGroups can also have styles applied by the ::highlight pseudo elements, when the identifier passed to the ::highlight pseudo is the same as the name of the HighlightRangeGroup in the HighlightsMap. The HighlightRangeGroup also has a `priority` property – this is used to disambiguate which styles should be used when text content is covered by Ranges from different HighlightRangeGroups.

## Application of CSS properties

The HighlightsMap is structured as a map so that there is a logical grouping of highlights. This allows web developers and frameworks to have highlights grouped in such a way that they are more easily composed (e.g. one framework can do spellcheck highlighting, while another can manage find-on-page, with yet another performing highlighting for selection).

During the CSS cascade, the ```::highlight``` pseudo will cascade style properties into a map referenced by the matching [originating element](https://drafts.csswg.org/selectors-4/#originating-element), indexed by the identifier name. Any Range that exists in the highlight map under that identifier will get its text styled based on these computed maps of the originating elements that are covered by the Range (which can be a single element). Additionally, the HighlightRangeGroup object's 'inline' style (i.e. properties set directly on the .style member) will be applied on top of the cascaded values for the given highlight identifier. The values of the HighlightRangeGroup objects' style are not stored as part of the cascade, but instead are used when determining which properties to paint to portion of an inline box.

In terms of painting, the ```::highlight``` pseudo is treated as a highlight pseudo-element, as described in [CSS Pseudo Elements Level 4](https://drafts.csswg.org/css-pseudo-4/#highlight-pseudos). Only a specific subset of style properties will apply and are limited to those that affect text.

Following the code example above, if we have the following snippet of HTML:

```html
<p>Some |text|</p>
```

where 'text' is covered by a Range (as denoted by the ```|``` characters) in the HighlightsMap under the 'example-highlight' identifier. In this case, during painting, the inline box containing ```Some text``` will detect that there is a Range that spans part of the box. Due to this, painting ```text``` will reference the Range and its container  HighlightRangeGroup in the HighlightsMap in order to determine what styles to use. For this example the Range belongs to the 'example-highlight' identifier, which applies ```background-color:yellow``` and ```color:blue```, based on the map that was cascaded onto the ```<p>``` element. If the HighlightRangeGroup had an inline style of ```color:black```, this will be applied and overwrite the cascaded blue color for 'example-highlight'. The text 'Some ' will be painted as it normally would.

There can be multiple such ranges for a given inline box and HighlightRangeGroups added to the map can overlap &mdash; in these cases, the associated text will be partitioned into a set of intervals, such that each member of the set has a unique collection of HighlightRangeGroups covering it. The style properties are then computed for each member in the set by applying the styles of the applicable HighlightRangeGroups in ascending priority order (based on the ```priority``` property), where the last write of a given property wins. In the event that HighlightRangeGroups overlap and have the same priority, the timestamp of when the HighlightRangeGroup was added to the map is used.

It is also possible to add entries in the HighlightsMap, without there being a corresponding ```::highlight()``` pseudo element for the associated document. In this case there are no cascaded properties to apply when painting inline boxes &mdash; only the inline properties directly set on the HighlightRangeGroup objects will apply (and if there are none, there will be no impact on painting).

## Example with overlapping Ranges

Take the following html snippet:
```html
<style>
p::highlight(foo) {
    color:blue;
    background-color:yellow;
}
p::highlight(bar) {
    background-color:orange;
}

</style>
<p>|Som|e t|ext|</p>
   1   2   1   2
<script>
let rangeGroup1 = new HighlightRangeGroup(range1);
let rangeGroup2 = new HighlightRangeGroup(range2);
CSS.highlights.set("foo", rangeGroup1);
CSS.highlights.set("bar", rangeGroup2);
</script>
```
Where (1) shows that ```range1``` covers ```"Some t"``` and (2) denotes ```range2``` covers ```"e text"```.

Because there are no priorities set (i.e. there is a tie between ```rangeGroup1``` and ```rangeGroup2```, the HighlightRangeGroups' styles are applied in timestamp order. The rendered results will have ```"Som"``` with blue text on yellow background, ```"e t"``` with blue text on orange background, and ```"ext"``` with the default color on orange background.

![overlap example1](overlap_example1.png)

Setting ```rangeGroup1.priority = 1;``` would cause ```rangeGroup1``` to apply on top of ```rangeGroup1```, which results in ```"Some t"``` being blue on yellow, and ```"ext"``` being default color on orange.

![overlap example2](overlap_example2.png)

## Invalidation

Ranges are live ranges - DOM changes within one of the Range objects will result in the new contents being highlighted. Changes to the boundary points of Ranges in the HighlightsMap will result in the user-agent invalidating the view and repainting the changed highlights appropriately. If there are DOM/CSS changes that result in a different cascaded highlight map for a given element, and there exists one or more Range objects in the highlights map for the cascaded identifiers, the layout representation of that element should be notified that the painting of the element might have changed. Ranges that are positioned inside of documents that are not in the view are ignored. The HighlightsMap is per-document &mdash; therefore, Ranges that are positioned inside of a different document than the HighlightsMap it is a part of are ignored for rendering.

## Removal of highlights

Because Range objects are live ranges, they must be modified when web developers wish their contents to no longer be highlighted. This can be achieved by removing the Range from the corresponding HighlightRangeGroup, by passing it to the ```delete()``` method.

## Open questions

Consider refactoring the naming (```RangeDecorationMap``` and ```::range-decoration(foo)```?) if consensus determines that 'highlight' is too specific.

Should we allow empty Ranges to be rendered like a caret, or are they not rendered at all?

How should inline 'inherit' values be treated? The cascaded values are resolved per usual, but a range can span multiple elements which could all have different 'computed' values for 'inherit'.
