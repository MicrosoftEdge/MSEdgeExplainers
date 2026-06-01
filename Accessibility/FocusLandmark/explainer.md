# Focus Landmark: declarative landmark focus navigation for web apps

Authors: [Benjamin Beaudry](https://github.com/benbeaudry)

Last updated: 2026-06-01

* Expected venues: [WHATWG HTML](https://html.spec.whatwg.org/), [Open UI](https://open-ui.org/), [W3C ARIA WG](https://www.w3.org/WAI/ARIA/)
* Related primitives: ARIA [`landmark` role](https://w3c.github.io/aria/#landmark), [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/)
* Status: **early exploration**

> 

## Table of contents

* [Introduction](#introduction)
  * [Two navigation paradigms](#two-navigation-paradigms)
  * [Before / After at a glance](#before--after-at-a-glance)
* [Why a declarative primitive?](#why-a-declarative-primitive)
* [Goal](#goal)
  * [Non-goals](#non-goals)
* [Principles](#principles)
* [Quickstart](#quickstart)
* [Placeholder tokens](#placeholder-tokens)
* [Use cases](#use-cases)
* [Focus landmark concepts](#focus-landmark-concepts)
* [Landmark candidates](#landmark-candidates)
* [Relationship to ARIA semantics](#relationship-to-aria-semantics)
* [Possible entry target algorithm](#possible-entry-target-algorithm)
  * [The focuslandmarkstart attribute](#the-focuslandmarkstart-attribute)
* [Disabling landmark memory](#disabling-landmark-memory)
* [Ordering](#ordering)
* [Iframes, shadow DOM, and flattened order](#iframes-shadow-dom-and-flattened-order)
* [Interaction with related platform features](#interaction-with-related-platform-features)
* [Feature detection](#feature-detection)
* [Future considerations](#future-considerations)
* [Alternatives considered](#alternatives-considered)
* [Open questions](#open-questions)
* [Polyfilling](#polyfilling)
* [Privacy and security considerations](#privacy-and-security-considerations)
* [Design notes](#design-notes)
* [Index of placeholder values](#index-of-placeholder-values)
* [Acknowledgments](#acknowledgments)

## Introduction

Rich web apps are built from major regions, such as a ribbon, a navigation pane, a document canvas, a chat list, a message composer, or an assistant sidebar, much like native applications. Users want to move between these regions directly from the keyboard, without tabbing through every control in between. This is one of the most common accessibility and productivity requests I hear from people who use web apps.

Today there is no consistent way to do it. Some platforms support it natively, some web apps build their own version, and the browser treats the page as a single block. As a result, the same action works differently, or not at all, depending on the app.

On native platforms this navigation is routine. On Windows, for example, `F6` and `Shift+F6` move focus from one area of an app to the next, and browsers use the same idea for their own chrome (tab strip, address bar, and so on). But this stops at the edge of web content. Authors have no way to plug page regions into the browser's own focus-navigation cycle.

We're proposing a declarative HTML primitive, with the placeholder name `focuslandmark`, that lets authors mark the major regions of a page so the browser can move focus to the next or previous one. Browser UI and web content would then share a single landmark-navigation model, similar to how `Tab` already provides one focus order across browser chrome and web content. The feature defines the behavior; the browser owns the key, choosing the platform's natural one (for example `F6` on Windows) or picking one where the platform has no such convention.

Because this problem is common across many web apps, it seems worth standardizing so that the behavior, default accessibility, and interoperability come from the platform rather than from per-site script.

### Two navigation paradigms

It helps to place this next to the two keyboard-navigation paradigms the web already has, and the one it is missing:

1. **Sequential focus navigation** (`Tab` / `Shift+Tab`): the browser-managed order of tabbable elements. It already spans browser chrome and web content as one order, but it visits *every* control, which is exactly what users want to skip when moving between regions.
2. **Directional navigation** (arrow keys, D-pad), as standardized by [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/): moves focus *within* one composite widget (a toolbar, a tablist, a menu) without leaving it.
3. **Landmark navigation** (this proposal): moves focus *between* the major regions of a page, across frames, and ideally across the browser's own panes too. This is the paradigm that has no declarative web primitive today.

`focuslandmark` and `focusgroup` are distinct, composing features, not the same mechanism. `focusgroup` brings arrow-key movement to the items inside a region; `focuslandmark` brings region-to-region movement to the page. A single region can be both: `focuslandmark` lands focus in it, and once focus is inside, `focusgroup` owns arrow-key movement among its items.

### Before / After at a glance

This comparison is about *authoring burden and consistency*, not about promising a finished UX. Several hard parts (the platform key, AT interaction, cross-frame privacy) are discussed later and remain open.

Before (a custom shortcut, re-invented per app):

```html
<div id="ribbon">…</div>
<div id="nav">…</div>
<main id="canvas">…</main>
<script>
  // Without focuslandmark an author script must:
  //  - Pick a key (F6? Ctrl+F6? something else?) and hope it doesn't clash
  //    with the browser's own pane navigation or a nested app's shortcut.
  //  - Maintain an ordered list of regions and a "current region" pointer.
  //  - Decide where focus lands inside each region, and remember the last spot.
  //  - Re-implement all of this again in every embedded iframe, with custom
  //    cross-frame coordination.
</script>
```

After (declarative markup; the browser owns the key and the cross-frame plumbing):

```html
<header focuslandmark aria-label="App ribbon">…</header>
<nav focuslandmark aria-label="Primary">…</nav>
<main focuslandmark aria-labelledby="doc-title">…</main>
```

What changed: the regions are declared once, the browser maps the platform's natural key onto a "move to next / previous focus landmark" operation, and that operation flows through browser chrome, page regions, and embedded frames as one order. The author keeps only app-specific logic.

## Why a declarative primitive?

Authors can, and do, build this with a `keydown` handler today. So why add a primitive rather than leave it to script (or wait for a bundle of new native elements)?

1. **One shared navigation order.** A custom shortcut makes the page feel like a separate app bolted next to the browser. A declarative primitive lets the browser fold page regions into the same cycle as its own panes, the way `Tab` already unifies chrome and content. Script cannot reach the browser's chrome to do this.
2. **Composition across nested apps.** When a host app and an app embedded in an iframe both ship their own `Ctrl+F6`, the two need custom coordination. A browser-mediated model composes embedded regions into the parent order without the two apps negotiating a key.
3. **Accessibility by default.** A declarative signal lets the platform's accessibility infrastructure understand the regions and the navigation without bespoke ARIA wiring on every site. It builds on a concept assistive technology already exposes — landmarks — rather than inventing a new one.
4. **Incremental and low-risk.** An attribute opt-in is a far smaller change than minting new elements, and it lets existing landmark markup (`<nav>`, `<main>`, `<aside>`) become navigable with little or no new markup.

This complements native elements and `focusgroup` rather than competing with them. The same reasoning led to `focusgroup`: a keyboard pattern users already know from native apps, re-built by hand on every site, is a good candidate for the platform to provide once.

## Goal

Provide a declarative way for authors to mark the major regions of a page as focus landmarks, so the browser can move focus to the next or previous one with a single, platform-appropriate key that is shared between browser chrome and web content. The mechanism should:

* build on ARIA landmarks rather than invent a parallel concept;
* compose cleanly with `focusgroup` and with native landmark elements;
* flatten participating landmarks across iframe and shadow DOM boundaries, while letting the embedding context decide whether embedded content participates;
* keep cross-document traversal browser-mediated, never script-enumerable across origins.

As with `focusgroup`, I believe the solution has to be declarative: if it required JavaScript, there would be little advantage over what authors can already write themselves, and the platform's accessibility infrastructure would not get the signal it needs to make the behavior accessible by default.

### Non-goals

* **Mandating a key.** The key that triggers the navigation is left to the user agent per platform, matching each platform's existing convention. `F6` / `Shift+F6` are examples, not a requirement.
* **Replacing `focusgroup`.** Arrow-key movement *within* a composite widget stays the job of `focusgroup`.
* **A numeric ordering attribute.** This proposal deliberately avoids a positive-`tabindex`-style `focuslandmarkindex` (see [Ordering](#ordering)).
* **Selection or activation.** Like `focusgroup`, this is about moving focus, not changing selection or activating controls.

## Principles

1. **Intuitive in declarative markup.** A focus landmark should be easy to reason about from the source, behave rationally when nested or embedded, and integrate with existing semantics (landmarks, `tabindex`, `focusgroup`) rather than overriding them.
2. **Build on what exists.** Reuse ARIA landmarks for semantics and reuse `focusgroup`'s conventions (source-order default, `reading-flow` hook, memory with a `nomemory` opt-out, a `none` opt-out) so the two features stay consistent and authors learn one set of ideas.
3. **No new burden on current pages.** Landmark navigation is a new key-driven paradigm. Adding it should not change current focus order, tab order, or layout for any existing page.
4. **Browser-mediated, not script-mediated, across boundaries.** Cross-document traversal must not become a way for one origin to enumerate another's structure.

## Quickstart

In the simplest form, an author marks each major region with a bare `focuslandmark` attribute. Pressing the platform's landmark-navigation key then moves focus from one region to the next:

```html
<div focuslandmark aria-label="Ribbon">…</div>
<div focuslandmark aria-label="Navigation">…</div>
<div focuslandmark aria-label="Document">…</div>
```

What to notice:

* By default, focus lands on the first focusable element inside the region.
* This says nothing about semantics yet; a bare `focuslandmark` is, at minimum, a navigation marker. Whether it should also default to the `region` role on a generic element is an [open question](#open-questions).
* `aria-label` is present because a landmark needs an accessible name; this is ordinary landmark authoring, independent of the navigation behavior.

An author can override the entry point and aim focus at a preferred target with `focuslandmarkstart`:

```html
<div focuslandmark aria-label="Find in document">
  <input focuslandmarkstart type="search" aria-label="Search headings">
  <button>Go</button>
</div>
```

Because the regions an author wants to mark are almost always the page's landmarks, the value form can name a concrete landmark subrole. The element then takes part in landmark navigation *and* (this is the case that would deliberately confer semantics) gets that ARIA role, so the author writes it once:

```html
<div focuslandmark="navigation" aria-label="Primary">…</div>
<!-- one possible meaning: equivalent to role="navigation" focuslandmark -->
```

If a region already carries a landmark role, a bare `focuslandmark` just adds the navigation behavior and changes nothing about the semantics:

```html
<section role="search" focuslandmark aria-label="Site search">…</section>
```

A focus landmark can also be a `focusgroup`; the two compose. `focuslandmark` brings focus to the region, and once focus is inside, `focusgroup` owns arrow-key movement among the items:

```html
<div role="toolbar"
     aria-label="Formatting"
     focuslandmark
     focusgroup="toolbar wrap">
  <button>Bold</button>
  <button>Italic</button>
  <button>Underline</button>
</div>
```

What to notice:

* `focuslandmark` and `focusgroup` sit on the same element but do different jobs: between-region entry vs. within-region arrow movement.
* The `toolbar` role here comes from the author; `focuslandmark` does not change it.

Underneath, the user agent would define abstract operations such as "move to next focus landmark" and "move to previous focus landmark," and could fold them into its own pane-navigation cycle:

```text
browser tab strip → address bar → favorites bar → page landmark 1 → page landmark 2 → child-frame landmark 1 → browser pane …
```

The important property is that browser and web content form one flattened navigation order instead of separate, competing shortcuts.

## Placeholder tokens

The names below make the examples concrete. This table is **not** intended to settle naming or the value grammar; how behavioral tokens (`none`, `nomemory`) share a value space with subrole names is itself an [open question](#open-questions).

Simple usage:

```html
<element focuslandmark>…</element>
<element focuslandmark="<subrole>">…</element>
<element focuslandmark="nomemory">…</element>
<element focuslandmark="none">…</element>
```

| Token              | What it would do                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *(bare, no value)* | Marks the element as a focus landmark for navigation. On an element that is already a landmark, changes only where focus goes. On a generic element, whether it stays a pure navigation marker or defaults to the `region` role is open.                                                                                              |
| `<subrole>`        | Names a concrete landmark subrole (`banner`, `complementary`, `contentinfo`, `form`, `main`, `navigation`, `region`, `search`). The element joins landmark navigation and — in the case that deliberately confers semantics — takes that ARIA role. Whether the shorthand confers the role or only validates an existing one is open. |
| `nomemory`         | Opt out of remembering the region's last entry target (memory is on by default).                                                                                                                                                                                                                                                      |
| `none`             | Opt an element and its subtree out of an ancestor's flattened landmark order.                                                                                                                                                                                                                                                         |

Related attributes used in the examples:

| Attribute               | Applies to                       | What it would do                                                                                                                                                                     |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focuslandmarkstart`    | a descendant of a focus landmark | Marks the preferred entry target for the region.                                                                                                                                     |
| `focuslandmarkchildren` | `<iframe>`                       | Whether the child document's landmarks participate in the parent's flattened order: `include`, `none`, or `self` (treat the iframe as one opaque landmark). Names are bikesheddable. |

## Use cases

1. **Region-to-region navigation.** A user moves focus directly between a page's major regions (ribbon, navigation pane, canvas, composer, sidebar) with one platform key, without tabbing through intervening controls.
2. **Shared order with browser chrome.** The same key continues the browser's own pane cycle into the page and back out, so chrome and content feel like one app.
3. **Custom entry point.** An author directs focus to a specific element within a region (e.g., a search field) rather than the first focusable element.
4. **Memory of last position.** Returning to a region restores where the user last was, unless the author opts out (e.g., a tablist that should always start on the selected tab).
5. **Implicit landmarks.** Existing landmark markup (`<nav>`, `<main>`, `<aside>`, …) participates with little or no new attributes (an [open question](#open-questions) is whether this should be automatic).
6. **Composition with `focusgroup`.** Landmark navigation enters a composite widget; arrow keys then move within it.
7. **Embedded apps.** Landmarks inside an iframe participate in the host's order, under the host's control, without the two apps negotiating a shortcut.
8. **Opt-out.** A region or an embedded subtree can decline to participate.

## Focus landmark concepts

This section defines vocabulary only; the behavior is described in the sections that follow. The terms parallel `focusgroup`'s where possible.

* **Focus landmark definition** — an element carrying the `focuslandmark` attribute. It declares that the element is a destination for landmark navigation.
* **Landmark candidate** — an element eligible to be a focus landmark: a landmark (by role or by native element), or, depending on the resolution of the open questions, a generic element carrying `focuslandmark`.
* **Focus landmark** — a candidate that participates in navigation (not opted out, rendered, not `inert`).
* **Entry target** — the element that receives focus when navigation lands on a focus landmark. Resolved by the [entry target algorithm](#possible-entry-target-algorithm).
* **Remembered entry target** — the last element focused within a landmark, restored on re-entry unless `nomemory` is set.
* **Flattened landmark order** — the single ordered sequence of focus landmarks the navigation key steps through, composed across shadow DOM and (where permitted) iframe boundaries, and ideally across browser panes.
* **Child landmark inclusion** — whether an embedded document's landmarks join the parent's flattened order, controlled by the embedder via `focuslandmarkchildren`.

A focus landmark builds **on** ARIA landmarks; it does not replace them. A bare `focuslandmark` on a landmark changes only where focus goes, not what the element *is*.

## Landmark candidates

`landmark` is an abstract ARIA role with a set of concrete subroles, each with a matching HTML element: `banner` (`<header>`), `complementary` (`<aside>`), `contentinfo` (`<footer>`), `form` (`<form>`), `main` (`<main>`), `navigation` (`<nav>`), `region` (`<section>`), and `search` (`<search>`). These already describe the major areas of a page, which is exactly what this navigation moves between, so landmarks are the natural anchor for the primitive.

This raises a few candidate-related open questions, carried in [Open questions](#open-questions): whether the implicit-landmark HTML elements should become focus landmarks automatically; whether a bare `focuslandmark` on a non-landmark element stays a pure navigation marker or takes on a default `region` role; and how behavioral tokens such as `none` and `nomemory` share the value space with subrole names.

## Relationship to ARIA semantics

This is where building on landmarks pays off. The [ARIA landmark role definition](https://w3c.github.io/aria/#landmark) already says assistive technologies SHOULD let users quickly navigate to landmark regions, and that user agents MAY do the same. AT has offered landmark navigation for years, but the user-agent side has largely gone unbuilt. The intent with `focuslandmark` is to build that user-agent mechanism, and to make it richer than a plain jump: the author can control where focus lands inside the region (`focuslandmarkstart`), whether the region remembers its last focus, and whether embedded frames take part.

Because the regions are landmarks, `focuslandmark` does not need to invent a new semantic. A bare `focuslandmark` on an element that is already a landmark changes only where focus goes, not what the element is. The shorthand value form (`focuslandmark="navigation"`) is the case that would deliberately confer a role. On a non-landmark element, whether a bare `focuslandmark` should stay a pure navigation marker or also apply a default `region` role is open.

When focus moves into a region, assistive technology already understands landmarks: it observes the focus change and announces the newly focused element, so no new AT feature is required for the basic experience.

## Possible entry target algorithm

This is one possible resolution, not a settled algorithm. When moving to a focus landmark, the browser would resolve the entry target roughly as follows:

1. If the landmark has a remembered entry target and it is still eligible, restore it (unless `nomemory` is set).
2. Otherwise, focus the first eligible `focuslandmarkstart` descendant.
3. Otherwise, if the landmark is a `focusgroup`, use the focusgroup entry algorithm.
4. Otherwise, if the `focuslandmark` element itself is focusable, focus it.
5. Otherwise, skip the landmark.

A programmatic entry target that is not in the normal tab order should use `tabindex="-1"` so it can receive focus without becoming a tab stop:

```html
<section focuslandmark aria-labelledby="chat-title">
  <h2 id="chat-title" tabindex="-1" focuslandmarkstart>Chat</h2>
  …
</section>
```

### The focuslandmarkstart attribute

`focuslandmarkstart` marks the preferred entry target within a landmark. It mirrors `focusgroup`'s `focusgroupstart`: it only applies when there is no remembered entry target (or when `nomemory` is set); memory takes precedence. If several descendants carry it, the first in source order (or reading-flow order, where that applies) would win. Direction of travel (next vs. previous) would not change which element is chosen.

## Disabling landmark memory

By default a focus landmark remembers the last element focused within it and restores focus there on re-entry, much like `focusgroup`'s memory. Memory is usually what users want, but not always: a region whose entry point should be fixed (for example, a composer that should always open on its text field, or a tablist that should start on the selected tab) can opt out with `nomemory`.

```html
<form focuslandmark="nomemory" aria-label="Compose message">
  <textarea focuslandmarkstart aria-label="Message"></textarea>
  <button>Send</button>
</form>
```

When a focus landmark is *also* a `focusgroup`, I would prefer to reuse `focusgroup`'s existing focus-memory mechanism rather than define a separate one, so the two features behave consistently. The precise rules for when memory is cleared (hidden/`inert`/removed targets, and so on) would follow `focusgroup`'s lead.

## Ordering

I don't think we should follow the path `tabindex` took and introduce a numeric `focuslandmarkindex`. A numeric index would recreate the problems of positive `tabindex`: global-ish manual ordering, difficult maintenance, and surprising keyboard/AT behavior.

Instead, the default order should be DOM / shadow-including tree order, adjusted by the same reading-order concepts used for sequential focus navigation where applicable. This follows the direction already used by `focusgroup`: source order by default, with CSS [`reading-flow`](https://developer.mozilla.org/en-US/docs/Web/CSS/reading-flow) / `reading-order` as the platform hook when visual order intentionally differs from DOM order.

## Iframes, shadow DOM, and flattened order

Landmark navigation should flatten participating landmarks across boundaries, but the embedding context must be able to prevent embedded content from participating. The details below are exploratory; the firm requirement is the privacy property in the last paragraph.

`focusgroup` gives useful precedent but does not solve this exact problem. It crosses shadow DOM boundaries by default and has `focusgroup="none"` as an opt-out, but it does not define flattened iframe traversal; its explainer instead treats iframes with focusable content as key-conflict elements. Landmark navigation needs a browser-mediated child-navigable model.

Proposed shape:

* **Shadow DOM:** landmark discovery uses the shadow-inclusive tree, similar to `focusgroup`. A component author can opt a subtree out with `focuslandmark="none"`. Closed shadow roots remain UA-visible for navigation but not script-inspectable.
* **Iframes:** a child document's focus landmarks participate at the iframe element's position in the parent order, when the iframe is eligible and not opted out by the parent.
* **Parent control:** the embedding element decides whether the child is included, skipped, or treated as a single landmark. Names are bikesheddable, but the shape might be:

```html
<!-- Child landmarks participate in the flattened order. -->
<iframe src="chat.html" title="Chat" focuslandmarkchildren="include"></iframe>

<!-- Child landmarks do not participate. -->
<iframe src="ad.html" title="Sponsored content" focuslandmarkchildren="none"></iframe>

<!-- The iframe is one landmark; internals are not flattened into the parent order. -->
<iframe src="third-party-app.html"
        title="Third-party app"
        focuslandmark
        focuslandmarkchildren="self"></iframe>
```

The key requirement: cross-document traversal is **browser-mediated, not script-mediated**. A cross-origin parent must not gain a way to enumerate child landmark names, counts, or structure. The browser can still move focus through the composed order internally.

## Interaction with related platform features

* **`focusgroup`.** Distinct and composing, as shown in [Quickstart](#quickstart): `focuslandmark` enters a region, `focusgroup` moves within it. Where a landmark is also a focusgroup, memory and entry behavior should defer to the focusgroup mechanism.
* **ARIA landmarks and assistive technology.** `focuslandmark` is layered on the existing `landmark` role, so AT's existing landmark understanding and announcements apply; the proposal adds the user-agent navigation side the ARIA definition already anticipates.
* **CSS `reading-flow` / `reading-order`.** Used as the hook for landmark order when visual order intentionally differs from DOM order, matching how `focusgroup` treats directional order (see [Ordering](#ordering)).
* **Directional / spatial navigation.** Like `focusgroup`, this proposal defines an abstract "next / previous focus landmark" operation rather than a specific key or input device; mapping platform input (keyboard, D-pad, AT command) onto that operation is the user agent's responsibility. Document-level spatial navigation, where it exists, addresses a different scope (any focusable element) and is expected to compose with, not replace, landmark navigation.

## Feature detection

The IDL below shows *one possible shape* for feature detection, mirroring `focusgroup`'s reflected attributes. It is illustrative, not a proposed final interface, and the names are placeholders.

```webidl
partial interface mixin HTMLOrSVGElement {
  [SameObject, PutForwards=value, Reflect] readonly attribute DOMTokenList focusLandmark;
  [CEReactions, Reflect] attribute boolean focusLandmarkStart;
};

partial interface HTMLIFrameElement {
  [CEReactions, Reflect] attribute DOMString focusLandmarkChildren;
};
```

## Future considerations

* **Imperative companion for virtualized / canvas content.** For content that is virtualized or drawn to `<canvas>`, declarative DOM landmarks may not be enough. An imperative companion API could let such apps expose landmarks. My current expectation is that, with HTML-in-Canvas, the declarative proposal would already cover most cases, so this is left as a future consideration rather than part of a first version.
* **Browser-pane integration details.** Exactly how page landmarks interleave with the browser's own panes (and how `Shift+`-style reverse traversal behaves at the boundaries) is a user-agent concern this document only sketches.
* **Richer embedder policies.** Beyond `include` / `none` / `self`, embedders might eventually want finer control (e.g., a cap on how many child landmarks surface). Out of scope for now.

## Alternatives considered

* **Custom `keydown` handlers** for `F6`, `Ctrl+F6`, or `Command+F6`. There is no version of this without downsides. Overriding `F6` breaks the browser's own focus navigation and no longer flows with it. Picking `Ctrl+F6` or another shortcut makes the browser and the website feel like two separate apps rather than one unified experience the way `Tab` does. Either way it forces authors into more scripting, competes with browser shortcuts, and does not compose across nested apps.
* **Skip links.** Useful, but author-authored, visible links are not a full browser/app navigation model and don't fold into the browser's pane cycle. A complement, not the same thing.
* **A numeric `focuslandmarkindex`.** Rejected for the same reasons positive `tabindex` is discouraged; see [Ordering](#ordering).
* **A brand-new set of native elements.** Higher cost and slower coverage than an attribute that upgrades existing landmark markup; see [Why a declarative primitive?](#why-a-declarative-primitive).

## Open questions

These are the points we most want early feedback on. The goal is to standardize an end-to-end landmark-navigation operation so the browser, top-level web app, embedded web app, and assistive technology can all take part in one consistent model, while leaving the triggering key to each platform's convention.

1. **Is this a problem we should work on solving?** Does the region-to-region gap match what you see in real apps?
2. **Attribute names.** `focuslandmark`, `focuslandmarkstart`, and `focuslandmarkchildren` are placeholders. Better names?
3. **Implicit landmarks.** Should the HTML elements that already carry a landmark role (`<main>`, `<nav>`, `<aside>`, …) become focus landmarks automatically, without an explicit `focuslandmark` attribute?
4. **Eligibility and semantics.** Should `focuslandmark="<subrole>"` confer the ARIA role, or only validate one the element already has? And on a non-landmark element, should a bare `focuslandmark` stay a pure navigation marker or default to the `region` role?
5. **Value grammar.** How should behavioral tokens (`none`, `nomemory`) and subrole names share one attribute's value space without ambiguity?
6. **Virtualized / canvas content.** Is declarative DOM enough for a first version, or is a companion imperative API needed? (My current guess: with HTML-in-Canvas, declarative is likely enough.)
7. **Memory default.** Is "memory on by default, with `nomemory` to opt out" the right default for regions, as it is for focusgroups?

## Polyfilling

No polyfill exists yet. A polyfill could approximate the authoring shape within a single document (ordering, entry target, memory) using a `keydown` handler, but two central properties are out of reach for script and only a user agent can provide: folding page regions into the **browser's own pane cycle**, and **browser-mediated cross-origin iframe** traversal that does not expose one origin's landmark structure to another. Those limits are part of why this is proposed as a platform primitive rather than a library.

## Privacy and security considerations

### Privacy

The central concern is cross-document traversal. It must be browser-mediated, never script-mediated. A cross-origin parent must not gain a way to enumerate the names, counts, structure, or content of a child document's focus landmarks; it only decides, via the embedding `<iframe>` element's `focuslandmarkchildren`, whether the child participates (`include`), is skipped (`none`), or is treated as a single opaque landmark (`self`). The browser can move focus through the composed order internally without exposing the child's internals to the embedder.

Because the entry target on landing derives from markup the document already controls (`focuslandmarkstart`, focusgroup memory, the first focusable element), the feature does not expose new information that sequential focus navigation does not already reveal within a single origin. Closed shadow roots remain UA-visible for navigation but are not made script-inspectable.

### Security

No significant security concerns are anticipated beyond the cross-origin enumeration boundary described above, but community feedback is welcome.

## Design notes

There are no resolved standards discussions to link yet; this section records the rationale behind the current exploratory choices so reviewers can challenge them directly:

* **Build on ARIA landmarks rather than a parallel concept** — reuses semantics AT already exposes and avoids a second region model.
* **Reuse `focusgroup` conventions** (source-order default, `reading-flow` hook, default-on memory with `nomemory`, `none` opt-out) — so authors learn one set of ideas and the two features compose predictably.
* **No numeric ordering attribute** — avoids re-introducing positive-`tabindex` problems.
* **Browser-mediated cross-frame traversal** — the privacy boundary is a requirement, not a detail.
* **Define a mechanism, not a key** — keeps the proposal aligned with each platform's existing convention and with how `focusgroup` abstracts directional input.

As real discussion happens, this section would evolve into links to specific issues and their resolutions, the way mature explainers track their design history.

## Index of placeholder values

All names here are placeholders to make the examples concrete; none are proposed as final.

`focuslandmark` attribute:

| Description                          | Placeholder syntax                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Navigation marker only               | *(bare; no value)*                                                                                         |
| Confer / validate a landmark subrole | `focuslandmark="banner \| complementary \| contentinfo \| form \| main \| navigation \| region \| search"` |
| Disable entry memory                 | `focuslandmark="nomemory"`                                                                                 |
| Opt element and subtree out          | `focuslandmark="none"`                                                                                     |

Related attributes:

| Description                                           | Placeholder syntax                                |
| ----------------------------------------------------- | ------------------------------------------------- |
| Preferred entry target within a landmark              | `focuslandmarkstart` (boolean, on a descendant)   |
| Child-document landmark participation (on `<iframe>`) | `focuslandmarkchildren="include \| none \| self"` |

## Acknowledgments

Thanks to the authors and contributors of the ARIA landmark roles and of the [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/) explainer, whose conventions this proposal leans on, and to everyone in the accessibility and web-standards communities who has described this region-to-region navigation need.
