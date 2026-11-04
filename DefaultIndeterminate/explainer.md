# Static indeterminateness for HTML checkboxes

## Authors

- [Jeff Weiner](https://github.com/AtOMiCNebula)

## Participate

- Discussion: [whatwg/html#6578](https://github.com/whatwg/html/issues/6578)

## Status

- Document status: **Proposal**
- Expected venue: [WHATWG HTML](https://html.spec.whatwg.org/)
- Proposed direction: [Issue comment](https://github.com/whatwg/html/issues/6578#issuecomment-6619634263)

## Introduction

Today, web authors can declare a checkbox's initial checkedness with the
`checked` attribute, and its initial disabled state with `disabled`, but there
is no facility to do the same for its initial indeterminate state. Authors must
run JavaScript to set `input.indeterminate`, which can cause the checkbox to
render incorrectly briefly until the script runs, and also prevents HTML-only
renderers from expressing the state.

This explainer proposes a new attribute to allow specifying a checkbox's
indeterminate state statically. The primary motivation for this is to allow
more effective server-side rendering for indeterminate checkboxes.

## Proposed approach

We propose adding a boolean `defaultindeterminate` content attribute to
`<input type="checkbox">`, reflected by a `defaultIndeterminate` IDL attribute.
Its presence sets the default to true; its absence sets it to false. The
existing `indeterminate` IDL attribute continues to represent the live state.

The following checkbox starts indeterminate, using its native appearance and
accessibility behavior, without JavaScript:

```html
<input type="checkbox" defaultindeterminate>
```

As with `checked` and `defaultChecked`, changing the default does not overwrite
a live state that has already been changed. To keep default and live state
independent, the platform will keep track of a **dirty indeterminateness**
flag, alongside dirty checkedness. It starts false; changing the live
`indeterminate` property or activating the checkbox sets it. While the flag is
false, adding or removing `defaultindeterminate` updates the live state. Form
reset clears the flag and restores the live state from the attribute. The
attribute does not track user interaction or changes to the live property.

Indeterminateness remains independent of checkedness: a checkbox can be both
checked and indeterminate, and clearing indeterminateness reveals its checked
or unchecked state. Existing activation, form submission, and validation
continue to use checkedness as they do today. The `:indeterminate` pseudo-class
continues to reflect the live state.

## Alternatives considered

- An `indeterminate` content attribute reflecting the live property would
  conflate default and current state, and could cause attribute mutations
  during checkbox activation.
- Making `checked` tri-state would change established boolean-attribute
  semantics and lose the distinction between checkedness and indeterminateness.
- Reusing dirty checkedness would couple two independent states; the existing
  `indeterminate` setter does not dirty checkedness today, and it's unclear if
  there is a benefit to doing so.
