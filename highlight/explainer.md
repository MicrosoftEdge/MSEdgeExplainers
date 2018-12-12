# Highlight API Explained

## Overview

The Highlight API extends the concept of [CSS Highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo-4/#highlight-pseudos) by providing a way for web developers to style the text of arbitrary Range objects, rather than being limited to the user-agent defined ```::selection```, ```::inactive-selection```, ```::spelling-error```, and ```::grammar-error```. This is useful in a variety of scenarios, including editing frameworks that wish to implement their own selection, find-on-page over virtualized documents, multiple selection to represent online collaboration, and spellchecking frameworks.

Current browsers do not provide this functionality which forces web developers and framework authors to modify the underlying structure of the DOM tree in order to achieve the rendering they desire. This can quickly become complicated in cases where the desired highlight/selection spans elements across multiple subtrees, and requires DOM updates to the view in order to adjust highlights as they change. The Highlight API aims to provide a programmatic way of adding and removing highlights that do not affect the underlying DOM structure, but instead apply styles based on Range objects.

## Example usage
A **HighlightsMap** lives off of the CSS namespace and maps from a group name to a sequence of Range objects.
The ```::highlight(ident)``` CSS pseudo-element function will take a CSS identifier that will be matched against the group name from the **HighlightsMap** of the associated document. The style properties contained within the rule describes a cascaded highlight style for Ranges that were inserted into the highlights map under a group name equal to the identifier.
The Range interface is extended to have a style property, that allows for inline-like styles to apply in addition to the cascaded styles, providing both declarative and programmatic interfaces for performing highlight styling. The combination of the styles will be applied to the various runs of text contents of the Range.

```css
:root::highlight(example-highlight) {
    background-color: yellow;
    color:blue;
}
```

```javascript
function highlightText(startNode, startOffset, endNode, endOffset) {
    let highlightRange = new Range();
    highlightRange.setStart(startNode, startOffset);
    highlightRange.setEnd(endNode, endOffset);
    highlightRange.style.color = "black";

    CSS.highlights.append("example-highlight", highlightRange);
}
```

The **HighlightsMap** is a maplike object with a few affordances for mapping a group name to an ordered sequence of Range objects, including a variadic ```set()```,  an ```append()``` method, and an ```insert()``` method;

```javascript
CSS.highlights.set("foo", range2, range3);
CSS.highlights.append("foo", range4);
CSS.highlights.insert("foo", 0, range1);
console.log(CSS.highlights.get("foo")); // Logs [range1, range2, range3, range4]
```

## Application of CSS properties

The HighlightsMap is structured as a map so that there is a logical grouping of highlights. This allows web developers and frameworks to have highlights grouped in such a way that they are more easily composed (e.g. one framework can do spellcheck highlighting, while another can manage find-on-page, with yet another performing highlighting for selection).

The grouping of highlights participates in the CSS cascade. The ::highlight pseudo will collect/cascade style properties into a map on matching elements, indexed by the group name. Any Range that exists in the highlight map under that group name will be styled based on the computed map of the element corresponding to the portions of the range. Additionally, the Range object's 'inline' style (i.e. properties set directly on the .style member) will be applied on top of the cascaded values for the group. The values of the Range objects' style are not stored as part of the cascade, but instead are used when determining which properties to apply to a given inline box.

Following the code example above, if we have the following snippet of HTML:

```html
<p>Some |text|</p>
```

Where 'text' is covered by the ```highlightRange``` (as denoted by the ```|``` characters), there will be two inline boxes created, one for 'Some ' and one for 'text'. The 'text' inline box will first lookup the 'example-highlight' grouping, and apply ```background-color:yellow``` and ```color:blue```, based on the map that was cascaded onto the ```<p>``` element. Subsequently, ```color:black``` will be applied based on the style of the Range itself.

Ranges added to the map can overlap --- in these cases, the properties are computed by applying the styles of the applicable Ranges in ascending priority order, where the last write of a given property wins. In the event that Ranges overlap and have the same priority, the timestamp of when the Range was added to the map is used.

It is also possible to add entries in the HighlightsMap, without there being a corresponding ::highlight() pseudo element for the associated document. In this case an there are no cascaded properties to apply when creating inline boxes --- only the inline properties directly set on the Range objects will apply (and if there are none, there will be no impact on inline boxes).

In terms of painting, the ::highlight pseudo is treated as a highlight pseudo-element, as described in [CSS Pseudo Elements Level 4](https://drafts.csswg.org/css-pseudo-4/#highlight-pseudos). Only a specific subset of style properties will apply and are limited to those that affect text.

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
CSS.higlights.append("foo", range1);
CSS.higlights.append("bar", range2);
</script>
```
Where (1) shows that ```range1``` covers ```"Some t"``` and (2) denotes ```range2``` covers ```"e text"```.

Because there are no priorities set (i.e. there is a tie between ```range1``` and ```range2```, the ranges' styles are applied in timestamp order. The rendered results will have ```"Som"``` with blue text on yellow background, ```"e t"``` with blue text on orange background, and ```"ext"``` with the default color on orange background.

[overlap example1](overlap_example1.png)

Setting ```range1.priority = 1;``` would cause ```range1``` to apply on top of ```range2```, which results in ```"Some t"``` being blue on yellow, and ```"ext"``` being default color on orange.

[overlap example2](overlap_example2.png)

## Invalidation

Ranges are live ranges - DOM changes within one of the Range objects will result in the new contents being highlighted. Changes to the boundary points of Ranges in the  HighlightsMap will result in the user-agent invalidating the view and repainting the changed highlights appropriately. If there are DOM/CSS changes that result in a different cascaded highlight map for a given element, and there exists one or more Range objects in the highlights map for the cascaded group names, the layout representation of that element should be notified that the painting of the element might have changed. Ranges that are positioned inside of documents that are not in the view are ignored. The HighlightMap is per-document --- therefore, Ranges that are positioned inside of a different document than the HighlightMap it is a part of are ignored for rendering.

## Removal of highlights

Because Range objects are live ranges, they must be modified when web developers wish their contents to no longer be highlighted. This can be achieved by removing the Range from the map, by passing it to the ```delete()``` method (note that ```delete()``` is overloaded so that passing a string will remove an entire group).

## Open questions

Consider refactoring the naming (RangeDecorationMap and ::range-decoration(foo)?) if consensus says that 'highlight' is too specific.

Should the .style property be added to AbstractRange and have styling apply to StaticRanges as well? What are the implications of this?

Should we allow empty Ranges to be rendered like a caret, or are they not rendered at all?

How should inline 'inherit' values be treated? The cascaded values are resolved per usual, but a range can span multiple elements which could all have different 'computed' values for 'inherit'. 

Can a Range participate in multiple groups? If so how do we order the cascaded properties for each group?

