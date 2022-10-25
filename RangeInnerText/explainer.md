# Range enhancements for advanced editing scenarios


Authors: [Daniel Libby](https://github.com/dlibby-)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: <b>Active</b>
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* <b>Current version: this document</b>
    
## Introduction

The `Range` object represents a pair of positions in the DOM. Selection is
represented as a Range but is special in a number of ways, due to the fact
that it represents the text selected by a user or the current caret position.
In an editing context, Selection is the target of many editing commands and
its string representation is the visible text that the user has selected.
Similar to Selection, the DOM positions of a Range can be moved around via
script APIs instead of user interaction, and with the introduction of the
[Highlight API](https://drafts.csswg.org/css-highlight-api-1/), can be
painted with certain effects applied.

Ranges are somewhat limited in capabilities for advanced editing scenarios.
While Ranges expose information about the rendering of the contained text via
client rect(s), they only expose the text content (not the visible text &mdash;
see [differences](https://developer.mozilla.org/docs/Web/API/Node/textContent#differences_from_innertext)) of the Range to script via `toString()`.

Complex editing applications on the Web will typically want to operate on
the visible text, which in turn requires the use of heuristics to map
the computed innerText back to DOM Ranges.

Creating an interoperable find-on-page feature exposes the difficulties in
trying to use heuristics to perform this mapping.
Performing the find without using the non-standard
[`window.find()`](https://developer.mozilla.org/docs/Web/API/Window/find)
API requires computing matches based on the visible text. In order to visually
highlight the matches, authors then must determine where the string matches that
were found to live in the DOM. This becomes difficult to manage when there is
complex content within the subtree of the content being searched.

## Goals

Expose a flat text representation of the rendered text of a Range objects and
allow developers to move a Range's endpoints over that representation, while
keeping the Range rooted in DOM positions.

## Non-goals

We do not currently wish to expose more complex editing operations (typically
exposed via non-standard extensions to `document.execCommand()`), though many of those
scenarios should be achievable by composing APIs together (see below discussion
on [TC39 Intl.Segmenter](https://tc39.es/proposal-intl-segmenter/)).

## Proposed Solution

We propose a new set of APIs that exposes the visible text of a Range along
with the ability to navigate this flat text representation. The concept of
innerText already exists on HTMLElement so we'll bring this same concept
to the AbstractRange interface. Additionally, we propose a `adjust()` method
on AbstractRange that operates on this computed flat text representation.
This roughly corresponds to capabilities User Agents have provided for
editing surfaces (e.g. the ability to navigate by character or word) which,
combined with the [TC39 Intl.Segmenter](https://tc39.es/proposal-intl-segmenter/)
proposal, will remove the need for web developers to re-implement this
functionality (perhaps incorrectly). This combination of functionality makes it
such that authors can operate on a flat, user-visible text representation of
a portion of the DOM tree, while Range objects continue to stay rooted in DOM
positions that do not need to be directly updated.

The `adjust()` method modifies one of the Range endpoints by moving by a number
of code units (corresponding to the concept of code unit in the [Unicode
standard](https://unicode.org/glossary/#code_unit)) from the current DOM position.
This relative movement of endpoint can either be forward or backwards,
as indicated by the sign of the `codeunits` argument.
Note that due to the presence of features like CSS `text-transform: uppercase`,
a given code unit position in the computed innerText may not have an exact
mapping to a DOM position. In these cases, the DOM position may end up
being the same for distinct offsets in the computed innerText. Character
movement, i.e. movement by
[user perceived character](https://unicode.org/glossary/#character) (see [UAX #29](https://www.unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries) for more details)
can be performed by using the [TC39 Intl.Segmenter](https://tc39.es/proposal-intl-segmenter/),
currently a stage 4 proposal for addition to TC39 as of February 2022.
Similarly, mapping "word" and "sentence" segments to their code unit
offsets will allow authors to adjust ranges according to those concepts.

## Code Example

Here's an example of how a spellchecker might use Range.innerText to
extract the visible text content of an editable region, perform an
asynchronous spellcheck, then map those results back to Range objects
which can then add visual effects via the CSS Highlight API.

```js
async function initiateSpellcheck(editableRegion) {
  // Create a range over the entire editable region.
  let range = new Range();
  range.setStart(editableRegion, 0);
  range.setEnd(editableRegion, editableRegion.childNode.length);

  // Check the visible text for spelling errors.
  let editableText = range.innerText;
  return Spellchecker.check(editableText).then((results) => {
    // Verify text hasn't changed otherwise results are no longer
    // valid.
    if (editableText !== range.innerText)
      return;

    // `results` is an array of misspelled word + code unit offsets.
    results.forEach((result) => {
      let misspelling = new Range(range);
      misspelling.adjust("start", result.offset);
      misspelling.collapse(/*toStart*/ true);
      misspelling.adjust("end", result.text.length);

      // Add misspelling range to highlight map so that the
      // squiggles are drawn underneath via Highlight API.
      CSS.highlights.set("misspellings", new Highlight(new StaticRange(mispelling)));
    });
  });
}
```

## Proposed idl changes
```
enum Endpoint {
    "start",
    "end"
}

partial interface Range {
    readonly DOMString innerText;
    void adjust(Endpoint endpoint, long codeunits);
}
```

## Privacy and Security Considerations

No considerable privacy and security concerns are expected, but we welcome community feedback.
In particular, the only additional information this proposal exposes is a mapping
between computed text and DOM, both of which are already accessible via JavaScript.


## Open Questions

DOM positions and innerText do not always map 1:1. In these situations we
will need to be careful to precisely define how the API behaves (i.e. moving
by a code unit may not end up adjusting the DOM Range).

Movement through bi-directional text can be done visually or logically.
Currently Blink only performs logical movement, which seems to be a good
fit when the `adjust()` abstraction is operating on code units. However, if
this evolves we will need to consider if the movement should be 
configuable, follow user preference, or limited to logical movement
only (or perhaps needs more evaluation independently).

