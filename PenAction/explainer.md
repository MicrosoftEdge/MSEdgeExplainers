# pen-action Explainer

## Motivation
To help ensure responsiveness to touch and other pointer input, authors must declare (using the touch-action CSS property) which types of manipulation the browser may initiate in response to pointer input.  All pointer input not consumed by the browser for a manipulation can be delivered as a [PointerEvent](https://www.w3.org/TR/pointerevents2/) for the web app to handle explicitly.

The touch-action property applies not only to touch, but to any type of pointer input the browser chooses to consume in pursuit of enabling the behaviors it lists.  The pen, in particular, is treated by browsers as being just another finger.  **If an author wanted to enable pan and zoom with touch, but receive PointerEvents to draw with the pen, there's currently no way to express this.**

Inspirational use cases where pen input should not trigger the same browser behavior as touch:
 * When annotating a document, the user may zoom in and pan the document with touch, but draw or write on the document using a pen
 * A pen may be used to highlight runs of text while touch pans the document (see example below)

## Proposal
To enable these scenarios, this document proposes a new CSS property, pen-action, which allows the author to instruct the browser to deliver PointerEvents for pen input instead of consuming the input for manipulations.

### Proposed pen-action CSS Property
| CSS Property Name | pen-action
|--                 |--
| Value | auto \| none
| Initial | auto
| Applies to | all elements except: non-replaced inline elements, table rows, row groups, table columns, and column groups. [(same as touch-action)](https://www.w3.org/TR/pointerevents2/#the-touch-action-css-property)
| Inherited | no
| Percentages | N/A
| Media | visual
| Computed value | Same as specified value

The pen-action property has two values: `auto` and `none`. `auto` allows the browser to consider pen input as it would touch input, so that it may consume pointer events to enable whatever manipulations are defined by the touch-action property.  A value of `none` indicates that the pen must generate PointerEvents and not be considered as a source of input for enabling other manipulations.  Put simply: `auto` means treat the pen as "just another finger" (today's behavior) and `none` means have the pen generate PointerEvents.

Note with this proposal that there is no mode enabling some manipulations with a pen but not with touch.  This is primarily due to a lack of scenarios, e.g. pan with the pen but write with the finger or pinch-zoom with two pens and not with fingers.

## Sample Code
This sample renders one highlight for each range selected by a pen.  Panning and zooming is still possible using touch, but a separate property (pen-action) is used to disable all the manipulations that could be initiated by using the pen.

To simplify the code that draws the highlight, the example leverages the proposed [Highlights API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/master/highlight/explainer.md).
```html
<style>
    :root::highlight(yellow-highlighter) {
        background-color: yellow;
    }

    body {
        pen-action: none;
    }
</style>
<body>
The user can pan and zoom this text, but script will process pointer
events for pen input and create highlights over the text.

... a bunch more text here omitted for brevity ...

<script type="module">
    const yellowHighlights = new HighlightRangeGroup()
    CSS.highlights.set("yellow-highlighter", yellowHighlights)

    const pointerIdToRangeMap = {}

    addEventListener("pointerdown", beginHighlight)
    addEventListener("pointermove", extendHighlight)
    addEventListener("pointerup", finishHighlight)

    function beginHighlight(e) {
        if (e.pointerType !== "pen") {
            return
        }

        const range = document.caretRangeFromPoint(e.clientX, e.clientY)
        pointerIdToRangeMap[e.pointerId] = range
        yellowHighlights.add(range)
    }

    function extendHighlight(e) {
        if (e.pointerType !== "pen") {
            return
        }

        const range = pointerIdToRangeMap[e.pointerId]
        const extension = document.caretRangeFromPoint(e.clientX, e.clientY)

        // Update the highlight based on the location of the pointer
        //
        // Takes into account that the highlight may be reversed
        // even though range boundary points are forced to follow document order
        //
        // implementation omitted for brevity
        updateRangeFocus(range, extension)
    }

    function finishHighlight(e) {
        if (e.pointerType !== "pen") {
            return
        }

        delete pointerIdToRangeMap[e.pointerId]
    }
</script>
</body>
```

## Existing Implementations
Edgehtml-based Edge shipped an implementation of pen-action that is consistent with this proposal.

## References
[Informative Discussion on pen-action](https://github.com/w3c/pointerevents/issues/203)

## Open questions
 1. Alternative syntaxes that retire touch-action and instead define a pointer-action could be considered.  Current thinking is that pen-action is a better fit as there are no known scenarios where a pen should do something other than behave exactly like the finger or just generate pointer events.

 ---
 [Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Pen%20Action) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BPen%20Action%5D)
