# Custom Highlight API Extensions

## Authors

- [Kevin Babbitt](https://github.com/kbabbitt) (Microsoft)

## Participate

- [Open an issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BCustom%20Highlight%20API%20Extensions%5D%20)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Custom Highlight API Extensions](#custom-highlight-api-extensions)
  - [Authors](#authors)
  - [Participate](#participate)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [User-Facing Problem](#user-facing-problem)
    - [Goals](#goals)
    - [Non-goals](#non-goals)
  - [User research](#user-research)
  - [Proposed Approach](#proposed-approach)
    - [CSS Animations and Transitions](#css-animations-and-transitions)
      - [Effect identity](#effect-identity)
      - [Animations](#animations)
      - [Transitions](#transitions)
      - [Events](#events)
    - [Per-range highlight styles](#per-range-highlight-styles)
    - [Opacity](#opacity)
    - [Solving staggered text animation](#solving-staggered-text-animation)
    - [Solving spoken-word tracking](#solving-spoken-word-tracking)
    - [Solving data-driven range styling](#solving-data-driven-range-styling)
  - [Alternatives considered](#alternatives-considered)
    - [`::nth-letter()` and `::nth-word()` pseudo-elements](#nth-letter-and-nth-word-pseudo-elements)
      - [Pros](#pros)
      - [Cons / Reasons for rejection](#cons--reasons-for-rejection)
    - [CSS Text Transitions](#css-text-transitions)
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
  - [References \& acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Many Web experiences apply visual effects to text. AI chat interfaces and
online presentation tools have made text entry and exit effects especially
prominent, while read-along experiences and editing tools use changing
highlights to convey playback or analysis state.

Existing Web primitives for building text-level animation effects can be
inefficient for these effects, since they require backing elements.
For a per-word animation with a lot of text, hundreds of extra elements
might be created for reason other than to support such an effect.

This explainer proposes three extensions to the CSS Custom Highlight API,
which together allow authors to apply independently timed,
compositor-driven animations to arbitrary text ranges without
introducing additional elements solely to achieve the effect.
Although text animation motivates this proposal, the per-range styling
capability also supports non-animated scenarios such as data-driven
annotations, collaborative selections, syntax highlighting, and other cases
where ranges within one `Highlight` need minor style variations.


## User-Facing Problem

The most common approach for building text-based effects is to segment the text using
a mechanism such as `Intl.Segmenter` or `String.prototype.split()`, wrap each
resulting character, word, or other unit in an element such as a `<span>`, and
apply the effect to each wrapper. This technique introduces several problems:

* **Performance:** Each wrapper adds cost to the DOM, style calculation,
  layout, and accessibility trees compared to a simple paragraph of text.
* **Accessibility:** Assistive technology may announce heavily fragmented text
  differently from an uninterrupted sentence. Authors sometimes compensate by
  maintaining a separate accessible representation.
* **Editing interaction:** Presentation-only elements can interfere with text
  selection, editing, and clipboard operations such as copy and paste.
* **Content maintenance:** When text changes, authors must preserve or rebuild
  the generated structure while keeping animation state and application data
  synchronized with it.

Libraries such as [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/) and
[Splitting.js](https://github.com/shshaw/Splitting) package this pattern and
handle many of its authoring details. Because the resulting representation
still uses an element for each text unit, it retains similar platform-level
costs and tradeoffs.

Libraries such as [Pretext](https://github.com/chenglou/pretext) provide an
alternative for measuring text and laying it out on a Canvas.
Canvas-based rendering avoids some of the drawbacks of DOM-based solutions but
introduces its own: the author becomes responsible for providing support for text
handling interactions such as selection, as well as an accessibility representation.

The Custom Highlight API already lets authors identify arbitrary text ranges
without changing the document structure. However, highlight styling only
supports a limited set of properties and does not allow for animation effects or
per-range variants like an inline style on an element.
Consequently, the API cannot currently replace element wrappers for these effects.

### Goals

* Allow authors to animate and transition paint-only styles on custom
  highlights using familiar CSS syntax and timing behavior.
* Allow style variations between ranges in one `Highlight`, without
  requiring a separate highlight name and CSS rule for every variation.
* Support efficient opacity effects over all of a custom highlight's painted
  content without making highlights participate in layout.
* Preserve the semantic document structure, text shaping, selection behavior,
  and accessibility representation of the highlighted content.

### Non-goals

* The proposal does not aim to address text-level animation on transforms.
  Setting opacity on an element creates a stacking context,
  but because it does not reposition any content,
  we can reasonably emulate this behavior in a highlight.
  Setting a transform on an element establishes a containing block,
  which influences positioning of descendant elements.
  It is much harder to define an analogous behavior in a post-layout effect.
* We are leaving the division of text into sub-element units (such as characters,
  words, or lines) up to the author rather than providing declarative options.
  Prior research on other solutions for efficient text-level animations surfaced
  internationalization and generalizability concerns with baking specific splitting
  algorithms into platform features, so we avoid doing so here.

## User research

* A developer who [attempted an LLM typing effect with Custom Highlights](https://bsky.app/profile/zubiden.bsky.social/post/3mcxb3vsqtc2d)
  reported that the lack of animatable highlight properties, including opacity,
  prevented the approach from working.
* Developers reported using Custom Highlights to [follow spoken
  text](https://bsky.app/profile/donnie.damato.design/post/3mcx2vrcoys2t) and
  [highlight spoken words](https://bsky.app/profile/dbushell.com/post/3mcwkt7bs4c2l).
  An earlier [accessibility
  discussion](https://news.ycombinator.com/item?id=26841701) similarly
  described highlighting the current word and sentence during speech.
* Editor and highlighter libraries expose mature range-decoration systems.
  Examples include
  [CodeMirror decorations](https://codemirror.net/docs/ref/#view.Decoration) and
  [Shiki syntax highlighting](https://shiki.style/).
* The [State of CSS 2025 typography responses](https://2025.stateofcss.com/en-US/features/typography/#typography_pain_points)
  include requests to animate individual letters without creating thousands of
  spans or splitting text in JavaScript.
* The [State of HTML 2024 Custom Highlight results](https://2024.stateofhtml.com/en-US/features/#custom_highlight_api)
  also record interest in syntax highlighting, avoiding extra wrappers, search
  term highlighting, and richer styling.

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
pseudo-elements, including the proposed `opacity` support. Properties which
do not apply to highlights are ignored in keyframes and transition lists.
Animation and transition properties declared on an originating
element apply only to that element; they do not configure effects on its
highlight pseudo-elements. Highlight effects are instead configured through
the highlight cascade, including matching `::highlight()` rules, per-range
declarations, and inheritance from corresponding ancestor highlight
pseudo-elements. Custom properties inherited from the originating element can
affect the resolved effect properties.

#### Effect identity

Each `(Highlight registry entry, range, originating element)` tuple acts as one
animation or transition target. This follows the existing highlight styling
model, in which each originating element draws its portion of a highlight using
the corresponding highlight pseudo-element style. A range which crosses
several elements can therefore produce effects with different property values,
timing parameters, or both.

Line boxes and paint fragments do not create additional animation targets. If
one originating element draws a range in several fragments, those fragments
share one animation timeline.

The registry entry is part of the identity because the same `Highlight` can be
registered under more than one name:

```js
CSS.highlights.set("search-result", results);
CSS.highlights.set("active-result", results);
```

The two names can match different `::highlight()` rules, so they produce
independent animation and transition effects. Removing and re-adding a range
creates a new membership and therefore new animation targets for its
originating elements.

#### Animations

An animation starts for an originating element when all of the following are
true:

* the range is a member of the `Highlight`; and
* the `Highlight` is registered under a name for which the combined
  `::highlight()` and per-range style specifies an animation; and
* the range contains content drawn by that originating element.

Changing a live `Range`'s boundary points does not restart animations for
originating elements which remain covered. It starts animations for newly
covered originating elements, with the timing synchronized to the remainder
of the range, and cancels animations for elements which are no longer
covered. 

```html
<p>This is a <b>paragraph</b> with <b>bold</b> words.</p>

<style>
  @keyframes pulse {
    from { background: transparent; }
    to { background: yellow; }
  }
  ::highlight(pulse) {
    animation: pulse 1s infinite alternate;
  }
</style>
<script>
  // Start the pulse animation on the first word of the paragraph.
  const paragraph = document.querySelector("p");
  const firstWord = paragraph.firstChild.textContent.split(" ")[0];
  const range = new Range();
  range.setStart(paragraph.firstChild, 0);
  range.setEnd(paragraph.firstChild, firstWord.length);
  CSS.highlights.set("pulse", new Highlight(range));

  // Later: Extend the pulse animation to the entire paragraph.
  range.selectNodeContents(paragraph);

  // The entire paragraph, including the <b> descendants,
  // now runs the pulse animation on the same timeline.
</script>
```

Changes to animation declarations follow the existing CSS Animations
update rules. Line boxes and internal paint fragments are not separately
exposed to authors.

#### Transitions

Transitions run when the computed style for one of these per-originating-element
highlight targets changes, whether the change comes from a `::highlight()` rule,
a per-range declaration, highlight inheritance, or an originating element's
custom properties.

As with animations and static highlight styling, different originating
elements can resolve different property values and timing parameters for the
same range. Their transitions run independently. Also similar to animations, changing
the boundary points of a range does not generate new transitions or interrupt transitions
that are already in progress.

Highlight membership changes also participate in transitions. The
not-highlighted transition endpoint uses the originating foreground values, a transparent
background, no highlight-introduced shadow or decoration, and the initial value
of other applicable properties. This gives adding and removing a range behavior
similar to gaining or losing `:hover`.

When a range is added to a registered `Highlight`, its before-change style is
the not-highlighted transition endpoint and its after-change style is the newly computed
highlight style. `@starting-style` can override the starting values when an
effect needs a different entry treatment.

Removing a range from a `Highlight` deletes it immediately from the set but
triggers an exit transition to the not-highlighted state.
`Highlight.clear()` starts exit transitions for each member, just as deleting
members individually would.

If a range is re-added while its exit transition is running, the existing CSS
transition reversal rules apply. A range which becomes invalid or no longer
belongs to the applicable document cancels its animations and transitions
without retaining stale paint.

Deleting a registry entry with `CSS.highlights.delete()`, or replacing
its value with a different `Highlight` using `CSS.highlights.set()`, cancels all
effects associated with the old registry entry, including any in-progress
transitions.

#### Events

`Highlight` becomes an `EventTarget`. Animation and transition events are
dispatched at the `Highlight`, with the affected `AbstractRange` exposed on the
event. Because the same range can produce an effect for more than one
originating element, the event also exposes the originating element.
`event.pseudoElement` identifies the applicable registry name, such as
`::highlight(search-result)`.

Conceptually, the events extend the existing event interfaces as follows:

```webidl
interface HighlightAnimationEvent : AnimationEvent {
  readonly attribute AbstractRange range;
  readonly attribute Element originatingElement;
};

interface HighlightTransitionEvent : TransitionEvent {
  readonly attribute AbstractRange range;
  readonly attribute Element originatingElement;
};
```

Events are generated independently for each `(Highlight registry entry, range,
originating element)` target, following the existing CSS Animations and CSS
Transitions event rules. The same range can therefore appear in multiple
events, including events with different elapsed times. Line boxes and paint
fragments do not generate additional events. An author can use the range and
originating element to identify which effect completed without estimating
completion using a timer.

### Per-range highlight styles

A staggered text fade requires each successive word to start its animation
slightly later than the preceding word. This is technically achievable with
custom highlights today, but in ways that are poorly suited to the scenario.
Existing techniques are discussed in the "Alternatives Considered" section.

Staggering animation effects that work on a per-element basis can take advantage
of each element's inline style to achieve this effect. We propose a capability
for highlight ranges that aims for similar flexibility.

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
properties added by this proposal.
For example, a per-range style can supply data for minor variants while leaving
the general nature of an effect in a shared rule:

```js
highlight.getRangeStyle(range).setProperty("--confidence", confidence);
```

```css
::highlight(analysis) {
  color: color-mix(in srgb, gray, green calc(var(--confidence) * 100%));
}
```

Per-range declarations participate in the author cascade after the shared
`::highlight()` rule, analogous to inline declarations. Invalid properties
are ignored in the same way as they are in a `::highlight()` rule. Normal importance
rules still apply, so a `!important` declaration in a stylesheet can override a
non-`!important` per-range declaration. The resulting style is resolved separately
for each originating element crossed by the range, since inheritance, custom
properties, and `currentColor` can differ across those elements. This includes
animation and transition parameters.

If the same `Highlight` is registered under multiple names, its per-range
declarations are shared, while each name contributes its own
`::highlight()` rules. Authors who need independent per-name range data can
use separate `Highlight` objects.

Overlapping ranges with different per-range styles behave like overlapping
ranges belonging to different named custom highlights. Each range's
declaration is first combined with the shared `::highlight()` rule to produce
an effective style for that range. Those effective styles are then painted as
separate highlight layers; they are not cascaded or merged into one style for
the overlap.

For example:

```js
const first = new StaticRange(/* ... */);
const second = new StaticRange(/* ... */);
const highlight = new Highlight(first, second);

highlight.getRangeStyle(first).backgroundColor = "yellow";
highlight.getRangeStyle(second).color = "blue";
```

Where the ranges overlap, the yellow background contributed by `first` remains
visible, while `second`, as the higher layer, supplies the winning blue
foreground. This is the same result the author would get by placing `first`
and `second` in separately named custom highlights with the corresponding
styles.

The existing custom-highlight stacking order continues to order different
registry entries. Within one `Highlight`, range set insertion order supplies
the additional ordering: later ranges paint above earlier ranges. Deleting and
re-adding a range moves it to the end of the set and therefore makes it the
highest range layer in that `Highlight`.

Ranges without distinct per-range styles retain the existing behavior for
members of one `Highlight`, including treating overlapping ranges as their
union. The additional layers are needed only where per-range styling makes a
difference observable.

### Opacity

To take advantage of compositor support in modern engines, staggering animation
effects that work on a per-element basis use the `opacity` property, rather than
animating `color` from `transparent` to the desired value. Using `opacity` for
these animations also lets authors share keyframes with non-text elements, such
as images, in a single staggered-entry effect that encompasses both.

Trading away compositor support would curtail or even outweigh the performance
benefits of avoiding DOM manipulation in a highlight-based animation. We therefore
propose allowing `opacity` to apply to highlights.

Applying `opacity` to a highlight necessarily behaves differently from applying
it to an element. A range has no single box, coordinate space, or
stacking position, and can cross elements, transforms, clips, columns, and
pages. Highlight opacity therefore does not create a stacking context,
containing block, or layout box.

Additionally, overlapping highlights are currently painted in a "phase-major"
order, in which all highlight backgrounds are painted before highlight shadows,
decorations, and the single winning foreground.

Instead, opacity applies to an **atomic highlight paint group**. Within the
portion of a custom highlight owned by one originating box, the group contains:

* the highlight background;
* text shadows and decorations introduced by the highlight;
* the wash painted over replaced content; and
* the foreground text, emphasis, stroke, and originating decorations where
  that highlight supplies the winning foreground style.

These effects are removed from the normal highlight paint order and instead
stacked together as a group. Opacity is applied once to the result,
and then it is painted in custom-highlight stacking order.

A distinct per-range style creates a distinct atomic paint group. When styled
ranges overlap, their groups use the same ordering and painting behavior
described above for overlapping custom highlights. Each background, shadow,
and introduced decoration is painted as part of its owning group, while only
the topmost group supplies the foreground text. Opacity is applied to each
group before the groups are stacked.

The existing "single winning foreground" rule remains.
Making the topmost highlight transparent does not reveal a lower highlight's
foreground color, or the foreground color of the originating element.
This is important for reveal animations: `opacity: 0` on the winning highlight
should hide the text.

### Solving staggered text animation

The following example uses `Intl.Segmenter` to create one range per word,
assigns each range a different animation delay, and animates the highlight's
opacity.

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

  const staggerInterval = 6 /* milliseconds */;
  for (const [index, range] of ranges.entries()) {
    highlight.getRangeStyle(range).animationDelay = `${index * staggerInterval}ms`;
  }

  // Register only after setting the delays, so all animations start together.
  CSS.highlights.set("response-words", highlight);
</script>
```

The shared `::highlight()` rule defines the animation, the per-range
declarations stagger its timing, and using `opacity` makes the animation
eligible for compositor acceleration.

To append more text dynamically, the application can add ranges to the
already registered `Highlight`. This continuation of the example receives
complete-word batches, each with its own stagger starting at zero:

```js
function appendResponseText(text) {
  const newNode = document.createTextNode(text);
  node.parentNode.append(newNode);
  const newWords = [...segmenter.segment(text)]
      .filter(segment => segment.isWordLike);

  for (const [index, {index: offset, segment}] of newWords.entries()) {
    const range = new StaticRange({
      startContainer: newNode,
      startOffset: offset,
      endContainer: newNode,
      endOffset: offset + segment.length,
    });
    highlight.add(range);
    highlight.getRangeStyle(range).animationDelay = `${index * staggerInterval}ms`;
  }
}

// Later, when another batch of text arrives:
appendResponseText(" Newly appended words fade in as they arrive.");
```

Each batch is appended as a new text node, leaving the existing `StaticRange`
boundaries unchanged. The new ranges and their per-range delays are set
synchronously, before the next style update, so their animations start with
the intended stagger. Adding these ranges does not restart animations for
existing ranges, even though all the words have the same originating `<p>`.
Previously revealed words remain visible through `animation-fill-mode: both`,
while each new range gets its own animation timeline. The same
`prefers-reduced-motion` rule also applies to the newly added ranges.

### Solving spoken-word tracking

Given a set of word ranges, an application can keep
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

### `::nth-letter()` and `::nth-word()` pseudo-elements

A previous investigation contemplated introducing `::nth-letter()`
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
  For example, there may be differences in how an author wants to handle adjacent
  whitespace or punctuation depending on whether they are implementing a per-word text
  entry effect, a read-along effect, or an editor highlight effect. Editing applications
  might also want to vary their behaviors to emulate native controls on the underlying platform.
* The same scenario may want to split different languages on different text units. For example,
  a text fade stagger might want to split English text per-word and Japanese text per-phrase.
  Tying the choice of text unit to the selector complicates the CSS that needs to be shipped,
  especially when languages are mixed on the same page.
* Does not provide a clear way to assign per-letter or per-word stagger intervals that's better
  than having lots of `::nth-word()` rules. Words can cross element boundaries, so these
  pseudo-elements cannot be made tree-abiding, which rules out the use of CSS counters.

### CSS Text Transitions

Another previous [proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/CSSTextTransitions/explainer.md)
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

* Similar concerns to `::nth-letter()` and `::nth-word()` around baking in specific
  text-splitting algorithms apply to this approach as well.
* Does not generalize well beyond the staggered text animation scenario.
* Loses representability of intermediate values.

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

### Compositing `color` animations

#### Pros

* Reuses the existing highlight painting model without introducing atomic
  groups or changing the paint order of highlight contributions.

#### Cons / Reasons for rejection

* Only benefits the winning foreground text color. Explicit backgrounds,
  decorations, shadows, and replaced-content washes would still need to
  have animations driven on the main thread.
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

These extensions affect painting and do not alter the DOM or accessibility
tree. Range boundaries and animation timing do not add semantics or cause text
to be announced. Authors remain responsible for ensuring that information
conveyed by a highlight is also available to assistive technology when needed.
Compared with presentation-only element wrappers, highlights preserve the
accessible representation and native selection behavior of the underlying
content.

In contrast to other solutions explored in this space, this approach leaves the decision
of how to segment text in the author's hands. For word-by-word animations or similar effects,
authors are encouraged to use a standards-backed splitting algorithm such as the one
exposed by `Intl.Segmenter`.

The proposal builds on the existing Custom Highlight API and CSS animation
models. It does not expose document content or ranges that the calling script
could not already access. The new events describe only ranges already supplied
to a `Highlight`, their originating elements, and the effects applied to them.
No additional privacy or security considerations have been identified.

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

Many thanks for valuable feedback and advice from:

- Dan Clark
- Elika Etemad
- Emilio Cobos Álvarez
- Fernando Fiori
- Greg Whitworth
- Kurt Catti-Schmidt
