# Focus Landmark: declarative landmark focus navigation for web apps

Authors: [Benjamin Beaudry](https://github.com/benbeaudry)

Last updated: 2026-07-09

* Expected venues: [Open UI](https://open-ui.org/), [WHATWG HTML](https://html.spec.whatwg.org/), [W3C ARIA WG](https://www.w3.org/WAI/ARIA/)
* Related primitives: ARIA [`landmark` role](https://w3c.github.io/aria/#landmark), [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/)
* Status: **early exploration**

## Table of contents

* [Introduction](#introduction)
  * [Two navigation paradigms](#two-navigation-paradigms)
  * [Before / After at a glance](#before--after-at-a-glance)
* [Why a declarative primitive?](#why-a-declarative-primitive)
* [Prior art](#prior-art)
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
* [Opting out](#opting-out)
* [Iframes, shadow DOM, and flattened order](#iframes-shadow-dom-and-flattened-order)
  * [Composition with focus-without-user-activation](#composition-with-focus-without-user-activation)
* [Interaction with related platform features](#interaction-with-related-platform-features)
* [Feature detection](#feature-detection)
* [Future considerations](#future-considerations)
* [Open questions](#open-questions)
* [Privacy and security considerations](#privacy-and-security-considerations)
* [Index of placeholder values](#index-of-placeholder-values)
* [Acknowledgments](#acknowledgments)

## Introduction

Rich web apps are often divided into major work regions, such as a navigation pane, an editor, and a comments or inspector pane. A person using a keyboard interface may want to move DOM focus directly between those regions without traversing every control in between.

Some applications implement their own region commands, and screen readers already provide heading and landmark navigation. Those assistive technology commands often move a reading position rather than DOM focus. The narrower gap is that mainstream browsers do not provide an interoperable operation for moving DOM focus among author-designated page regions.

Some platforms and browsers use `F6`-family commands to move between application or browser panes. Those commands are useful prior art, but page authors cannot consistently add page regions to the browser's own cycle.

I am proposing a declarative HTML primitive, with the placeholder name `focuslandmark`, that lets authors mark major regions so the browser can move focus to the next or previous one. Browser UI, web content, and embedded documents could then share a browser-managed navigation model. The user agent owns the command and chooses an appropriate platform binding; `F6` is illustrative rather than required.

### Two navigation paradigms

It helps to place this next to two existing keyboard-navigation patterns and the missing region-level operation:

1. **Sequential focus navigation** (`Tab` / `Shift+Tab`): the browser-managed order of tabbable elements. It visits each control, which is useful for local interaction but inefficient for moving between distant regions.
2. **Directional navigation** (arrow keys), as proposed by [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/): moves focus *within* one composite widget, such as a toolbar or tablist. Its standardization is ongoing.
3. **Landmark navigation** (this proposal): moves DOM focus *between* major page regions, across frames where permitted, and potentially as part of the browser's own pane cycle.

`focuslandmark` and `focusgroup` address different levels of navigation. A focusgroup may be inside a focus landmark, and its generated or current tab stop may become the landmark's entry target under the normal focusgroup rules.

### Before / After at a glance

**Generic regions (explicit opt-in).** Generic elements that already carry `role="region"` add a bare `focuslandmark` to join landmark navigation; it changes only where focus goes, not the semantics.

Before:

```html
<div role="region" aria-label="App ribbon">…</div>
<div role="region" aria-label="Primary">…</div>
<div role="region" aria-label="Canvas">…</div>
<script>
  // Pick a key, maintain an ordered list of regions, choose entry targets,
  // remember prior focus, and coordinate separately with embedded documents.
</script>
```

After:

```html
<div role="region" focuslandmark aria-label="App ribbon">…</div>
<div role="region" focuslandmark aria-label="Primary">…</div>
<div role="region" focuslandmark aria-label="Canvas">…</div>
```

**Semantic landmark elements (possible implicit participation).** Under the proposed implicit behavior, existing landmark markup stays the same:

```html
<header aria-label="App ribbon">…</header>
<nav aria-label="Primary">…</nav>
<main>…</main>
```

Whether semantic landmarks participate implicitly, rather than always needing an explicit `focuslandmark`, is an [open question](#open-questions).

## Why a declarative primitive?

Authors can, and do, approximate same-document region cycling with a `keydown` handler. The full feature proposed here needs user-agent support:

1. **One shared command and order.** The browser can fold page regions into its own pane cycle. Page script cannot own browser shortcuts or reach browser chrome.
2. **Composition across nested documents.** Browser mediation can place eligible child-frame regions at the iframe's position without requiring host and child applications to negotiate a key or expose cross-origin structure.
3. **Browser-only discovery and integration.** Script already requests native focus through `element.focus()`. User-agent support adds common eligibility and ordering across closed shadow roots and documents, root fallback without author-visible `tabindex` mutation, and browser-chrome integration.
4. **Incremental markup.** The proposal builds on existing landmark markup and adds entry and memory behavior without requiring new region elements.

This is an additive navigation operation. It does not trap focus or remove or reorder ordinary `Tab` stops.

## Prior art

The examples below are representative evidence that applications implement region navigation with different keys, orders, and entry models.

Several Microsoft 365 web applications document product-specific `F6`-family navigation:

| Application                                                                                                                                      | Documented behavior                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Word for the web](https://support.microsoft.com/en-us/accessibility/word/use-a-screen-reader-to-explore-and-navigate-word)                      | `Ctrl+F6` and `Ctrl+Shift+F6` cycle document content, status bar, title banner, and ribbon tabs.                                                                                                                                       |
| [PowerPoint for the web](https://support.microsoft.com/en-US/accessibility/powerpoint/use-keyboard-shortcuts-to-create-powerpoint-presentations) | `Ctrl+F6` and `Ctrl+Shift+F6` on Windows, with Command variants on macOS, cycle the slide, Notes, status and title bars, ribbon, and thumbnails.                                                                                       |
| [Excel for the web](https://support.microsoft.com/en-us/accessibility/excel/keyboard-shortcuts-in-excel)                                         | `Ctrl+F6` moves between the ribbon and workbook. The documentation also describes `Ctrl+F6` and `Ctrl+Shift+F6` cycling landmark regions, but does not give one complete order.                                                        |
| [Outlook on the web](https://support.microsoft.com/en-us/accessibility/outlook/use-a-screen-reader-to-explore-and-navigate-outlook-mail)         | Mail uses `Ctrl+F6` and `Ctrl+Shift+F6` to cycle main regions. [Calendar](https://support.microsoft.com/en-us/accessibility/outlook/use-a-screen-reader-to-explore-and-navigate-outlook-calendar) documents a `Ctrl+F6` Jump-to model. |
| [Teams for the web](https://support.microsoft.com/en-US/accessibility/teams/keyboard-shortcuts-for-microsoft-teams)                              | `Ctrl+F6` and `Ctrl+Shift+F6` move between sections; details vary by view and settings.                                                                                                                                                |
| [OneNote for the web](https://support.microsoft.com/en-US/accessibility/onenote/keyboard-shortcuts-in-onenote)                                   | `Ctrl+F6` jumps into and out of command and navigation areas. A general reverse `Ctrl+Shift+F6` cycle is not documented.                                                                                                               |

The exact key, region order, and reverse behavior vary across these applications.

Google's [Docs Editors accessibility documentation](https://support.google.com/docs/answer/6282736?hl=en) describes moving focus among Menu bar, Side panel, and Main landmarks in Docs, Sheets, and Slides. The documented commands are `Ctrl+Alt+period` on Windows, `Alt+Shift+period` on ChromeOS, and `Command+Option+period` on macOS; comma reverses direction. This is documented editor accessibility behavior, not a universal browser command.

Adobe React Aria's [`useLandmark`](https://react-aria.adobe.com/useLandmark) is a closely related reusable scripted implementation. It explicitly registers semantic landmarks, uses `F6` and `Shift+F6` to move focus, restores prior focus, and supports nesting and custom focus behavior. Its last-focused default has been [questioned by an adopter](https://github.com/adobe/react-spectrum/discussions/9483); maintainers explain that it deliberately preserves working context.

[OpenUI5 fast navigation](https://ui5.sap.com/#/topic/10b14c7284ba48a185ae2046db470706) is an explicit `F6` grouping model with first-tab-chain and custom entry behavior. The [Landmarks extension](https://github.com/matatk/landmarks) and [SkipTo](https://skipto-landmarks-headings.github.io/page-script-5/) demonstrate same-document landmark navigation and discovery in extensions or script. Page scripts cannot generically traverse closed roots, non-cooperating cross-origin documents, or browser chrome. Cooperating components and frames can approximate parts through APIs or `postMessage`, and privileged extensions may have additional capabilities.

## Goal

Provide a declarative way for authors to mark the major regions of a page as focus landmarks, so the browser can move focus to the next or previous one with a platform-appropriate command shared between browser chrome and web content. The mechanism should:

* build on ARIA landmarks rather than invent a parallel concept;
* compose cleanly with `focusgroup` and native landmark elements;
* flatten participating landmarks across iframe and shadow DOM boundaries, while letting the embedding context decide whether embedded content participates;
* keep cross-document traversal browser-mediated, with no direct API for enumerating another origin's landmarks.

### Non-goals

* **Mandating a key.** The user agent chooses the command binding for each platform. `F6` and `Shift+F6` are examples, not requirements.
* **A numeric ordering attribute.** This proposal avoids a positive-`tabindex`-style `focuslandmarkindex` (see [Ordering](#ordering)).

## Principles

1. **Intuitive in declarative markup.** A focus landmark should be understandable from the source, behave predictably when nested or embedded, and integrate with landmarks, `tabindex`, and `focusgroup`.
2. **Build on what exists.** Reuse ARIA landmarks for semantics and consider the conventions under discussion for `focusgroup`, including reading order, entry memory, `nomemory`, and `none`.
3. **No new burden on current pages.** Landmark navigation is a new command and should not change existing page behavior without an applicable opt-in or resolved implicit-participation rule.
4. **Browser-mediated across boundaries.** The parent context remains in control of whether subframes participate, and the feature exposes no direct API for enumerating another origin's landmarks.

## Quickstart

In the simplest explicit form, an author marks existing semantic regions with a bare `focuslandmark` attribute. Invoking the platform's landmark-navigation command then moves focus from one region to the next:

```html
<div role="region" focuslandmark aria-label="Ribbon">…</div>
<div role="region" focuslandmark aria-label="Navigation">…</div>
<div role="region" focuslandmark aria-label="Document">…</div>
```

* After memory and `focuslandmarkstart`, the current entry algorithm tries the first eligible focusable descendant. Whether root focus or skipping is the right final fallback remains open.
* A bare `focuslandmark` on an existing landmark changes behavior, not semantics. Whether it gives a generic element a default `region` role is an [open question](#open-questions).
* The labels distinguish several landmarks with the same role. Not every kind of landmark requires an accessible name.

An author can aim focus at a preferred target with `focuslandmarkstart`:

```html
<div role="region" focuslandmark aria-label="Find in document">
  <input focuslandmarkstart type="search" aria-label="Search headings">
  <button>Go</button>
</div>
```

The value form can name a concrete landmark role. This is a central part of the proposal: the element joins focus-landmark navigation and deliberately receives those landmark semantics.

```html
<div focuslandmark="navigation" aria-label="Primary">…</div>
<!-- proposed equivalent to role="navigation" focuslandmark -->
```

If a region already carries a landmark role, a bare `focuslandmark` just adds the navigation behavior:

```html
<section role="search" focuslandmark aria-label="Site search">…</section>
```

The user agent would define abstract "move to next focus landmark" and "move to previous focus landmark" operations and could fold them into its pane-navigation cycle:

```text
browser tab strip → address bar → page landmark 1 → page landmark 2 → child-frame landmark 1 → browser pane …
```

## Placeholder tokens

The names below make the examples concrete. This table does not settle naming or the mixed value grammar.

| Token              | What it would do                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *(bare, no value)* | Marks the element for focus-landmark navigation. On an existing landmark it changes only behavior. Whether it gives a generic element `region` semantics is open. |
| `<landmark-role>`  | One of `banner`, `complementary`, `contentinfo`, `form`, `main`, `navigation`, `region`, or `search`. It joins navigation and deliberately confers that role.     |
| `nomemory`         | Opts out of restoring the region's last-focused entry target.                                                                                                     |
| `none`             | Opts an otherwise implicit landmark out of focus-landmark navigation.                                                                                             |

| Attribute            | Applies to                       | What it would do                                 |
| -------------------- | -------------------------------- | ------------------------------------------------ |
| `focuslandmarkstart` | a descendant of a focus landmark | Marks the preferred entry target for the region. |

The role-valued shorthand is still exploratory. Open questions include how a value interacts with an existing matching or conflicting `role`, what invalid role values do, and whether role names can share one attribute cleanly with `none` and `nomemory`.

## Use cases

1. **Region-to-region navigation.** A user moves focus directly between major regions with one user-agent command.
2. **Shared order with browser chrome.** The same command continues the browser's pane cycle into the page and back out.
3. **Custom entry point.** An author directs focus to a heading, search field, or other preferred target within a region.
4. **Memory of last position.** Returning to a region restores the user's last focus unless the author opts out.
5. **Implicit landmarks.** Existing landmark markup may participate without another attribute, if implicit participation is adopted.
6. **Embedded apps.** Eligible landmarks inside an iframe participate at the iframe's position under embedder control.
7. **Opt-out.** A landmark can decline implicit participation, and an embedder can exclude a child document.

## Focus landmark concepts

* **Focus landmark definition** — an element made eligible by `focuslandmark`, a role-valued shorthand, or a future implicit-participation rule.
* **Landmark candidate** — an element whose native or ARIA semantics are exposed as a concrete landmark under the applicable mapping conditions, or that has an applicable `focuslandmark` value.
* **Focus landmark** — an eligible candidate that participates and is rendered, connected, and not `inert`.
* **Entry target** — the element that receives focus when navigation lands on a focus landmark.
* **Remembered entry target** — the last eligible element focused within a landmark, restored unless `nomemory` is set.
* **Flattened landmark order** — the browser-managed sequence composed across shadow DOM, permitted iframe boundaries, and potentially browser panes.
* **Child landmark inclusion** — whether an embedded document's landmarks join the parent's sequence. A Permissions Policy is one possible mechanism, not a settled answer.

## Landmark candidates

`landmark` is an abstract ARIA role and is not used directly by authors. Its concrete roles are `banner`, `complementary`, `contentinfo`, `form`, `main`, `navigation`, `region`, and `search`. HTML mappings are contextual: `header` and `footer` are `banner` and `contentinfo` only when body-scoped; `form` and `section` are landmarks only when named; and an `aside` nested in sectioning content is `complementary` only when named, while a body- or `main`-scoped `aside` remains `complementary`.

Not every landmark requires an accessible name. Repeated landmarks with the same role generally need distinguishing labels. The [ARIA Authoring Practices landmark guidance](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) describes the existing naming and nesting considerations.

Because native landmark elements already identify major regions, one option is for them to participate implicitly. That reduces markup but can create noisy or unintended navigation on existing pages, so it requires an opt-out such as `focuslandmark="none"`. Implicit participation remains an open question.

## Relationship to ARIA semantics

The [ARIA landmark role definition](https://w3c.github.io/aria/#landmark) says assistive technologies should let users navigate quickly to landmark regions and user agents may provide similar navigation.

Assistive technology landmark commands and this proposal are not the same operation. AT commands often move a reading or virtual-cursor position, while this proposal moves DOM focus. A bare `focuslandmark` on an existing semantic landmark changes only focus behavior. The role-valued form, such as `focuslandmark="navigation"`, deliberately confers the named semantics.

A focus change remains observable to assistive technology, but focusing a descendant does not guarantee that the enclosing landmark will be announced. Browser and assistive technology combinations need testing.

## Possible entry target algorithm

This is one possible resolution, not a settled algorithm. When moving to a focus landmark, the browser would resolve the entry target roughly as follows:

1. If the landmark has a remembered entry target and it is still connected, rendered, enabled, non-`inert`, eligible under applicable modal or feature-specific focus rules, and successfully focusable, restore it unless `nomemory` is set.
2. Otherwise, focus the first eligible `focuslandmarkstart` descendant owned by this landmark.
3. Otherwise, focus the first eligible focusable descendant in the applicable logical order.
4. Otherwise, focus the landmark root for this operation, if the user agent supports a container fallback.
5. Otherwise, skip the landmark.

Nested landmarks own their own targets and memory. A target belongs to its nearest participating landmark, so an outer landmark does not claim focus from a nested one.

[Open question](#open-questions): Should entry targets include elements that are focusable by script or by this operation but are not ordinary tab stops?

```html
<section role="region" focuslandmark aria-labelledby="chat-title">
  <h2 id="chat-title" tabindex="-1" focuslandmarkstart>Chat</h2>
  …
</section>
```

### The focuslandmarkstart attribute

`focuslandmarkstart` marks the preferred entry target within its nearest focus landmark. It applies when there is no eligible remembered target or when `nomemory` is set. If several owned descendants carry it, the first in the applicable logical order wins. Direction of travel does not change the selected entry target.

## Disabling landmark memory

By default, a focus landmark remembers the last eligible element focused within it and restores focus there on re-entry. A region whose entry point should remain fixed can opt out with `nomemory`.

```html
<form focuslandmark="nomemory" aria-label="Compose message">
  <textarea focuslandmarkstart aria-label="Message"></textarea>
  <button>Send</button>
</form>
```

Memory is browser-owned and scoped to the document. A remembered target becomes stale when it is disconnected, hidden, `inert`, disabled, ineligible under applicable modal or feature-specific focus rules, no longer owned by the landmark, or no longer focusable. Whether memory should be the default remains open; prior implementations and adopter expectations differ.

## Ordering

I do not propose a numeric `focuslandmarkindex`.

Focus Landmark needs a dedicated candidate-order algorithm. [HTML focus navigation scopes](https://html.spec.whatwg.org/multipage/interaction.html#focus-navigation-scope) can inform shadow and slot composition, but cannot be reused verbatim because they order focusable areas and focus-navigation-scope owners, not arbitrary landmark roots. The algorithm should be shadow-including and slot-aware and apply CSS [`reading-flow` and `reading-order`](https://drafts.csswg.org/css-display-4/#reading-flow) where they establish an order for the relevant candidates.

Next and previous traverse the same logical list in opposite directions. The ordering details, especially around slotted content and nested scopes, remain open and should stay aligned with `focusgroup` where the two proposals use the same platform machinery.

## Opting out

If landmark elements participate implicitly, an author needs a way to decline. `focuslandmark="none"` is the placeholder opt-out: the element remains semantic and otherwise focusable, but is not a focus-landmark destination.

```html
<form focuslandmark="none" aria-label="Filters">…</form>
```

The token name and its interaction with role values remain open.

## Iframes, shadow DOM, and flattened order

Landmark navigation should flatten participating landmarks across boundaries while keeping the embedding context in control. The details are exploratory.

* **Shadow DOM:** discovery uses the dedicated shadow-including, slot-aware landmark order described above. Closed shadow roots remain visible to the user agent for navigation but not inspectable by page script.
* **Iframes:** eligible landmarks in a child document participate at the iframe element's position in the parent order.
* **Eligibility:** disconnected, hidden, `aria-hidden`, `inert`, or otherwise ineligible regions and frames are skipped. Top-layer membership alone does not establish an active focus scope. A modal dialog constrains candidates because HTML makes outside content inert; an ordinary popover does not. Any additional fullscreen or popover restriction needs a feature-specific rule.
* **Parent control:** the embedder decides whether a child participates. A dedicated Permissions Policy, with the placeholder name `focus-landmark-participation`, is one possible mechanism rather than a settled design.

```html
<!-- Possible syntax if a dedicated Permissions Policy is adopted. -->
<iframe src="chat.html" title="Chat"
        allow="focus-landmark-participation"></iframe>
```

Cross-document traversal remains browser-mediated. This proposal exposes no direct parent API for enumerating a cross-origin child's landmark names, count, structure, or entry targets. Cooperating frames can still exchange information through `postMessage`, and ordinary focus effects remain observable. The user agent composes the sequence and retains control at document and browser-chrome boundaries.

### Composition with `focus-without-user-activation`

Landmark navigation is user-triggered. A child receives focus only when the user invokes the browser-managed command; it cannot use participation to pull focus on its own.

[`focus-without-user-activation`](https://html.spec.whatwg.org/multipage/interaction.html#allow-focus-steps) is an existing HTML Permissions Policy feature governing specified automatic or programmatic focus operations. It is precedent, not this command's participation gate: denying it must not block user-agent landmark traversal, and traversal must not confer user activation on the destination document. A separate participation control may still determine whether the child's landmarks join the parent sequence.

## Interaction with related platform features

* **`focusgroup`.** This complementary proposal handles arrow-key movement within a composite widget; `focuslandmark` moves between regions. Standardization of `focusgroup` is ongoing. If landmark entry reaches a focusgroup container rather than a concrete target, the two features need an explicit composition rule to resolve the group's generated or current tab stop; this does not happen automatically.
* **ARIA landmarks and assistive technology.** ARIA provides region semantics and AT navigation. This proposal adds a user-agent operation that moves DOM focus; it does not define AT reading-position behavior or guarantee landmark announcements.
* **Permissions Policy / `focus-without-user-activation`.** Permissions Policy is a possible model for parent-controlled frame participation. `focus-without-user-activation` is only a related precedent.

## Feature detection

The IDL below shows one possible shape for detecting the reflected attributes. It is illustrative, not a proposed final interface, and the names and value grammar are placeholders.

```webidl
partial interface mixin HTMLOrSVGElement {
  [SameObject, PutForwards=value, Reflect] readonly attribute DOMTokenList focusLandmark;
  [CEReactions, Reflect] attribute boolean focusLandmarkStart;
};
```

If cross-frame participation uses Permissions Policy, it would not be part of this reflected interface. Unsupported browsers can continue to use the page's ordinary landmark semantics, `Tab` order, and skip links. That fallback is not a polyfill of the browser-integrated feature.

## Future considerations

* **Imperative companion for virtualized or canvas content.** Declarative DOM landmarks may not cover content that is virtualized or drawn into a canvas. Whether such content needs an imperative companion is open.
* **Browser-pane integration details.** The exact placement of page landmarks among browser panes, boundary behavior, command discovery, and reverse traversal are user-agent design questions.

## Open questions

These are the main points where I want early feedback:

1. **Problem and scope.** Does the region-to-region DOM-focus gap match the needs of dense web applications?
2. **Platform bindings and discovery.** How should user agents expose, teach, and remap the command across platforms, assistive tooling, and laptops where function keys may require a modifier?
3. **Attribute names.** Are `focuslandmark` and `focuslandmarkstart` suitable placeholder names?
4. **Implicit landmarks.** Should existing semantic landmarks participate automatically, and is `none` the right opt-out?
5. **Role-valued shorthand.** This explainer proposes that `focuslandmark="<landmark-role>"` confers the named semantics. How should it interact with a matching, conflicting, or invalid existing `role`? Should bare `focuslandmark` on a generic element imply `region`?
6. **Entry eligibility.** Which descendants may be entry targets, and should the root be focusable only for this operation when no descendant qualifies?
7. **Value grammar.** Can role names, `none`, and `nomemory` share one attribute without ambiguity?
8. **Memory.** Should restoration be on by default, and is an author `nomemory` control sufficient?
9. **Ordering.** How should focus-navigation scopes, slots, `reading-flow`, and `reading-order` define one reversible list?
10. **Cross-frame participation.** What should the default be, how does the embedder control it, and is Permissions Policy the right mechanism?
11. **Virtualized and canvas content.** Is a declarative first version enough, or is an imperative companion necessary?
12. **Script approximation.** Would a same-document reference implementation help validate the model without suggesting that the full browser-integrated feature is polyfillable?

## Privacy and security considerations

Within one document, the attributes, command results, and ordinary focus events are observable by script. Focus memory is browser-owned, but its result is observable when focus returns.

Cross-document composition needs explicit threat analysis. Relevant concerns include focus timing and observation across origins, hostile or dynamically inserted stops, hidden frames, landmark flooding, and unclear parent-child control. A cross-origin parent must not gain an enumeration API for a child's landmarks.

The traversal command itself is browser-owned and must not be modeled as the cancelable default action of a content-dispatched key event. Ordinary focus events still occur as applicable, and script may react or subsequently redirect focus. The user agent must nevertheless retain an unconditional browser-chrome escape that content cannot intercept.

## Index of placeholder values

All names here are placeholders to make the examples concrete; none are final.

`focuslandmark` attribute:

| Description                          | Placeholder syntax                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Navigation marker only               | *(bare; no value)*                                                                                                           |
| Confer a concrete landmark role      | `focuslandmark="banner"` (alternatively `complementary`, `contentinfo`, `form`, `main`, `navigation`, `region`, or `search`) |
| Disable entry memory                 | `focuslandmark="nomemory"`                                                                                                   |
| Opt out of focus-landmark navigation | `focuslandmark="none"`                                                                                                       |

Related attributes and controls:

| Description                                    | Placeholder syntax                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Preferred entry target within a landmark       | `focuslandmarkstart` (boolean, on a descendant)                          |
| Child landmark participation (include/exclude) | Possible Permissions Policy, e.g. `allow="focus-landmark-participation"` |

## Acknowledgments

Thanks to the authors and contributors of the ARIA landmark roles, the [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/) explainer, and the prior implementations and documentation linked above.
