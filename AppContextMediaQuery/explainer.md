# App Context Media Query

## Authors

- [Alexander Kyereboah](https://github.com/kyerebo), [Microsoft](https://microsoft.com)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues?q=is%3Aissue%20label%3A%22App%20Context%20Media%20Query%22)
- [Github Discussion](https://github.com/w3c/manifest/issues/1092)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C CSS Working Group](https://www.w3.org/groups/wg/css/)
* Current version: this document

## Table of Contents

- [Introduction](#introduction)
  - [The `display-mode` Problem](#the-display-mode-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposed Solution](#proposed-solution)
  - [Syntax](#syntax)
  - [Behavior Rules](#behavior-rules)
  - [Behavior Summary](#behavior-summary)
- [Key Scenarios](#key-scenarios)
- [Alternatives Considered](#alternatives-considered)
- [Privacy and Security Considerations](#privacy-and-security-considerations)
- [Future Extension: Service Worker `clients` Integration](#future-extension-service-worker-clients-integration)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction

Today, web developers lack a reliable way to determine whether their app is running in an installed app window, because the existing `display-mode` media queries conflate installation state with presentation mode and break under common scenarios like entering fullscreen. The **`app-context` CSS media feature** solves this by providing a stable, dedicated signal for the application context that is independent of the app's current display mode.

Developers would like a way to style their content differently depending on whether their web app is running in an installed app window. Common use cases include:

- **Hiding install prompts** when the user is already in the installed experience.
- **Showing app-specific UI** (e.g., a title bar, back navigation, or "open in browser" link) that only makes sense in an app window.
- **Adapting layout** for the app window's chrome (or lack thereof).

### The `display-mode` Problem

Currently, the best available signal is the [`display-mode` media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/display-mode#syntax):

```css
@media (display-mode: standalone) {
  .install-banner { display: none; }
}
```

This works only until the app enters fullscreen. When a user triggers fullscreen, the display mode changes from `standalone` to `fullscreen`, and the media query no longer matches. In the example above, the install banner reappears, layout shifts, and app-specific UI disappears. The app is still *installed*, but the *presentation* no longer reflects this.

The two concepts of "is this an installed app?" and "what is the current display mode?" are **orthogonal** and should be treated as such. A web app can be installed and rendered in `standalone`, `fullscreen`, or `minimal-ui` mode. Developers need a signal that remains stable across all of these states.

## Goals

- Provide a **stable signal** for "running in an installed app window" that is separate from display mode, with clear naming that communicates the current application context rather than global installation state.
- Provide both **declarative and imperative** access to the signal. CSS `@media` rules enable reactive styling, while `matchMedia()` enables JavaScript-driven logic.

## Non-goals

- **Standardize `navigator.standalone` cross-browser.** WebKit can keep its existing behavior; other engines should not adopt it. See [Alternatives Considered](#alternatives-considered).
- **Replace `display-mode` media queries.** `display-mode` remains useful for adapting to presentation changes. `app-context` complements it.

## Proposed Solution

### Syntax

A new CSS media feature named `app-context`, used as an enumerated media feature with discrete values:

```css
@media (app-context: installed) {
  /* Styles applied only inside an installed app window */
}

@media (app-context: browser) {
  /* Styles applied only in a regular browser tab */
}
```

The name `app-context` communicates that the feature describes the context in which the application is running, not whether the app is installed on the device globally.

### Behavior Rules

1. **Matches `installed`** when the document is in an application context: a top-level browsing context with a manifest applied, presented in its own OS-level app window.
2. **Remains `installed` regardless of display mode.** Whether the app is in `standalone`, `fullscreen`, or `minimal-ui` mode, the `app-context` media feature continues to match `installed`.
3. **Only applies to top-level browsing contexts.** In any iframe (same-origin or cross-origin) the feature matches `browser`.
4. **Matches `browser` in browser tabs.** Even if the same URL has an installed app elsewhere, opening it in a regular browser tab means `(app-context: installed)` does not match. The feature reflects the *current* browsing context, not global installation state.
5. **Usable via `matchMedia()`.** JavaScript can query and listen for changes using `window.matchMedia()`, following standard media query semantics.

### Behavior Summary

| Context | `(app-context: installed)` | `(display-mode: standalone)` |
|---------|:-------------------:|:----------------------------:|
| Browser tab | no match | no match |
| Installed, standalone mode | match | match |
| Installed, then goes fullscreen | **match** | **no match** |
| Installed, minimal-ui mode | **match** | **no match** |
| Any iframe inside app window | no match | no match |

The key benefit of this approach over the existing `display-mode` media query is that it provides a consistent signal for the application context, regardless of the current display mode of the window.

## Key Scenarios

### Scenario 1: Hiding the Install Prompt

A PWA shows an install banner to browser-tab users but hides it for users already in the installed experience:

```css
.install-banner {
  display: flex;
}

@media (app-context: installed) {
  .install-banner {
    display: none;
  }
}
```

Today, this breaks when the user enters fullscreen, and the banner flashes back. With `app-context`, the banner stays hidden.

### Scenario 2: App-Specific Navigation

An installed app shows a back button and "open in browser" link that don't make sense in a tab:

```css
.app-nav {
  display: none;
}

@media (app-context: installed) {
  .app-nav {
    display: flex;
  }
}
```

### Scenario 3: JavaScript Detection

A site conditionally shows a service worker update prompt only in the installed experience:

```js
if (window.matchMedia('(app-context: installed)').matches) {
  showUpdatePrompt();
}
```

### Scenario 4: Listening for Context Changes

Although uncommon, a document could transition between contexts (e.g., a browser tab being "captured" into an app window). Developers can listen for this reactively:

```js
window.matchMedia('(app-context: installed)').addEventListener('change', (e) => {
  document.body.classList.toggle('is-installed', e.matches);
});
```

## Alternatives Considered

### A Boolean Media Feature (`installed`)

An alternative approach is to define a boolean media feature named `installed`:

```css
@media (installed) {
  /* Styles for an installed app window */
}

@media not (installed) {
  /* Styles for a regular browser tab */
}
```

This design is simpler to author, following the pattern of other boolean media features like `(hover)` or `(scripting)`. However:

- **Naming ambiguity.** The name `installed` suggests a statement about global installation state. A developer might reasonably expect `(installed)` to be `true` if the app is installed on the device, even when viewed in a browser tab. In reality, the feature would only match when running *inside* an installed app window. The name `app-context` makes this distinction explicit, and describes the current context, not a global property.
- **Limited extensibility.** A boolean feature can only express two states. If future application contexts emerge, a boolean feature cannot accommodate them without introducing additional media features. An enumerated feature like `app-context` can grow by adding new values.
- **No `browser` counterpart.** With a boolean feature, styling for the browser-tab case requires `not (installed)`, which is less readable and less intentional than `(app-context: browser)`.

**Conclusion:** While the boolean form is simpler for a binary state check, the `app-context` enumerated approach offers clearer semantics and room to grow.

### Standardizing `navigator.standalone`

`navigator.standalone` has been historically supported on WebKit. It returns `true` when a page is displayed in standalone mode. However, the property has become a de facto method for detecting iOS/iPad rather than detecting installed apps:

- **Web compatibility risk.** Countless sites use `'standalone' in navigator` as a platform-detection signal for iOS/iPads, not to detect installed apps. Standardizing this property across Chrome, Firefox, and others would cause those checks to fire on all platforms, massively amplifying breakage. When Safari 17 brought `navigator.standalone` to macOS desktop, Mozilla was using `platform === 'MacIntel' && 'standalone' in navigator` to identify iPads, sending desktop Mac users to the iOS App Store. While it was fixed, this exposed ambiguous semantics that don't directly match to installation and causes web compatibility issues.
- **Naming confusion.** The term "standalone" is already defined as a `display-mode` value in the Web App Manifest spec. Reusing it as a navigator property name conflates two different concepts (installation state and display mode) making developer intent ambiguous.

**Conclusion:** `navigator.standalone` is unsuitable as a cross-browser standard. WebKit can maintain its proprietary behavior which is used to identify iOS devices; other engines should not adopt it. A CSS media feature like `app-context` avoids all of these issues.

### Extending `display-mode` with a New Value

One option is adding a value like `display-mode: installed`. However:

- `display-mode` is designed to reflect *how* the content is presented, not *whether* it is installed. Adding an installation signal conflates the two concepts.
- An app in fullscreen would still report `display-mode: fullscreen`, not `display-mode: installed`, so the problem remains unsolved.
- Media features can only match one value at a time, you cannot simultaneously match `display-mode: standalone` and `display-mode: installed`.

A related idea is a compound value like `display-mode: standalone-fullscreen`, representing a state where the app is both standalone and fullscreen. There are similarities here to how `window-controls-overlay` seems to extend standalone mode. An author could then write an OR query like `@media (display-mode: standalone) or (display-mode: standalone-fullscreen)` to cover both states. However, while `window-controls-overlay` is an appropriate extension of `display-mode` because it describes a visible presentation change (the title bar area has developer-mutable elements), installation state is not a presentation change — it does not alter how content is visually rendered. Encoding it into `display-mode` still conflates "is this app installed?" with "how is this app displayed?"

**Conclusion:** A separate media feature is the correct design. The `display-mode` media feature should remain focused on visible presentation differences. Installation state is orthogonal to how content is displayed, and a dedicated signal like `app-context` cleanly represents this without overloading `display-mode` with non-presentational semantics.

### A New JavaScript API (`navigator.isInstalled`)

A dedicated JS property could work, but:

- CSS media features are already bridged to JS via `matchMedia()`, so no separate API is needed.
- A CSS-first approach gives developers reactive, declarative styling without requiring JavaScript.

**Conclusion:** The CSS media feature, accessible via `matchMedia()`, covers both CSS and JS use cases with a single mechanism.

## Privacy and Security Considerations

### Privacy

- **No cross-site information leak.** The feature only reflects the current browsing context. It does not reveal whether the app is installed on the device, only whether the current document is *running* in an app window. A site opened in a browser tab always sees `(app-context: installed)` as non-matching, even if the user has the app installed.
- **No new fingerprinting surface.** The information exposed (the current app context) is already inferable from existing signals like `display-mode: standalone`, except that `app-context` is stable across display mode changes. It does not expose any new bits of entropy beyond what the user has already disclosed by opening the app window.
- **Iframe isolation.** The feature evaluates to `false` in all iframes, preventing embedded third-party content from detecting the host app's installation state.

### Security

- **No elevated privileges.** The media feature is purely informational; it does not grant any new capabilities.
- **No new attack surface.** The feature does not interact with system APIs, credentials, or storage in any novel way.

## Future Extension: Service Worker `clients` Integration

### Background: Service Workers and the Clients API

[Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) run in a separate thread from the page and act as a network proxy and event handler for the web app. They have no access to the DOM and therefore cannot use CSS media queries or `window.matchMedia()`. Instead, service workers interact with their controlled pages through the Clients API, which provides a list of [`Client`](https://developer.mozilla.org/en-US/docs/Web/API/Client) objects representing each window, tab, or worker controlled by the service worker.

Today, each `Client` exposes properties such as `url`, `id`, `type`, and `frameType`, but it does not indicate whether the client is running in an installed app window or a regular browser tab. Currently, there is no direct way for a service worker to distinguish between these contexts. Developers resort to workarounds like message-passing from the page to the service worker to relay installation state, which is fragile, asynchronous, and not always timely.

### Current Workaround: Message-Passing

Without a built-in property on `Client`, developers would manually relay the app context from the page to the service worker using `postMessage`. This typically involves the page detecting its own context (via `matchMedia`) on load and sending a message to the service worker, which then maintains a mapping of client IDs to their contexts:

**Page (client-side):**

```js
// On page load, inform the service worker of the current app context
if (navigator.serviceWorker.controller) {
  const isInstalled = window.matchMedia('(app-context: installed)').matches;
  navigator.serviceWorker.controller.postMessage({
    type: 'app-context-report',
    context: isInstalled ? 'installed' : 'browser'
  });
}
```

**Service Worker:**

```js
// Maintain a map of client contexts reported by pages
const clientContexts = new Map();

self.addEventListener('message', (event) => {
  if (event.data?.type === 'app-context-report') {
    clientContexts.set(event.source.id, event.data.context);
  }
});

// Later, when deciding how to handle a push notification:
self.addEventListener('push', async (event) => {
  const allClients = await self.clients.matchAll({ type: 'window' });
  const installedClient = allClients.find(
    client => clientContexts.get(client.id) === 'installed'
  );

  if (installedClient) {
    installedClient.postMessage({ type: 'update-available' });
  } else {
    self.registration.showNotification('New update available');
  }
});
```

This approach has several drawbacks:

- **Stale data.** The initial report is a point-in-time snapshot. If the app context changes after the report (a browser tab is captured into an app window, the user uninstalls the app while a page is open, or the user installs and relaunches in a different context), the service worker's map becomes outdated. To stay current, the page must also listen for `matchMedia` changes and send follow-up messages, adding further complexity.
- **Race conditions.** The service worker may need to act (e.g., on a `push` event) before the page has had a chance to send its context report.

### Proposed Extension

A natural complement to the `app-context` CSS media feature would be exposing the same information on the [`WindowClient`](https://developer.mozilla.org/en-US/docs/Web/API/WindowClient) interface in the Service Worker API. For example, an `appContext` property:

```js
const allClients = await self.clients.matchAll({ type: 'window' });
const installedClient = allClients.find(client => client.appContext === 'installed');

if (installedClient) {
  // An installed app window exists — post a message to it
  installedClient.postMessage({ type: 'update-available' });
} else {
  // No installed client — show a system notification
  self.registration.showNotification('New update available');
}
```

This extension would align the service worker's view of its clients with the information already available to pages via the `app-context` media feature, closing the gap in contexts where DOM-based detection is not possible. The exact shape of this API (property name, semantics for non-window clients, etc.) is left for future discussion and would be specified alongside the Service Worker and Clients API standards.

## References & Acknowledgements
Many thanks for valuable feedback and advice from:
- Lu Huang
- Alison Maher
- Alex Russell
- Rob Paveza

References:
- [W3C Media Queries Level 5](https://drafts.csswg.org/mediaqueries-5/)
- [Existing suggested detection methods](https://web.dev/learn/pwa/detection/)
