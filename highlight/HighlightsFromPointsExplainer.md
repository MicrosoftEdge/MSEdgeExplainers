# HighlightsFromPoint API Explainer

Authors: [Stephanie Zhang](https://github.com/stephanieyzhang), [Sanket Joshi](https://github.com/sanketj), [Fernando Fiori](https://github.com/ffiori)

Previous authors: [Dan Clark](https://github.com/dandclark), [Luis Sánchez Padilla](https://github.com/luisjuansp)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C CSS Working Group](https://www.w3.org/Style/CSS/)
* Current version: this document

## Introduction
[Highlights](https://drafts.csswg.org/css-highlight-api-1/) give ranges an appearance, such as rendering background colors to denote comments or annotations in a document, find-on-page for virtualized content, and squiggles for spelling and grammar checking.

These use cases require that the users not only be able to see the highlighted portion of the document, but have the ability to interact with it.

Here are some inspirational examples of how users may interact with highlighted ranges:
 - When a user clicks a highlighted result from find-on-page, the selection may be moved to cover the result so that it can be copied or edited easily.
 - When a user hovers over a misspelled word, the web app may display UI with suggested replacement text.
 - When a user clicks an annotation in a document, the web app may emphasize and scroll into view the corresponding annotation in a pane which lists all the annotations in the document.


## Proposal
The highlightsFromPoint() API is designed to enhance user interaction with highlighted content on web pages. Highlights are used to visually distinguish specific ranges within a document, such as comments, search results, or spelling errors. This API aims to provide a robust mechanism for identifying and interacting with these highlights, addressing challenges related to multiple overlapping highlights, shadow DOM handling, and performance optimization.

### Key Considerations 
- **Multiple Overlapping Highlights**: When multiple highlights overlap from different features (e.g., a spell-checker and a find-on-page feature), it's crucial to identify all highlights at a specific point. This ensures that all relevant highlights are accurately identified, enabling web developers to handle overlapping highlights more effectively.
- **Shadow DOM Handling**: Highlights within shadow DOMs require special handling to maintain encapsulation. The method can be designed to respect shadow DOM boundaries, ensuring highlights inside shadows are managed correctly. This helps maintain the integrity of the shadow DOM while still allowing highlights to be identified and interacted with.
- **Performance Optimization**: By providing a dedicated API for hit-testing highlights, the method can optimize performance. Instead of relying on more complex and potentially slower methods to determine which highlights are under a specific point, this method offers a streamlined and efficient way to perform this task, improving overall performance.

### API Design
The `highlightsFromPoint()` method will be part of the `CSS.highlights` interface. It will return a sequence of highlights at a specified point, ordered by [priority](https://drafts.csswg.org/css-highlight-api-1/#priorities). The developer has the option to pass in `options`, which is an optional dictionary where the key maps to an array of `ShadowRoot` objects. The API can search for and return highlights within the provided shadow DOM. The approach of passing an `options` parameter of `ShadowRoot` object is similar to [caretPositionFromPoint()](https://drafts.csswg.org/cssom-view/#dom-document-caretpositionfrompoint) and [getHTML()](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-gethtml) methods. 

```html
interface HighlightRegistry {
  // Returned values in priority order.
  sequence<Highlight> highlightsFromPoint(float x, float y, optional HighlightsFromPointOptions options = {});
};

dictionary HighlightsFromPointOptions {
  sequence<ShadowRoot> shadowRoots = [];
};
```

## Alternative Solutions
### Event-based API
It was initially discussed in the CSSWG whether an event-based API to handle interactions with custom Highlights was the most suitable option (see [this issue](https://github.com/w3c/csswg-drafts/issues/7513) for details). The main idea was dispatching events to the Highlights present under the cursor upon user actions. Different approaches were taken into account:

1. A separate event is dispatched for each Highlight under the cursor in descending priority order. The default action is to advance to the next Highlight and `preventDefault()` can be used to stop this. This might result in firing an arbitrary number of events for a single user action.
2. Dispatch a single event for the top-priority Highlight, with the event path including other Highlights and then bubbling to the DOM tree. However, pointer events can currently only target elements, so this approach might break other specification assumptions.
3. A combination of approaches 1 and 2, dispatching two events per user action: one for Highlights and one for the DOM tree. The Highlight event propagates through overlapping Highlights, and if `preventDefault()` wasn't called in that sequence, a new event is fired on the DOM tree.

In the end, due to these options becoming increasingly complex, `highlightsFromPoint()` was decided to be implemented as a first step, allowing handling pointer events with regular DOM events, and still satisfying most of the use cases that were brought up in the discussions.

### Making `highlightsFromPoint` part of `DocumentOrShadowRoot`
While exploring the implementation of the `highlightsFromPoint()` API, we considered adding it to the `DocumentOrShadowRoot` interface. However, we decided against this approach due to the complexities involved in managing shadow DOM encapsulation and to ensure consistency with existing APIs like `caretPositionFromPoint()` and `getHTML()`, which face similar encapsulation challenges.

## Privacy and Security Considerations
### Privacy Considerations:
The API is designed to minimize the exposure of user information by only revealing highlights at a specific point. It does not handle personal or sensitive information directly, but developers must ensure that highlights do not contain private data. The API respects shadow DOM boundaries to maintain encapsulation and operates independently of user state, so to not reveal any personal information.

### Security Considerations:
The API introduces no new security risks. 

## Relevant Discussions
  1. [[css-highlight-api] Approaches for dispatching highlight pointer events · Issue #7513 · w3c/csswg-drafts (github.com)](https://github.com/w3c/csswg-drafts/issues/7513)
  2. [[css-highlight-api] Exposing shadow DOM highlights in highlightsFromPoint() · Issue #7766 · w3c/csswg-drafts (github.com)](https://github.com/w3c/csswg-drafts/issues/7766)

  ---
  [Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/HighlightEvents) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BHighlightEvents%5D)
