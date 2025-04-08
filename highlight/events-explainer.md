# Events for Highlighted Ranges

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Archived**
* Expected venue: [W3C CSS Working Group](https://www.w3.org/Style/CSS/)
* Current version: this document

## Introduction
[Highlights](https://drafts.csswg.org/css-highlight-api-1/) give ranges an appearance. Use cases include rendering background colors to denote comments or annotations in a document, powering find-on-page for virtualized content, adding squiggles for spelling and grammar checking, and more.

These use cases require that the users not only be able to see the highlighted portion of the document, but also interact with it.

Here are some inspirational examples of how users may interact with highlighted ranges:
 * When a user clicks a highlighted result from find-on-page, the selection may be moved to cover the result so that it can be copied or edited easily.
 * When a user hovers over a misspelled word, the web app may display UI with suggested replacement text.
 * When a user clicks an annotation in a document, the web app may emphasize and scroll into view the corresponding annotation in a pane which lists all the annotations in the document.

To power these scenarios, highlighted ranges should produce events that can be handled in JavaScript.

## Proposal
A new event, HighlightPointerEvent, will be created to describe how the user is interacting with highlighted ranges.

```idl
interface HighlightPointerEvent : PointerEvent {
    readonly Range range;
}
```

When a user performs a pointer action on part of an element containing a highlighted `Range`, a `HighlightPointerEvent` object must be fired on the `Highlight` that that `Range` belongs to. `HighlightPointerEvent.range` will be set to that `Range` so that the event listener can determine which one of the `Highlight`'s ranges the event applies to. Propagation for the event will work as if the element was the first DOM parent of the `Highlight` (see below examples).

One approach would be to set `HighlightPointerEvent.target` to the `Highlight`. But, this poses a web compatibility problem. Currently a `PointerEvent`'s `target` can only be an element, so `PointerEvent` handlers will expect this and encounter problems if they receive a `HighlightPointerEvent` whose `target` is a `Highlight`.

So in order to retain web compatibility and not break `PointerEvent` handlers in existing code, the event's `target` will be set to the element rather than the `Highlight`.


The `Highlight` interface will be changed to inherit from `EventTarget` in order to be able to have event listeners added to it and events fired against it.

```idl
[Exposed=Window]
interface Highlight : EventTarget {
  constructor(AbstractRange... initialRanges);
  setlike<AbstractRange>;
  attribute long priority;
  attribute HighlightType type;
};
```

Here's an example illustrating how a "find-highlights" Highlight could move selection such that it coincides with the clicked find-on-page result.

```html
<html>
<head>
    <style>
        :root::highlight(find-highlights) {
            background-color: yellow;
        }
    </style>
</head>
<body>
    <div id="content">text to highlight</div>
    <script type="module">
        const findHighlights = new Highlight()
        CSS.highlights.set("find-highlights", findHighlights)

        // simulated find result for the word "highlight"
        const text = document.getElementById("content").firstChild
        const range = new Range();
        range.setStart(text, text.length - "highlight".length)
        range.setEnd(text, text.length)
        findHighlights.add(range)

        // on click of a range in the find-highlights group, move selection
        // to coincide with the result
        findHighlights.addEventListener("click", e => {
            const range = e.range
            const selection = getSelection()
            selection.removeAllRanges()
            selection.addRange(range)
        })
    </script>
</body>
</html>
```


### [Multiple Ranges and Highlights](#multiple-ranges-and-highlights)

Ranges can overlap and each range may belong to more than one Highlight. However, only one event will be fired on one Highlight. Highlights have a priority order as defined in the [Highlight API explainer](https://drafts.csswg.org/css-highlight-api-1/#priorities). To find the group that will receive the event, sort the Highlight objects in descending priority order and dispatch the event to the first Highlight. The priority order establishes a layering of highlights, so firing the event based on this ordering ensures the highlight "nearest to the user" receives the event.

It is also possible that there are multiple hit ranges within the target Highlight. To handle this, we also define a priority order for ranges within a Highlight, where the range that was added to the group first has the highest priority and the range added last has the lowest priority. Using this ordering, we take the range with the highest priority to be the HighlightPointerEvent's range.

### Event Types
All [MouseEvent types](https://www.w3.org/TR/uievents/#events-mouse-types) apply to highlighted ranges (including [contextmenu](https://html.spec.whatwg.org/multipage/indices.html#event-contextmenu) which is defined elsewhere).

All [PointerEvent types](https://www.w3.org/TR/pointerevents2/#pointer-event-types) apply to highlighted ranges except [gotpointercapture](https://www.w3.org/TR/pointerevents2/#the-gotpointercapture-event) and [lostpointercapture](https://www.w3.org/TR/pointerevents2/#the-lostpointercapture-event). (See section on [interaction with pointer capture](#interaction-with-pointer-capture) below.)

### [Interaction with elements and element pointer events](#interaction-with-elements-and-element-pointer-events)

Whenever an element receives pointer input, if a range within that element is also hit, the range's Highlight should receive a pointer event that corresponds to the pointer event received by the element (except in the case of pointer capture - see section on [interaction with pointer capture](#interaction-with-pointer-capture) below). To determine the set of ranges that are hit, we hit test the boxes for elements as usual and after finding the hit element, we find the ranges that cover that hit.

Elements and Highlights should receive the same pointer events. This means that a Highlight callback would be able to prevent the event from reaching an element by calling stopPropogation, as well as canceling the event via preventDefault.

As an example, consider a scenario where there are two consecutive paragraphs, p1 and p2, with one highlight, h1, on the last line of p1 and another highlight, h2, on the first line of p2.

```html
<html>
<head>
    <style>
        :root::highlight(foo) {
            background-color: red;
        }
        :root::highlight(bar) {
            background-color: blue;
        }
    </style>
</head>
<body>
    <p id="p1">foo</p>
    <p id="p2">bar</p>
    <script type="module">
        const p1 = document.getElementById("p1");
        const r1 = new Range();
        r1.selectNode(p1);
        const p2 = document.getElementById("p2");
        const r2 = new Range();
        r2.selectNode(p2);

        CSS.highlights.set("foo", new Highlight(r1));
        CSS.highlights.set("bar", new Highlight(r2));
    </script>
</body>
</html>
```

Let's say the user performs a mouse down on the last line of p1, moves the mouse to the first line of p2, and then performs a mouse up. The sequence of events fired would be:

```
PointerDown p1
    Capture phase p1 pointerdown - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointerdown - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointerdown - target:p1 currentTarget:p1 range:r1

PointerMove(s) p1
    Capture phase p1 pointermove - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointermove - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointermove - target:p1 currentTarget:p1 range:r1

PointerMove(s) p2
    Capture phase p2 pointermove - target:p2 currentTarget:p2 range:r2
    Target phase h2 pointermove - target:p2 currentTarget:h2 range:r2
    Bubbling phase p2 pointermove - target:p2 currentTarget:p2 range:r2

PointerUp p2
    Capture phase p2 pointerup - target:p2 currentTarget:p2 range:r2
    Target phase h2 pointerup - target:p2 currentTarget:h2 range:r2
    Bubbling phase p2 pointerup - target:p2 currentTarget:p2 range:r2
```

### [Interaction with pointer capture](#interaction-with-pointer-capture)

A Highlight cannot currently become a pointer capture target. There are no exposed APIs on Highlight to set/release pointer capture explicitly, and Highlights should not be [implicit pointer capture](https://www.w3.org/TR/pointerevents/#implicit-pointer-capture) targets as this would mean either preventing elements from taking implicit pointer capture, or adding support to the browser for multiple simultaneous implicit pointer targets, which could be complex. Since there is currently no known scenario that requires pointer capture on highlighted ranges, it seems better to avoid this complexity.

If an element is taking pointer capture, only highlighted ranges within that element's scope can receive pointer events. Let's reconsider the scenario from the [interaction with elements and element pointer events](#interaction-with-elements-and-element-pointer-events) section and this time let's say p1 is taking pointer capture. Because of pointer capture, even when the user's mouse has moved over p2, p1 will continue receiving pointer events and p2 does not get hit. Because p2 is not hit, h2 will also not be hit and will not receive pointer events. Additionally, because Highlights cannot take pointer capture, h1 will also stop receiving events once the mouse has moved off it. So the sequence of events will be:

```
PointerDown p1
    Capture phase p1 pointerdown - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointerdown - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointerdown - target:p1 currentTarget:p1 range:r1

PointerMove(s) p1
    Capture phase p1 pointermove - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointermove - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointermove - target:p1 currentTarget:p1 range:r1

PointerMove(s) p1 taking pointer capture
    Target phase p1 pointermove - target:p1 currentTarget:p1

PointerUp p1
    Target phase p1 pointerup - target:p1 currentTarget:p1
```

### [Interaction with the CSS pointer-events property](#CSS-pointer-events-property)

The CSS [pointer-events](https://www.w3.org/TR/SVG11/interact.html#PointerEventsProperty) property cannot be applied to a Highlight directly. However, a highlighted range should only receive pointer events if its containing element will also be receiving an event. So if an element has the pointer-events property set to a non-auto value and is determined to not be hit for a given pointer input, parts of ranges inside that element will also not be hit.

### [Interaction with the CSS touch-action property](CSS-touch-action-property)

The CSS [touch-action](https://w3c.github.io/pointerevents/#the-touch-action-css-property) property cannot be applied to a Highlight directly because there is no known scenario that requires a highlight to govern the gestures that the browser may apply. However, like pointer-events, the presence of the touch-action property on a highlighted range's container can influence the set of pointer events that the highlight receives.

Let's once again consider the example from the [interaction with elements and element pointer events](#interaction-with-elements-and-element-pointer-events) section, but this time let's say the user is using their finger on a touchscreen instead of a mouse. If p1 has touch-action set to auto/pan-y/pan-up, p1 will receive a pointercancel event as the browser starts to pan up. If the pan starts while the user's finger is over h1, then h1 will also receive a pointercancel; however, if the pan starts after the user's finger has moved off h1, h1 will not receive a pointercancel because it will not be hit at that moment. So the event sequence will be:

```
PointerDown p1
    Capture phase p1 pointerdown - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointerdown - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointerdown - target:p1 currentTarget:p1 range:r1

PointerMove(s) p1
    Capture phase p1 pointermove - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointermove - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointermove - target:p1 currentTarget:p1 range:r1
    
PointerCancel p1
    Capture phase p1 pointercancel - target:p1 currentTarget:p1 *range:r1
    *Target phase h1 pointercancel - target:p1 currentTarget:h1 range:r1 
    Bubbling phase p1 pointercancel - target:p1 currentTarget:p1 *range:r1
    
*if pans starts while user's finger is over h1
```

If p1 has touch-action set to some other value, when the user taps down with their finger on the last line of p1, p1 will receive implicit pointer capture. So the sequence of events will be as it was in the [interaction with pointer capture](interaction-with-pointer-capture) section:

```
PointerDown p1
    Capture phase p1 pointerdown - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointerdown - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointerdown - target:p1 currentTarget:p1 range:r1

PointerMove(s) p1
    Capture phase p1 pointermove - target:p1 currentTarget:p1 range:r1
    Target phase h1 pointermove - target:p1 currentTarget:h1 range:r1
    Bubbling phase p1 pointermove - target:p1 currentTarget:p1 range:r1

PointerMove(s) p1 taking implicit pointer capture
    Target phase p1 pointermove - target:p1 currentTarget:p1

PointerUp p1
    Target phase p1 pointerup - target:p1 currentTarget:p1
```

## Open Questions
  1. Should we fire multiple events for each hit Range/Highlight pair as opposed to what's described in the [multiple Ranges and Highlights](#multiple-ranges-and-highlights) section above? As an example, two ranges, one marking a find-on-page result and another marking the location of an annotation in the document, could overlap. Clicking on the overlapping area of these two ranges could both move the selection to the clicked find-on-page result while also emphasizing the corresponding annotation text in another part of the web app's view. There are other cases where the author would want two Highlights related to a single range to receive events. If a word is highlighted for both a grammar error and a spelling error, the author may want to include some logic in their event handlers to coordinate dynamically whether the grammar or spelling error gets to handle a click, rather than having it always go to whichever Highlight has higher priority.

  2. If we do fire multiple events per hit, does there need to be a way for one Highlight to stop a pointer event from reaching other Highlights? Consider a scenario where a website and an extension (ex. Grammarly) are both applying highlights to the same content, and both want to show a suggestion popup in response to a HighlightRangePointerEvent. If both groups receive the event and get to show their respective popups, it could mean that one popup is shown on top of the other, which may negatively affect the usability and/or look-and-feel of the page. One solution is to define a new event path that enables a single event to flow through all the hit Range/Highlight pairs in priority order, which would allow higher priority Highlights to call stopPropogation and prevent the event from reaching groups with lower priority. Another idea is to define the default action of each HighlightRangePointerEvent to be the generation of the HighlightRangePointerEvent for the next Range/Highlight pair (in descending priority order). This way, a group can call preventDefault and prevent events from reaching subsequent Highlights.

  3. Should a highlight be able to prevent selection in response to a pointer event? Elements are able to prevent selection by calling preventDefault, but Highlights will not be able to do so because Elements and Highlights receive separate pointer events. One option is to define that cancelling the HighlightRangePointerEvent will also prevent selection.

  4. Is an API similar to elementsFromPoint needed for highlights? It would provide the additional ranges hit by the HighlightRangePointerEvent so that behaviors for multiple types of highlights can be composed at the web app's option. This may not work well, however, for scenarios where separate uncoordinated frameworks or extensions are trying to work together (ex. CKEditor may provide find-on-page and annotation highlights while Grammarly provides spellcheck highlights).

  5. Should Highlights be able to receive pointer capture?

  6. Should we fire the pointer event on the Range that was hit, instead of the containing Highlight? It seems more developer friendly to create a single event listener on a Highlight than to create one listener per Range in the group.
  
  7. Should the Highlight be the `target` of the pointer event that is propagated to the parent Elements? This would enable Highlights to be PointerEvent targets, and could introduce the risk of breaking the expectations of current code as PointerEvents currently only have Nodes as their target.


  ---
  [Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/HighlightEvents) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BHighlightEvents%5D)