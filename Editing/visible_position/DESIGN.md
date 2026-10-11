# Reduce VisiblePosition usage in Editing Commands

This document proposes a phased plan to reduce `VisiblePosition` usage inside Blink's editing command bodies.

---

## Background

`VisiblePosition` is Blink's canonicalized cursor position type - it answers *where the caret visually appears given current layout*. It belongs at exactly two points in the editing pipeline:

- **Entry** - renderer hands a `VisibleSelection` to the command system.
- **Exit** - command hands its result back to update the caret on screen.

Inside `DoApply()`, commands work on DOM structure - raw `Position` questions, no layout needed. VisiblePosition is used throughout command bodies as a type adapter because `IsEndOfParagraph`, `MoveParagraph`, etc. had no `Position` overloads when written. Every such call silently forces a full layout update, interleaved with DOM mutations.

---

## Problem Statement

### User-visible symptoms
- **Wrong caret/selection bugs** - stale VisiblePositions are silently used after DOM mutations (`IsValid()` is `DCHECK`-only in release). Caret lands in wrong position after paste, list insertion, or indent.
- **Loss of developer intent** - raw positions get silently re-canonicalized into different positions than the caller intended, taking away flexibility from developers.
- **Typing lag** - each keystroke triggers multiple full style+layout passes against a partially-mutated tree.
- **Paste jank** - `ReplaceSelectionCommand` triggers dozens of layout passes for a single Ctrl+V on complex content.
- **Slow indent/outdent** - `IndentOutdentCommand` loops per-paragraph; VisiblePosition construction multiplies layout cost by paragraph count.
- **Blocks future work** - every VisiblePosition inside `DoApply()` is an implicit main-thread layout dependency, blocking batched undo and speculative editing.

### Known bugs blocked on this work
- [Hotlist 7675360](https://issues.chromium.org/hotlists/7675360) - 25-30 open issues: wrong caret after paste, bad selection after list insertion, undo/redo producing wrong selection, indent leaving caret in detached subtree.
- Several WPT failures in `editing/` and `contenteditable/` where stale VisiblePosition after mutation is the root cause.

### Scale

| Metric | Count |
|--------|-------|
| `VisiblePosition` type usage | ~370 across 16 files |
| `CreateVisiblePosition()` calls | ~124 across 15 files |
| `.DeepEquivalent()` calls (VisiblePosition unwrapping) | ~271 across 16 files |

Top offenders: `composite_edit_command.cc` (112), `replace_selection_command.cc` (98), `insert_list_command.cc` (91), `delete_selection_command.cc` (64), `indent_outdent_command.cc` (61).

~110 of 124 `CreateVisiblePosition` calls (~89%) are unnecessary type adapters. Only ~14 sites are genuinely load-bearing.

> Unit test files (`*_test.cc`) are not included in any of the counts above.

### After this work

| Metric | Before | After |
|--------|--------|-------|
| `CreateVisiblePosition` calls in `commands/` | 126 | ~16 |
| `VisiblePosition` type references in `commands/` | ~391 | ~66 |
| Unnecessary `UpdateStyleAndLayout` per editing op | multiple | 0 |

---

## Design Principles

### The Correct Abstraction Boundary

```
User Interaction
    |
    v
[Boundary-IN]   VisibleSelection → SelectionInDOMTree   (renderer → command)
    |
    v
[Command body]  Works entirely with Position / PositionWithAffinity / EphemeralRange
    |
    v
[Boundary-OUT]  SelectionInDOMTree → SetEndingSelection(...)  (command → renderer)
```

`VisiblePosition` belongs only at the two boundary points. The problem is that commands create VisiblePositions deep inside `DoApply()`.

---

## Anti-Patterns to Eliminate

Patterns are ordered by priority: highest VisiblePosition count reduction first, then safety risk.

### P1: VisiblePosition parameter forces caller canonicalization

`MoveParagraph` / `MoveParagraphWithClones` / `MoveParagraphs` in
`composite_edit_command.h` take `const VisiblePosition&`. Every caller in
`indent_outdent_command.cc`, `insert_list_command.cc`, `delete_selection_command.cc`,
etc. must wrap raw positions into VisiblePositions before calling. Fixing the three method
signatures (Step 3) removes ~80 VisiblePositions across all callers at once.

### P2: `EndingVisibleSelection()` called mid-command for raw position access

`EndingVisibleSelection()` unconditionally calls `UpdateStyleAndLayout` then wraps
the result in a `VisibleSelection`. It appears in two unnecessary forms throughout
`replace_selection_command.cc`, `composite_edit_command.cc`,
`indent_outdent_command.cc`, `insert_list_command.cc`, and others:

| Sub-pattern | Replacement |
|---|---|
| Raw position only | `EndingSelection().Start()` / `.End()` - no layout |
| After explicit layout gate, position used for navigation | Keep `UpdateStyleAndLayout`; replace `EndingVisibleSelection().VisibleStart()` with `EndingSelection().Start()` and use `Position` overloads |
| VisiblePosition from `EndingVisibleSelection()` passed directly to navigation function | `NavigationFn(EndingSelection().Start(), rule)` - explicit gate already covers layout |

`EndingSelection()` returns a `SelectionForUndoStep` with raw `Position` values that
are already correct - no re-canonicalization needed.


### P3: VisiblePosition as a type requirement for navigation tests

`IsEndOfParagraph` / `IsStartOfParagraph` have no `Position` overload today, so VisiblePosition
creation is forced purely to satisfy the type signature. High frequency across all
command files; mechanical to fix once Step 1 overloads exist.

### P4: Create-then-extract

A VisiblePosition is created from a `PositionWithAffinity` or raw `Position` and immediately
passed to a navigation function. The VisiblePosition serves only as a type adapter - the position
was already correct before the wrap. Fixed mechanically alongside P3 sites.

---

## Proposed Approach: bottom-up foundation, top-down infrastructure

1. **Add missing `Position`-based overloads** for navigation functions in `position_units` and `editing_commands_utilities` (bottom-up, purely additive).
2. **Change `CompositeEditCommand` infrastructure signatures** to take `Position` instead of `VisiblePosition` (top-down, uses the new overloads internally).
3. **Migrate command files** using the new overloads and the new infrastructure signatures, in ascending order of VisiblePosition count.

---

## Step 1: Add Position-based Navigation Overloads

**Nature:** Purely additive. No existing code is changed. Each overload is its own CL with tests. Zero regression risk.

### New file: `position_units.h` / `position_units.cc`

All `Position`-based navigation overloads live in a new dedicated pair. No
`VisiblePosition` type appears anywhere in these files. The existing
`Position`/`PositionWithAffinity` overloads currently in `visible_units.h` are
relocated here in CL 1-A; the originals are removed. Callers that needed only those
overloads switch to including `position_units.h`; files that still use VisiblePosition-returning
functions keep `visible_units.h`.

### Gaps to fill

New `Position` overloads to add to `position_units.h` / `position_units.cc`:

**Paragraph boundary** (call algorithm templates in `visible_units_paragraph.cc`):
`StartOfParagraph`, `EndOfParagraph`, `IsStartOfParagraph`, `IsEndOfParagraph`,
`StartOfNextParagraph`, `InSameParagraph`.

**Document boundary**: `EndOfDocument`, `IsStartOfDocument`, `IsEndOfDocument`.

**Position traversal**: `PreviousPositionOf(const Position&, EditingBoundaryCrossingRule)`,
`NextPositionOf(const Position&, EditingBoundaryCrossingRule)`. These bypass the
`CreateVisiblePosition` wrap in the existing VisiblePosition overloads by calling
`PreviousVisuallyDistinctCandidate` / `NextVisuallyDistinctCandidate` directly. Do
not change existing VisiblePosition signatures.

**Character query**: `CharacterAfter(const Position&)`.

**Line boundary**: `IsStartOfLine` and `IsEndOfLine` taking `const PositionWithAffinity&`
and `const Position&`. No `Position` overloads exist today; needed because
`IsStartOfLine(CreateVisiblePosition(pos, affinity))` appears in
`editing_commands_utilities.cc` with no layout-free replacement.

**In `editing_commands_utilities.h` / `.cc`** (not `position_units` - depends on
block-structure helpers private to that file): `StartOfBlock`, `EndOfBlock`,
`IsStartOfBlock`, `IsEndOfBlock`, `EnclosingEmptyListItem`.

### Already in `visible_units.h` - relocate to `position_units.h`

These already take `Position` or `PositionWithAffinity` and return the same. They are
moved in CL 1-A and removed from `visible_units.h`.

**Word:** `StartOfWordPosition`, `EndOfWordPosition`, `MiddleOfWordPosition`,
`PreviousWordPosition`, `NextWordPosition`.

**Sentence:** `StartOfSentencePosition`, `EndOfSentence(const Position&)`,
`PreviousSentencePosition`, `NextSentencePosition`, `ExpandEndToSentenceBoundary`,
`ExpandRangeToSentenceBoundary`.

**Line:** `StartOfLine(PositionWithAffinity)`, `EndOfLine(PositionWithAffinity)`,
`InSameLine(PositionWithAffinity, PositionWithAffinity)`.

**Document:** `StartOfDocument(Position)`.

Note: `EndOfSentence(const VisiblePosition&)` stays in `visible_units.h` - it is a
VisiblePosition overload, not a `Position`-based one.

### `PositionWithAffinity` ownership rule

A function belongs in `position_units.h` if it answers a "where is the boundary of
unit X?" question using DOM structure, regardless of whether it takes or returns
`PositionWithAffinity`. `PositionWithAffinity` is just a `Position` with an affinity
tag - it is not a layout type.

A function stays in `visible_units.h` if it is a layout or hit-test utility that
happens to use `PositionWithAffinity` as a carrier type (e.g.
`AdjustForwardPositionToAvoidCrossingEditingBoundaries`,
`PositionForContentsPointRespectingEditingBoundary`). These are tied to layout
machinery, not navigation units.

### Implementation strategy

New overloads in `position_units.cc` call through to the existing private algorithm
templates in the originating files (e.g. `StartOfParagraphAlgorithm<EditingStrategy>`
in `visible_units_paragraph.cc`). Algorithm templates are not moved. For functions
with no existing `Position`-typed algorithm, write the algorithm first and have both
the VisiblePosition overload and the new `Position` overload call into it.

---

## Step 2: Migrate Simple Commands

Migrate the 5 lowest-VisiblePosition command files. These validate that the new overloads are
drop-in replacements against the WPT editing test suite.

| File | VisiblePosition refs | Notes |
|------|---------|-------|
| `style_commands.cc` | 1 | |
| `undo_step.cc` | 2 | |
| `editor_command.cc` | 6 | |
| `insert_line_break_command.cc` | 6 | P3 and P4 examples |
| `insert_text_command.cc` | 7 | |

### Migration patterns

| Before | After |
|---|---|
| `CreateVisiblePosition(pos).DeepEquivalent()` | `pos` - drop entirely; do not substitute `CanonicalPositionOf` |
| `IsEndOfParagraph(CreateVisiblePosition(pos))` | `IsEndOfParagraph(pos)` |
| `StartOfParagraph(vp).DeepEquivalent()` | `StartOfParagraph(pos)` |
| `VisiblePosition::FirstPositionInNode(*node).DeepEquivalent()` | `Position::FirstPositionInNode(*node)` |
| `VisiblePosition::LastPositionInNode(*node).DeepEquivalent()` | `Position::LastPositionInNode(*node)` |
| `LineBreakExistsAtVisiblePosition(vp)` | `LineBreakExistsAtPosition(pos)` |
| `VisiblePosition::BeforeNode(*node)` | `Position::BeforeNode(*node)` |
| `EndingVisibleSelection().VisibleStart().DeepEquivalent()` | `EndingSelection().Start()` |

---

## Step 3: Infrastructure Signature Changes

Change the five `CompositeEditCommand` protected methods from `const VisiblePosition&`
to `const Position&`. Method bodies migrate simultaneously using the Step 1 overloads.

- `MoveParagraph`, `MoveParagraphs` - three params each
- `MoveParagraphWithClones` - two params
- `CleanupAfterDeletion` - one param with default
- `ReplaceCollapsibleWhitespaceWithNonBreakingSpaceIfNeeded` - one param

All callers in `indent_outdent_command.cc`, `insert_list_command.cc`,
`delete_selection_command.cc`, `apply_block_element_command.cc`,
`format_block_command.cc` drop their `CreateVisiblePosition` wrappers and pass
`Position` directly.

---

## Step 4: Heavy Command Migration

With Step 1 overloads and Step 3 infrastructure in place, the heavy files fall into
two categories:

- **Category A** (fixed by Step 3): VisiblePosition created solely to pass to `MoveParagraph` / `MoveParagraphWithClones` / `CleanupAfterDeletion`.
- **Category B** (fixed by Step 1): VisiblePosition created solely to call `IsEndOfParagraph`, `IsStartOfParagraph`, `StartOfParagraph`, `EndOfParagraph`, `StartOfBlock`, etc.

| File | VisiblePosition refs | Primary category |
|------|---------|-----------------|
| `insert_paragraph_separator_command.cc` | 19 | B |
| `apply_block_element_command.cc` | 37 | B + A |
| `indent_outdent_command.cc` | 61 | A |
| `delete_selection_command.cc` | 64 | A + B |
| `insert_list_command.cc` | 91 | A + B |
| `replace_selection_command.cc` | 98 | B |

`composite_edit_command.cc` (112 refs): Step 3 covers the method signatures. The
remaining VisiblePosition in `RebalanceWhitespaceOnTextSubstring`,
`MoveParagraphContentsToNewBlockIfNecessary`, `BreakOutOfEmptyListItem`,
`BreakOutOfEmptyMailBlockquotedParagraph` are addressed in Step 4.

### Estimated VisiblePosition reduction

| Work item | Estimated VisiblePositions removed |
|-----------|-----------------------|
| Simple command migration (Step 2) | ~25 |
| Infrastructure signature changes (Step 3) | ~80 |
| Heavy command migration (Step 4) | ~220 |
| **Total** | **~325 of ~391 (83%)** |

---

## What is Legitimately VisiblePosition (Do Not Remove)

1. **Entry boundary.** `CompositeEditCommand` constructor calling `ComputeVisibleSelectionInDOMTreeDeprecated()`.

2. **Exit boundary.** `EndingVisibleSelection()` in `Apply()` for the `IsRichlyEditablePosition` check.

3. **Visual-caret equivalence checks.** When the question is "did the caret actually move?", VisiblePosition equivalence is the right tool - some positions are structurally distinct but render to the same caret. `MostForwardCaretPosition(x) == MostForwardCaretPosition(y)` is often a layout-free replacement, but each site requires individual confirmation.

4. **`VisiblePosition::FirstPositionInNode` / `LastPositionInNode` as equality tests.** Replaceable with `Position::` variants only after per-site confirmation that positions are canonical.

---

## Testing Strategy

**Per-CL:**
- `blink_unittests --gtest_filter="*Edit*"` - all pass
- `third_party/blink/web_tests/editing/` - no new failures
- `third_party/blink/web_tests/editing/contenteditable/` - no new failures

**Per-step gate:**
- Full `blink_unittests` suite
- `content_browsertests` editing subset
- Verify `visible_position.h` include count in `commands/` is decreasing

**Manual smoke test:** Basic typing, delete/backspace, paste, undo/redo, list creation, indent/outdent, Enter in list items, table editing.

**Regression monitoring:** Watch CQ for editing test failures for 2 weeks after each step lands.

---

## Next Steps: Beyond Commands

- `core/editing/selection_adjuster.cc` - 28 VisiblePosition refs, primarily P3/P4
- `core/editing/editing_utilities.cc` - ~12 VisiblePosition refs in internal helpers
- `core/editing/serializers/styled_markup_serializer.cc` - 7 VisiblePosition refs, P3/P4
- `core/editing/editor.cc` - ~5 VisiblePosition refs in internal helpers

Out of scope until Step 4 lands.

