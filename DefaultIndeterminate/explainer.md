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

The below table shows checkboxes in various states across different rendering
engines. An [interactive demo](https://microsoftedge.github.io/MSEdgeExplainers/DefaultIndeterminate/demo.html)
is also available.

|             | Unchecked / Checked / Indeterminate |
|------------:|:-----------------------------------:|
| Edge/Chrome | <img src="example-edge.jpg">        |
| Firefox     | <img src="example-firefox.jpg">     |
| Safari      | <img src="example-safari.jpg">      |

## User-Facing Problem

Checkboxes today cannot be statically defined to have an indeterminate state,
and can only reach that state post-creation through JavaScript invoking a
property setter. It _is_ possible to represent indeterminateness to Assistive
Technologies (ATs) via the `aria-checked=mixed` content attribute value, but
that _only_ applies to Assistive Technologies. The
[discussion in whatwg/html#6578](https://github.com/whatwg/html/issues/6578)
identified several situations where this gap is made apparent today:

- **Static component examples.** A component library or style guide should be
  able to show an indeterminate native checkbox alongside checked, unchecked,
  and disabled examples without [initialization scripts](https://github.com/whatwg/html/issues/6578#issuecomment-818499168).
- **Server-rendered forms and components.** A form generated from prefilled
  data may need a logically-grouped checkbox to start indeterminate because only
  some sub-options are selected. Users should see the correct state immediately,
  rather than waiting for JavaScript to initialize or
  [hydrate a framework component](https://github.com/whatwg/html/issues/6578#issuecomment-1017575165).
- **Static renderer output.** Users of formats such as
  [GitHub Flavored Markdown](https://github.com/whatwg/html/issues/6578#issuecomment-894712701)
  could benefit from indeterminate checkboxes in generated HTML where authors
  cannot supply initialization scripts.

An example of how to mark a checkbox as indeterminate today can be seen here:

```html
<label>
  <input id="select-all" type="checkbox">
  Select all options
</label>
<script>
  document.querySelector("#select-all").indeterminate = true;
</script>
```

An additional concern with indeterminate checkboxes is that the form reset
algorithm does not remove indeterminateness. This is likely an oversight, since
even checkedness applied solely via IDL attribute setter will be reset.

### Goals

- Allow static HTML and server-rendered components to express an initially
  indeterminate native checkbox without JavaScript initialization.
- Allow form reset to restore initial indeterminate state.
- Preserve existing checkbox interaction, form submission, and validation
  behavior.

### Non-goals

- Change the relationship between checkedness and indeterminateness.

## Proposed Approach

We propose adding a boolean `defaultindeterminate` content attribute to
`<input type="checkbox">`, reflected by a `defaultIndeterminate` IDL attribute.
Its presence sets the default to true; its absence sets it to false. The
existing `indeterminate` IDL attribute continues to represent the live state.

The following checkbox starts indeterminate, using its native appearance and
accessibility behavior, without JavaScript:

```html
<label>
  <input id="select-all" type="checkbox" defaultindeterminate>
  Select all options
</label>
```

```diff
 <label>
-  <input id="select-all" type="checkbox">
+  <input id="select-all" type="checkbox" defaultindeterminate>
   Select all options
 </label>
-<script>
-  document.querySelector("#select-all").indeterminate = true;
-</script>
```

As with `checked` and `defaultChecked`, changing the default does not overwrite
a live state that has already been changed. To keep default and live state
independent, the platform will keep track of a *dirty indeterminateness* flag,
alongside dirty checkedness. It starts false; changing the live `indeterminate`
property or activating the checkbox sets it. While the flag is false, adding or
removing `defaultindeterminate` updates the live state. The attribute does not
track user interaction or changes to the live property.

Form reset should clear the *dirty indeterminateness* flag from a checkbox, and
restore the indeterminateness to the default state as specified by
`defaultindeterminate` content attribute. This is in line with how the algorithm
handles checkedness, and in general, considerations made for *dirty checkedness*
should be made for *dirty indeterminateness* as well.

Indeterminateness remains independent of checkedness: a checkbox can be both
checked and indeterminate, and clearing indeterminateness reveals its checked
or unchecked state. Existing activation, form submission, and validation
continue to use checkedness as they do today. The `:indeterminate` pseudo-class
continues to reflect the live state.

## Alternatives considered

- An `indeterminate` content attribute reflecting the live property would
  conflate default and current state, and could cause attribute mutations
  during checkbox activation.
  ```html
  <label>
    <input id="select-all" type="checkbox" indeterminate>
    Select all options
  </label>
  ```
  ```diff
   <label>
  -  <input id="select-all" type="checkbox" defaultindeterminate>
  +  <input id="select-all" type="checkbox" indeterminate>
     Select all options
   </label>
  ```
- Making `checked` tri-state would change established boolean-attribute
  semantics and lose the distinction between checkedness and indeterminateness.
  ```html
  <label>
    <input id="select-all" type="checkbox" checked="mixed">
    Select all options
  </label>
  ```
  ```diff
   <label>
  -  <input id="select-all" type="checkbox" defaultindeterminate>
  +  <input id="select-all" type="checkbox" checked="mixed">
     Select all options
   </label>
  ```
- Reusing dirty checkedness would couple two independent states; the existing
  `indeterminate` setter does not dirty checkedness today, and it's unclear if
  there is a benefit to doing so.

## Open Questions

- **Is the change to have the reset algorithm consider indeterminateness worth
  making?** It's a breaking change, though hopefully one that would be rare in
  practice. The change itself makes the reset algorithm treat indeterminateness
  similarly to how it treats checkedness. Additionally, not fixing this is even
  more glaring with the introduction of a default state for indeterminateness.
  - I will create a Chromium use-counter to collect metrics about how often
    indeterminate checkboxes are reset, to build confidence in this approach.
