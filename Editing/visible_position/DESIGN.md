# Design: Reducing VisiblePosition Usage in Editing Commands

---

## Background

### What is VisiblePosition and why does it exist?

`VisiblePosition` is Blink's canonicalized cursor position type. It answers the
question: *where does the caret visually appear on screen, given the current layout?*
This is intentional
and correct at two points in the editing pipeline:

- **Entry** — when a user gesture (keypress, mouse click, IME commit) is translated
  into a command and the renderer hands a `VisibleSelection` to the command system.
- **Exit** — when a command finishes and hands its result back to the renderer to
  update the caret on screen.

Between those two points — inside `DoApply()` — commands operate on DOM structure.
They ask questions like: *is this position at the end of its paragraph? what node
delimits the current block? where does the next paragraph start?* These are
DOM-structural questions with answers expressible as raw `Position` values. They do
not require knowing where the caret *looks* on a rendered line.

The problem is that `VisiblePosition` is used **throughout** command bodies, not just
at the two boundaries. `IsEndOfParagraph`, `StartOfParagraph`, `MoveParagraph`, and
similar functions did not have `Position` overloads when the commands were written,
so VP was used as a type adapter. Every call to these functions from inside a command
silently triggers a full layout update — often multiple times per command, interleaved
with DOM mutations.

### What web authors and users experience

The forced layout mid-command has direct, observable consequences for web authors
building `contenteditable`-based editors and for users of those editors:

- **Typing lag in large documents.** Each keystroke in a `contenteditable` document
  triggers one or more editing commands. Each command constructs multiple
  `VisiblePosition` values, each forcing a full style+layout pass against a
  partially-mutated tree. In a document with tables, complex CSS, or a large node
  count, this adds up to perceptible latency on every keypress.

- **Jank during paste of rich content.** `ReplaceSelectionCommand` — which handles
  Ctrl+V — constructs VPs at every structural decision point during the paste
  operation. Pasting a table into a complex document can trigger dozens of layout
  passes within a single user action.

- **Slow indent and outdent on multi-paragraph selections.** `IndentOutdentCommand`
  processes one paragraph at a time in a loop. Each iteration constructs several VPs,
  triggering layout on every iteration. For a 20-paragraph selection, this multiplies
  into 20× the expected cost.

- **Silent wrong-caret bugs.** `VisiblePosition` records the document version at
  construction. After a DOM mutation the version changes and the VP is technically
  invalid — but `IsValid()` is a `DCHECK`-only check in release builds, so stale VPs
  are silently used without any indication that they may point into a restructured
  subtree. The result is the caret landing in the wrong position after paste, list
  insertion, or indent — bugs that are difficult to reproduce consistently and difficult
  to attribute to the VP staleness.

- **Structural blocker for future improvements.** `VisiblePosition` requires a live,
  up-to-date `LayoutObject` graph on the main thread. Every VP construction inside
  `DoApply()` is an implicit main-thread layout dependency. This is a structural
  blocker for any work that aims to reduce synchronous layout during editing — such
  as batched undo, speculative editing, or off-thread IME handling.

### Scale of the problem

In `editing/commands/*.cc` (source files, excluding tests):

| Metric | Count |
|--------|-------|
| `VisiblePosition` type usage | ~391 across 18 files |
| `CreateVisiblePosition()` calls | ~126 across 16 files |
| `.DeepEquivalent()` calls (VP unwrapping) | ~288 across 18 files |

Top offenders: `composite_edit_command.cc` (112), `replace_selection_command.cc` (98),
`insert_list_command.cc` (91), `delete_selection_command.cc` (64),
`indent_outdent_command.cc` (61).

Of the 126 `CreateVisiblePosition` calls, approximately **110 (~87%) are unnecessary**
— the VP is used only as a type adapter (to pass a position to a function that has no
`Position` overload) or for a caret-equivalence check (which does not require
`UpdateStyleAndLayout`). Only ~16 sites (~13%) are genuinely load-bearing: the two
boundary points and two affinity-sensitive navigation sites.

### After this work

| Metric | Before | After |
|--------|--------|-------|
| `CreateVisiblePosition` calls in `commands/` | 126 | ~16 |
| `VisiblePosition` type references in `commands/` | ~391 | ~66 (legitimate boundary + open questions) |
| Unnecessary `UpdateStyleAndLayout` triggers per editing operation | multiple per command | 0 for all common operations |

The ~66 remaining VP references are the two boundary sites, the confirmed
affinity-sensitive navigation, and a small number of sites pending owner review on
canonicality (see Open Questions).

### Known bugs and test failures blocked on this work

**Open Chromium bugs:** The hotlist
[issues.chromium.org/hotlists/7675360](https://issues.chromium.org/hotlists/7675360)
tracks bugs that are directly caused by or made significantly harder to fix by the
forced `UpdateStyleAndLayout` calls and stale-VP usage inside editing commands.
As of the time of writing there are **25–30 open issues** in the hotlist — covering
wrong caret placement after paste, incorrect selection after list insertion, undo/redo
producing the wrong selection, and indent/outdent leaving the caret in a detached
subtree.

**Web Platform Tests:** Several WPT failures in `editing/` and `contenteditable/` are
attributable to commands reading a stale or incorrectly-canonicalized position after
a DOM mutation. These failures are not straightforwardly fixable today because the
root cause — VP construction interleaved with mutations — makes it difficult to reason
about which position is current at any given point. Removing VP from command internals
is a prerequisite for a clean fix.

---

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

`VisiblePosition` belongs only at the two boundary points. The problem is that
commands create VPs deep inside `DoApply()`.

---

## Anti-Patterns to Eliminate

### P1: Create-then-extract

A VP is created from a `PositionWithAffinity` or raw `Position` and immediately
passed to a navigation function like `IsEndOfParagraph`. The VP serves only as a
type adapter — the position was already correct before the wrap.

Example location: `insert_line_break_command.cc`.

### P2: VP as a type requirement for navigation tests

`IsEndOfParagraph` / `IsStartOfParagraph` have no `Position` overload today, so VP
creation is forced purely to satisfy the type signature. Example location:
`composite_edit_command.cc` (whitespace rebalancing helpers).

### P3: VP stored across a DOM mutation

A `VisiblePosition` is captured before a DOM mutation and referenced after. A TODO
comment in `insert_line_break_command.cc` explicitly flags this: "Stop storing
VisiblePositions through mutations." `IsValid()` is `DCHECK`-only in release builds,
so stale VP is silently used rather than caught. See crbug.com/648949.

### P4: VP parameter forces caller canonicalization

`MoveParagraph` / `MoveParagraphWithClones` / `MoveParagraphs` in
`composite_edit_command.h` take `const VisiblePosition&`. Every caller in
`indent_outdent_command.cc`, `insert_list_command.cc`, `delete_selection_command.cc`,
etc. must wrap raw positions into VPs before calling. Much of the VP count in those
files traces back to this single cascade.

### P5: `EndingVisibleSelection()` called mid-command for raw position access

`EndingVisibleSelection()` unconditionally calls `UpdateStyleAndLayout` then wraps
the result in a `VisibleSelection`. It is called inside `DoApply()` bodies solely to
extract `.Start()` / `.End()` / `.Anchor()` — raw positions available for free from
`EndingSelection()` which returns a `SelectionForUndoStep` directly.

Example location: `CompositeEditCommand::RebalanceWhitespace()` in
`composite_edit_command.cc`.

### P5 — Sub-command boundary: `EndingVisibleSelection()` after a sub-command mutates the DOM

A subtler variant of P5 occurs in composite commands that invoke other commands
mid-execution. `ReplaceSelectionCommand::DoApply` calls `DeleteSelection` as a
sub-command (line 1236), which mutates the DOM and calls `SetEndingSelection` with
fresh positions reflecting the post-mutation state. Immediately after,
`ReplaceSelectionCommand` calls `EndingVisibleSelection().VisibleStart()` (line 1245).

**Why `EndingSelection().Start()` is always sufficient here:**
`SetEndingSelection` stores a `SelectionForUndoStep` — raw `Position` objects
(`anchor_`, `focus_`) that were correct at the time the sub-command finished. They
point into the live post-mutation tree. They do not need VP re-canonicalization to
become valid; they already are. `EndingSelection().Start()` returns `anchor_` or
`focus_` directly, with zero cost and no layout.

The explicit `GetDocument().UpdateStyleAndLayout(DocumentUpdateReason::kEditing)` at
line 1243 is real and must stay — the structural navigation functions (`IsEndOfParagraph`,
`PreviousPositionOf`, etc.) read `GetLayoutObject()` state, which requires a clean
layout tree. But that gate has nothing to do with `EndingVisibleSelection()`. It gates
the *navigation query*, not the position retrieval.

`EndingVisibleSelection()` was adding a second identical `UpdateStyleAndLayout` on top
of the explicit call one line earlier, then wrapping the result in a VP that was
immediately discarded with `.VisibleStart().DeepEquivalent()`. Both costs are
eliminated by replacing it with `EndingSelection().Start()`.

**Three sub-patterns within this variant:**

| Sub-pattern | Example | Correct replacement |
|---|---|---|
| Only raw position needed | `EndingVisibleSelection().Start()` (line 1360) | `EndingSelection().Start()` — no layout at all |
| Navigation query after explicit layout gate | `UpdateStyleAndLayout(...)` then `EndingVisibleSelection().VisibleStart()` used for `IsEndOfParagraph` etc. (lines 1243-1246) | Keep explicit `UpdateStyleAndLayout`; replace `EndingVisibleSelection().VisibleStart()` with `EndingSelection().Start()` and use `Position` overloads |
| VP passed to navigation function | `PreviousPositionOf(EndingVisibleSelection().VisibleStart())` (line 1315) | `PreviousPositionOf(EndingSelection().Start(), rule)` — `Position` overload; the explicit gate above already covers the layout requirement |

The rule: **the explicit `UpdateStyleAndLayout` calls in `replace_selection_command.cc`
are the correct layout gates and must stay. `EndingVisibleSelection()` adds nothing
except a redundant second layout and a VP wrapper that is immediately discarded.**

---

## Proposed Approach: bottom-up foundation, top-down infrastructure

The approach combines two complementary moves in a specific order that keeps every
intermediate state compile-clean and independently testable:

1. **Add missing `Position`-based overloads** for navigation functions in `visible_units`
   and `editing_commands_utilities` (bottom-up, purely additive).
2. **Change `CompositeEditCommand` infrastructure signatures** to take `Position`
   instead of `VisiblePosition` (top-down, uses the new overloads internally).
3. **Migrate command files** using the new overloads and the new infrastructure
   signatures, in ascending order of VP count.

---

## Step 1: Add Position-based Navigation Overloads

**Nature:** Purely additive. No existing code is changed. Each overload is its own CL
with tests. Zero regression risk.

### Gaps to fill

**In `visible_units.h` / `visible_units_paragraph.cc`:** `IsStartOfParagraph`,
`IsEndOfParagraph`, `StartOfParagraph`, `EndOfParagraph`, `StartOfNextParagraph`,
`InSameParagraph` — all taking `const Position&` with the same
`EditingBoundaryCrossingRule` default as the VP overloads.

**In `visible_units.h` / `visible_units.cc`:** `EndOfDocument`, `IsStartOfDocument`,
`IsEndOfDocument`, `CharacterAfter` — each taking `const Position&`. Also
`PreviousPositionOf(const Position&, EditingBoundaryCrossingRule)` and
`NextPositionOf(const Position&, EditingBoundaryCrossingRule)` as new
`Position`-returning overloads alongside the existing VP-returning ones. Do not
change existing signatures.

**In `editing_commands_utilities.h` / `.cc`:** `StartOfBlock`, `EndOfBlock`,
`IsStartOfBlock`, `IsEndOfBlock`, `EnclosingEmptyListItem` — all taking `const Position&`.
`LineBreakExistsAtPosition(Position)` already exists; verify callers can use it.

### Already exist (no work needed)

`StartOfWordPosition`, `EndOfWordPosition`, `StartOfLine`, `EndOfLine`, `InSameLine`,
`StartOfDocument` — already in `visible_units.h` with `Position` overloads.

### Implementation strategy for the new overloads

The `Position`-typed algorithm already exists as a private template in the
implementation file. `visible_units_paragraph.cc` already has
`StartOfParagraphAlgorithm<Strategy>(const PositionTemplate<Strategy>&, ...)` which
operates purely on DOM structure — no `UpdateStyleAndLayout`, no VP construction.
The existing VP public overload calls into it by extracting `.DeepEquivalent()` first.

The new public `Position` overloads call the algorithm directly, for example:

```cpp
Position StartOfParagraph(const Position& pos, EditingBoundaryCrossingRule rule) {
  return StartOfParagraphAlgorithm<EditingStrategy>(pos, rule);
}
bool IsStartOfParagraph(const Position& pos, EditingBoundaryCrossingRule rule) {
  return pos == StartOfParagraphAlgorithm<EditingStrategy>(pos, rule);
}
```

The pattern holds for all Step 1 additions: check whether a `Position`-typed
algorithm template already exists before writing the overload body. For any function
that has no such algorithm, write the algorithm first and have both the VP and
`Position` overloads call into it.

### Implementation note for `PreviousPositionOf(Position)` and `NextPositionOf(Position)`

These two differ from the paragraph/document functions. There is no pre-existing
`Position`-typed algorithm template to call — the existing
`PreviousPositionOfAlgorithm` takes a `Position` internally but wraps the result in
`CreateVisiblePosition`, which is the sole layout-forcing call.

The `Position`-returning overloads bypass that wrap entirely:

1. Call `PreviousVisuallyDistinctCandidate(position, rule)` directly — this takes
   and returns `Position` and reads existing layout state via `GetLayoutObject()`
   without forcing `UpdateStyleAndLayout`.
2. Check null-movement: `if (prev.AtStartOfTree() || prev == position) return Position()`.
3. Apply boundary crossing rules using
   `AdjustBackwardPositionToAvoidCrossingEditingBoundaries(PositionWithAffinity(prev), position).GetPosition()`
   for `kCannotCrossEditingBoundary`, and `SkipToStartOfEditingBoundary(prev, position)`
   for `kCanSkipOverEditingBoundary`.

The same logic applies to `NextPositionOf(Position)` using
`NextVisuallyDistinctCandidate` and
`AdjustForwardPositionToAvoidCrossingEditingBoundaries`.

No `CreateVisiblePosition` anywhere. The VP return type on the existing overloads
was purely an artefact of the algorithm wrapper — the affinity is never used at the
call sites in `MoveParagraphWithClones` / `MoveParagraphs`, both of which call
`.DeepEquivalent()` immediately.

---

## Step 2: Migrate Simple Commands

Migrate the 5 lowest-VP command files using the Step 1 overloads. These serve as
proof-of-concept and validate that the new overloads are drop-in replacements against
the WPT editing test suite.

| File | VP refs | Notes |
|------|---------|-------|
| `style_commands.cc` | 1 | XS — one VP reference |
| `undo_step.cc` | 2 | XS |
| `editor_command.cc` | 6 | S |
| `insert_line_break_command.cc` | 6 | S — P3 and P1 examples live here |
| `insert_text_command.cc` | 7 | S — uses `FirstPositionInNode`, `LastPositionInNode`, `CreateVisiblePosition` |

### Migration patterns for call sites

| Pattern (before) | Replacement (after) |
|---|---|
| `CreateVisiblePosition(pos).DeepEquivalent()` | `pos` — drop the call entirely; do not substitute `CanonicalPositionOf` |
| `IsEndOfParagraph(CreateVisiblePosition(pos))` | `IsEndOfParagraph(pos)` (Step 1 overload) |
| `StartOfParagraph(vp).DeepEquivalent()` | `StartOfParagraph(pos)` (Step 1 overload) |
| `VP::FirstPositionInNode(*node).DeepEquivalent()` | `Position::FirstPositionInNode(*node)` |
| `VP::LastPositionInNode(*node).DeepEquivalent()` | `Position::LastPositionInNode(*node)` |
| `LineBreakExistsAtVisiblePosition(vp)` | `LineBreakExistsAtPosition(pos)` |
| `VisiblePosition::BeforeNode(*node)` (as position source) | `Position::BeforeNode(*node)` |
| `EndingVisibleSelection().VisibleStart().DeepEquivalent()` | `EndingSelection().Start()` |

---

## Step 3: Infrastructure Signature Changes

Change the `CompositeEditCommand` protected methods that take `VisiblePosition`
parameters to take `Position`. With Step 1 overloads in place, the method bodies
can be migrated simultaneously.

### Target signatures

The five methods change from `const VisiblePosition&` / `VisiblePosition` parameters
to `const Position&` / `Position`:

- `MoveParagraph` and `MoveParagraphs` — three `const VisiblePosition&` params each → `const Position&`
- `MoveParagraphWithClones` — two `const VisiblePosition&` params → `const Position&`
- `CleanupAfterDeletion` — `VisiblePosition destination` → `Position destination = Position()`
- `ReplaceCollapsibleWhitespaceWithNonBreakingSpaceIfNeeded` — `const VisiblePosition&` → `const Position&`

### Internal body changes for `MoveParagraphs`

The body of `MoveParagraphs` uses VP parameters in three places:

1. **Destination range check** — VP comparison operators replaced with
   `ComparePositions(destination, start) >= 0 && ComparePositions(destination, end) <= 0`.

2. **`RelocatablePosition` setup** — `PreviousPositionOf(start_of_paragraph_to_move, kCannotCrossEditingBoundary).DeepEquivalent()`
   becomes `PreviousPositionOf(start, kCannotCrossEditingBoundary)` using the Step 1
   `Position` overload directly.

3. **`kPreserveSelection` path** — `EndingVisibleSelection().VisibleStart()` /
   `.VisibleEnd()` become `EndingSelection().Start()` / `.End()`.
   `ComparePositions` already accepts `Position` on both sides.

### Internal body changes for `CleanupAfterDeletion`

- `destination.DeepEquivalent().AnchorNode()` → `destination.AnchorNode()`
- `caret_after_delete` comes from `EndingSelection().Start()` instead of
  `EndingVisibleSelection().VisibleStart()` — avoiding the `UpdateStyleAndLayout` inside
  `EndingVisibleSelection()`
- `IsStartOfParagraph` / `IsEndOfParagraph` checks use Step 1 `Position` overloads

### Internal body changes for `ReplaceCollapsibleWhitespaceWithNonBreakingSpaceIfNeeded`

`CharacterAfter(position)` uses the Step 1 `Position` overload.
`MostForwardCaretPosition(position)` already takes `Position` — no change needed.

---

## Step 4: Heavy Command Migration

With Step 1 overloads and Step 3 infrastructure in place, the 6 heavy command files
can be migrated. The majority of their VP usage falls into two categories already
addressed:

- **Category A** (fixed by Step 3): VP created solely to pass to `MoveParagraph` /
  `MoveParagraphWithClones` / `CleanupAfterDeletion`.
- **Category B** (fixed by Step 1): VP created solely to call `IsEndOfParagraph`,
  `IsStartOfParagraph`, `StartOfParagraph`, `EndOfParagraph`, `StartOfBlock`, etc.

The remaining VP usage after removing Category A and B will be small and can be
addressed file-by-file.

| File | VP refs | Primary VP category |
|------|---------|-------------------|
| `insert_paragraph_separator_command.cc` | 19 | B |
| `apply_block_element_command.cc` | 37 | B + A |
| `indent_outdent_command.cc` | 61 | A (MoveParagraph callers) |
| `delete_selection_command.cc` | 64 | A + B |
| `insert_list_command.cc` | 91 | A + B |
| `replace_selection_command.cc` | 98 | B |

**Note on `composite_edit_command.cc` (112 refs):** Step 3 addresses the method
signatures. The remaining VP in the private methods (`RebalanceWhitespaceOnTextSubstring`,
`MoveParagraphContentsToNewBlockIfNecessary`, `BreakOutOfEmptyListItem`,
`BreakOutOfEmptyMailBlockquotedParagraph`) are addressed as part of Step 4 alongside
the heavy commands, since they are typically called from those files.

### Estimated VP reduction

| Work item | Estimated VPs removed |
|-----------|-----------------------|
| Simple command migration (Step 2) | ~25 |
| Infrastructure signature changes (Step 3) | ~80 (cascades to all callers) |
| Heavy command migration (Step 4) | ~220 |
| **Total** | **~325 of ~391 (83%)** |

---

## What is Legitimately VP (Do Not Remove)

Not all VP usage should be removed. The following are correct uses:

1. **Entry boundary.** The `CompositeEditCommand` constructor reads
   `frame->Selection().ComputeVisibleSelectionInDOMTreeDeprecated()` to set
   `starting_selection_`. This is correct — it is the boundary-in point where the
   renderer hands a visible selection to the command system.

2. **Exit boundary.** `EndingVisibleSelection()` in `Apply()` checks
   `IsRichlyEditablePosition(EndingVisibleSelection().Anchor())`. This is correct —
   it is the boundary-out validation point.

3. **Visual-caret equivalence checks.** Some positions are structurally distinct
   but render to the same visual caret (e.g. `AfterNode(foo)` and `BeforeNode(bar)`
   for adjacent inlines). When the question is "did the caret actually move?", VP
   equivalence is the right tool. `PositionAvoidingPrecedingNodes` in
   `replace_selection_command.cc:170–171` uses it as a loop-exit guard when walking
   up toward the block boundary; `DeleteSelectionCommand::InitializePositionData` at
   `delete_selection_command.cc:149–153` uses it to detect whether expanding the
   selection into a special container changed the visible endpoints. More such sites
   may exist. `MostForwardCaretPosition(x) == MostForwardCaretPosition(y)` is often
   a valid layout-free replacement, but each site requires individual confirmation.

4. **`VisiblePosition::FirstPositionInNode` / `LastPositionInNode` as equality
   tests.** Some sites in `delete_selection_command.cc` use these to check whether a
   cell is empty. This may be replaceable with `Position::FirstPositionInNode` /
   `LastPositionInNode`, but requires per-site analysis to confirm the positions are
   canonical. Flag these for careful review rather than mechanical replacement.

---

## Testing Strategy

**Per-CL (required before landing):**
- `blink_unittests --gtest_filter="*Edit*"` — all pass
- `third_party/blink/web_tests/editing/` WPT suite — no new failures
- `third_party/blink/web_tests/editing/contenteditable/` — no new failures

**Per-step gate (before starting the next step):**
- Full `blink_unittests` suite
- `content_browsertests` editing subset
- Verify `visible_position.h` include count in `commands/` is decreasing

**Manual smoke test (per step):**
Basic typing, delete/backspace, paste (Ctrl+V), undo/redo, list creation,
indent/outdent, Enter key inside list items, table editing.

**Regression monitoring:**
Watch CQ for editing test failures for 2 weeks after each step lands.


## Next Steps: Beyond Commands

Once the four steps in this document are complete, the following files in the broader
`editing/` tree can be migrated using the same Step 1 overloads:

- `core/editing/selection_adjuster.cc` — 28 VP refs, primarily P1/P2
- `core/editing/editing_utilities.cc` — ~12 VP refs in internal helpers (excluding the public VP API functions)
- `core/editing/serializers/styled_markup_serializer.cc` — 7 VP refs, P1/P2
- `core/editing/editor.cc` — ~5 VP refs in internal helpers

These are explicitly out of scope for the current effort to keep the initial CL
surface manageable and to allow the Step 1 overloads to prove out against the
commands test suite first. They should be tracked as follow-on work once Step 4 lands.
