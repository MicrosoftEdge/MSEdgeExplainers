# Reflect the application context in the `display-mode` media feature

## Authors

- [Alexander Kyereboah](https://github.com/kyerebo), [Microsoft](https://microsoft.com)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues?q=is%3Aissue%20label%3A%22Application%20Context%20Media%20Feature%22)
- [CSSWG discussion](https://github.com/w3c/csswg-drafts/issues/14125)
- [Web App Manifest discussion](https://github.com/w3c/manifest/issues/1092)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C CSS Working Group](https://www.w3.org/groups/wg/css/)
* Current version: this document

Following signals from [CSSWG review](https://github.com/w3c/csswg-drafts/issues/14125), this explainer proposes extending `display-mode` to better reflect the application context. The behavior below is proposed, not a description of current browser support.

## Table of Contents

- [Introduction](#introduction)
  - [The `display-mode` Problem](#the-display-mode-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposed Solution](#proposed-solution)
  - [Allow Multiple Matching Values](#allow-multiple-matching-values)
  - [Add the `application` Value](#add-the-application-value)
  - [Behavior Rules](#behavior-rules)
  - [Behavior Summary](#behavior-summary)
- [Key Scenarios](#key-scenarios)
- [Alternatives Considered](#alternatives-considered)
- [Compatibility and Open Questions](#compatibility-and-open-questions)
- [Privacy and Security Considerations](#privacy-and-security-considerations)
- [Service Workers: Out of Scope](#service-workers-out-of-scope)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction

Today, web developers lack a reliable way to determine whether their app is running in an installed application context rather than an ordinary browser tab. Existing `display-mode` queries describe presentation, but their mutually exclusive matching loses useful information under common scenarios like entering fullscreen.

This proposal addresses the problem in two parts: allow **multiple `display-mode` values to match at once**, and add **`(display-mode: application)`** as a simple, stable query for the current application context.

Developers would like a way to style their content differently depending on whether their web app is running in an installed app window. Common use cases include:

- **Hiding install prompts** when the user is already in the installed experience.
- **Showing app-specific UI**, such as an "open in browser" link.
- **Adapting layout and navigation** to the current presentation, including fullscreen and the presence or absence of browser controls.

### The `display-mode` Problem

Currently, the best available signal is the [`display-mode` media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/display-mode#syntax):

```css
@media (display-mode: standalone) {
  .install-banner { display: none; }
}
```

Under today's mutually exclusive matching, this works only until the standalone app enters fullscreen. The matching value changes from `standalone` to `fullscreen`, and the query no longer matches. In the example above, the install banner reappears even though the document is still running in the same app window.

Removing mutual exclusivity would let `display-mode` retain useful signals through overlapping transitions, while adding `application` would give developers one query across application presentations.

## Goals

- Allow **concurrent `display-mode` matches** where the values describe compatible aspects of presentation, such as `standalone` and `fullscreen`.
- Provide a **stable, simple signal** through `(display-mode: application)` for the current application context.
- Provide both **declarative and imperative** access to the signal. CSS `@media` rules enable reactive styling, while `matchMedia()` enables JavaScript-driven logic.

## Non-goals

- **Expose global installation state.** A document in an ordinary browser tab would not learn whether its app is installed elsewhere on the device. This is about display presentation, not install state.
- **Change the manifest `display` member.** This proposal changes media-query matching. It does not add `"display": "application"` to the manifest.
- **Add a separate JavaScript API or standardize `navigator.standalone`.** The proposed signal is available through `matchMedia()`. See [Alternatives Considered](#alternatives-considered).
- **Expose media query state to service workers.** This is a broader limitation affecting all media features, outside the scope of this proposal.

## Proposed Solution

### Allow Multiple Matching Values

The `display-mode` media feature would no longer require its values to be mutually exclusive. Each value's definition would individually determine when it matches.

For example, a standalone app entering fullscreen would continue to match `standalone` while also matching `fullscreen`. Authors could query either aspect independently or combine them:

```css
@media (display-mode: standalone) and (display-mode: fullscreen) {
  /* Styles for a standalone app while it is fullscreen */
}
```

Likewise, an ordinary browser tab entering fullscreen could match both `browser` and `fullscreen`.

Similarly, `picture-in-picture` would match for content displayed in a Picture-in-Picture window through the Document Picture-in-Picture API, regardless of the app's configured display mode. Like entering fullscreen through the Fullscreen API, this would add a presentation signal rather than replace the underlying display-mode match.

`window-controls-overlay` would follow the same underlying-mode logic as `browser`, `standalone`, and `minimal-ui`. It is a display mode an app can request in its manifest through `display_override`, rather than an API-triggered presentation state. An app using this mode would retain its `window-controls-overlay` match when entering fullscreen or displaying content through the Document Picture-in-Picture API.

An app using `display: minimal-ui` would continue to match `minimal-ui` when it enters fullscreen, alongside `fullscreen`. Like standalone mode, minimal-ui provides an application presentation, with additional minimal navigation controls. Entering fullscreen would not replace that underlying mode, even though those controls may be hidden. This proposed behavior remains an [open question](#compatibility-and-open-questions).

This does not mean every value matches together. Each value keeps its own meaning, and some remain incompatible. For example, we can't match both `standalone` and `browser` at the same time as they are contradictory.

### Add the `application` Value

A new `application` value would answer the common question directly:

```css
@media (display-mode: application) {
  /* Styles for content running in an application context */
}
```

Here, an [application context](https://www.w3.org/TR/appmanifest/#dfn-application-context) is a top-level context to which the user agent has applied an application manifest, typically presented as an installed app window. Merely linking a manifest from a page or installing the app elsewhere does not make an ordinary browser tab an application context.

The `application` value indicates **whether the top-level context is an application context**. Values such as `standalone`, `minimal-ui`, `window-controls-overlay`, `fullscreen`, and `picture-in-picture` describe **how it is presented** and can match alongside `application`. The `browser` value instead describes a web app opened in a conventional browser tab or new browser window, which is not an application context. Therefore, `browser` and `application` cannot match at the same time.

Consequently, `application` is not a synonym for `standalone` and does not imply that browser controls are absent. It also is not an installation-status query: opening the same URL in an ordinary browser tab would not match `application`, even if the app is installed.

Both parts of the proposal matter. Non-exclusive matching preserves useful existing signals across presentation changes; `application` provides a single query covering all application presentations, including an app launched directly in fullscreen. JavaScript can use the same signal:

```js
const isApplication = window.matchMedia('(display-mode: application)').matches;
```

### Behavior Rules

1. **Match values independently according to their definitions.** A standalone app entering fullscreen would match both `standalone` and `fullscreen`. Content displayed through the Document Picture-in-Picture API would match `picture-in-picture` alongside its underlying display mode.
2. **Match `application` for the current application context.** The result would not depend on which presentation mode the app uses.
3. **Keep `application` stable across presentation-only changes.** Entering or leaving fullscreen would not change whether the document is running as an application.
4. **Keep `browser` and `application` mutually exclusive.** A conventional browser tab or new browser window would match `browser`, not `application`. This holds even in fullscreen, or when the same app is installed elsewhere.
5. **Reflect actual context changes.** If a document moves between a browser tab and an application context, the query would update. JavaScript could observe that through the usual `matchMedia()` change event.

Embedded documents would follow the [existing `display-mode` inheritance behavior](https://drafts.csswg.org/mediaqueries-5/#display-modes): child browsing contexts match the top-level context's display-mode values, including `application`. This applies to both same-origin and cross-origin embedded documents.

### Behavior Summary

The following illustrates the proposed behavior for top-level contexts. The last column lists relevant matching values, not an exhaustive set of every possible combination.

| Context | `(display-mode: application)` | Other matching `display-mode` values |
|---------|:----------------------------:|--------------------------------------|
| Conventional browser tab or new browser window | no match | `browser` |
| Ordinary browser tab, with the same app installed elsewhere | no match | `browser` |
| Ordinary browser tab in fullscreen | no match | `browser`, `fullscreen` |
| Application in standalone mode | match | `standalone` |
| Standalone application after entering fullscreen | match | `standalone`, `fullscreen` |
| Application in minimal-ui mode, outside fullscreen | match | `minimal-ui` |
| Minimal-ui application after entering fullscreen | match | `minimal-ui`, `fullscreen` (proposed; open question) |
| Application launched in fullscreen mode | match | `fullscreen` |
| Application in window-controls-overlay mode | match | `window-controls-overlay` |
| Window-controls-overlay application after entering fullscreen | match | `window-controls-overlay`, `fullscreen` |

A conventional browser tab or browser window would continue to match `browser`, not `application`, whether fullscreen was entered through the Fullscreen API or browser UI such as F11. Allowing concurrent matches does not change the mutual exclusivity of `browser` and `application`.

## Key Scenarios

### Scenario 1: Hiding the Install Prompt

A PWA shows an install banner to browser-tab users but hides it for users already in the installed experience:

```css
.install-banner {
  display: flex;
}

@media (display-mode: application) {
  .install-banner {
    display: none;
  }
}
```

Unlike today's standalone-only check, the proposed query would keep the banner hidden when the app enters fullscreen. It would also cover apps launched in fullscreen or using other application presentations. It would not suppress the banner in an ordinary browser tab merely because the app is installed elsewhere.

### Scenario 2: Application-Specific Fullscreen UI

An app hides its own window toolbar during fullscreen without changing other application-specific styling:

```css
@media (display-mode: application) and (display-mode: fullscreen) {
  .app-window-toolbar {
    display: none;
  }
}
```

The `application` query would remain matching while `fullscreen` changes. The combined rule would not apply to an ordinary browser tab in fullscreen.

### Scenario 3: JavaScript Detection

A site conditionally shows a service worker update prompt only in the installed experience:

```js
if (window.matchMedia('(display-mode: application)').matches) {
  showUpdatePrompt();
}
```

### Scenario 4: Listening for Context Changes

Although uncommon, a document could transition between contexts (e.g., a browser tab being "captured" into an app window). Developers can listen for this reactively:

```js
const applicationQuery = window.matchMedia('(display-mode: application)');

document.body.classList.toggle('is-application', applicationQuery.matches);
applicationQuery.addEventListener('change', (event) => {
  document.body.classList.toggle('is-application', event.matches);
});
```

Entering or leaving fullscreen alone would not trigger a change to this query. Moving the document into or out of an application context would.

## Alternatives Considered

### A Separate `application-context` Media Feature

Earlier versions of this explainer proposed a separate `application-context` media feature. The designs considered included a boolean query, `(application-context)`, and a discrete feature with explicit values. The [proposal reviewed by the CSSWG](https://github.com/w3c/csswg-drafts/issues/14125) used `application` and `none`:

```css
@media (application-context: application) {
  /* Styles for an installed app window */
}

@media (application-context: none) {
  /* Styles for a regular browser tab */
}
```

This approach provides a dedicated signal independent of presentation changes. It was motivated in part by the assumption that `display-mode` values would remain mutually exclusive.

The CSSWG discussion suggested addressing that restriction directly and expressing the context signal as another `display-mode` value. With concurrent matching, `application` can coexist with presentation values without being replaced by `fullscreen`. Authors get the same simple context check through the existing media feature, while the change also addresses the loss of existing presentation signals during fullscreen transitions.

**Conclusion:** Extend `display-mode` rather than introduce a separate feature. The distinction between current application context and presentation remains useful, but no longer requires separate media features.

### Naming the `display-mode` Value `installed`

An alternative is to name the new value `installed` instead of `application`:

```css
@media (display-mode: installed) {
  /* Styles for an installed app window */
}
```

**Naming ambiguity.** The name `installed` suggests global installation state. A developer might reasonably expect `(display-mode: installed)` to match if the app is installed on the device, even when the document is viewed in an ordinary browser tab. The intended signal only matches when the document is being displayed as an application. It does not answer whether an app was installed at some point or remains installed elsewhere.

**Conclusion:** Prefer `application`. Paired with `display-mode`, it describes the current application presentation rather than an installation lifecycle state.

### Standardizing `navigator.standalone`

`navigator.standalone` has historically been supported by WebKit to identify its standalone application experience. However, some sites also use the property's presence as an iOS/iPad detection signal:

- **Web compatibility risk.** Sites using `'standalone' in navigator` to detect a platform would also match other engines if they adopted this property. Such checks test for API presence, not whether the document is running as an application.
- **Naming confusion.** The term "standalone" is already a specific `display-mode` value. Reusing it for a general application-context signal makes it unclear whether an app in fullscreen or minimal-ui should qualify.

**Conclusion:** Do not standardize `navigator.standalone` as the solution to this problem. The `application` query offers CSS and JavaScript access without extending that legacy property to other engines.

### A New JavaScript API (`navigator.isInstalled`)

A dedicated JS property could work, but:

- CSS media features are already bridged to JS via `matchMedia()`, so no separate API is needed.
- A CSS-first approach gives developers reactive, declarative styling without requiring JavaScript.

**Conclusion:** `(display-mode: application)`, accessible via `matchMedia()`, covers both CSS and JS use cases with a single mechanism.

## Compatibility and Open Questions

- **Existing assumptions about exclusivity.** Allowing concurrent matches changes the behavior of existing queries, not just the availability of a new value. JavaScript that selects the first matching mode or assumes one query becomes false when another becomes true may also behave differently. The [compatibility follow-up in the CSSWG discussion](https://github.com/w3c/csswg-drafts/issues/14125#issuecomment-5203563961) reported no blocking historical concerns, but the specific matching changes still need compatibility evaluation.
- **Minimal-ui during fullscreen.** We propose that `minimal-ui` and `fullscreen` can both match when an app using `display: minimal-ui` enters fullscreen, just as `standalone` and `fullscreen` can. However, should `minimal-ui` stop matching when its navigation controls are hidden?

## Privacy and Security Considerations

### Privacy

- **Current context, not an installation inventory.** An ordinary top-level browser tab would not match `application`, even if the user has the corresponding app installed. The query would not allow that tab to discover installed apps elsewhere on the device.
- **More reliable context information.** Existing values such as `standalone` already reveal some application presentations. The proposal makes context detection stable across transitions and available in cases that are currently ambiguous, including fullscreen. The privacy assessment must account for that increased reliability rather than assume no additional information is exposed.
- **Embedded documents inherit the signal.** Following existing `display-mode` behavior, both same-origin and cross-origin iframes would match the top-level context's values, including `application`. Embedded third-party content could therefore observe whether the top-level context is an application context. This does not reveal whether an app is installed elsewhere on the device.

### Security

- **No elevated privileges.** The media feature is purely informational; it does not grant any new capabilities.
- **Not an authorization signal.** Matching `application` would not establish trust in a document or entitle it to sensitive operations.

## Service Workers: Out of Scope

[Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) cannot use `window.matchMedia()` to inspect their clients' media-query state. A page could relay its current application context through messaging, but a built-in solution would need broader consideration of media-query access from service workers. This proposal does not add a `Client` or `WindowClient` API.

## References & Acknowledgements
Many thanks for valuable feedback and advice from:
- Lu Huang
- Alison Maher
- Alex Russell
- Rob Paveza
- Marcos Caceres
- Ben Francis

References:
- [W3C Media Queries Level 5: Display Modes](https://drafts.csswg.org/mediaqueries-5/#display-modes)
- [Web App Manifest: Application Context](https://www.w3.org/TR/appmanifest/#dfn-application-context)
- [CSSWG review and discussion](https://github.com/w3c/csswg-drafts/issues/14125)
- [Existing suggested detection methods](https://web.dev/learn/pwa/detection/)
