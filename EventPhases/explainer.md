---
tags: explainer, brainstorming
title: Opt-In Event Phases For Reliably Fast DOM Operations
label: EventPhases 
owner: slightlyoff
venue: Web Perf
---

# Opt-In Event Phases For Reliably Fast DOM Operations

## Authors:

- [Alex Russell](https://infrequently.org/about-me/) &lt;alexrussell@microsoft.com&gt;, &lt;slightlyoff@chromium.org&gt;

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=slightlyoff&labels=EventPhases&title=%5BEventPhases%5D+%3CTITLE+HERE%3E)

<!-- - [Discussion forum] -->

## Introduction

["Layout thrashing"](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) is a widely acknowledged performance problem in web application development. It has been documented [across](https://webperf.tips/tip/layout-thrashing/) [many](https://www.afasterweb.com/2015/10/05/how-to-thrash-your-layout/) [years](https://kellegous.com/j/2013/01/26/layout-performance/), generating both comprehensive [documentation on how to manually avoid it](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) and [tooling to highlight when it occurs.](https://developer.chrome.com/docs/devtools/performance#find_the_bottleneck)

This problem is also the proximate cause of the design of many of today's functional-reactive frameworks (although, in practice, they do not guard against it effectively).

In the worst cases, layout thrashing is a key contributor to slow interactions (diagnosed most easily via the [INP metric](https://web.dev/articles/inp)). Innocent-looking code that interleaves style reads and DOM mutations can trigger layout more than once per painted frame.

### How Does This Happen?

[Joe Liccini's excellent blog post](https://webperf.tips/tip/layout-thrashing/) covers the underlying mechanics in detail, but to recap, the phases of generating a frame from changes to CSS and DOM (per [Paul Lewis' classic article](https://web.dev/articles/rendering-performance)) are:

![The Pixel Pipeline](./the-full-pixel-pipeline-45b24543207ea_1440.jpg "Phases of the pixel pipeline, JavaScript -> Style -> Layout -> Paint -> Composite. From Paul Lewis's article on web.dev")

We can substitute most DOM manipulations &mdash; from the parser, from script, or from UI state changes (e.g., hovering with a mouse) &mdash; for "JavaScript" in this diagram; the phases are the same for generating an updated set of pixels for the user.

Now, browsers _could_ simply run this full set of phases after every single DOM or state manipulation. This would require blocking JavaScript execution to generate a visible frame after every manipulation operation (adding or removing elements, changing styles, etc.), which would be relatively slow. To avoid this, browsers batch work, attempting to avoid running the style and layout phases until JavaScript's single-threaded execution relinquishes control of the event loop (see [Jake's masterful talk](https://www.youtube.com/watch?v=cCOL7MC4Pl0), or [a recent transcription](https://www.andreaverlicchi.eu/blog/jake-archibald-in-the-loop-jsconf-asia-talk-transposed/)).

But certain operations _force_ the browser to run at least the style and layout phases before JavaScript has [yielded to the main thread.](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield) These APIs [are numerous](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) and generate an unpredictable amount of main-thread work, as work to generate updated metrics for style-readback operations [can potentially require style and layout invalidation _for every element in the document_.](https://web.dev/articles/reduce-the-scope-and-complexity-of-style-calculations)

> [!NOTE]
> Incidentally, this is why CSS-in-JS is such a terrible antipattern. Manipulating style rules at runtime is dramatically more costly than poorly timed style readback because it also blows away the caches that make style recalculation and layout faster.

Most code that manipulates the DOM, then calls any API that returns sizing information _before_ yielding to the main thread causes style recalculation and layout to run, which can be extremely slow.

```html
<script type="module">
  // Assuming no script before this code modifies the DOM or styles,
  // this code will execute quickly:
  let foo = document.querySelector("#foo");
  // Synchronously reads back dimensions computed at last layout.
  let width = foo.innerWidth; 
  // Set styles that will impact the element's computed width the
  // next time a layout occurs.
  foo.style.width = `${parseInt(width) + 10}px`;
  // ...
  foo.style.maxWidth = "75%";
  // Explicitly yield to main thread here.
  scheduler.yield();
  // Because the DOM is "dirty" (has chaged since JS started 
  // running), all frame-generation phases will execute:
  // style recalc -> layout -> paint -> composite.
</script>
```

It's straightforward to apply the "read, then write" discipline in small programs, but imagine an only slightly more complicated program that uses code from a different vendor, a common occurrence in the modern web:

```js
// analytics.example.com/analytics.js
export function log(element) {
  // ...
  let height = element.innerHeight;
  // ...
}
```

```html
<script type="module">
  import * from "https://analytics.example.com/analytics.js"

  let foo = document.querySelector("#foo");
  let width = foo.innerWidth; 
  foo.style.width = `${parseInt(width) + 10}px`;
  log(foo);
  // ... 
  foo.style.maxWidth = "75%";
  // Yield the thread.
  scheduler.yield();
  // style recalc -> layout -> paint -> composite.
</script>
```

In this (only slightly) stylized example, `log()` performs a synchronous readback of style information that implies that *at least* the style recalculation and layout phases of the frame generation pipeline must be re-run in order to compute the element's `innerHeight`. This happens when the `innerHeight` accessor is called because browsers attempt to batch writes in the hopes that they will not need to perform the expensive style, layout, paint, and composite phases until a full frame needs to be generated for the user. 

The spooky-action-at-a-distance design of CSS also makes it impossible for browsers to calculate height without first computing width, meaning that potentially every element in the document may change dimension as a result. Automatic height from width is a tremendous time saving for web developers in general, but can create large global side effects whenever the DOM is manipulated. This gives rise to the meme that "DOM is slow" (it isn't); in reality, _style and layout may take an unbounded and hard-to-reason-about amount of time_ and care is required to avoid interleaving DOM manipulation and layout readback operations in script.

Fast web tools and sites go to extreme lengths to batch writes, only reading sizes from the DOM at the _very_ beginning of a [JavaScript execution task.](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth) In moderately complex pages, enforcing this sort of discipline is extremely challenging. 

Style readback can create global effects, since DOM manipulation can't be assured to only impact a specific subtree.

> [!NOTE]
> Recent additions to the web platform can provide better isolation for each of the frame generation phases. In order:
>
> - **Style recalc**: [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) provides subtree-level isolation for style recalculation operations for _most_ styles (exceptions include [inherited properties such as `color`, `font-size`, and CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Inheritance#inherited_properties)). <br><br>Other approaches like [selector prefixing (a.k.a. "style scoping")](https://nolanlawson.com/2023/01/17/my-talk-on-css-runtime-performance/) can approximate this benefit by shortcutting lookups when applied to a majority of elements and style rules. Disappointingly, `contain: style;` does _not_ provide this benefit (and its [use-cases](https://css-tricks.com/almanac/properties/c/contain/#aa-style) are dubious).<br><br>
> - **Layout**: CSS [layout containment (via `contain: layout;`)](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) delivers subtree isolation in the layout phase, allowing sections of a document to "skip" many global layout operations.<br><br>
> - **Paint**: CSS paint containment (via [`contain: paint;`](https://developer.mozilla.org/en-US/docs/Web/CSS/contain)) ensures that content within an element cannot require the rasterizer and compositor systems consider changes within the element to impact stacking and painting of other elements (common challenging examples include `box-shadow`).<br><br>
> - **Composite**: Judicious use of [`will-change`](https://css-tricks.com/almanac/properties/w/will-change/) and strictly defined CSS animations can dramatically impact responsiveness of interactive content, however most compositing operations remain only indirectly influenceable.
>
> [`content-visibility`](https://web.dev/articles/content-visibility) also provides another axis of layout and paint-phase work management. By preventing those calculations from occurring for elements that are known _a priori_ to be outside the viewport, `content-visibility` can be combined with other techniques to dramatically reduce work generated by DOM changes.

Large web applications today are generally not built with these new APIs in mind, leading to single-threaded performance cliffs when selector caches reach their limits or are unadvisedly invalidated (e.g., by "CSS-in-JS" runtimes). Combined with the reality that most of today's computers are slow Android phones, this creates consistent challenges for web application responsiveness.

The scale and persistence of these issues suggests missing platform controls to facilitate better page-level outcomes.

### Goals

 - Identify APIs or controls that can provide document authors with page-level control to prevent interleaving of style readbacks and writes.
 - Minimal API surface area.
 - Ability to be incrementally adopted.
 - Integration with the [Reporting API,](https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API) including a [Report-Only mode,](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only) to assist in migrations.

### Non-goals

 - Subtree-scale control for read and write phasing. It will be challenging enough for developers to consider a global regime; fine-grained configuration may harm adoption as much as could enhance it.
 - New, fully asynchronous style readback APIs (see Considered Alternatives below).

## Proposal

We propose a mode with separate read and write phases for interacting with the DOM. When this mode is enabled, interleaving reads and writes will no longer incidentally trigger global style recalculation and layout, but will either result in "stale" reads or exceptions.

Today's phasing can be described as:

 1. Browser processing (style, layout, etc.)
 1. JavaScript event dispatch (style reads + DOM writes)
    1. Task execution
    1. Microtask queues drained
 1. GOTO: 1

At any point in JavaScript processing, the DOM can be mutated and the results of those modifications on styling for any element can be synchronously read back. If they would impact element dimensions, these changes will force _at least_ the `style` and `layout` phases of the frame production process to execute.

This is, conceptually, a `read/write` phase, in which both operations are allowed in the same task or microtask.

To be minimally invasive to this model, we propose additions to event handling that define opt-in phases on either side of `read/write`, such that either `read` or `write` callbacks execute before or after the existing event delivery tasks. We pair it with APIs for scheduling in future phases. 

The new phasing, conceptually, is:

 1. Browser processing (style, layout, etc.)
 1. JavaScript event dispatch
    1. Opt-in `read` phase
       1. Task execution
       1. Microtask queues drained
    1. Existing `read/write` phase
       1. Task execution
       1. Microtask queues drained
    1. Opt-in `write` phase 
       1. Task execution
       1. Microtask queues drained
 1. GOTO: 1

In each turn, the `read` phase happens strictly before the `write` phase. We expect that style readback in the `write` phase will be allowed, but simply always return dirty information.

For example:

```js
let foo = document.getElementById("foo");
foo.addEventListener(
  // Event type
  "click", 
  // Handler
  (evt) => {
    // Synchronous style readbacks are fine here
    let w = foo.innerWidth;
    let h = foo.innerHeight;
    console.log(w, h);

    // Writes are not allowed, and instead must 
    // be scheduled. This could be written many 
    // ways, but we imagine the Scheduler API 
    // might be a good place for it:
    scheduler.postTask(
      () => {
        let styles = foo.styleAttributeMap;
        styles.set("width",  CSS.px(w + 10));
        styles.set("height", CSS.px(h + 10));
        // ...
      },
      { phase: "write" }
    );
  },
  // Options
  { phase: "read" }
);
```

Syntax of the scheduling integration is TBD (e.g., should there be explicit `scheduler.postForRead()` and `scheduler.postForWrite()` API instead?). We could also imagine the event carrying scheduling methods for brevity:

```js
foo.when("click", 
  (evt) => {
    // ...
    evt.on("write", () => { /* ... */ });
  },
  { phase: "read" }
);
```

It's also unclear if any (or all) of these methods should return promises. See Considered Alternatives for variations that can.

Extensions will also be required for the platform's existing scheduling APIs to allow them to "call" their phase when not triggering today's conjoined `read/write` phase. Examples include:

- `setTimeout()`
- `setInterval()`
- `requestAnimationFrame()`
- `requestIdleCallback()`
- `postMessage()`
- `queueMicrotask()`

### Opt-in Mechanism

Achieving widespread adoption of these mechanisms is a daunting but important task, as any stray third party library can effectively destroy the performance of web applications today. As a result, we place a premium on alternatives that allow for incremental rewrites of existing code, as well as the ability to polyfill with minimal intrusion.

The meat of our proposal (above) does not require any explicit page-level opt-in, but we can imagine enforcement modes that can set a global policy to strictly require use of them; e.g. via [Document Policy](https://github.com/WICG/document-policy/blob/main/document-policy-explainer.md):

```html
<html>
  <head>
    <meta http-equiv="Document-Policy" 
          content="event-phases: required">
    <!-- ... -->
  </head>
  <!-- ... -->
</html>
```

This sort of policy would disable registration of event handlers that do not specify the `read` or `write` phases. 

This policy will, in effect, prevent the entire class of layout-thrashing bugs. It's TBD if attempted synchronous reads in the write phase should be errors under this policy, or if that should be specified with a separate argument for the sake of compatibility; e.g.:

```html
<meta http-equiv="Document-Policy" 
      content="event-phases: required strict">
```

### Facilitating The Transition With Report-Only Mode

Very few libraries and tools will initially be compatible with this model, and experience with the [TLS adoption effort](https://www.usenix.org/conference/enigma2017/conference-program/presentation/schechter) has taught us that integration with the [Reporting API](https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API) and a [Report-Only Mode](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only) are important enablers for organisations looking to make large-scale change in their applications.

Programmatic use might look like:

```js
let options = {
  types: [ "event-phases" ],
  buffered: true
};

let obs = new ReportingObserver(
  (reports, observer) => {
    reports.forEach((r) => {
      console.log(r.type); // "event-phases"
      console.dir(r.body); // sourceFile, lineNumber, ...
    });
  },
  options
);
```

HTTP headers can be used to enable both policy and reporting:

```
Reporting-Endpoints: default="https://reports.example/default"
Document-Policy: event-phases=required strict, report-to=default;
```

And violation reports can also be automatically delivered in a way that warns, but does not trigger enforcement so that organizations can find problematic code in their deployed services from a central endpoint:

```
Reporting-Endpoints: default="https://reports.example/default"
Document-Policy-Report-Only: event-phases=required strict, report-to=default
```

## Considered Alternatives

There are many alternatives in this design space, and we're actively looking for feedback on both the proposal above and the relative merits of differing approaches. If you have views as to which style is best, please leave feedback in our [Issues List](TODO) or [reach out by email.](TODO)

### Dirty Reads Only

The simplest API would allow pages to prevent style readback from triggering layout, even when the DOM has been manipulated since the last layout:

```html
<html>
  <head>
    <meta http-equiv="Document-Policy" 
          content="synchronous-style-readback: disable">
    <!-- ... -->
  </head>
  <!-- ... -->
</html>
```

In this design, readbacks provide dirty data. Sizing and styling information from the last time the document was laid out is provided instead. This has several implications:

  - Code expecting to be able to read back will continue to "work", but may be subtly broken, as no layout operations will be forced and code expecting updated dimensions will receive potentially incorrect sizing information.
  - `read` -> `write` -> `read` within a turn will always produce the same final value as the first `read` operation.
  - Styling information for elements created and attached to the DOM in the current turn will always be whatever the global default for a value would be.

For example:

```html
<html>
  <head>
    <meta http-equiv="Document-Policy" 
          content="synchronous-style-readback: disable">
    <style>
      /* inline css */
      #foo { width: 100px; }
    </style>
  </head>
  <body>
    <div id="foo"></div>
    <script type="module">
      let foo = document.querySelector("#foo");

      // Layout has previously occurred, but the 
      // DOM has not been manipulated, so the 
      // stale value is correct, e.g. 100px:
      let width = foo.innerWidth; // 100
      foo.style.width = `${parseInt(width) + 10}px`;

      // Logs "100", even though the next frame 
      // will display `#foo` at 110px wide.
      console.log(foo.innerWidth); // 100
    </script>
  </body>
</html>
```

By integrating with the [Reporting API](https://w3c.github.io/reporting/), developers can detect these cycles. 

To prevent them entirely, we can imagine a mode that simply disallows synchronous read operations once the DOM has been dirtied:

```html
<meta http-equiv="Document-Policy" 
      content="synchronous-style-readback: error">
```

```js
// `synchronous-style-readback: error`
let foo = document.querySelector("#foo");
let width = foo.innerWidth; // 100
foo.style.width = `${parseInt(width) + 10}px`;

// Throws an exception, nothing logged.
console.log(foo.innerWidth); 
```

We can imagine versions of this design that allow a *single* forced layout, but block write (DOM manipulation) operations past that point in the interest of avoiding re-construction of style and layout trees for generating the subsequent frame. E.g.:

```js
// `synchronous-style-readback: once`
let foo = document.querySelector("#foo");
let width = foo.innerWidth; // 100
foo.style.width = `${parseInt(width) + 10}px`;
// Performs (single, slow) forced layout
console.log(foo.innerWidth); // 110

// All write operations dissallowed once single-readback 
// barrier is set; only cleared by yielding fully.
foo.style.height = "auto"; // Throws
```

The difficulty in operationalising this variant seems high; developers may be surprised (as in the current environment) to find that work that is fully permitted in one line becomes an error for reasons that do not have strong symmetry with their mental model of layout computation.

Other variations might allow specific subtrees to run known-inexpensive forced layouts, for example if `contain: strict` is set on an element and the styles being read back are for an element contained in a Shadow DOM. We might also imagine allowing reads from known-unaffected trees and subtrees if modifications are constrained to similarly isolated containers.

The difficulty in lining up these exclusions as to be useful appears difficult, but we welcome feedback on this.

### Parallel, Async APIs

Another way around the problems of synchronous layouts and computed style information could be the introduction of parallel, fully asynchronous APIs with options for disabling synchronous variants. For example, a promise-vending API for delivering element geometry information (similar to [Resize Observers](https://web.dev/articles/resize-observer)) would give runtimes the ability to almost-synchronously deliver that information inside the same turn when the DOM is not dirtied (modified in a way that would affect layout), or defer delivery to the beginning of the very next turn after a layout has completed. There are questions to be litigated about staleness of layout data relative to promise resolution, but a simple variant of such an API might integrate with the high-performance [CSS Typed OM](https://developer.chrome.com/docs/css-ui/cssom) like this:

```html
<!-- 
 Opt-in globally disables old APIs, exposes new ones 
-->
<meta http-equiv="Document-Policy" 
      content="synchronous-style-accessors: disable">

<script type="module">
  let foo = document.querySelector("#foo");

  console.log(foo.innerWidth === undefined); // true

  // A new shorthand for getting the computedStyleMap; 
  // ordinarily calling `window.getComputedStyles(foo)` 
  // or `foo.getComputedStyleMap()` would force
  // synchronous re-resolution of all dirtied styles. 
  // This variant returns a promise that returns in 
  // the next microtask (assuming no DOM modification 
  // has happened since turn start) or at 
  // the beginning of the next turn:
  let computed = await foo.computedStyles();

  // A new shorthand for accessing geometry.
  // This object provides access to all geometry, 
  // including (but not limited to):
  //  - widths (margin, border, content, etc.)
  //  - heights
  //  - scroll dimensions
  //  - offsets
  // This alternative to calling accessors such as 
  // `offsetWidth` allows the engine to re-use existing 
  // geometry computed from the last layout, or defer 
  // the lines following until the next turn (after a 
  // layout has occurred naturally):
  let dimensions = await foo.dimensions();
  let bw = dimensions.borderWidth;

  foo.attributeStyleMap.set("width", CSS.px(bw + 10));
</script>
```

This style of API opt-in is unusual on the web platform, and our experience designing [the updated DOM for Dart (`dart:html`)](https://dart.dev/libraries/dart-html) convinced us that forced transitions to new APIs are exceedingly difficult to pull off in practice, [no matter how nice the new APIs are by comparison.](https://api.dart.dev/stable/latest/dart-html/Element/on.html)

The powerful force of legacy code will be an impediment to adoption regardless of which style of API we choose, however, and the jury is out on which path will lead to the fastest adoption.

### Per-subtree Enforcement

As an alternative to a global document policy, we consider that developers in legacy codebases might find it preferable to trigger enforcement only for a subset of DOM elements. This implies a need for alternatives to the document-policy based opt-in design. This isn't exclusive with document-wide opt-in, and we might imagine both being available some day.

Triggering notice or enforcement this way might use the same values but with an alternative triggering syntax; e.g. as a new global HTML attribute:

```html
<section phasedlayout="strict">
  <p style="display: block; width: 100px" id="foo">
     Style readbacks may be dirty on 
     elements within this subtree</p>
</section>
<script>
  let foo = document.getElementById("foo");
  let w = foo.innerWidth;
  foo.styleAttributeMap.set("width", CSS.px(w + 10));
  console.log(w, foo.innerWidth); // 100, 100
</script>
```

Or perhaps via CSS:

```css
:root {
  phased-layout-events: strict;
}
```

Naming TBD, obviously.

Inspired by [`fastdom`](https://github.com/wilsonpage/fastdom), we can imagine versions of this design that allow fine-grained opt-in:

```js
// No global opt-in (or out), no new APIs:
let foo = document.querySelector("#foo");
let width = 0;
// Scheduling of these callbacks would be 
// arbitrary without `await` barrier
await window.read(() => {
  width = foo.innerWidth; // 100

  // Exception; writes not allowed
  foo.attributeStyleMap.set(CSS.px(width + 10));
});
await window.write(() => {
  // Succeeds
  foo.attributeStyleMap.set(CSS.px(width + 10));

  // Exception; synchronous reads not allowed
  width = foo.innerWidth; // 100
});
```

Cancellation could be handled with an [`AbortController`.](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

Alternatives to `read()` and `write()` promise-vending callbacks could, instead, be element-based, although this can create challenges for coordination across wider sections of a document and so we do not explore them here.

## Open Questions

The author has no strong preference for any particular API style considered in this document, so the largest open question relates to which design we should pick (if any).

Beyond that, cross-cutting open questions include:

 - Should reads after writes throw or return stale data?
 - What API style should we adopt for scheduler integration?
 - Which sort of pattern we should adopt for integrating with existing scheduling APIs (e.g. `rAF()`)?
 - Use of Document Policy for enforcement vs, e.g., [Feature Policy which reamains more widely supported](https://caniuse.com/feature-policy) but presents a semantic mismatch.
 - How will these proposals interact with extensions? Should users be able to force such a behaviour onto all extensions? Should we adopt it there by policy?

 Feedback on these issues is appreciated.

## Accessibility, Privacy, and Security Considerations

This API surface is not believed to present access to new timing information or other data that is not already available via scripting to the web platform and exposes no new security-sensitive capability.

<!-- 
## Stakeholder Feedback / Opposition

TODO
-->

## References & acknowledgements

The author would like to thank many folks for their patience and input in development of this proposal, including (but not limited to):

- [Kurt Catti-Schmidt](https://github.com/KurtCattiSchmidt)
- [Daniel Clark](https://www.linkedin.com/in/daniel-clark-a4a0b658/)
- [Alison Maher](https://www.linkedin.com/in/alison-maher-6255b2121/)
- [Andy Luhrs](https://aluhrs.com/)
- [Kevin Babbitt](https://github.com/kbabbitt)

Many projects have influenced the thinking in this proposal, including:

 - [fastdom](https://github.com/wilsonpage/fastdom): Wilson Page's excellent batching approach with optional development-time enforcement (via "strict mode")
 - The Minecraft Scripting API's [Before Events](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/systembeforeevents?view=minecraft-bedrock-experimental) and [After Events](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/systemafterevents?view=minecraft-bedrock-experimental) which cleanly separate a read-only phase from the writable phase of extension execution.
 - [The original DART DOM (via the `dart:html` package)](https://rm-dart.web.app/tutorials/web/low-level-html/add-elements), designed by Dart team members, as well as [Erik Arvidsson](https://www.linkedin.com/in/erik-arvidsson-88213a1/) and [the author of this proposal](https://infrequently.org/about-me/). Many solutions to the read/write phasing problem were considered as part of this effort.