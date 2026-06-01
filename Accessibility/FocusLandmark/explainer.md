# Focus Landmark: declarative landmark focus navigation for web apps

Authors: [Benjamin Beaudry](https://github.com/benbeaudry)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venues: [WHATWG HTML](https://html.spec.whatwg.org/), [Open UI](https://open-ui.org/), [W3C ARIA WG](https://www.w3.org/WAI/ARIA/)
* Current version: this document

## Introduction

Rich web apps are built from major regions, such as a ribbon, a navigation pane, a document canvas, a chat list, a message composer, or an assistant sidebar, much like native applications. Many users want to move between these regions directly from the keyboard, without tabbing through every control in between. This is one of the most common accessibility and productivity requests I hear from people who use web apps.

Today there is no consistent way to do it. Some platforms support it natively, some web apps build their own version, and the browser treats the page as a single block. As a result, the same action works differently, or not at all, depending on the app.

Because this problem is common across many web apps, it seems worth standardizing. The proposed direction is to add a declarative HTML primitive, with the placeholder name `focuslandmark`, that lets authors mark the major regions of a page so the browser can move focus to the next or previous one. Browser UI and web content would then share a single landmark-navigation model, similar to how `Tab` already provides one focus order across browser chrome and web content. The browser would choose the key for each platform; the feature defines the behavior, not the key.

This is an early exploration. The goal is to confirm the problem and check whether this is a reasonable starting point.

## What problem are we trying to solve?

Rich web apps have major regions just like native apps: a ribbon, a document canvas, a navigation pane, a chat list, a message composer, an assistant sidebar, and so on. Users want to move between them directly from the keyboard. On native platforms they can. On Windows, for example, `F6` and `Shift+F6` move focus from one area to the next, and browsers use the same idea for their own chrome. But this stops at the edge of web content. Authors have no way to plug page regions into the browser's own focus-navigation cycle.

Today that leaves authors with no good option:

1. **Do nothing.** The browser cycles through its own panes (tab strip, address bar, and so on), but once focus reaches web content it treats the whole page as a single block. This isn't really a solution; the page regions simply aren't handled.
2. **Build a custom shortcut for the same action.** These vary a lot. Some override `F6` itself, which breaks the browser's own pane navigation whenever focus is inside the web page. Others use `Ctrl+F6`, Google Docs uses `Ctrl+Alt+Shift+M` to move focus out of the editing area (and `Ctrl+Alt+.` / `Ctrl+Alt+,` for the side panel), and other apps differ again. The same action ends up working inconsistently across the web.

This gets worse with nested apps. If a host app uses `Ctrl+F6` and an app embedded inside it also uses `Ctrl+F6`, the two need some sort of custom coordination.

## Goals

* Define a declarative way for authors to mark the major regions of a page as focus landmarks.
* Let the browser move focus to the next or previous focus landmark with a single, platform-appropriate key, shared between browser chrome and web content.
* Compose cleanly with existing primitives: ARIA [`landmark` roles](https://w3c.github.io/aria/#landmark) and [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/).
* Flatten landmarks across iframe and shadow DOM boundaries, while letting the embedding context control whether embedded content participates.
* Keep cross-document traversal browser-mediated, never script-enumerable across origins.

## Non-goals

* Mandating a specific key. The key that triggers the navigation is left to the user agent per platform, matching each platform's existing convention.
* Replacing `focusgroup`. Arrow-key movement *within* a composite widget stays the job of `focusgroup`; this feature handles movement *between* regions.
* Introducing a numeric ordering attribute analogous to positive `tabindex`.

## How would we solve it?

I'm suggesting a declarative "focus landmark" DOM primitive that lets authors mark the major regions of a page. The browser maps it to the platform's natural key for this kind of navigation (for example `F6` on Windows), or picks one where the platform has no such convention. Pressing that key moves focus to the next or previous focus landmark, landing on a predetermined focusable region or element. The feature defines the behavior; the browser owns the key.

The idea builds on two existing primitives: the ARIA [`landmark` role](https://w3c.github.io/aria/#landmark) and [`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/). In fact, it's the same kind of need that led to `focusgroup`: users expect a keyboard pattern they already know from native apps, but today each author rebuilds it by hand in JavaScript, slightly differently on every site. A declarative primitive lets the browser provide that behavior once.

The two differ in scope. `focusgroup` handles arrow-key movement *within* one composite widget, while `focuslandmark` handles movement *between* the major regions of a page, across frames, and ideally across the browser's own panes too.

In the simplest form, an author marks each major region with a bare `focuslandmark` attribute. Pressing the navigation key then moves focus from one region to the next:

```html
<div focuslandmark>...</div>
<div focuslandmark>...</div>
<div focuslandmark>...</div>
```

By default, focus lands on the first focusable element inside the region. An author can override that and point to a preferred entry target with `focuslandmarkstart`:

```html
<div focuslandmark>
  <input focuslandmarkstart type="search" aria-label="Search headings">
  <button>Go</button>
</div>
```

So far this says nothing about semantics; `focuslandmark` is purely a navigation marker. But the regions an author wants to mark are almost always the page's landmarks, so the primitive can build on ARIA landmarks rather than invent a parallel concept.

The first link is the explicit `role`. If a region already has a landmark role, `focuslandmark` just adds the navigation behavior on top:

```html
<div role="navigation" focuslandmark aria-label="Primary">...</div>
```

As a shorthand, the `focuslandmark` value can name a concrete landmark subrole. The element then takes part in landmark navigation *and* gets that ARIA role applied automatically, so the author writes it once:

```html
<div focuslandmark="navigation" aria-label="Primary">...</div>
<!-- equivalent to role="navigation" focuslandmark -->
```

The second link is the HTML elements that already carry a landmark role implicitly: `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`, `<form>`, `<section>`, `<search>`. Since these already mark a page's major regions, a natural suggestion (left as an open question below) is that they become focus landmarks implicitly, without the author writing `focuslandmark` at all:

```html
<nav aria-label="Primary">...</nav>     <!-- implicitly a focus landmark -->
<main aria-labelledby="doc-title">...</main>
<aside aria-label="Comments">...</aside>
```

This wouldn't break existing pages. Landmark navigation is a new key-driven paradigm that doesn't exist on the web today, so turning these elements into focus landmarks adds a destination for that new key without changing anything about current focus, tab order, or layout. By default the entry point is the region's first focusable element, and authors can change it with `focuslandmarkstart` or opt a region out.

A focus landmark can also be a `focusgroup`. The two compose: `focuslandmark` brings focus to the region, and once focus is inside, `focusgroup` owns arrow-key movement among its items.

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

Underneath, the user agent would define abstract operations such as "move to next focus landmark" and "move to previous focus landmark." The browser could then integrate those operations with its own pane-navigation cycle:

```text
browser tab strip → address bar → favorites bar → page landmark 1 → page landmark 2 → child-frame landmark 1 → browser pane ...
```

The important behavior is that the browser and web content form one flattened navigation order instead of separate browser and page shortcuts.

The subsections below cover the details: candidate elements, ARIA semantics, entry behavior and memory, ordering, and cross-frame composition.

### 1. Landmark candidates

`landmark` is an abstract role with a set of concrete subroles, each with a matching HTML element: `banner` (`<header>`), `complementary` (`<aside>`), `contentinfo` (`<footer>`), `form` (`<form>`), `main` (`<main>`), `navigation` (`<nav>`), `region` (`<section>`), and `search` (`<search>`). These already describe the major areas of a page, which is exactly what this navigation moves between, so landmarks are the natural anchor for the primitive.

The relationships shown above raise a few open design questions: whether the `focuslandmark="<subrole>"` shorthand should confer the ARIA role or only validate against a role the element already has; whether the implicit-landmark HTML elements should become focus landmarks automatically; and whether a bare `focuslandmark` on a non-landmark element should stay a pure navigation marker or also take on a default role such as `region`. How behavioral tokens such as `none` and `nomemory` would share that value space with subrole names is also open. The names are placeholders.

### 2. Relationship to ARIA semantics

This is where the link to landmarks gets interesting. The [ARIA landmark role definition](https://w3c.github.io/aria/#landmark) already says assistive technologies SHOULD let users quickly navigate to landmark regions, and that user agents MAY do the same. AT has offered landmark navigation for years, but the user-agent side has largely gone unbuilt. My intent with `focuslandmark` is to build that user-agent mechanism, but richer than a plain jump: the author can control where focus lands inside the region (`focuslandmarkstart`), whether the region remembers its last focus, and whether embedded frames take part.

Because the regions are landmarks, `focuslandmark` does not need to invent a new semantic. A bare `focuslandmark` on an element that is already a landmark changes only where focus goes, not what the element is. The shorthand value form (`focuslandmark="navigation"`) is the case that would deliberately confer a role. On a non-landmark element, whether a bare `focuslandmark` should stay a pure navigation marker or also apply a default `region` role is open (see §1).

When focus moves into a region, assistive technology already understands landmarks: it observes the focus change and announces the newly focused element.

### 3. Entry target and memory

When moving to a focus landmark, the browser should resolve the entry target roughly as follows:

1. If the landmark has remembered focus and that target is still eligible, restore it.
2. Otherwise, focus the first eligible `focuslandmarkstart` descendant.
3. Otherwise, if the landmark is a `focusgroup`, use the focusgroup entry algorithm.
4. Otherwise, if the `focuslandmark` element itself is focusable, focus it.
5. Otherwise, skip the landmark.

Memory should be on by default, with an opt-out token similar to focusgroup. When a `focuslandmark` is also a `focusgroup`, I could reuse focusgroup's existing focus-memory mechanism instead of defining a separate one, so the two features stay consistent:

```html
<form focuslandmark="nomemory" aria-label="Compose message">
  <textarea focuslandmarkstart aria-label="Message"></textarea>
  <button>Send</button>
</form>
```

### 4. Ordering

I don't think we should follow the path `tabindex` took and introduce a numeric `focuslandmarkindex` for ordering. Instead, the default order should be DOM / shadow-including tree order, adjusted by the same reading-order concepts used for sequential focus navigation where applicable. This follows the direction already used by focusgroup: source order by default, with CSS `reading-flow` / `reading-order` as the platform hook when visual order intentionally differs from DOM order.

A numeric index would recreate the problems of positive `tabindex`: global-ish manual ordering, difficult maintenance, and surprising keyboard/AT behavior.

### 5. Iframes, shadow DOM, and flattened order

Landmark navigation should flatten participating landmarks across boundaries, but the embedding context must be able to prevent embedded content from participating.

Focusgroup gives useful precedent but does not solve this exact problem. It crosses Shadow DOM boundaries by default and has `focusgroup="none"` as an opt-out. It does not define flattened iframe traversal; the explainer instead treats iframes with focusable content as key-conflict elements. Landmark navigation needs a browser-mediated child-navigable model.

Proposed model:

- **Shadow DOM:** landmark discovery uses the shadow-inclusive tree, similar to focusgroup. Component authors can opt out a subtree with a `none` token, e.g. `focuslandmark="none"`. Closed shadow roots remain UA-visible for navigation but not script-inspectable.
- **Iframes:** child-document focus landmarks participate at the iframe element's position in the parent order when the iframe is eligible and not opted out by the parent.
- **Parent control:** the embedding element should be able to treat the child as included, skipped, or a single landmark. Names are bikesheddable, but the shape might be:

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

The exact attribute names are open. The key requirement is that cross-document traversal is browser-mediated, not script-mediated. Cross-origin parents should not receive a way to enumerate child landmark names, counts, or structure. The browser can still move focus through the composed order internally.

## Privacy & Security Considerations

Cross-document focus-landmark traversal must be browser-mediated, never script-mediated. A cross-origin parent must not gain a way to enumerate the names, counts, structure, or content of a child document's focus landmarks; it only decides, via the embedding `<iframe>` element, whether the child participates (`include`), is skipped (`none`), or is treated as a single opaque landmark (`self`). The browser can move focus through the composed order internally without exposing the child's internal structure to the embedder.

Because the entry target on landing is derived from author markup the document already controls (`focuslandmarkstart`, focusgroup memory, the first focusable element), the feature does not expose any new information that sequential focus navigation does not already reveal within a single origin. Closed shadow roots remain UA-visible for navigation purposes but are not made script-inspectable.

## Considered alternatives

- **Custom `keydown` handlers** for `F6`, `Ctrl+F6`, or `Command+F6`. There is no version of this without downsides. If an author overrides `F6`, it breaks the browser's own focus navigation and no longer flows with it. If an author picks `Ctrl+F6` or some other shortcut instead, the browser and the website feel like two separate apps rather than one unified experience, the way `Tab` works today. Either way it forces authors into more scripting, competes with browser shortcuts, and does not compose across nested apps.
- **Skip links.** Useful, but visible/author-authored links are not a full browser/app navigation model. Not quite the same thing.

## Open questions

The goal is to standardize an end-to-end landmark-navigation operation so the browser, top-level web app, embedded web app, and assistive technology can all take part in a single, consistent model. The point is to build the mechanism, not to tie it to one key everywhere: the key that triggers it should be left to the user agent's discretion per platform, matching each platform's existing convention.

Open questions for early validation:

1. Do you agree this is a problem we should work on solving?
2. Attribute names: `focuslandmark`, `focuslandmarkstart`, and `focuslandmarkchildren` are placeholders. Any suggestions?
3. Implicit landmarks: should the HTML elements that already carry a landmark role (`<main>`, `<nav>`, `<aside>`, and so on) become focus landmarks automatically, without an explicit `focuslandmark` attribute?
4. Eligibility rules: should the `focuslandmark="<subrole>"` shorthand confer the ARIA role, or only reflect one the element already has? And on a non-landmark element, should a bare `focuslandmark` stay a pure navigation marker or default to the `region` role?
5. Virtualized/canvas content: is declarative DOM enough for v1, or is a companion imperative API needed? I would think that with HTML in Canvas this proposal would be enough.

## References

* [ARIA `landmark` role](https://w3c.github.io/aria/#landmark)
* [`focusgroup` explainer (Open UI)](https://open-ui.org/components/scoped-focusgroup.explainer/)
* [CSS `reading-flow`](https://drafts.csswg.org/css-display-4/#reading-flow)
