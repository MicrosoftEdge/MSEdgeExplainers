# Installed Media Query

## Authors

- [Alexander Kyereboah](https://github.com/kyerebo), [Microsoft](https://microsoft.com)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues?q=is%3Aissue%20label%3A%22Installed%20Media%20Query%22)
- [Github Discussion](https://github.com/w3c/manifest/issues/1092)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C CSS Working Group](https://www.w3.org/groups/wg/css/)
* Current version: this document

## Table of Contents

- [Introduction](#introduction)
- [User-facing Problems](#user-facing-problems)
  - [The `display-mode` Problem](#the-display-mode-problem)
  - [The `navigator.standalone` Problem](#the-navigatorstandalone-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposed Solution](#proposed-solution)
  - [Syntax](#syntax)
  - [Behavior Rules](#behavior-rules)
  - [Behavior Summary](#behavior-summary)
- [Key Scenarios](#key-scenarios)
- [Alternatives Considered](#alternatives-considered)
- [Privacy and Security Considerations](#privacy-and-security-considerations)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction

The **`installed` CSS media feature** provides a reliable, boolean signal indicating whether the current document is running inside an installed web application window. It evaluates to `true` when the document is in an application context (a top-level browsing context with a manifest applied, presented in its own app window) and `false` otherwise.

```css
@media (installed: yes) {
  .install-banner { display: none; }
}
```

This feature separates the concept of "running as an installed app" from the app's current display mode, solving a long-standing gap in the web platform where developers lacked a clean, stable signal for installation state.

## User-facing Problems

Developers frequently need to know whether their web app is running in an installed app window. Common use cases include:

- **Hiding install prompts** when the user is already in the installed experience.
- **Showing app-specific UI** (e.g., a title bar, back navigation, or "open in browser" link) that only makes sense in an app window.
- **Adapting layout** for the app window's chrome (or lack thereof).

### The `display-mode` Problem

Today, the best available signal is the `display-mode` media query:

```css
@media (display-mode: standalone) {
  .install-banner { display: none; }
}
```

This works only until the app enters fullscreen. When a user triggers fullscreen, the display mode changes from `standalone` to `fullscreen`, and the media query no longer matches. In the example above, the install banner reappears, layout shifts, and app-specific UI disappears. The app is still *installed*, but the *presentation* no longer reflects this.

The two concepts of "is this an installed app?" and "what is the current display mode?" are **orthogonal** and should be treated as such. A web app can be installed and rendered in `standalone`, `fullscreen`, or `minimal-ui` mode. Developers need a signal that remains stable across all of these states.

### The `navigator.standalone` Problem

WebKit has shipped `navigator.standalone` as a property on iOS for a considerable amount of time. However, this property has become a de facto method for detecting iOS/iPad rather than detecting installed apps. When Safari 17 brought `navigator.standalone` to macOS desktop, Mozilla was using `platform === 'MacIntel' && 'standalone' in navigator` to identify iPads, sending desktop Mac users to the iOS App Store. While it was fixed, this exposed ambiguous semantics that don't directly match to installation and causes web compatibility issues.

This makes `navigator.standalone` unsuitable as a cross-browser standard.

## Goals

- Provide a **stable, boolean signal** for "running in an installed app window" that is separate from display mode.
- Require **no new JavaScript API**. CSS `@media` rules and `matchMedia()` cover both declarative and imperative use cases.

## Non-goals

- **Standardize `navigator.standalone` cross-browser.** WebKit can keep its existing behavior; other engines should not adopt it. See [Alternatives Considered](#alternatives-considered).
- **Replace `display-mode` media queries.** `display-mode` remains useful for adapting to presentation changes. `installed` complements it.

## Proposed Solution

### Syntax

A new CSS media feature named `installed` with two valid values:

```css
@media (installed: yes) {
  /* Styles applied only inside an installed app window */
}

@media (installed: no) {
  /* Styles applied only in a regular browser tab */
}
```

### Behavior Rules

1. **Evaluates to `yes`** when the document is in an application context: a top-level browsing context with a manifest applied, presented in its own OS-level app window.
2. **Remains `yes` regardless of display mode.** Whether the app is in `standalone`, `fullscreen`, or `minimal-ui` mode, the `installed` media feature continues to match.
3. **Only applies to top-level browsing contexts.** In any iframe (same-origin or cross-origin) the feature evaluates to `no`.
4. **Evaluates to `no` in browser tabs.** Even if the same URL has an installed app elsewhere, opening it in a regular browser tab yields `installed: no`. The feature reflects the *current* browsing context, not global installation state.
5. **Usable via `matchMedia()`.** JavaScript can query and listen for changes using `window.matchMedia('(installed: yes)')`, following standard media query semantics.

### Behavior Summary

| Context | `(installed: yes)` | `(display-mode: standalone)` |
|---------|:-------------------:|:----------------------------:|
| Browser tab | false | false |
| Installed, standalone mode | true | true |
| Installed, then goes fullscreen | **true** | **false** |
| Installed, minimal-ui mode | **true** | **false** |
| Any iframe inside app window | false | false |

The key scenario today is "Installed, then goes fullscreen". With `display-mode: standalone`, the installed signal is lost when entering fullscreen. With `installed: yes`, it remains stable.

## Key Scenarios

### Scenario 1: Hiding the Install Prompt

A PWA shows an install banner to browser-tab users but hides it for users already in the installed experience:

```css
.install-banner {
  display: flex;
}

@media (installed: yes) {
  .install-banner {
    display: none;
  }
}
```

Today, this breaks when the user enters fullscreen, and the banner flashes back. With `installed`, the banner stays hidden.

### Scenario 2: App-Specific Navigation

An installed app shows a back button and "open in browser" link that don't make sense in a tab:

```css
.app-nav {
  display: none;
}

@media (installed: yes) {
  .app-nav {
    display: flex;
  }
}
```

### Scenario 3: JavaScript Detection

A site conditionally shows a service worker update prompt only in the installed experience:

```js
if (window.matchMedia('(installed: yes)').matches) {
  showUpdatePrompt();
}
```

### Scenario 4: Listening for Context Changes

Although uncommon, a document could transition between contexts (e.g., a browser tab being "captured" into an app window). Developers can listen for this reactively:

```js
window.matchMedia('(installed: yes)').addEventListener('change', (e) => {
  document.body.classList.toggle('is-installed', e.matches);
});
```

## Alternatives Considered

### Standardizing `navigator.standalone`

`navigator.standalone` has been historically supported on WebKit. It returns `true` when a page is displayed in standalone mode. However:

- **Web compatibility risk.** Countless sites use `'standalone' in navigator` as a platform-detection signal for iOS/iPads, not to detect installed apps. Standardizing this property across Chrome, Firefox, and others would cause those checks to fire on all platforms, massively amplifying breakage.
- **Naming confusion.** The term "standalone" is already defined as a `display-mode` value in the Web App Manifest spec. Reusing it as a navigator property name conflates two different concepts (installation state and display mode) making developer intent ambiguous.

**Conclusion:** WebKit can maintain its proprietary behavior which is used to identify iOS devices; other engines should not adopt it. A CSS media feature avoids all of these issues.

### Extending `display-mode` with a New Value

One option is adding a value like `display-mode: installed`. However:

- `display-mode` is designed to reflect *how* the content is presented, not *whether* it is installed. Adding an installation signal conflates the two concepts.
- An app in fullscreen would still report `display-mode: fullscreen`, not `display-mode: installed`, so the problem remains unsolved.
- Media features can only match one value at a time, you cannot simultaneously match `display-mode: standalone` and `display-mode: installed`.

**Conclusion:** A separate media feature is the correct design.

### A New JavaScript API (`navigator.isInstalled`)

A dedicated JS property could work, but:

- CSS media features are already bridged to JS via `matchMedia()`, so no separate API is needed.
- A CSS-first approach gives developers reactive, declarative styling without requiring JavaScript.

**Conclusion:** The CSS media feature, accessible via `matchMedia()`, covers both CSS and JS use cases with a single mechanism.

## Privacy and Security Considerations

### Privacy

- **No cross-site information leak.** The feature only reflects the current browsing context. It does not reveal whether the app is installed on the device, only whether the current document is *running* in an app window. A site opened in a browser tab always sees `installed: no`, even if the user has the app installed.
- **No new fingerprinting surface.** The information exposed (`true`/`false` for the current context) is already inferable from existing signals like `display-mode: standalone`, except that `installed` is stable across display mode changes. It does not expose any new bits of entropy beyond what the user has already disclosed by opening the app window.
- **Iframe isolation.** The feature evaluates to `false` in all iframes, preventing embedded third-party content from detecting the host app's installation state.

### Security

- **No elevated privileges.** The media feature is purely informational; it does not grant any new capabilities.
- **No new attack surface.** The feature does not interact with system APIs, credentials, or storage in any novel way.

## Stakeholder Feedback / Opposition

<!-- TODO: Add feedback from other browser vendors and web developers as discussions progress. -->

| Stakeholder | Position | Notes |
|-------------|----------|-------|
| Edge | Positive |  |
| Chrome | Positive |  |
| Mozilla | - | Pending feedback |
| WebKit | Positive | |
| Web developers | Positive | Frequently requested in [CRBugs](https://issues.chromium.org/issues/331692948#comment15) and [issue discussions](https://github.com/w3c/manifest/issues/1092#). |

## References & Acknowledgements
Many thanks for valuable feedback and advice from:
- Lu Huang

References:
- [W3C Media Queries Level 5](https://drafts.csswg.org/mediaqueries-5/)
- [Existing suggested detection methods](https://web.dev/learn/pwa/detection/)

<!-- TODO: Add acknowledgements as the proposal progresses. -->
