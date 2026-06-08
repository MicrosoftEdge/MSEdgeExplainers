# **Web Install API**

## Authors:

- [Diego Gonzalez](https://github.com/diekus), [Microsoft](https://microsoft.com)
- Lia Hiscock, Microsoft

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22Web%20Install%20API%22)

> **Here for Origin Trials?**
> The Web Install API is currently available as an [Origin Trial](https://developer.chrome.com/docs/web-platform/origin-trials/) in Chrome and Microsoft Edge versions 143-148. See [Origin Trial Instructions](https://github.com/MicrosoftEdge/Demos/blob/main/pwa-web-install-api/README.md) to learn more.
>
> The Origin Trial exposes the earlier `install_url`-based shape of the API, which is being replaced. For background on that earlier design, see the archived [install-url-version/](./install-url-version/) explainers.

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

- This document status: **Active**
- Expected venue: [W3C Web Incubator Community Group](https://github.com/WICG)
- **Current version: this document**

## Table of contents

- [Introduction](#introduction)
- [Relationship to other proposals](#relationship-to-other-proposals)
- [User-Facing Problem](#user-facing-problem)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
- [Proposed Approach](#proposed-approach)
  - [Sample code](#sample-code)
- [Alternatives considered](#alternatives-considered)
- [Accessibility, Privacy, and Security Considerations](#accessibility-privacy-and-security-considerations)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [Security and Privacy Self-Review](#security-and-privacy-self-review)
- [Additional Links](#additional-links)

## Introduction

<!--
TODO: 2-3 paragraphs framing the feature.

Recommended beats (modeled on the PWA Origin Migration explainer):
- One sentence naming what the feature is.
- One paragraph on the gap in today's web platform that motivates it.
- One paragraph naming what this proposal introduces, in one sentence,
  without going into mechanism. The "how" belongs in Proposed Approach.

Note the pivot from the earlier design: the previous `install_url` shape
took a page URL and inferred the app from it. This proposal takes the
app's manifest URL directly, which removes the cross-origin discovery
and privacy surfaces that blocked the earlier design from shipping.
-->

## Relationship to other proposals

This document is the **main** specification for web app installation initiated
by a website. It defines:

- The `navigator.install()` JavaScript entry point.
- The shared install algorithm used by every entry point: manifest fetching,
  parsing, and validation; user activation, sandbox, and cross-origin gates;
  the consent UI contract; the error taxonomy returned to callers.

A second, **declarative** entry point is incubating in parallel:

- [`<install>` element](https://github.com/WICG/install-element) (WICG) — a
  user-agent-styled button that invokes the same install algorithm defined
  here. It is a [permission element](https://wicg.github.io/PEPC/permission-elements.html)
  and adds element-specific surfaces (PEPC validity gating, `promptaction` /
  `promptdismiss` events, fallback content, launch-when-installed UI).

The `<install>` repository hosts two explainers reflecting the element's
current state of transition:

- [README.md](https://github.com/WICG/install-element/blob/main/README.md) —
  the Origin Trial shape (`installurl` / `manifestid`), available through
  Chrome/Edge M152. Normative for OT participants only.
- [manifest-url-explainer.md](https://github.com/WICG/install-element/blob/main/manifest-url-explainer.md) —
  the forward-looking design that aligns the element's attributes with
  `navigator.install()`'s manifest-URL shape. Incubating.

To avoid duplication, the topic split (against the forward-looking element
design) is:

| Topic | Defined here | Defined in `<install>` |
|---|---|---|
| `navigator.install()` shape and IDL | Yes | — |
| `<install>` element shape and IDL | — | Yes |
| Manifest fetch / parse / validate pipeline | Yes (normative) | References this doc |
| Consent UI contract | Yes (normative) | References this doc, adds element flow |
| Cross-origin, sandbox, activation gates | Yes (normative) | References this doc, adds PEPC visibility overlay |
| Error taxonomy | Yes (normative) | Maps backend errors to element events |
| `manifestId` privacy contract | Yes | References this doc |
| Launch-when-installed behavior | Not exposed via JS API | Yes |
| PEPC mixin behavior (`isValid`, `validationstatuschange`, etc.) | — | Yes |
| Element fallback content | — | Yes |

**During the Origin Trial bridge period**, the element's OT shape performs an
extra document-fetch step (load `installurl`, find `<link rel="manifest">`)
before invoking the backend defined here. That step is element-specific and
documented in install-element's README. The forward-looking design removes
it and aligns the element fully with this document.

Readers working on the `<install>` element should treat this document as the
normative source for backend behavior. Readers working on `navigator.install()`
do not need to read the element explainers.

## User-Facing Problem

<!--
TODO: Open with a concrete, named user story (not a developer story).
The migration explainer's opener is a good template: "Imagine you have
'SocialApp' installed from www.example.com/social..."

Pick one or two scenarios that a non-expert reader would recognize.
Candidates to consider:
- A user discovering a PWA via a directory / catalog / aggregator page
  and wanting to install it without leaving that page.
- A developer's marketing page or docs site offering "install our app"
  for a PWA that lives at a different origin.
- A user-curated list (e.g., "best productivity PWAs") that wants to
  offer one-click install rather than send users on a discovery hunt.

Each scenario should end with what the user *experiences* today vs.
what this proposal makes possible. Keep mechanism out of this section.
-->

### Goals

<!--
TODO: Bullet list. Each goal should be a sentence, not a phrase.
Suggested starting points:
- Let a site install a web app whose identity it knows (by manifest URL),
  subject to user consent.
- Keep the consent UI clearly attributable: the user should see which
  site is asking and which app is being installed.
- Avoid creating a cross-origin probing surface: a site should learn
  nothing about install state, manifest contents, or app identity that
  it didn't already supply.
- Compose with existing PWA install machinery (no parallel install path).
-->

### Non-goals

<!--
TODO: Bullet list. Be explicit about what this proposal does NOT do,
especially capabilities the prior `install_url` design promised:
- Discovering an app's manifest from an arbitrary page URL. The caller
  must supply the manifest URL directly.
- Silent / unattended installation. User consent is always required.
- Installing native apps, extensions, or non-PWA artifacts.
- Reporting install state of arbitrary apps back to the caller.
-->

## Proposed Approach

<!--
TODO: This is the "how" section. Recommended sub-structure:

1. The shape of the API at the call site (one short code sample, in
   prose form: "A page calls navigator.install({manifest, id?}). The
   browser fetches the manifest, parses it, and prompts the user.")
2. What the browser does (manifest fetch, validation, consent UI).
3. What the caller gets back (the promise resolution shape, and
   importantly what is NOT returned — no manifest_id on success, to
   avoid cross-origin probing).
4. How this composes with the existing manifest pipeline.

Note for the writer: the legacy install_url overloads still ship behind
the Origin Trial. Decide whether to describe the new shape only, or to
contrast against the legacy shape. The migration explainer does the
former and is cleaner for it.
-->

### Sample code

<!--
TODO: One small example per scenario from User-Facing Problem.
Keep examples to ~10 lines. Show the happy path first, then one
error-handling example.

Skeleton:

```js
// App directory installing a third-party PWA by manifest URL.
const button = document.querySelector('#install');
button.addEventListener('click', async () => {
  try {
    await navigator.install({
      manifest: 'https://app.example.com/manifest.webmanifest',
    });
  } catch (err) {
    // AbortError: user dismissed the prompt.
    // DataError: manifest could not be fetched or parsed.
    // TypeError: arguments were invalid.
  }
});
```

Also show the optional `id` form, with a note that it must be an
absolute URL when supplied.
-->

## Alternatives considered

<!--
TODO: One sub-section per alternative. Each should have a short
description, a Pros list, and a Cons list. The migration explainer's
format is a good template.

Required entries (these are alternatives that were considered and
rejected during the install_url -> manifest pivot — write them up so
the design history is captured):

### `install_url`-based discovery (the previous design)

Cover: what it was, why it shipped to OT, what privacy/security review
flagged that blocks it from shipping, and why a manifest-URL-based API
addresses those concerns.

### Inferring manifest URL from a page URL

Browser fetches `install_url`, parses HTML, finds <link rel="manifest">.
Cons: cross-origin fetch + parse with the calling origin as initiator;
manifest path is an attacker-controllable redirect target; latency.

### Always require the caller to supply both manifest URL and id

Cons: id is declared inside the manifest; requiring callers to supply
it duplicates state and creates a mismatch failure mode. The current
proposal makes `id` optional and validates against the manifest.

### Returning the resolved manifest_id from install()

Cons: cross-origin fingerprinting surface (probe-by-resolution). The
current proposal omits it from the result.
-->

## Accessibility, Privacy, and Security Considerations

### Accessibility

<!--
TODO: The install consent UI is browser-rendered, using existing
accessible PWA install surfaces. Note any new surfaces this proposal
introduces (probably none), and confirm keyboard / screen reader
parity with the existing install prompt.
-->

### Privacy

<!--
TODO: Walk through the privacy surfaces. Recommended structure:

- What the caller learns on success. (Resolution of the promise =
  "user accepted install". Nothing about the manifest contents,
  app identity, or pre-existing install state.)
- What the caller learns on rejection. (Distinguish error types that
  are safe to expose from ones that aren't. AbortError vs. DataError
  vs. TypeError vs. NotAllowedError.)
- Why manifest_id is intentionally NOT returned: it would let a caller
  probe cross-origin app identity by trying candidate ids and observing
  whether resolution succeeded.
- Why the API requires transient user activation.

This section will get scrutiny in TAG and security review — be
explicit about what was traded off.
-->

### Security

<!--
TODO:
- Transient user activation requirement.
- Sandbox restrictions (the API is gated off in sandboxed frames
  without the appropriate token).
- The install itself uses the same manifest validation, icon fetch,
  and consent flow as existing PWA install — no new code path that
  bypasses those checks.
- Cross-origin manifest fetches happen with the calling document
  as initiator (or document — clarify), and follow the same CORS
  / no-cors rules as a regular manifest fetch from that origin.
-->

## Stakeholder Feedback / Opposition

<!--
TODO: Fill in as positions land. Template:

- Developers: TBD. Link to any public feedback threads.
- W3C TAG Review: [TBD link]
- Browser Standards Positions:
  - Chrome: [Implementing — link to chromestatus]
  - Mozilla: [TBD link]
  - WebKit: [TBD link]
-->

## Security and Privacy Self-Review

<!--
TODO: Answer the 22 questions from
https://www.w3.org/TR/security-privacy-questionnaire/

The archived `install-url-version/web-install-security-privacy-review.md`
has answers for the prior design; many can be adapted but the privacy
answers in particular need to be rewritten for the new shape (especially
2.1, 2.5, and 2.13 — the surfaces narrowed substantially).
-->

## Additional Links

- Archived earlier design: [install-url-version/explainer.md](./install-url-version/explainer.md)
- Origin Trial demo: [MicrosoftEdge/Demos](https://github.com/MicrosoftEdge/Demos/blob/main/pwa-web-install-api/README.md)
- [Chrome Status](https://chromestatus.com/feature/5183481574850560)
- [TAG review (prior design)](https://github.com/w3ctag/design-reviews/issues/1051)
