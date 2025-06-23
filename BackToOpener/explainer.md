# Back to Opener: Seamless Back Navigation in New Tabs

Authors: [Victor Huang](https://github.com/victorhuangwq)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

This document status: Active  
Expected venue: [WHAT WG](https://whatwg.org/)  
Current version: this document

## Introduction

In scenarios such as chat interfaces (e.g., ChatGPT, Google AI mode, Copilot, Gemini) and search engines (e.g., Yahoo, Bing, Perplexity), users often have significant context associated with the current document and prefer opening links in new browsing contexts (e.g., via `target="_blank"`) to support multitasking and preserve context. However, this practice disables the browser's back button, preventing users from easily returning to the original document, and contributes to tab proliferation by leaving multiple browsing contexts open without a clear navigation path back to the originating document.

This proposal introduces an opt‑in mechanism that signals the browser to insert the opener's URL as an initial entry in the new browsing context's session history. When the user navigates back in the new browsing context, the UA will automatically return focus to the originating browsing context and close the newly opened browsing context, provided the originating document is still active. This feature enhances user experience by supporting a logical back navigation flow and reducing the proliferation of browsing contexts (perceived by users as tab clutter).

## User-Facing Problem

The default behavior of opening links in new browsing contexts, as commonly used by chat interfaces and search engines, can frustrate users by causing proliferation of browsing contexts and making it difficult to return to the original conversation or context. Traditional [guidance](https://www.nngroup.com/articles/new-browser-windows-and-tabs/) warns against breaking the user's flow by opening new browsing contexts. At the same time, modern chat interfaces prioritize multitasking and context preservation, thus preferring to open links in new browsing contexts.

This proposal bridges the gap by creating a clear navigation pathway back to the originating document, ensuring users can effortlessly return without manually navigating through multiple browsing contexts. It additionally helps reduce the proliferation of browsing contexts perceived as tab clutter.

## Goals and Use Cases

The primary goal is to allow web developers to maintain a connected navigation experience, where the source context is always within reach even when content is loaded in new browsing contexts. Key use cases include:

- Search Engines: Users can click on search results and then return to their search results document.
- Conversational Chat Interfaces: Users can click on links and navigate back to the conversation document.

## Non-Goals

- Any PWA (Progressive Web App) specific behavior or functionality.
- Modifying the behavior of existing links that do not explicitly opt-in to this feature.

## Proposed Approach

Developers can signal their intent via `window.open()` and `<a>` elements. The browser will then handle the navigation logic, ensuring that when the user navigates back in the new browsing context, it automatically returns focus to the originating browsing context and closes the new browsing context if the opener is still active.

- For `window.open()`, we propose introducing a new `windowFeatures` parameter called `addOpenerToHistory`. When this feature is specified, the browser will add the opener's URL to the new browsing context's history.

```javascript
window.open("https://www.destination.com", "_blank", "addOpenerToHistory")
```

- For `<a>` elements, we propose introducing a new `rel` attribute value called `addOpenerToHistory`. When this value is specified, the browser will add the opener's URL to the new browsing context's history.

```html
<a href="https://www.destination.com" target="_blank" rel="addOpenerToHistory">Example Destination</a>
```

### Expected Behavior
Upon clicking the back button in the destination browsing context, the UA will, check if the opener browsing context is still active:

- Active: The UA will automatically return focus to the opener browsing context and close the destination browsing context.
- Inactive (e.g., closed or navigated away): UA will navigate back to the opener's URL in the current browsing context.

## Alternatives Considered

### Policy Header Approach

An alternative approach could involve using a policy header or meta tag to signal the browser to add the opener to the history. With this policy in place, the browser would automatically apply the "back-to-opener" behavior for all new-tab links originating from that site.

Pros:

- Simplifies implementation for developers, as they wouldn't need to modify individual links or scripts.
- Ensures consistent behavior across the site without requiring additional attributes.

Cons:

- Less flexible than the opt-in mechanism, as it applies to all links on the site, potentially leading to unintended behavior for links that shouldn't have this functionality.  

### UA-Defined Behavior

Another alternative we considered was an approach outside the Web Platform, leaving it up to the user agent to determine whether to add the opener to the history based on heuristics or user preferences. 

Pros:

- Reduces the need for developers to explicitly signal their intent, potentially leading to a more consistent user experience across different sites.  
- Could be implemented as a browser feature without requiring changes to web standards.

Cons:

- Inconsistency Risks: This behavior might vary across browsers and UA versions, leading to unpredictable user experiences.
- In quickly evolving markets like chat interfaces, a manual override is important—developers should be able to opt into the behavior when needed rather than rely solely on UA heuristics.

## Privacy and Security Considerations

Even though the opener's URL is added to the new browsing context's history, this does not expose any additional information about the opener browsing context to the new browsing context. This is because a browsing context cannot query the history of another browsing context and can only use its own history to navigate back and forth.

Interaction with `rel="noopener"` and `rel="noreferrer"` has also been considered. The implementation of this proposal should not rely on the presence of the `Referer` header or the `window.opener` property, as this would not be compatible with `rel="noopener"` or `rel="noreferrer"`.
