# Slotted Options in Customizable `<select>`

## Authors

- [@ffiori](https://github.com/ffiori)

## Participate

- WHATWG HTML issue:
  [whatwg/html#11535](https://github.com/whatwg/html/issues/11535)
- File feedback on this explainer:
  [MSEdgeExplainers issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues)

## Status of this Document

This document is a starting point for engaging the community and standards
bodies in developing collaborative solutions fit for standardization. As the
solutions to the problems described in this document progress along the
standards track, we will retain this document as an archive and use this section
to keep the community up to date.

- This document status: **Active**
- Expected venue: [WHATWG HTML](https://html.spec.whatwg.org/)
- Current version: this document

## Table of Contents

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
- [Motivation](#motivation)
- [Proposed Approach](#proposed-approach)
- [Open questions and challenges](#open-questions-and-challenges)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References](#references)

## Introduction

The `<select>` element is one of the most common form controls on the web. With
the new customizable `<select>` (`appearance: base-select`), developers can
finally style and structure a real `<select>` to match their design.

Today, you can't build a reusable `<select>`-based component that lets the
people using your component supply the `<option>`s. If you wrap a `<select>`
inside a
[web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
and expose a
[`<slot>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot) for
options, the `<select>` ignores the slotted options and its dropdown comes up
empty.

This explainer proposes that a customizable `<select>` recognize `<option>`,
`<optgroup>`, and its trigger `<button>` when they are slotted in from outside
the component, so they behave as if they were written directly inside the
`<select>`. This lets developers wrap the native `<select>` in a component
instead of rebuilding it from scratch.

## User-Facing Problem

Say you're building a design system and want to ship a styled select that
consumers use like the native one, writing `<option>`s as children. Design
systems are built as web components, so you reach for the obvious approach: put
a real `<select>` in the component's shadow root and expose a `<slot>` for the
options:

```html
<my-custom-select>
  <template shadowrootmode="open">
    <select>
      <slot></slot>
    </select>
  </template>

  <option>One</option>
  <option>Two</option>
</my-custom-select>
```

**This doesn't work today.** A `<select>` builds its option list from its own
direct children. The slotted `<option>`s are children of `<my-custom-select>`,
not of the `<select>`, so the select never sees them and the dropdown is empty.

There are two workarounds today, both with real costs. One keeps a native
`<select>` in the shadow root and uses a
[`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
to move or copy the slotted options into it. Native keyboard, focus, and
accessibility keep working because the options become real children of the
`<select>`, but you own the bookkeeping of a second, relocated set of elements
and keeping it in sync. The other drops the native control and rebuilds the
trigger, popup, keyboard support, focus, and screen-reader semantics by hand.
Design systems already ship these workarounds; Shopify's
[Polaris web components](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/select)
are one example.

**Why this matters to end users.** Hand-rebuilt selects are often less
accessible than the native control. They drop keyboard shortcuts, mishandle
focus, or expose incomplete information to assistive technology, which mostly
affects people who use screen readers or keyboard navigation. Reusing the real
`<select>` inside a component gives users the native control's accessibility
instead of a re-implementation.

> **Note on scope:** This applies only to `<select>` in customizable mode
> (`appearance: base-select`). A `<select>` with the default native appearance
> is unchanged.

### Goals

- Treat `<option>` elements slotted into a customizable `<select>` as that
  select's options.
- Support the same for slotted `<optgroup>`s and for a slotted trigger
  `<button>`.
- Make all the usual `<select>` behaviors and JavaScript APIs work transparently
  with slotted options: selection, `value`, keyboard interaction, accessibility,
  and form submission.
- Support nested components, where options pass through more than one `<slot>`
  before reaching the `<select>`.
- Keep the option list in sync as options are added, removed, or re-slotted,
  with the changes observable immediately.

### Non-goals

- Changing `<select>` elements that use the default native appearance. This
  proposal applies only to `appearance: base-select`.
- Extending this behavior to other elements in this proposal (for example
  `<datalist>`, `<table>`, `<fieldset>`, or `<form>`). Those may be worth doing
  later, but are out of scope here.
- Letting arbitrary unrelated elements become a select's options. Only the
  elements a `<select>` already accepts (`<option>`, `<optgroup>`, and the
  trigger `<button>`) are in scope.

## Motivation

Multiple teams and design-system authors have asked for this. They want to offer
a `<select>`-based component with a familiar API, where consumers just write
`<option>`s, while staying close to the platform. Without slotting support, each
of them has to ship a large, hand-built select and maintain its accessibility.

The recurring request in the
[discussion](https://github.com/whatwg/html/issues/11535) is to let `<option>`s
be provided through a slot, like any other child content.

## Proposed Approach

A customizable `<select>` should find its `<option>`s (and `<optgroup>`s and
trigger `<button>`) by looking at the content that is actually rendered inside
it, including content placed there through `<slot>`s, instead of only its direct
children. If an `<option>` is rendered inside the select because it was slotted
in, the select treats it as one of its options.

Everything else about `<select>` stays the same. From the page's point of view,
a slotted `<option>` behaves as if it had been written directly inside the
`<select>`.

### The common case

A component wraps a `<select>` and exposes a single `<slot>` for options:

```html
<my-custom-select>
  <template shadowrootmode="open">
    <select>
      <slot></slot>
    </select>
  </template>

  <option>One</option>
  <option>Two</option>
</my-custom-select>
```

**Proposed result:** the `<select>` recognizes both `<option>`s and shows them
in its dropdown. `select.options` contains the two options, selection works, and
the control is the real, accessible native select.

### Nested components

Components are often nested. Here the options live in the light DOM of
`<my-section>`, are slotted into `<my-custom-select>`, and are then forwarded
again into the inner `<select>`, crossing two shadow boundaries:

```html
<my-section>
  <template shadowrootmode="open">
    <my-custom-select>
      <template shadowrootmode="open">
        <select>
          <slot></slot>
        </select>
      </template>
      <slot></slot>
    </my-custom-select>
  </template>

  <option>One</option>
  <option>Two</option>
</my-section>
```

**Proposed result:** the `<select>` still recognizes the options, even though
they pass through multiple slots. This needs to work, because nesting
design-system components is common.

### A slotted trigger button

In customizable mode, the first child `<button>` of a `<select>` becomes the
control's trigger (the thing you click to open the dropdown), replacing the
default. A component may want consumers to provide both the trigger button and
the options through the same slot:

```html
<my-custom-select>
  <template shadowrootmode="open">
    <select>
      <slot></slot>
    </select>
  </template>

  <button>Pick a number</button>
  <option>One</option>
  <option>Two</option>
</my-custom-select>
```

**Proposed result:** the `<select>` uses the slotted `<button>` as its trigger
and treats the `<option>`s as its options. `select.options` returns the two
options and does not include the button.

### Slotted option groups

`<optgroup>`s (with their nested `<option>`s) can be slotted too, and behave
just like directly authored groups: the label groups the options, and a
`disabled` group disables its options.

```html
<my-custom-select>
  <template shadowrootmode="open">
    <select>
      <slot></slot>
    </select>
  </template>

  <optgroup label="Numbers">
    <option>One</option>
    <option>Two</option>
  </optgroup>
  <optgroup label="Letters" disabled>
    <option>A</option>
    <option>B</option>
  </optgroup>
</my-custom-select>
```

### JavaScript APIs

Because slotted options are treated as the select's options, the existing
imperative APIs behave exactly as they would for direct children:

```js
const select = document.querySelector('my-custom-select')
  .shadowRoot.querySelector('select');

select.options.length;     // counts the slotted options
select.selectedIndex = 1;  // selects the second slotted option
select.selectedOptions;    // reflects the current selection
select.value;              // the selected option's value
```

The option list also stays in sync as the page adds, removes, or re-slots
options, and those changes are observable immediately, without waiting for a
later turn of the event loop:

```js
const option = document.createElement('option');
option.textContent = 'Three';
myCustomSelect.append(option);  // gets slotted into the inner <select>

select.options.length;          // already reflects the new option
```

## Open questions and challenges

The proposed direction is to have a customizable `<select>` look for its options
in the flat tree. The main things to work through:

- **Performance.** The select should not walk its whole flat tree every time its
  options are queried. It needs to update its option list incrementally as
  slotting changes.
- **Synchronous updates.** When slot assignment changes, the option list and the
  selected option should update immediately, so a read right after a change is
  correct.
- **Trigger button vs options.** When a button and options are slotted through
  the same slot, the select must treat the first button as its trigger and the
  rest as options.
- **Nested slotting.** Options can be forwarded through more than one slot
  before reaching the select, so the lookup has to handle multiple shadow
  boundaries.
- **Spec algorithms.** A few algorithms assume tree order and DOM ancestry, such
  as building the list of options and finding an option's nearest ancestor
  select. These would need to consider the flat tree for base-select.

## Alternatives Considered

### Rebuild `<select>` from scratch in JavaScript

The status-quo workaround: don't use a real `<select>` at all. Build the
trigger, the popup, and the option list out of generic elements and JavaScript.

**Pros**

- Works today; full control over markup and behavior.

**Cons**

- A large amount of code to write and maintain.
- Accessibility, keyboard support, type-ahead, focus management, and platform
  integration must all be re-implemented by hand, and are easy to get wrong.
- The result is rarely as robust or consistent as the native control.

**Reason for rejection:** it pushes a large, error-prone burden onto every
component author and tends to produce worse outcomes for end users.

### MutationObserver that clones options into the shadow root

Keep a real `<select>` in the shadow root, but use a `MutationObserver` to watch
the component's light-DOM children and copy any `<option>`s into the shadow
`<select>`.

**Pros**

- Reuses the native `<select>` for rendering and behavior.

**Cons**

- The options the developer wrote and the options the select actually uses
  become two different sets of elements; keeping their attributes, state, and
  styling in sync is fiddly and error-prone.
- Identity is confusing: the element the author put in the page is not the one
  the select reports back.
- Still requires ongoing JavaScript and careful bookkeeping for every change.

**Reason for rejection:** it's a brittle workaround for something slots are
meant to handle natively, and the duplicated-element model can cause subtle
bugs.

### Customized built-in elements (the `is` attribute)

Extend the native `<select>` with the customized built-in mechanism
(`<select is="my-select">`).

**Pros**

- Builds on the native element directly.

**Cons**

- Customized built-ins cannot attach a shadow root to many elements and have
  well-known limitations, so they don't give component authors the encapsulated,
  slot-based composition model this problem is about.
- Not implemented across all browser engines.

**Reason for rejection:** it doesn't provide the shadow DOM and slot composition
that this problem needs.

### Solve it generically for all elements at once

Instead of fixing `<select>`, define a general mechanism so that any element can
find slotted children, so `<table>`, `<form>`, `<fieldset>`, and others would
all benefit.

**Pros**

- A consistent story across the platform; avoids `<select>` becoming a special
  case.

**Cons**

- A much larger design space, with significant web-compatibility risk for
  elements like `<form>`.
- Blocks a concrete, high-demand need (`<select>`) behind a broad, open-ended
  effort.

**Reason for rejection (for now):** `<select>` has clear, present demand and a
tractable scope. Starting here does not rule out generalizing later, and it
gives a concrete case to learn from before designing something broader.

## Accessibility, Internationalization, Privacy, and Security Considerations

**Accessibility (the primary motivation).** Reusing the native `<select>` inside
a component gives end users the platform's built-in keyboard support, focus
handling, and assistive-technology semantics, instead of a hand-rebuilt control
that often gets these wrong. A slotted `<option>` is exposed to accessibility
tooling the same way a directly authored `<option>` is.

**Internationalization.** No new internationalization surface is introduced.
Slotted options carry their text, language, and direction just like ordinary
options, and grouping and labels behave the same.

**Privacy.** No new information is exposed. Slotting only rearranges where a
developer's own elements render within their own document; it doesn't reveal
anything across origins or to any other party.

**Security.** No new capability or cross-boundary access is introduced. The
options come from the page's own content being composed into the page's own
component; this proposal doesn't let a shadow tree reach content it couldn't
already compose.

## Stakeholder Feedback / Opposition

- **Web developers / design-system authors:** Positive and actively requesting
  it. Several independent teams have already had to build workarounds, for
  example:
  [1](https://github.com/whatwg/html/issues/11535#issuecomment-3155754832),
  [2](https://github.com/whatwg/html/issues/11535#issuecomment-3520607548).
- **Implementors** (signals from the
  [discussion](https://github.com/whatwg/html/issues/11535)):
  - Chromium: prototyping and supportive.
  - Mozilla: has questioned whether to solve this only for `<select>` rather
    than more generally.
  - WebKit: no signal yet.
- **Open standards-level questions raised in discussion:**
  - Whether to solve this for `<select>` in isolation, or as part of a general
    mechanism that applies to many elements.
  - How it sequences against other in-progress work on the customizable
    `<select>`.

These questions are being tracked in
[whatwg/html#11535](https://github.com/whatwg/html/issues/11535).

## References

Related work and background:

- [Customizable `<select>` and `appearance: base-select`](https://open-ui.org/components/customizableselect/)
  (Open UI).
- [Using shadow DOM and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
  (MDN).
- [The `<select>` element](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element)
  and
  [the `<option>` element](https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element)
  (HTML Standard).
