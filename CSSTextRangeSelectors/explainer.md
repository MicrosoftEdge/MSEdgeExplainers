# CSS Text Range Selectors

## Authors
- [John Jansen](https://github.com/thejohnjansen)

## Status of this Document

This document is an **exploratory draft** for discussion, not a specification.
It proposes investigating author-declared CSS selector syntax that identifies
an arbitrary substring or range of text for styling, without JavaScript Range
plumbing or wrapping the text in additional elements.

* This document status: **Brainstorming**
* Potential discussion venue: [W3C CSS Working Group](https://www.w3.org/Style/CSS/)
* Current version: this document

No CSSWG acceptance, agreed syntax, or implementation commitment is asserted.
All new syntax below is tentative and is not existing CSS. The range model,
matching mechanism, and permitted styling remain unresolved. Related work
already exists; this draft explores a differentiated authoring surface rather
than claiming that text-range styling is a new problem.

Feedback is welcome through the
[repository issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BCSS%20Text%20Range%20Selectors%5D+).
The issue states discussed below were checked on October 5, 2026; those states
and the linked editors' drafts may change.

## Motivation and Problem

Authors sometimes want to visually distinguish a portion of a sentence rather
than an entire element: a phrase in a quotation, a term in instructional
content, or a passage associated with an annotation. That portion may start
inside one text node and end inside another, crossing existing inline markup.

Wrapping text in `<span>` elements provides a styling hook, but couples
presentation to document structure. Independent, overlapping ranges do not
necessarily form a nested element tree, making wrappers awkward to maintain.
The [CSS Custom Highlight API](https://drafts.csswg.org/css-highlight-api-1/)
already avoids those wrappers by styling registered DOM ranges. Its
programmatic authoring surface still requires script to locate boundary
points, construct ranges, and register highlights.

The narrower problem here is declarative range identification in CSS:
could an author describe the desired portion of text alongside its style,
without that script or additional source markup? This could be useful for
static documents and separately maintained annotation stylesheets. It would
not eliminate the need to keep annotations consistent with their content.

## Representative Use Cases

| Use case | Desired outcome | Design pressure |
| --- | --- | --- |
| Instructional material | Highlight a particular term or phrase in otherwise unchanged prose. | Localization, repeated terms, and explicit matching scope. |
| Editorial annotations | Distinguish a quoted passage crossing an `<em>` or `<a>` boundary. | Cross-element ranges without losing existing semantics. |
| Independent annotation layers | Paint intersecting passages from two reviewers without restructuring the text. | Overlap, precedence, and separate ownership of styles. |
| Generated static documents | Emit range descriptions and CSS from a publishing pipeline instead of emitting wrapper elements or initialization script. | Stable offsets, versioning, and source readability. |

For example, in:

```html
<p class="lesson">Read the <em>small print</em> before signing.</p>
```

an author might want to highlight only `small`, or the phrase
`the small print`, which crosses inline-element boundaries. These are
different from styling all text children of the paragraph.

The examples are illustrative needs, not evidence of measured demand.
User research should establish which scenarios justify a new CSS surface
rather than the existing API or declarative markup alternatives.

## Scope and Range Model

The proposed capability is **author-declared CSS syntax identifying an
arbitrary text substring/range for presentation**. Here, "select" means
identifying content to style, not changing the user's Selection or caret.
Whether identification uses text anchors, offsets, or another mechanism is
open. Supporting text that crosses element boundaries is a use-case
requirement to investigate.

Two possible models must be distinguished:

* **DOM-backed source range:** Identify boundaries in DOM text and paint the
  visible portions between them. [DOM ranges](https://dom.spec.whatwg.org/#ranges)
  provide a boundary-point model, but source text and displayed text differ.
* **Rendered-text range:** Match against a defined user-visible text stream
  after some rendering transformations. This needs a precise definition of
  that stream and of its mapping to paintable fragments or DOM boundaries.

Neither model meets these particular use-cases. DOM text can include hidden 
content and whitespace that is collapsed in rendering. 
Rendered text may reflect `text-transform`, generated content, 
and layout-dependent breaks, and may not map one-to-one
to source offsets. The repository's
[Range enhancements explainer](../RangeInnerText/explainer.md) discusses
related mapping difficulties; its proposed APIs are not assumed to exist.

A design must also define logical order versus visual order for bidirectional
text. "Rendered" should not silently mean a sequence of glyphs, and a CSS
range should not be assumed to correspond to a single layout box.

## Tentative Syntax Sketches

**The following are alternative design sketches, not valid standardized CSS
or a proposed grammar ready for implementation.** The name `::text-range`
is a placeholder, deliberately distinct from the whole-text-node `::text`
discussion. Using pseudo-element notation here does not settle whether
pseudo-elements are the right abstraction.

All examples use highlight-like colors to illustrate a visual outcome.
They do not imply that every CSS property would apply.

### Sketch A: Text Anchors

```css
/* Tentative: identify the quoted substring within each matched scope. */
.lesson::text-range(quote("small")) {
  background-color: yellow;
  color: black;
}

/* Tentative: context disambiguates a phrase crossing inline markup. */
.lesson::text-range(
  quote("the small print", prefix("Read "), suffix(" before signing."))
) {
  background-color: lightblue;
}
```

The intent is to locate a quoted string in the text associated with each
`.lesson` element, optionally using preceding and following context. Whether
that scope contains direct-child text, descendant DOM text, or a rendered
text stream is unresolved. Prefix and suffix would constrain a match rather
than be included in the highlighted passage in this sketch.

Text anchors are readable and can survive unrelated insertions before a
passage. They can also become ambiguous, stop matching after editing or
translation, or require expensive searching. No first-match or all-matches
default is implied. A start/end-anchor form could identify a long passage
without quoting all of it, but would introduce endpoint pairing and
inclusion questions.

### Sketch B: Text Offsets

```css
/* Tentative: offsets relative to the text stream of each matched scope. */
.lesson::text-range(offsets(9, 14)) {
  background-color: yellow;
  color: black;
}
```

Under an illustrative zero-based, start-inclusive, end-exclusive stream
equal to `Read the small print before signing.`, these offsets identify
`small`. This convention is only an assumption for this example, not a
decision about counting units or normalization.

Offsets are compact and can be generated by a publishing or annotation
pipeline without copying the passage into CSS. They are brittle when text
is inserted, removed, translated, or normalized differently. A version or
expected-text check might prevent stale offsets from styling unrelated text,
at the cost of additional syntax and processing.

Offsets in DOM text commonly use UTF-16 code units; an author-facing text
stream might instead use Unicode code points or grapheme clusters. Those
are not interchangeable. Even after choosing a unit, the design must define
how boundaries inside a grapheme cluster or shaped text are handled.

### Shared Tradeoffs and an Alternative Composition

Both sketches combine locating content and styling it in one rule.
A selector-based form is convenient for small annotations, but repeating
the same range description in multiple rules is awkward. Another possibility
is to declare named ranges separately in CSS and style them using the
existing `::highlight(name)` surface. That would require a new declaration
mechanism; `::highlight()` alone does not locate text.

Named declarations could reuse highlight painting, but introduce name
scoping, registry ownership, collisions with script-created highlights, and
removal or invalidation rules. A separate highlight-map format or HTML
markers might solve the authoring problem better than a new selector.
These alternatives should be compared before choosing syntax.

## Relationship to Existing Standards and Prior Art

### Whole Text Nodes and Anonymous Boxes

[CSSWG issue w3c/csswg-drafts#2208](https://github.com/w3c/csswg-drafts/issues/2208),
**open** when checked, is titled
`[css-pseudo-5] ::text / ::text-node pseudoelement`. Its initial proposal
targets direct-child text nodes; discussion explores descendants, contiguous
text runs, whitespace nodes, styling text versus anonymous boxes, specificity,
cascade, and flex/layout consequences. It does **not** define arbitrary
substring endpoints. A text-node feature and a substring-range feature could
coexist, but should not be presented as the same proposal.

Two related discussions help explain the box-model distinction.
[w3c/csswg-drafts#2084](https://github.com/w3c/csswg-drafts/issues/2084)
is a closed issue about opening `<details>` for styling, including print;
[comments referenced from #2208](https://github.com/w3c/csswg-drafts/issues/2084#issuecomment-351280093)
discuss anonymous-box styling. It is not itself a substring-range proposal.
[w3c/csswg-drafts#2406](https://github.com/w3c/csswg-drafts/issues/2406),
open when checked, proposes a `::contents` pseudo-element wrapping an
element's contents, not text-range matching.

### CSS Custom Highlights and Limited Text Pseudo-elements

The [CSS Custom Highlight API](https://drafts.csswg.org/css-highlight-api-1/)
defines script registration of `Highlight` objects containing
`AbstractRange` objects through `CSS.highlights`, and styling through
`::highlight(name)`. These ranges can cross element boundaries and overlap.
The API's applicable-property restrictions, per-element highlight styles,
painting order, priority, and range invalidation are important foundations
to evaluate rather than reinvent.

This draft could complement that API by adding declarative range
identification; it does not propose replacing its programmatic capabilities.
The repository's [Highlight API explainer](../highlight/explainer.md)
is **archived** and points to the current specification. Its historical
browser-availability statements should not be read as current support claims.

[CSS Pseudo-Elements Level 4](https://drafts.csswg.org/css-pseudo-4/)
already describes partial-text styling mechanisms.
[`::selection`](https://drafts.csswg.org/css-pseudo-4/#selectordef-selection)
styles user-selected text;
[`::first-letter`](https://drafts.csswg.org/css-pseudo-4/#first-letter-pseudo)
and [`::first-line`](https://drafts.csswg.org/css-pseudo-4/#first-line-pseudo)
target restricted typographic portions.
[`::target-text`](https://drafts.csswg.org/css-pseudo-4/#selectordef-target-text)
styles text targeted by a document URL fragment, not arbitrary
author-defined ranges declared in a stylesheet.

The repository's [Arbitrary Text Fragments explainer](../Fragments/explainer.md)
is **withdrawn** in favor of work on
[Scroll to Text Fragment](https://wicg.github.io/scroll-to-text-fragment/).
Its purpose was URL-addressable text, not CSS-authored range selection,
although ambiguity and cross-element matching are shared concerns.

### Declarative Marker Nodes for Highlights

[CSSWG issue w3c/csswg-drafts#13381](https://github.com/w3c/csswg-drafts/issues/13381),
`[css-highlight-api] Use marker nodes to declaratively annotate highlights`,
was opened January 22, 2026 and was **open** when checked. It explores HTML
marker nodes such as `<!start name="some-range">` and
`<!end name="some-range">` to annotate DOM ranges associated with highlights.
Those spellings are proposals in that discussion, not established HTML syntax.

This is especially close adjacent work: both approaches seek declarative
highlight authoring without JavaScript range setup or wrapper elements.
The thread considers nested and overlapping marker ranges, name scoping,
JavaScript reflection and invalidation, and highlight priority/type.
It also discusses the tradeoff between embedded markers and separate
highlight-map data.

The distinction is **where and how boundaries are declared**. Markers embed
boundary information in source markup and can split text nodes without
adding wrapper elements. This draft explores descriptions in CSS that
identify content without inserting markers. Embedded boundaries may track
the intended passage more directly; external quotes or offsets keep markup
unchanged but can become stale or ambiguous. Neither approach is necessarily
better for every authoring workflow, and coordination could avoid redundant
range and highlight models.

### Annotation Anchoring and Nearby Text Styling Work

The [Web Annotation Data Model's Text Quote Selector](https://www.w3.org/TR/annotation-model/#text-quote-selector)
uses an exact quotation with optional prefix/suffix context.
Its [Text Position Selector](https://www.w3.org/TR/annotation-model/#text-position-selector)
uses offsets and explicitly notes their brittleness under edits. These are
annotation-data selectors, not CSS selectors. Their normalization, logical
ordering, and boundary rules offer prior art, not semantics automatically
adopted by the sketches above.

The repository's [CSS Text Transitions & Animations explainer](../CSSTextTransitions/explainer.md)
explores effects on units such as words and characters. It is related by
sub-element text styling, but unit-based animation is distinct from locating
an arbitrary author-chosen passage. This draft does not assume its proposal
or any layout-affecting animation capabilities.

## Non-goals

This exploration is not intended to replace semantic markup such as `<em>`,
`<mark>`, or links; change text content; or create interactive elements from
substrings. It is not a query language for extracting text, a search engine,
an annotation storage protocol, or a replacement for the DOM Range API.

It does not define URL navigation, scrolling, user Selection/caret changes,
editor operations, or automatic linguistic analysis and syntax tokenization.
Cross-document or cross-origin ranges and access to closed shadow trees or
private form-control internals are outside the intended scope.

Arbitrary box creation, flex-item construction, and layout-changing
substring styles are not initial goals. Highlight-like presentation is the
starting point to investigate, not an agreed list of allowed properties.

## Open Design Questions

| Area | Questions to resolve |
| --- | --- |
| Text model | DOM-backed source boundaries or a rendered-text stream? How are collapsed whitespace, hidden content, generated text, `text-transform`, line breaks, replaced elements, and `display: contents` handled? |
| Cross-element ranges | May a match cross inline or block boundaries? Which elements originate its styles? How are gaps and non-text content painted? What are the boundaries around shadow roots and slotted content? |
| Repetition and ambiguity | Match one occurrence, all occurrences, or require disambiguation? How are overlapping occurrences, repeated endpoints, and nested matching scopes deduplicated? What happens when nothing matches? |
| Internationalization | What normalization and case/locale sensitivity apply? What do offsets count? How are grapheme clusters, ligatures, bidirectional logical order, and vertical writing handled? |
| Dynamic content | Re-run a declarative query after mutations, preserve live DOM boundaries, or require regeneration? How do streaming, text-node splits/merges, localization, and virtualized content affect identity and stale annotations? |
| Selector model | Does a rule select a highlight-like pseudo-element, a text fragment, or an element with a matching range? What specificity, combinators, nesting, CSSOM representation, and query API behavior follow? A substring must not accidentally become an element-content predicate. |
| Overlap and cascade | How do two ranges, cascade layers, and `!important` interact? Distinguish cascading declarations for one range from painting priority between ranges. Can existing highlight inheritance, priorities, and user-highlight ordering be reused? |
| Authoring location | Should authors declare ranges in source markup, separate annotation data, or runtime CSS? How do stylesheet replacement, conditional rules, scoped names, and script-created highlights interact? |
| Error handling and tooling | How are malformed expressions, reversed/out-of-bounds offsets, and stale expected text diagnosed? What can feature detection and developer tools report without exposing protected content? |

### Privacy and Security

Text-dependent matching deserves review even when it does not expose a
JavaScript query API. Could observable rendering, resource requests from
conditional styling, geometry, or timing let an untrusted stylesheet probe
otherwise inaccessible content? Matching should not expand a stylesheet's
ability to inspect cross-origin documents, closed shadow trees, user-agent
internals, or sensitive control values. The choice of properties, containment
boundaries, and any reflection APIs must be evaluated together; no conclusion
of "no new privacy risk" is made here.

Quoted anchors can duplicate sensitive content into shared stylesheets,
logs, or generated artifacts. Offset-based descriptions avoid quoting but
can still reveal annotation metadata. Neither mechanism should be treated
as an access-control or redaction feature.

### Incremental Performance

How can an implementation limit invalidation to affected text scopes rather
than repeatedly scanning a document for every rule? Quote matching and
offset remapping have different costs, especially under frequent edits,
many ranges, or large stylesheets. Scoped caches, match-count limits, and
restrictions on expressions need investigation, not assumptions of a free
performance improvement.

A rendered-text model adds a dependency on style or layout. Could applying
a range's style alter the text stream used to locate that same range and
cause cycles? Paint-only properties might reduce this risk but do not by
themselves define a matching stage or invalidation algorithm.

### Accessibility and Progressive Enhancement

Presentation-only ranges should preserve document semantics, reading order,
and ordinary selection/copy behavior. Authors should not convey essential
meaning only through a highlight's color. Contrast, forced-colors behavior,
and the relationship to accessibility semantics need examination; visual
annotations do not automatically become accessible annotations.

The examples should leave the underlying text readable when a rule is not
understood or a range cannot be identified. Essential emphasis or interaction
should remain in semantic markup. A production fallback can use semantic
markup or the Custom Highlight API as appropriate; this exploratory draft
does not assert support for its tentative syntax.
