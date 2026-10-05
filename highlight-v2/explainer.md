# Custom Highlight API Extensions

## Authors:

- [Kevin Babbitt](https://github.com/kbabbitt) (Microsoft)

## Participate

- [Open an issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BCustom%20Highlight%20API%20Extensions%5D%20)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
  - [Goals](#goals)
- [User research](#user-research)
- [Proposed Approach](#proposed-approach)
  - [CSS Animations and Transitions](#css-animations-and-transitions)
    - [Animation identity](#animation-identity)
    - [Transitions](#transitions)
    - [Events](#events)
  - [Per-range highlight styles](#per-range-highlight-styles)
  - [Opacity](#opacity)
  - [Solving staggered text animation](#solving-staggered-text-animation)
  - [Solving spoken-word tracking](#solving-spoken-word-tracking)
  - [Solving data-driven range styling](#solving-data-driven-range-styling)
- [Alternatives considered](#alternatives-considered)
  - [CSS Text Transitions](#css-text-transitions)
    - [Pros](#pros)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection)
  - [`::nth-letter()` and `::nth-word()` pseudo-elements](#nth-letter-and-nth-word-pseudo-elements)
    - [Pros](#pros-1)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-1)
  - [Driving staggered highlight fades through JavaScript](#driving-staggered-highlight-fades-through-javascript)
    - [Pros](#pros-2)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-2)
  - [One ::highlight() rule per animation offset](#one-highlight-rule-per-animation-offset)
    - [Pros](#pros-3)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-3)
  - [Extending `AbstractRange` with an inline `style` property](#extending-abstractrange-with-an-inline-style-property)
    - [Pros](#pros-4)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-4)
  - [Compositing `color` animations](#compositing-color-animations)
    - [Pros](#pros-5)
    - [Cons / Reasons for rejection](#cons--reasons-for-rejection-5)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
- [References & acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

This explainer proposes three extensions to the CSS Custom Highlight API:
support for CSS animations and transitions, per-range styles, and opacity.
Together, these features allow authors to apply independently timed,
compositor-driven effects to arbitrary text ranges without wrapping each text
unit in an element.

The motivating use case is a word-by-word fade animation, such as the ones used
by AI chat interfaces. The proposed primitives are intentionally more general:
they can also support read-along experiences, data-driven annotations and
selections, syntax highlighting, and other paint-only effects over text.

## User-Facing Problem

Many Web experiences apply visual effects to text at sub-element granularity.
Examples include fading in the words of a streamed response and emphasizing the
word currently being spoken in a read-along experience.

The unit of currency for CSS animations and transitions is the element. An
author-written implementation must therefore divide the text using a mechanism
such as `Intl.Segmenter` or `String.prototype.split()`, wrap each resulting
character, word, or other unit in an element such as a `<span>`, and apply the
effect to each wrapper. This technique introduces several problems:

* **Performance:** Each wrapper adds cost to the DOM, style calculation,
  layout, and accessibility trees compared to a simple paragraph of text.
* **Accessibility:** Assistive technology may announce heavily fragmented text
  differently from an uninterrupted sentence. Authors sometimes compensate by
  maintaining a separate accessible representation.
* **Editing interaction:** Presentation-only elements can interfere with text
  selection, editing, and copy and paste.
* **Content maintenance:** When text changes, authors must preserve or rebuild
  the generated structure while keeping animation state and application data
  synchronized with it.

Libraries such as [GSAP
SplitText](https://gsap.com/docs/v3/Plugins/SplitText/) and
[Splitting.js](https://github.com/shshaw/Splitting) package this pattern and
handle many of its authoring details. Because the resulting representation
still uses an element for each text unit, it retains similar platform-level
costs and tradeoffs.

There is also evidence that these workloads extend beyond the original
staggered text scenario:

* A developer who [attempted an LLM typing effect with Custom
  Highlights](https://bsky.app/profile/zubiden.bsky.social/post/3mcxb3vsqtc2d)
  reports that the lack of animatable highlight properties, including opacity,
  prevented the approach from working.
* Developers report using Custom Highlights to [follow spoken
  text](https://bsky.app/profile/donnie.damato.design/post/3mcx2vrcoys2t) and
  [highlight spoken words](https://bsky.app/profile/dbushell.com/post/3mcwkt7bs4c2l).
  An earlier [accessibility
  discussion](https://news.ycombinator.com/item?id=26841701) similarly
  describes highlighting the current word and sentence during speech.
* Editor and highlighter libraries expose mature range-decoration systems.
  [CodeMirror decorations](https://codemirror.net/docs/ref/#view.Decoration),
  [Monaco model decorations](https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/model.ts),
  and [Shiki token
  output](https://shiki.style/guide/dual-themes) all associate visual
  presentation with independently meaningful text ranges.

The Custom Highlight API already lets authors identify arbitrary text ranges
without changing the document structure. However, every range in a custom
`Highlight` currently shares one static `::highlight()` style. Authors cannot
animate that style, assign a different value such as an animation delay to each
range, or fade the complete painted contribution of a highlight. Consequently,
the API cannot replace presentation-only wrappers for these effects.

### Goals

* Allow authors to animate and transition paint-only styles on custom
  highlights using familiar CSS syntax and timing behavior.
* Allow small style variations between ranges in one `Highlight`, without
  requiring a separate highlight name and CSS rule for every variation.
* Support efficient opacity effects over all of a custom highlight's painted
  content without making highlights participate in layout.
* Preserve the semantic document structure, text shaping, selection behavior,
  and accessibility representation of the highlighted content.
* Support use cases beyond staggered text animation.
* Let authors choose how to divide content into ranges. Different applications
  and languages can use words, grapheme clusters, phrases, syntax tokens, or
  application-defined units as appropriate.

Each proposal also has uses independent of the staggered fade scenario:

| Scenario | Supporting evidence | Relevant proposals |
| --- | --- | --- |
| Staggered word or character animation | Current implementations range from author-written segmentation and wrapper code to libraries such as SplitText and Splitting.js; State of CSS respondents request individual-letter animation without spans or JavaScript splitting; one developer directly attempted the effect with Custom Highlights | Animations, per-range delays, and opacity |
| Spoken-word and read-along highlighting | Practitioner reports describe using Custom Highlights to follow spoken text; an accessibility discussion describes simultaneous current-word and current-sentence highlighting | Transitions when ranges enter and leave a highlight |
| Data-driven range presentation | CodeMirror, Monaco, and [ProseMirror](https://prosemirror.net/docs/ref/#view.Decoration) expose range decorations; Shiki emits styled token spans; [Lexical](https://github.com/facebook/lexical/blob/main/packages/lexical-yjs/src/SyncCursors.ts) generates highlight names and CSS rules for arbitrary collaborator colors | Per-range styles, with optional transitions and opacity |

The proposal does not give highlights independent layout boxes. Effects which
require transforms, clipping, generated content, or independent layout remain
out of scope. It also does not replace the position mapping, virtualization,
or semantic data models used by editors and annotation frameworks.

## User research

The evidence above combines direct Custom Highlight usage with adjacent evidence
from established text-animation, editor, and syntax-highlighting ecosystems.
The distinction is important:

* There is direct evidence for attempting staggered Custom Highlight
  animations and for using Custom Highlights in spoken-word experiences.
* There is strong evidence that editors and syntax highlighters need
  independently styled ranges, but those projects are not necessarily asking
  for this particular API shape.
* Automatic entry and exit transitions are a proposed way of expressing these
  effects. The research did not find direct requests for that specific
  lifecycle behavior.

The [State of CSS 2025 typography
responses](https://2025.stateofcss.com/en-US/features/typography/#typography_pain_points)
include requests to animate individual letters without creating thousands of
spans or splitting text in JavaScript. The [State of HTML 2024 Custom Highlight
results](https://2024.stateofhtml.com/en-US/features/#custom_highlight_api)
also record interest in syntax highlighting, avoiding extra wrappers, search
term highlighting, and richer styling.

These sources establish demand for the workloads more strongly than for the
specific APIs proposed here. The proposal therefore treats the three features
as general paint-only building blocks and demonstrates below how they address
the evidenced scenarios.

## Proposed Approach

We propose three enhancements to the Custom Highlight API:

1. CSS Animations and Transitions on highlight ranges.
1. Per-range styles to allow for minor variations on a given `::highlight()` rule.
1. Opacity support on highlight ranges.

### CSS Animations and Transitions

We propose allowing the CSS animation and transition properties to apply to
custom highlight pseudo-elements. For example:

```css
@keyframes emphasize {
  from { background-color: transparent; }
  to { background-color: gold; }
}

::highlight(new-annotation) {
  animation: emphasize 300ms ease-out;
  transition: background-color 150ms;
}
```

Animations and transitions can affect properties that are valid for highlight
pseudo-elements, including the proposed `opacity` support. Enabling animation
properties does not expand highlights into general CSS boxes: properties which
do not apply to highlights remain inapplicable in keyframes and transition
lists as well.

#### Animation identity

Each `(Highlight, range, registry entry)` tuple acts as one logical animation
target. A range which crosses several elements, lines, or paint fragments still
has one animation timeline. Implementations may need several internal style or
compositor targets to paint those fragments, but those targets remain
synchronized and are not separately exposed to authors.

The registry entry is part of the identity because the same `Highlight` can be
registered under more than one name:

```js
CSS.highlights.set("search-result", results);
CSS.highlights.set("active-result", results);
```

The two names can match different `::highlight()` rules, so they produce
independent animation and transition streams. Removing and re-adding a range
creates a new membership and therefore a new animation target.

Animations start when both of the following are true:

* the range is a member of the `Highlight`; and
* the `Highlight` is registered under a name for which the combined
  `::highlight()` and per-range style specifies an animation.

Changing a live `Range`'s boundary points does not restart its animations.
Changes to animation declarations follow the existing CSS Animations update
rules. Internal fragment targets are not returned from
`document.getAnimations()`, since exposing them would make author-visible
behavior depend on layout and implementation details.

#### Transitions

Transitions run when the computed style for a logical highlight target changes,
whether the change comes from a `::highlight()` rule, a per-range declaration,
or a change in the originating element's highlight style.

Highlight membership changes also participate in transitions. The
not-highlighted endpoint uses the originating foreground values, a transparent
background, no highlight-introduced shadow or decoration, and the initial value
of other applicable properties. This gives adding and removing a range behavior
similar to gaining or losing `:hover`.

When a range is added to a registered `Highlight`, its before-change style is
the not-highlighted endpoint and its after-change style is the newly computed
highlight style. `@starting-style` can override the starting values when an
effect needs a different entry treatment.

When a range is removed, the user agent retains its outgoing highlight paint
long enough to transition from its current style to the not-highlighted
endpoint. The range ceases to be a member immediately for JavaScript set
operations; the retained paint exists only for the exit transition. It is
discarded when all exit transitions finish or are canceled. The outgoing
target's transition declarations control this exit transition, since there is
no longer a matching `::highlight()` style after removal. Any CSS animations
on the removed target are canceled before the exit transition begins.
`clear()`, removal of a registry entry, and replacement of the registered
`Highlight` apply the same behavior to each affected logical target.

If a range is re-added while its exit transition is running, the existing CSS
transition reversal rules apply. A range which becomes invalid or no longer
belongs to the applicable document cancels its animations and transitions
without retaining stale paint.

#### Events

`Highlight` becomes an `EventTarget`. Animation and transition events are
dispatched at the `Highlight`, with the affected `AbstractRange` exposed on the
event. `event.pseudoElement` identifies the applicable registry name, such as
`::highlight(search-result)`.

Conceptually, the events extend the existing event interfaces as follows:

```webidl
interface HighlightAnimationEvent : AnimationEvent {
  readonly attribute AbstractRange range;
};

interface HighlightTransitionEvent : TransitionEvent {
  readonly attribute AbstractRange range;
};
```

One event is dispatched per logical range and registry entry, not per element
or paint fragment. These events do not bubble through the DOM because a
`Highlight` is not a DOM node. In particular, an author can use
`animationend`, `animationcancel`, `transitionend`, or `transitioncancel` for
cleanup without estimating completion using a timer.

### Per-range highlight styles

A staggered text fade requires each successive word to start its animation
slightly later than the preceding word. This is technically achievable with
custom highlights today, but in ways that are poorly suited to the scenario.
Existing techniques are discussed in the "Alternatives Considered" section.

Staggering animation effects that work on a per-element basis can take advantage
of each element's inline style to achieve this effect. We propose a capability
for highlight ranges that is similar in spirit.

The proposed API is:

```webidl
partial interface Highlight {
  CSSStyleDeclaration? getRangeStyle(AbstractRange range);
};
```

`getRangeStyle(range)` returns a mutable declaration block for the membership
of `range` in that `Highlight`. It returns `null` if the exact range object is
not currently a member. The style belongs to the `(Highlight, range)`
relationship, rather than to the range alone:

```js
const range = new StaticRange(/* ... */);
const searchResults = new Highlight(range);
const diagnostics = new Highlight(range);

searchResults.getRangeStyle(range).backgroundColor = "yellow";
diagnostics.getRangeStyle(range).textDecorationColor = "red";
```

The same range can therefore participate in different highlights without
sharing presentation state.

Repeated calls for a current membership return the same
`CSSStyleDeclaration`. Changing the boundary points of a live `Range` preserves
the declaration. Deleting the range or clearing the `Highlight` detaches it:
the declaration remains inspectable, but further changes have no effect.
Re-adding the range creates a fresh declaration. This lifecycle follows the
identity of entries in `Highlight`'s existing `setlike<AbstractRange>`.

The declaration accepts custom properties and properties that are valid for
highlight pseudo-elements, including animation, transition, and opacity
properties added by this proposal. Invalid properties are ignored in the same
way as they are in a style attribute. For example, script can supply data while
leaving presentation in CSS:

```js
highlight.getRangeStyle(range).setProperty("--confidence", confidence);
```

```css
::highlight(analysis) {
  color: color-mix(in srgb, gray, green calc(var(--confidence) * 100%));
}
```

Per-range declarations participate in the author cascade after the shared
`::highlight()` rule, analogous to inline declarations. Normal importance
rules still apply, so an important declaration in a stylesheet can override a
normal per-range declaration. The resulting style is resolved separately for
each originating element crossed by the range, since inheritance and
`currentColor` can differ across those elements.

If the same `Highlight` is registered under multiple names, its per-range
declarations are shared, while each name contributes its own
`::highlight()` rules. Authors who need independent per-name range data can
use separate `Highlight` objects.

Per-range styles also make overlap between members of the same `Highlight`
observable. Where differently styled members overlap, declarations from all
covering members participate in a range-local cascade, with later insertion
order winning ties. The result is one effective style source for that interval,
rather than duplicate painting of every overlapping member. Deleting and
re-adding a range moves it to the end of the set and therefore updates this
order.

### Opacity

To take advantage of compositor support in modern engines, staggering animation
effects that work on a per-element basis use the `opacity` property, rather than
animating `color` from `transparent` to the desired value. Using `opacity` for
these animations also lets authors share keyframes with non-text elements, such
as images, which participate in a larger staggered effect.

Trading away compositor support would curtail or even outweigh the performance
benefits of avoiding DOM manipulation in a highlight-based animation. We therefore
propose allowing `opacity` to apply to highlights.

Applying `opacity` to a highlight necessarily behaves differently from applying
it to an element. An arbitrary range has no single box, coordinate space, or
stacking position, and can cross elements, transforms, clips, columns, and
pages. Highlight opacity therefore does not create a stacking context,
containing block, or layout box.

Instead, opacity applies to an **atomic highlight paint group**. Within the
portion of a custom highlight owned by one originating box, the group contains:

* the highlight background;
* text shadows and decorations introduced by the highlight;
* the wash painted over replaced content; and
* the foreground text, emphasis, stroke, and originating decorations where
  that highlight supplies the winning foreground style.

The group is rendered to a transparent image and opacity is applied once to the
result. Applying opacity after rendering avoids darkening where glyphs,
shadows, or decorations within the group overlap.

Atomic grouping requires custom highlight groups to be painted contiguously in
custom highlight stacking order. This differs from the current phase-major
order, in which all highlight backgrounds are painted before highlight shadows,
decorations, and the single winning foreground. For example, a
higher-priority highlight's background can cover a lower-priority highlight's
decoration. This paint-order change is the deliberate cost of giving each
custom highlight element-like group opacity.

The existing single winning foreground rule remains. Lower highlights do not
receive hidden copies of the text, so making the topmost highlight transparent
does not reveal a lower highlight's foreground color. This is important for
reveal animations: `opacity: 0` on the winning highlight hides the text.

The group identity consists of the registry entry, the effective style source,
and the originating box. A range with a distinct per-range style has its own
effective style source. Overlapping members first resolve through the
range-local cascade described above and therefore do not apply opacity
repeatedly to the same pixels.

One logical range can produce multiple box-local groups when it crosses element
boundaries. Those groups share animation timing, but implementations are not
required to combine them into one physical surface. They can be composited
independently when doing so produces equivalent pixels, and can fall back to
main-thread painting for complex overlap, fragmentation, or decoration cases.
Whether an animation is compositor-driven is not author-observable and does not
change the required result.

### Solving staggered text animation

The following example uses `Intl.Segmenter` to create one range per word,
assigns each range a different animation delay, and animates the highlight's
opacity. It does not add any presentation-only elements to the document.

```html
<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  ::highlight(response-words) {
    animation: fade-in 600ms ease-in-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    ::highlight(response-words) {
      animation: none;
      opacity: 1;
    }
  }
</style>

<p id="response">Custom highlights can animate text without extra spans.</p>

<script>
  const node = document.querySelector("#response").firstChild;
  const segmenter = new Intl.Segmenter(undefined, {granularity: "word"});
  const words = [...segmenter.segment(node.data)]
      .filter(segment => segment.isWordLike);

  const ranges = words.map(({index, segment}) => new StaticRange({
    startContainer: node,
    startOffset: index,
    endContainer: node,
    endOffset: index + segment.length,
  }));

  const highlight = new Highlight(...ranges);

  for (const [index, range] of ranges.entries()) {
    highlight.getRangeStyle(range).animationDelay = `${index * 6}ms`;
  }

  // Register only after setting the delays, so all animations start together.
  CSS.highlights.set("response-words", highlight);
</script>
```

The shared `::highlight()` rule defines the animation, the per-range
declarations stagger its timing, and atomic highlight opacity allows eligible
animations to run on the compositor.

### Solving spoken-word tracking

The practitioner reports linked in the [User-Facing
Problem](#user-facing-problem) use Custom Highlights to connect speech playback
to the word being spoken. Given a set of word ranges, an application can keep
the current word in one `Highlight`:

```css
::highlight(spoken-word) {
  background-color: gold;
  transition: background-color 120ms ease-out;
}
```

```js
const spokenWord = new Highlight();
CSS.highlights.set("spoken-word", spokenWord);

function setSpokenWord(range) {
  spokenWord.clear();
  spokenWord.add(range);
}
```

The speech or media layer calls `setSpokenWord()` as playback advances. When
the range changes, the old word transitions to the not-highlighted state while
the new word transitions into the highlighted state. No timer is needed to
drive intermediate colors, and neither word needs a wrapper element.

The same pattern can use two Highlights to track the current word and current
sentence independently.

### Solving data-driven range styling

Range-decoration systems commonly receive presentation data from an
application model. For example, Lexical's [collaborative selection
implementation](https://github.com/facebook/lexical/blob/main/packages/lexical-yjs/src/SyncCursors.ts)
currently generates a highlight name and CSS rule for each collaborator's
arbitrary color.

Per-range styles allow one logical `Highlight` and one shared CSS rule to
represent those selections:

```css
::highlight(remote-selections) {
  background-color:
      color-mix(in srgb, var(--selection-color) 35%, transparent);
  transition: background-color 120ms;
}
```

```js
const remoteSelections = new Highlight();
CSS.highlights.set("remote-selections", remoteSelections);

function addRemoteSelection(range, color) {
  remoteSelections.add(range);
  remoteSelections.getRangeStyle(range)
      .setProperty("--selection-color", color);
}

function removeRemoteSelection(range) {
  remoteSelections.delete(range);
}
```

The application supplies only the per-range data. The stylesheet continues to
control how the color is presented, including its alpha, transition timing,
forced-color behavior, and any future theme-specific adjustments. Syntax
highlighters and analysis tools can use the same pattern for token categories,
confidence scores, diagnostic severity, or other range-specific values.

## Alternatives considered

### CSS Text Transitions

A previous [proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/CSSTextTransitions/explainer.md)
contemplated four new CSS properties:

```css
transition-text-interval: <time [0s,∞]>#
transition-text-unit: [ none | character | word | line ]#
animation-text-interval: <time [0s,∞]>#
animation-text-unit: [ none | character | word | line ]#
```

#### Pros

* Frees authors from having to think about how to split text.
* Doing text splitting in the engine is faster than manipulating ranges in JavaScript.
* Minimal new API surface.

#### Cons / Reasons for rejection

* Does not generalize well beyond the staggered text animation scenario.
* Loses representability of intermediate values.

### `::nth-letter()` and `::nth-word()` pseudo-elements

Another previous investigation contemplated introducing `::nth-letter()`
and `::nth-word()` pseudo-element selectors. These selectors have a
[long history](https://github.com/w3c/csswg-drafts/issues/3208)
of being requested additions to CSS but come with their own
complicating factors.

#### Pros

* Frees authors from having to think about how to split text.
* Doing text splitting in the engine is faster than manipulating ranges in JavaScript.
* In contrast to Text Transitions, generalizes to non-animation scenarios.

#### Cons / Reasons for rejection

* Even though [UAX-29](https://www.unicode.org/reports/tr29/tr29-47.html) gives us *a*
  standardized way to split text on letter and word boundaries, it is not clear that
  this way is sufficiently universal across use cases to bake it into pseudo-elements.
  For example, different use cases might want to handle adjacent whitespace or punctuation
  differently.
* The same scenario may want to split different languages on different text units. For example,
  a text fade stagger might want to split English text per-word and Japanese text per-phrase.
  Tying the choice of text unit to the selector complicates the CSS that needs to be shipped,
  especially when languages are mixed on the same page.
* Does not provide a clear way to assign per-letter or per-word stagger intervals that's better
  than having lots of `::nth-word()` rules. Words can cross element boundaries, so these
  pseudo-elements cannot be made tree-abiding, which rules out the use of CSS counters.

### Driving staggered highlight fades through JavaScript

Instead of assigning per-range delays, authors could run a JavaScript loop. Once every `n`
milliseconds, where `n` is the desired stagger interval, the next range would have the desired
highlight (including animation effect) applied.

#### Pros

* Reduces need for new API surface.

#### Cons / Reasons for rejection

* Stagger animation updates are tied to the main thread event loop. Implementations frequently cap
  this loop at their own refresh cadence, such as 60 times a second (once every 16.7 ms).
  This limits the effects authors can achieve; one use case that was examined was written for
  a stagger interval of once every 6 ms, which could not be faithfully reproduced on a 16.7 ms
  refresh timer. Competing work on the main thread could also introduce jank.

### One ::highlight() rule per animation offset

Instead of assigning per-range delays, authors could specify each successive delay in its
own `::highlight()` rule.

#### Pros

* Reduces need for new API surface.

#### Cons / Reasons for rejection

* The number of text units participating in a stagger animation can be arbitrarily long.
  Assigning a unique offset per text unit for `n` text units requires maintaining `n`
  unique `::highlight()` rules. There are two ways to do this, neither of which is good:
  * Ensure a sufficient number of rules are present at the outset, which causes stylesheet bloat; or
  * Dynamically generate and add rules via CSSOM, which can cause large style recalculations to occur.

### Extending `AbstractRange` with an inline `style` property

An alternative API would put the declaration directly on every range:

```webidl
partial interface AbstractRange {
  [SameObject, PutForwards=cssText]
  readonly attribute CSSStyleDeclaration style;
};
```

#### Pros

* Provides a short and familiar `range.style` API.
* Makes the declaration easy to retain as a live `Range` changes boundary
  points.
* Defining it on `AbstractRange`, rather than `Range`, also covers
  `StaticRange` and future range types.

#### Cons / Reasons for rejection

* A range describes document geometry, not one presentation of that geometry.
  The same range can be used for editing, extraction, measurement, or several
  unrelated highlights.
* If one range belongs to two `Highlight` objects, an intrinsic style would
  force both uses to share declarations. Membership-owned styles let the same
  range represent, for example, a yellow search result and a red diagnostic.
* A style mutation would need to find and invalidate every `HighlightRegistry`
  containing every `Highlight` which contains the range. This creates reverse
  rendering dependencies on a general DOM geometry object.
* The effect of the declaration while the range is not highlighted would be
  unclear.
* Adding presentation state to the base interface would impose these semantics
  on every present and future `AbstractRange` subtype, even when it is never
  used for highlighting.

For these reasons, the proposal keeps style on the relationship between a
`Highlight` and one of its members, exposed through
`highlight.getRangeStyle(range)`.

### Compositing `color` animations

#### Pros

* Reuses the existing highlight painting model without introducing atomic
  groups or changing the relative order of highlight contributions.

#### Cons / Reasons for rejection

* Only the winning foreground text color fades. Explicit backgrounds,
  decorations, shadows, and replaced-content washes remain visible unless
  authors animate each color-valued property separately.
* Does not integrate as cleanly with non-text content that participates in a
  staggered fade. An image would still animate using `opacity`, requiring
  separate keyframes for text and non-text units.
* On current graphics platforms, compositing `color` is less efficient than
  compositing `opacity`. The former requires a native paint worklet in the
  engine, whereas the latter can be offloaded entirely to the graphics API.

## Accessibility, Internationalization, Privacy, and Security Considerations

As with any animation effect, user preferences expressed via `prefers-reduced-motion`
should be respected.

As with any opacity effect, user contrast preferences expressed via `prefers-contrast`
or enabling Forced Colors Mode should be respected.

In contrast to other solutions explored in this space, this approach leaves the decision
of how to segment text in the author's hands. For word-by-word animations or similar effects,
authors are encouraged to use a standards-backed splitting algorithm such as the one
exposed by `Intl.Segmenter`.

<!--
## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

- [Implementor A] : Positive
- [Stakeholder B] : No signals
- [Implementor C] : Negative

[If appropriate, explain the reasons given by other implementors for their concerns.]
-->

## References & acknowledgements

* [CSS Custom Highlight API Level 1](https://drafts.csswg.org/css-highlight-api-1/)
* [CSS Pseudo-Elements Level 4: highlight pseudo-elements](https://drafts.csswg.org/css-pseudo-4/#highlight-pseudos)
* [CSS Animations Level 1](https://drafts.csswg.org/css-animations-1/)
* [CSS Transitions Level 2](https://drafts.csswg.org/css-transitions-2/)
* [`Intl.Segmenter`](https://tc39.es/ecma402/#segmenter-objects)
* [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/)

Many thanks for valuable feedback and advice from:

- Dan Clark
- Elika Etemad
- Emilio Cobos Álvarez
- Fernando Fiori