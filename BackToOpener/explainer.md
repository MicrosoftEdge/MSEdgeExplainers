# Back to the Opener: Seamless Navigation with Linked Tab Histories

Authors: [Victor Huang](https://github.com/victorhuangwq)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

This document status: Active  
Expected venue: [WHAT WG](https://whatwg.org/)  
Current version: this document

## Introduction

Modern web experiences can lead to excessive tab proliferation when users click links that open in new tabs, particularly in contexts such as search engines and LLM chat interfaces. Notably, a relatively modern paradigm has emerged where chat interfaces (like ChatGPT, Copilot, or Gemini) often open content in new tabs rather than replacing the current tab. This makes sense for the chat interfaces, as this approach supports multitasking and preserves the conversational context.

This proposal introduces an opt‑in mechanism that signals the browser to insert the opener as an initial entry in the new tab's history. When the user navigates back in the new tab, the UA will automatically return focus to the originating tab and close the new tab, provided the opener is still active. This feature enhances user experience by supporting a logical back navigation flow, and reduce tab clutter at the same time.

## User-Facing Problem

Modern chat interfaces and search engines often open links in new tabs to preserve context. However, this new-tab paradigm can frustrate users by causing tab proliferation and making it difficult to return to the original conversation or context. Traditional [guidance](https://www.nngroup.com/articles/new-browser-windows-and-tabs/) warns against breaking the user's flow by opening new tabs, yet modern chat interfaces prioritize multitasking and context preservation.

This proposal bridges the gap by creating a clear, seamless navigation pathway back to the originating tab, ensuring users can effortlessly return without getting lost among numerous extra tabs.

## Goals and Use Cases

The primary goal is to allow web developers to maintain a connected navigation experience, where the source context is always within reach even when content is loaded in new tabs. Key use cases include:

- Search Engines: Users can click on search results and then effortlessly return to their search page.
- LLM Chat Interfaces: Users can click on links and navigate back to the conversation window seamlessly.

## Proposed Approach

Developers can signal their intent via `window.open()` and `<a>` elements. The browser will then handle the navigation logic, ensuring that when the user navigates back in the new tab, it automatically returns focus to the originating tab and closes the new tab if the opener is still active.

- For `window.open()`, we propose introducing a new `windowFeatures` parameter called `addOpenerToHistory`. When this feature is specified, the browser will add the opener to the new tab's history.

```javascript
window.open("https://www.destination.com", "_blank", "addOpenerToHistory")
```

- For `<a>` elements, we propose introducing a new `rel` attribute value called `addOpenerToHistory`. When this value is specified, the browser will add the opener to the new tab's history.

```html
<a href="https://www.destination.com" target="_blank" rel="addOpenerToHistory">Example Destination</a>
```

### Observed Behavior

- Upon clicking the back button in the destination tab, if the opener tab is still active, the browser will automatically return focus to the opener tab and close the new tab.
- If the opener tab is unavailable (e.g., closed or navigated away), the new tab will navigate back to the opener's URL in the current tab.


## Alternatives Considered

### Policy Header Approach

An alternative approach could involve using a policy header or meta tag to signal the browser to add the opener to the history. With this policy in place, the browser would automatically apply the "back-to-opener" behavior for all new-tab links originating from that site.

Pros:

- Simplifies implementation for developers, as they wouldn't need to modify individual links or scripts.
- Ensures consistent behavior across the site without requiring additional attributes.

Cons:  
Less flexible than the opt-in mechanism, as it applies to all links on the site, potentially leading to unintended behavior for links that shouldn't have this functionality.

### UA-Defined Behavior

Another alternative we considered was an approach outside the Web Platform, leaving it up to the user agent to determine whether to add the opener to the history based on heuristics or user preferences. 

Pros:

- Reduces the need for developers to explicitly signal their intent, potentially leading to a more consistent user experience across different sites.  
- Could be implemented as a browser feature without requiring changes to web standards.

Cons:

- Inconsistency Risks: This behavior might vary across browsers and UA versions, leading to unpredictable user experiences.
- In quickly evolving markets like chat interfaces, a manual override is important—developers should be able to opt into the behavior when needed rather than rely solely on UA heuristics.

## Privacy and Security Considerations

Even though the opener is added to the history, this does not expose any additional information about the opener tab to the new tab. This is because a new tab cannot query the history of another tab and can only use its own history to navigate back and forth.

Interaction with `rel="noopener"` and `rel="noreferrer"` has also been considered. The implementation of this proposal should not rely on the presence of the `Referer` header or the `window.opener` property, as this would not be compatible with `rel="noopener"` or `rel="noreferrer"`.