# HighlightsFromPoint API Explainer

Authors: [Stephanie Zhang](https://github.com/stephanieyzhang), [Sanket Joshi](https://github.com/sanketj), [Fernando Fiori](https://github.com/ffiori)

Previous authors: [Dan Clark](https://github.com/dandclark), [Luis Sánchez Padilla](https://github.com/luisjuansp)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C CSS Working Group](https://www.w3.org/Style/CSS/)
* Current version: this document

## Introduction
[Highlights](https://drafts.csswg.org/css-highlight-api-1/) allow developers to give an appearance to a range of text. Use cases for this include rendering background colors to denote comments or annotations in a document, highlighting selections of other users in online collaboration for text or code editing, highlighting find-on-page results for virtualized content, and squiggles for spelling and grammar checking.

These use cases require that the users not only be able to see the highlighted portion of the document, but have the ability to interact with it.

Here are some inspirational examples of how users may interact with highlighted ranges:
 - When a user clicks on content that a different user has selected or is editing, display some information about the user currently working on that content.
 - When a user clicks a highlighted result from find-on-page, the selection may be moved to cover the result so that it can be copied or edited easily.
 - When a user hovers over a misspelled word, the web app may display UI with suggested replacement text.
 - When a user clicks an annotation in a document, the web app may emphasize and scroll into view the corresponding annotation in a pane which lists all the annotations in the document.

Currently, web developers who want to implement some sort of interaction with custom highlights need to use workarounds that are cumbersome to code, maintain, often involve directly editing the DOM with static ranges, and incurring performance penalties.

## Customer Problem Example

For example, let's have a deeper look at the case of online collaboration mentioned above where it's needed to show the name of the user who is selecting some piece of text upon clicking on it.
This could look as follows, where the chunks of text each user selected are highlighted with a different color and a tooltip is shown:

![online-collaboration-example](example-text-editor-online-collaboration.gif)

In the [Appendix](#example-code-without-highlightsfrompoint) there is a full example of code showing how this could be achieved with custom highlights, but let's focus on the section where the event listeners are added:

```html
function isPointInsideDOMRect(x, y, rect) {
    return (
        x >= rect.left && x <= rect.right &&
        y >= rect.top && y <= rect.bottom
    );
}

function createActiveHighlights(x, y) {
    resetActiveHighlights();
    for (highlight of CSS.highlights.values()) {
        let username = highlightToUsername.get(highlight);
        if (username != undefined) {
            for (highlightAbstractRange of highlight.values()) {
                let range = new Range();
                range.setStart(highlightAbstractRange.startContainer, highlightAbstractRange.startOffset);
                range.setEnd(highlightAbstractRange.endContainer, highlightAbstractRange.endOffset);
                for (rect of range.getClientRects()) {
                    if (isPointInsideDOMRect(x, y, rect)) {
                        setActiveHighlight(highlight, username, x, y);
                    }
                }
            }
        }
    }
}

document.addEventListener('click', (event) => {
    createActiveHighlights(event.pageX, event.pageY);
});

document.addEventListener('mousemove', (event) => {
    cursorBox.style.display = 'none';
});
```

Some things to notice:

- There's a loop over all of the registered custom highlights in `CSS.highlights`.
- There's another loop over all of the highlight's ranges to see if the point `(x,y)` is inside one of them.
- A `Range` has to be created for each range of the highlight because they can be `StaticRanges`, which don't support `getClientRects()`.
- There's a loop over all of the `DOMRects` returned by `getClientRects()` for each range.
- Determining if a point is inside a `DOMRect` needs some extra computation which was added in a helper `isPointInsideDOMRect`.


## Proposal
The `highlightsFromPoint()` API aims to provide a robust mechanism for identifying and interacting with custom highlights, making it easier for web developers to implement features like the ones described in the [Introduction](#introduction) of this document.

Some considerations about it:

- **Multiple Overlapping Highlights**: When multiple highlights overlap from different features (e.g., a spell-checker and a find-on-page feature), it's crucial to identify all highlights at a specific point. This ensures that all relevant highlights are accurately identified, enabling web developers to handle overlapping highlights more effectively.
- **Performance Optimization**: By providing a dedicated API for hit-testing highlights, the method can optimize performance. Instead of relying on more complex and potentially slower methods to determine which highlights are under a specific point, this method offers a streamlined and efficient way to perform this task, improving overall performance (refer to the [Performance Analysis](#performance-analysis) in the Appendix for more details on an example).
- **Shadow DOM Handling**: Highlights within shadow DOMs require special handling to maintain encapsulation. The method can be designed to respect shadow DOM boundaries, ensuring highlights inside shadows are managed correctly. This helps maintain the integrity of the shadow DOM while still allowing highlights to be identified and interacted with.

The `highlightsFromPoint()` method proposed would be part of the `CSS.highlights` interface. It would return a sequence of highlights at a specified point, ordered by [priority](https://drafts.csswg.org/css-highlight-api-1/#priorities). The developer has the option to pass in `options`, which is an optional dictionary where the key maps to an array of `ShadowRoot` objects. The API can search for and return highlights within the provided shadow DOM. The approach of passing an `options` parameter of `ShadowRoot` object is similar to the [caretPositionFromPoint()](https://drafts.csswg.org/cssom-view/#dom-document-caretpositionfrompoint) and [getHTML()](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-gethtml) methods. 

### Customer Problem Example Using highlightsFromPoint

Now going back to the text editor online collaboration example discussed in [Customer Problem Example](#customer-problem-example) section, let's see how `createActiveHighlights` could be implemented using the proposed API:

```html
function createActiveHighlights(x, y) {
    resetActiveHighlights();
    let highlights = CSS.highlights.highlightsFromPoint(event.clientX, event.clientY);
    for (highlight of highlights) {
        let username = highlightToUsername.get(highlight);
        if (username != undefined) {
            setActiveHighlight(highlight, username, x, y);
        }
    }
}
```

This piece of code is significantly smaller and simpler than the solution that was shown in the previous section without `highlightsFromPoint`. More specifically:
- There's no need to iterate over all the ranges of the highlights registered anymore, now `highlightsFromPoint` gives us only the highlights that are under the point `(x,y)`.
- There's no need to deal with ranges and rectangles anymore because that's handled by the API.

You can refer to a full implementation in the [Appendix](#example-code-using-highlightsfrompoint).

## Alternative Solutions
### Event-based API
A [previous explainer](events-explainer.md) proposed an [event](https://dom.spec.whatwg.org/#event)-based API to handle interactions with custom Highlights.
This has been discussed in the CSSWG too, see [this issue](https://github.com/w3c/csswg-drafts/issues/7513) for details. The main idea was dispatching events to the Highlights present under the cursor upon user actions. Different approaches were taken into account:

1. A separate event is dispatched for each Highlight under the cursor in descending priority order. The default action is to advance to the next Highlight and `preventDefault()` can be used to stop this. This might result in firing an arbitrary number of events for a single user action.
2. Dispatch a single event for the top-priority Highlight, with the event path including other Highlights and then bubbling to the DOM tree. However, pointer events can currently only target elements, so this approach might break other specification assumptions.
3. A combination of approaches 1 and 2, dispatching two events per user action: one for Highlights and one for the DOM tree. The Highlight event propagates through overlapping Highlights, and if `preventDefault()` wasn't called in that sequence, a new event is fired on the DOM tree.

If we wanted to apply option 3 above to the example of online collaboration described before, instead of adding the event listener to the `document`, we should add it to the highlights themselves. This could be achieved as follows:

```html
let highlightsHit = false;
for (highlight of highlightToUsername.keys()) {
    highlight.addEventListener('click', (event) => {
        if (!highlightsHit) {
            resetActiveHighlights();
            highlightsHit = true;
        }
        createActiveHighlight(event.currentTarget, event.pageX, event.pageY);
    });
}

document.addEventListener('mousemove', (event) => {
    cursorBox.style.display = 'none';
});

document.addEventListener('click', (event) => {
    if (!highlightsHit) {
        // If no Highlights were hit, reset them in case there were active ones from previous clicks.
        resetActiveHighlights();
    }
    else {
        // Reset flag for future events.
        highlightsHit = false;
    }
});
```

In contrast to the solutions presented before, in `createActiveHighlights` now we don't have to loop over the highlights affected, but we have to do it beforehand to set all the necessary event listeners. Also notice that we now have to keep track if any Highlights are hit after every click so we know when to reset the old active ones.

The main problem with these mentioned event-based options is that each of them carry significant complexity from a specification point of view. Option 3 described above would be the most suitable one, but the event phases are hard to define. Let's suppose that the user moves the mouse over the Highlight `h1` set on element `e1`, and an event listener was set on `h1`. The phases should look as follows:

    Capture phase e1 pointermove - target:e1 currentTarget:e1
    Target phase h1 pointermove - target:e1 currentTarget:h1
    Bubbling phase e1 pointermove - target:e1 currentTarget:e1

A workaround is needed here where `event.target` should stay as the element `e1` because pointer events can only target elements, but actually the target was the highlight, which doesn't really follow the definition for `event.target`.
Furthermore, when `currentTarget == target`, it should be target phase, this would imply the event phases work in a new way and it could break current site implementations or introduce inconsistencies with current specifications.

We can conclude the `highlightsFromPoint()` API proposed in this explainer is simpler to implement and specify, it doesn't need these kind of workarounds nor creates these open questions, and still satisfies the use cases adequately.

### Promise-based API

Another asynchronous variation for `highlightsFromPoint` could be returning a [Promise](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects), which returns the highlights present at the given point upon resolving.
This is some example code for how to implement the online collaboration website with it:

```html
function createActiveHighlights(x, y) {
    let highlightsPromise = CSS.highlights.highlightsFromPoint(event.clientX, event.clientY);
    highlightsPromise.then((highlights) => {
        resetActiveHighlights();
        for (highlight of highlights) {
            let username = highlightToUsername.get(highlight);
            if (username != undefined) {
                setActiveHighlight(highlight, username, x, y);
            }
        }
    });
    return highlightsPromise;
}
```

This approach wouldn't really work because one Promise could resolve after other things take place. For example, let's say the user clicks on a highlighted range and then outside of any highlighted ranges. If the old Promise resolves after the new one, it could incorrectly create active highlights and they would stay there until the user clicks somewhere else. This would be problematic for the developer to fix.

Another disadvantage of this option is that being promise-based would be inconsistent with other similar APIs like [`elementFromPoint`](https://drafts.csswg.org/cssom-view/#dom-document-elementfrompoint) and [`caretPositionFromPoint`](https://drafts.csswg.org/cssom-view/#dom-document-caretpositionfrompoint), which are synchronous, potentially introducing some developer confusion regards how to handle these functions and how they work.

### Making `highlightsFromPoint` part of `DocumentOrShadowRoot`
While exploring the implementation of the `highlightsFromPoint()` API, we considered adding it to the [`DocumentOrShadowRoot`](https://dom.spec.whatwg.org/#documentorshadowroot) interface. However, we decided against this approach due to the complexities involved in managing shadow DOM encapsulation and to ensure consistency with existing APIs like [`caretPositionFromPoint()`](https://drafts.csswg.org/cssom-view/#dom-document-caretpositionfrompoint) and [`getHTML()`](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-gethtml), which face similar encapsulation challenges.

## Privacy and Security Considerations
### Privacy Considerations
The API is designed to minimize the exposure of user information by only revealing highlights at a specific point. It does not handle personal or sensitive information directly, but developers must ensure that highlights do not contain private data. The API respects shadow DOM boundaries to maintain encapsulation and operates independently of user state, so to not reveal any personal information.

### Security Considerations
The API introduces no new security risks. 

## Relevant Discussions
  1. [[css-highlight-api] Approaches for dispatching highlight pointer events · Issue #7513 · w3c/csswg-drafts (github.com)](https://github.com/w3c/csswg-drafts/issues/7513)
  2. [[css-highlight-api] Exposing shadow DOM highlights in highlightsFromPoint() · Issue #7766 · w3c/csswg-drafts (github.com)](https://github.com/w3c/csswg-drafts/issues/7766)

  ---
  [Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/highlightsFromPoint) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?template=highlightsfrompoint.md)

## Questions of Interest
Is there a demand for the API to return the Range object in addition to the Highlight object?
Are there performance issues regarding the "FromPoint" APIs (e.g. [caretPositionFromPoint](https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint))synchronous implementations?

## Appendix

### highlightsFromPoint IDL Proposed

```html
interface HighlightRegistry {
  // Returned values in priority order.
  sequence<Highlight> highlightsFromPoint(float x, float y, optional HighlightsFromPointOptions options = {});
};

dictionary HighlightsFromPointOptions {
  sequence<ShadowRoot> shadowRoots = [];
};
```

### Example Code Without highlightsFromPoint

This is the full implementation for the text editor online collaboration example mentioned in [Customer Problem Example](#customer-problem-example) section. This is one way the code for it could be written nowadays without highlightsFromPoint API.

```html
<!DOCTYPE html>
<html>
<head>
<style>
    div {
        padding: 20px;
        font-size: 22px;
    }
    div::highlight(selection-highlight-Alice) {
        background-color: rgba(0, 255, 0, 0.3);
    }
    div::highlight(selection-highlight-Bob) {
        background-color: rgba(0, 255, 255, 0.3);
    }
    div::highlight(active-selection-highlight-Alice) {
        background-color: rgba(0, 255, 0, 1);
    }
    div::highlight(active-selection-highlight-Bob) {
        background-color: rgba(0, 255, 255, 1);
    }
    #cursorBox {
        position: absolute;
        background-color: white;
        padding: 2px;
        border: 1px solid black;
        display: none;
        font-size: 14px;
    }
</style>
</head>
<body>
<div contenteditable="true" spellcheck="false">
This is an example for using custom highlights in online collaboration.</br>
This simulates a text document that Alice and Bob are editing, besides you, the user seeing this.</br>
This is some text that Alice selected on her text editor session.</br>
This whole sentence is what Bob has selected on his.</br>
</br>
Clicking on those highlighted pieces of text shows which user selected them and intensifies the background color.</br> 
</div>
<div id="cursorBox"></div>
<script>
    let cursorBox = document.getElementById('cursorBox');
    let div = document.querySelector('div');
    let aliceTextNode = div.childNodes[4];
    let aliceRange = new StaticRange({startContainer: aliceTextNode, startOffset: 0, endContainer: aliceTextNode, endOffset: 18});
    let bobTextNode = div.childNodes[6];
    let bobRange = new StaticRange({startContainer: bobTextNode, startOffset: 0, endContainer: bobTextNode, endOffset: bobTextNode.textContent.length});

    let aliceHighlightName = 'selection-highlight-Alice';
    let aliceHighlight = new Highlight(aliceRange);
    let aliceActiveHighlight = new Highlight(aliceRange);
    CSS.highlights.set(aliceHighlightName, aliceHighlight);
    let bobHighlightName = 'selection-highlight-Bob';
    let bobHighlight = new Highlight(bobRange);
    let bobActiveHighlight = new Highlight(bobRange);
    CSS.highlights.set(bobHighlightName, bobHighlight);

    let highlightToUsername = new Map([
        [aliceHighlight, "Alice"],
        [bobHighlight, "Bob"]
    ]);

    function resetActiveHighlights() {
        for (username of highlightToUsername.values()) {
            let activeHighlightName = 'active-selection-highlight-' + username;
            CSS.highlights.delete(activeHighlightName);
        }
        cursorBox.style.display = 'none';
        cursorBox.textContent = '';
    }

    function setActiveHighlight(highlight, username, x, y) {
        let activeHighlightName = 'active-selection-highlight-' + username;
        CSS.highlights.set(activeHighlightName, highlight);
        cursorBox.textContent += (cursorBox.textContent.length ? ', ' : '') + username;
        cursorBox.style.display = 'block';
        cursorBox.style.left = (x + 2) + 'px';
        cursorBox.style.top = (y - cursorBox.getBoundingClientRect().height - 6) + 'px';
    }

    function isPointInsideDOMRect(x, y, rect) {
        return (
            x >= rect.left && x <= rect.right &&
            y >= rect.top && y <= rect.bottom
        );
    }

    function createActiveHighlights(x, y) {
        resetActiveHighlights();
        for (highlight of CSS.highlights.values()) {
            let username = highlightToUsername.get(highlight);
            if (username != undefined) {
                for (highlightAbstractRange of highlight.values()) {
                    // Need to create a Range for getClientRects() because it can be a StaticRange.
                    let range = new Range();
                    range.setStart(highlightAbstractRange.startContainer, highlightAbstractRange.startOffset);
                    range.setEnd(highlightAbstractRange.endContainer, highlightAbstractRange.endOffset);
                    let rangeIsHit = false;
                    for (rect of range.getClientRects()) {
                        if (isPointInsideDOMRect(x, y, rect)) {
                            setActiveHighlight(highlight, username, x, y);
                            rangeIsHit = true;
                            break;
                        }
                    }
                    if (rangeIsHit) {
                        break;
                    }
                }
            }
        }
    }

    document.addEventListener('mousemove', (event) => {
        cursorBox.style.display = 'none';
    });

    document.addEventListener('click', (event) => {
        createActiveHighlights(event.pageX, event.pageY);
    });
</script>
</body>
</html>
```

### Example Code Using highlightsFromPoint

This is the full implementation for the text editor online collaboration example mentioned in [Customer Problem Example](#customer-problem-example-using-highlightsfrompoint) section, using the new highlightsFromPoint API proposed.

```html
<!DOCTYPE html>
<html>
<head>
<style>
    div {
        padding: 20px;
        font-size: 22px;
    }
    div::highlight(selection-highlight-Alice) {
        background-color: rgba(0, 255, 0, 0.3);

    }
    div::highlight(selection-highlight-Bob) {
        background-color: rgba(0, 255, 255, 0.3);
    }
    div::highlight(active-selection-highlight-Alice) {
        background-color: rgba(0, 255, 0, 1);
    }
    div::highlight(active-selection-highlight-Bob) {
        background-color: rgba(0, 255, 255, 1);
    }
    #cursorBox {
        position: absolute;
        background-color: white;
        padding: 2px;
        border: 1px solid black;
        display: none;
        font-size: 14px;
    }
</style>
</head>
<body>
<div contenteditable="true" spellcheck="false">
This is an example for using custom highlights in online collaboration.</br>
This simulates a text document that Alice and Bob are editing, besides you, the user seeing this.</br>
This is some text that Alice selected on her text editor session.</br>
This whole sentence is what Bob has selected on his.</br>
</br>
Clicking on those highlighted pieces of text shows which user selected them and intensifies the background color.</br> 
</div>
<div id="cursorBox"></div>
<script>
    let cursorBox = document.getElementById('cursorBox');
    let div = document.querySelector('div');
    let aliceTextNode = div.childNodes[4];
    let aliceRange = new StaticRange({startContainer: aliceTextNode, startOffset: 0, endContainer: aliceTextNode, endOffset: 18});
    let bobTextNode = div.childNodes[6];
    let bobRange = new StaticRange({startContainer: bobTextNode, startOffset: 0, endContainer: bobTextNode, endOffset: bobTextNode.textContent.length});

    let aliceHighlightName = 'selection-highlight-Alice';
    let aliceHighlight = new Highlight(aliceRange);
    let aliceActiveHighlight = new Highlight(aliceRange);
    CSS.highlights.set(aliceHighlightName, aliceHighlight);
    let bobHighlightName = 'selection-highlight-Bob';
    let bobHighlight = new Highlight(bobRange);
    let bobActiveHighlight = new Highlight(bobRange);
    CSS.highlights.set(bobHighlightName, bobHighlight);

    let highlightToUsername = new Map([
        [aliceHighlight, "Alice"],
        [bobHighlight, "Bob"]
    ]);

    function resetActiveHighlights() {
        for (username of highlightToUsername.values()) {
            let activeHighlightName = 'active-selection-highlight-' + username;
            CSS.highlights.delete(activeHighlightName);
        }
        cursorBox.style.display = 'none';
        cursorBox.textContent = '';
    }

    function setActiveHighlight(highlight, username, x, y) {
        let activeHighlightName = 'active-selection-highlight-' + username;
        CSS.highlights.set(activeHighlightName, highlight);
        cursorBox.textContent += (cursorBox.textContent.length ? ', ' : '') + username;
        cursorBox.style.display = 'block';
        cursorBox.style.left = (x + 2) + 'px';
        cursorBox.style.top = (y - cursorBox.getBoundingClientRect().height - 6) + 'px';
    }

    function createActiveHighlights(x, y) {
        resetActiveHighlights();
        let highlights = CSS.highlights.highlightsFromPoint(x, y);
        for (highlight of highlights) {
            let username = highlightToUsername.get(highlight);
            if (username != undefined) {
                setActiveHighlight(highlight, username, x, y);
            }
        }
    }

    document.addEventListener('mousemove', (event) => {
        cursorBox.style.display = 'none';
    });

    document.addEventListener('click', (event) => {
        createActiveHighlights(event.pageX, event.pageY);
    });
</script>
</body>
</html>
```

### Performance Analysis

We compared the performance of the two approaches presented for the online collaboration example analyzed throughout this explainer: with and without the proposed `highlightsFromPoint` API.
We compared how long it takes for the event listener added for `'click'` events to complete in both cases when it happens over a highlighted portion and when it happens over unaffected text. For this, we slightly modified the listener as shown below and also implemented a `testPerformance` function as follows, adding a hundred extra highlights to stress the test:

```html
let accumulatedTime = 0;
let eventsFired = 0;
document.addEventListener('click', (event) => {
    let start = performance.now();
    createActiveHighlights(event.pageX, event.pageY);
    let duration = performance.now() - start;
    accumulatedTime += duration;
    eventsFired++;
});

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPerformance() {
    let mouseclickEvent = new Event('click');
    let highlightRange = new Range();
    highlightRange.setStart(bobRange.startContainer, bobRange.startOffset);
    highlightRange.setEnd(bobRange.endContainer, bobRange.endOffset);
    let rangeRect = highlightRange.getClientRects()[0];

    mouseclickEvent.pageX = rangeRect.left + rangeRect.width/2;
    mouseclickEvent.pageY = rangeRect.top + rangeRect.height/2;

    // Add more highlights to stress the test.
    for(let i=0; i<100; i++){
        let h = new Highlight(bobRange);
        let name = "highlight-" + i;
        CSS.highlights.set(name, h);
        highlightToUsername.set(h, name)
    }

    // First dispatches can be outliers.
    for(let i=0; i<100; i++){
        div.dispatchEvent(mouseclickEvent);
    }
    await wait(100); 
    
    // Measure the time it takes to process a click event on a highlight.
    accumulatedTime = 0;
    eventsFired = 0;
    for(let i=0; i<1000; i++){
        div.dispatchEvent(mouseclickEvent);
    }
    await wait(1000); 
    console.log("Avg time it took to process a click event on a highlight (ms): " + (accumulatedTime/eventsFired));

    // Now measure the time it takes to process a click event on the div but outside of highlights.
    mouseclickEvent.pageY = rangeRect.top - 1;
    accumulatedTime = 0;
    eventsFired = 0;
    for(let i=0; i<1000; i++){
        div.dispatchEvent(mouseclickEvent);
    }
    await wait(1000); 
    console.log("Avg time it took to process a click event outside of highlights (ms): " + (accumulatedTime/eventsFired));
}

testPerformance();
```

After executing both examples, we got the following results showing a ~1.7x improvement on clicking over highlights and a ~18x improvement on clicking outside of any highlights when using `highlightsFromPoint`:

- Using `highlightsFromPoint`:
    - Average time it took to process a click event over highlights (ms): 7.689199999928475
    - Average time it took to process a click event outside of highlights (ms): 0.023700000166893005

- Not using `highlightsFromPoint`:
    - Average time it took to process a click event over highlights (ms): 13.20869999974966
    - Average time it took to process a click event outside of highlights (ms): 0.43030000013113023

When the mouse click event happens outside of the higlights, the performance profiler from developer tools shows that `createActiveHighlights` takes more time dealing with the ranges and getting the rectangles compared to the version that uses `highlightsFromPoint`. And when the event happens on a highlight, the call to `highlightsFromPoint` takes less time than all the necessary calls to `getClientRects` that are fired in the version that doesn't use the new API. Both measurements indicate that using the new API gives a performance advantage by getting rid of all the Javascript overhead that the program requires when implementing this use case with the current APIs available.
