# focusgroup for HTML and CSS
> Now with 100% more Style[sheet support]!

Authors: [Travis Leithead](https://github.com/travisleithead),
         [David Zearing](https://github.com/dzearing),
         [Chris Holt](https://github.com/chrisdholt/)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in
developing collaborative solutions fit for standardization. As the solutions to problems
described in this document progress along the standards-track, we will retain this 
document as an archive and use this section to keep the community up-to-date with the 
most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [WHATWG HTML Workstream](https://whatwg.org/workstreams#:~:text=html)
* **Current version: this document**

## 1. Introduction

When writing custom controls, authors need to implement the semantics of various known
controls (see [ARIA authoring guide](https://www.w3.org/TR/wai-aria-practices-1.1/)) to
enable proper (and expected) keyboard support. Control examples include tabs and tabsets,
combo boxes, accordion panels, carousels, focusable grid tables, etc. Many of these 
patterns expect arrow-key navigation, as well as support for page down/up, home/end, even
"type ahead" behavior. 

The native web platform supports *some* of these linear navigation behaviors in native
controls like radio button groups (wrap-around arrow key movement that changes both focus
and linked selection), &lt;select&gt; element popups (up/down movement among options), and 
date-time controls (arrow key movement among the components of the date), but **does not 
expose a primitive** that can be used independently to get this behavior. 

We propose exposing a new web platform primitive—'focusgroup'—to facilitate focus navigation (not selection)
using arrow keys among a set of focusable elements. This feature can then be used 
(**without any JavaScript**) to easily supply platform-provided focus group navigation into
custom-authored controls in a standardized and predictable way for users.

Customers like Microsoft's Fluent UI team are excited to leverage this built-in capacity
for its keyboard consistency, default accessibility (provides a signal to ATs for alternate 
keyboard navigation), and promised interoperability
over existing solutions.

While this document emphasizes the usage of the keyboard arrow keys for accessibility
navigation, we acknowledge that there are other input modalities that work (or can be adapted 
to work) equally well for focusgroup navigation behavior (e.g., game controllers, gesture 
recognizers, touch-based ATs, etc.)

## 2. Goal

The goal of this feature is to "pave the cow path" of an existing authoring practice 
(and [accessibility best-practice](https://www.w3.org/TR/wai-aria-practices-1.1/)) 
implemented in nearly every Web UI library: the "roving tabindex". Here's a few sources 
that explain roving tabindex in more detail as well as a selection of common libraries 
implementing the pattern:

* [What's 'roving tabindex'?](https://www.stefanjudis.com/today-i-learned/roving-tabindex/)
* [Rob Dodson explains roving tabindex (YouTube)](https://www.youtube.com/watch?v=uCIC2LNt0bk)
* [roving tabindex in React](https://js.coach/package/react-roving-tabindex)
* [Angular's ListKeyManager in the Component Dev Kit](https://material.angular.io/cdk/a11y/overview#listkeymanager)
* [FocusZone in Fluent UI](https://developer.microsoft.com/en-us/fluentui#/controls/web/focuszone)
* [Elix component library's KeyboardDirectionMixin](https://component.kitchen/elix/KeyboardDirectionMixin)

To achieve this goal, we believe that the solution must be done with declarative markup or CSS.
If JavaScript is required, then there seems little advantage to using a built-in feature over
what can be implemented completely in author code. Furthermore, a declarative solution provides
the key signal that allows the platform's accessibility infrastructure to make the group 
accessible by default:

* Signaling to the AT that arrow-key navigation can be used on the focused element.
* Understanding the bounds/extent of the group, providing list context like "X in Y items" 
   (posinset/setsize)
* Providing a consistent and reliable navigation usage pattern for users with no extra author code
   required.

## 3. Non-Goals

In most roving tabindex implementations, the notion of moving *focus* is 
tightly coupled with the notion of *selection*. In some cases, it makes sense to have selection follow
the focus, but in other scenarios these need to be decoupled. For this proposed standard, we decouple 
selection from focus and only focus (cough) on the focus aspect: moving focus using the
keyboard among eligible focus targets. Adding selection state, e.g., tracking the currently selected 
option in a list, will be a separate feature. To handle selection-based scenarios, we defer to the 
CSS proposal [**Toggles**](https://tabatkins.github.io/css-toggle/) which can work nicely with focusgroups.

No additional UI (e.g., a "focus ring") is associated with focusgroups. A focusgroup
is wholly intended as a logical (transparent) grouping mechanism for a set of already focusable child elements,
providing arrow key navigation among them. All the pre-existing styling/ native UI affordances for
focus tracking are unchanged with this proposal.

## 4. Principles

1. Intuitive use in declarative scenarios. Focusgroups
    * are easy to reason about (self-documenting) in the source markup or CSS.
    * provide an intuitive interaction between focusgroups.
    * integrate well with other related platform semantics.
2. Focusgroups are easy to maintain and configure.
    * Configuration is managed in one place.
    * Provide easy to understand usage into HTML and CSS patterns.
    * Avoid "spidery connections" e.g., using IDRefs or custom names that are hard to maintain.
3. Complimentary declarative representations in HTML and CSS
    * HTML attributes offers focusgroup usage directly with impacted content and provide for
       the most straightforward scenarios.
    * CSS properties allow for responsive design patterns to conditionally apply focusgroup 
       behavior under changing layouts. Enables some advanced use cases where selector-based
       matching is advantageous.
     
## 5. Use Cases

1. (Child opt-in) Group a set of focusable child elements under a single focusgroup.
2. (Descendent opt-in) Focusable elements deeply nested can participate in a single focusgroup.
3. (Wrap) Focusgroup can be configured to have wrap-around focus semantics.
4. (Horizontal/vertical) A focusgroup can be configured to respond to either horizontal navigation
    keys or vertical keys or both (to trivially reserve one axis of arrow key behavior for 
    supplementary actions, such as opening nodes in a tree view control).
5. (Extend same direction) Focusgroups can be nested to provide arrow navigation into multiple 
    composed widgets (such as lists within lists).
6. (Extend opposite direction) Focusgroups can be nested to provide arrow navigation into composed
    widgets with orthogonal navigation semanantics (such as horizontal-inside-vertical menus).
7. (Multiple focusgroups) Multiple focusgroups can be established on a single element (advanced CSS 
    scenario).
8. (Opt-out) Individual elements can opt-out of focusgroup participation (advanced CSS scenario)
9. (Grid) Focusgroups can be used for grid-type navigation (structured content grids like &lt;table&gt;,
    not "presentation" grids).

## 6. Focusgroup Concepts

A focusgroup is a group of elements that are related by arrow-key navigation and for which the 
platform provides the arrow key navigation behavior by default (no JavaScript event handlers needed)!
Navigation is provided according to order or structure of the DOM (not how the content is presented 
in a user interface).

This document describes two kinds of focusgroups: **linear focusgroups** and **grid focusgroups**.
Linear focusgroups provide arrow key navigation among a *list* of elements. Grid focusgroups provide 
arrow key navigation behavior for tabular (or 2-dimensional) data structures.

Multiple linear focusgroups can be combined together into one logical focusgroup, but linear focusgroups
cannot be combined with grid focusgroups and vice-versa.

Focusgroups consist of a **focusgroup definition** that establish **focusgroup candidates** and
**focusgroup items**. Focusgroup definitions manage the desired behavior for the associated focusgroup 
items. Focusgroup items are the elements that actually participate in the focusgroup (among the possible
focusgroup candidates).

When a focusgroup definition is associated with an element, all of that element's direct children
become focusgroup candidates. Focusgroup candidates become focusgroup items if they are focusable, e.g.,
implicitly focusable elements like `<button>`, or explicitly made focusable via `tabindex` or some
other mechanism (e.g., `contenteditable`).

In HTML, *one* **focusgroup definition** can be added to an element using the `focusgroup` attribute:

Example 1:
```html
<p id=parent focusgroup>
   Some text
   <a id=one href="…">a link</a>.
   Some more text.
   <span id=two tabindex=-1> focusable span</span>.
   <a id=three href="…">another link</a>
</p>
```

Using CSS, a focusgroup definition can be applied with selectors, and must include a name. `auto` is 
a reserved name that corresponds to the same focusgroup implied by the HTML `focusgroup` attribute.
(Several additional reserved names are defined for grid focusgroups; any other name is considered a custom
linear focusgroup.)

```css
#parent { 
   focus-group: auto;
}
```

For the `parent` element which includes the focusgroup definition, the elements `one`, `two`, and `three`
(and any other children of `parent` that may be added or removed) are focusgroup candidates and because
each are focusable, they also become focusgroup items. When one of the focusgroup items is focused, then
the user can move focus sequentially according to DOM order among all the focusgroup items using the arrow
keys (up/right moves focus forward, down/left moves focus backwards). Note that only elements `one` and
`three` can be focused using the Tab key (because element `two` has `tabindex=-1` set, which takes it out
of the tabindex sequential navigation ordering).

Focusgroup definitions may include the following (in addition to a name):

* extend -- a mechanism to join this focus group to an ancestor focusgroup. Note: linear focusgroups cannot
   be joined to grid focusgroups and vice versa.
* direction -- applies to linear focusgroups only: constrains the keys used for arrow key navigation to 
   horizontal, vertical, or both (the default).
* wrap -- what to do when the attempting to move past the end of a focusgroup. The default/initial value is 
   nowrap which means that focus is not moved past the end of a focus group with the arrow keys.

In HTML these focusgroup definitions are applied as space-separated token values to the `focusgroup` 
attribute. In CSS, these definitions are specified as properties (including a `focus-group` shorthand
property for convenience).

Example 1b:

```html
<div focusgroup="wrap horizontal">
```

Example 1c:
```css
div { 
   focus-group-name: auto;
   focus-group-wrap: wrap;
   focus-group-direction: horizontal;
}
```

In the case that HTML attribute values conflict with CSS properties, the CSS values override the 
HTML-defined values. For example:

Example 1d:
```html
<div focusgroup="wrap horizontal" style="focus-group-name: auto; focus-group-wrap: nowrap; focus-group-direction: both">
```

The CSS-specified value of 'nowrap' would override the HTML attribute value's "wrap" directive; 
similarly for 'both' overriding "horizontal".

There is no change to the way Tab navigation works with `tabindex` nor the Tab ordering behavior. To 
use a focusgroup, focus must enter that element's focusable children somehow: for accessibility
and keyboard-only scenarios, the Tab key is typically used--programmatic calls to `element.focus()` 
or user clicks with a pointing device are alternatives.

The focusgroup can be used to reduce the number of tab stops (`tabindex=0`) necessary in a document
by converting those into `tabindex=-1` and adding a focusgroup to manage them. The 'roving tabindex'
scenario is accomplished by picking an entry point to the focusgroup (a child with `tabindex=0`), and 
setting the rest of the focusable elements to `tabindex=-1`. This is the same pattern needed to setup
the roving tabindex, but by adding `focusgroup`, no JavaScript is necessary to manage it afterward:

Example 2:
```html
<my-list focusgroup>
  <my-listitem tabindex="0">...</mylistitem>
  <my-listitem tabindex="-1">...</mylistitem>
  <my-listitem tabindex="-1">...</mylistitem>
  <my-listitem tabindex="-1">...</mylistitem>
  <my-listitem tabindex="-1">...</mylistitem>
</my-list>
```

From outside of the above markup, assume a Tab key press lands focus on the first `<my-listitem>`. From
this point, the user can use the arrow keys to move from the beginning of the list to the end, or press
Tab again to move outside of this group. Alternatively, maybe you want to support both Tab *and* Arrow
key navigation in your scenario. No problem, just change the setup so that all the list items participate
in the tab order:

Example 3:
```html
<my-list focusgroup>
  <my-listitem tabindex="0">...</mylistitem>
  <my-listitem tabindex="0">...</mylistitem>
  <my-listitem tabindex="0">...</mylistitem>
  <my-listitem tabindex="0">...</mylistitem>
  <my-listitem tabindex="0">...</mylistitem>
</my-list>
```

The focusgroup doesn't "remember" the last element that was focused when focus leaves the group 
and returns later. Instead, the "leaving" and "returning" logic (for keyboard scenarios) depends on the
preexisting *tabindex sequential focus navigation* only. In other words, because Tab is often used to enter,
optionally move through, and leave a focusgroup, the enter-and-exit points depend on which elements
participate in the tab order (those with `tabindex=0` for example). The [CSS Toggles](https://tabatkins.github.io/css-toggle/) 
proposal could be used in this same scenario to track the "toggle state" among this group of toggle-able
elements, allowing focus changes to be decoupled from "selection/toggle" state.

### 6.1. Key conflicts

The focusgroup handles keystrokes (keydown) with a default behavior to move the focus within 
focusgroup items. This default keyboard handling could interfere with other actions the application would like
to take. Therefore, authors may cancel the focusgroup's default behavior by canceling 
(`preventDefault()`) on the keydown event. These events will be dispatched by the focused element, and 
bubble through the focusgroup parent element, which is a convenient place to handle the event.

### 6.2. Key traps

Some built-in controls like `<input type=text>` "trap" nearly all keys that would be handled by the
focusgroup. This proposal does not provide a way to prevent this from happening (Tab should continue
to be used to "exit" these trapping elements).

### 6.3. Enabling wrapping behaviors

By default, focusgroup traversal with arrow keys ends at boundaries of the focus group (the start and
end of a linear focusgroup, and the start and end of both rows and columns in a grid focusgroup). The 
following focusgroup definition values can configure this:

| HTML attribute value | CSS property & value | Explanation |
|----------------------|----------------------|-------------|
| focusgroup="wrap" | focus&#8209;group&#8209;wrap:&nbsp;wrap | **linear focusgroup**: causes movement beyond the ends of the focusgroup to wrap around to the other side; **grid focusgroup**: causes focus movement at the ends of the rows/columns to wrap around to the opposite side of the same rows/columns |
| focusgroup="" (unspecified) | focus&#8209;group&#8209;wrap:&nbsp;nowrap | Disables any kind of wrapping (the initial/default value) |

The following are only applicable to grid focusgroups:

| HTML attribute value | CSS property & value | Explanation |
|----------------------|----------------------|-------------|
| focusgroup="row&#8209;wrap" | focus&#8209;group&#8209;wrap:&nbsp;row&#8209;wrap | Rows wrap around, but column wrapping [and flowing as described below] is disabled. |
| focusgroup="col&#8209;wrap" | focus&#8209;group&#8209;wrap:&nbsp;col&#8209;wrap | Columns wrap around, but row wrapping [and flowing as described below] is disabled. |
| focusgroup="flow" | focus&#8209;group&#8209;wrap:&nbsp;flow | Movement past the end of a row wraps the focus to the beginning of **the next row**. Movement past the beginning of a row wraps focus back to the end of **the prior row**. Same for columns. The last row/column wraps to the first row/column and vice versa. |
| focusgroup="row&#8209;flow" | focus&#8209;group&#8209;wrap:&nbsp;row&#8209;flow | Rows "flow" from row ends to the next/prior row as described above, but column flowing/wrapping is disabled. |
| focusgroup="col&#8209;flow" | focus&#8209;group&#8209;wrap:&nbsp;col&#8209;flow | Columns "flow" from column ends to the next/prior column as described above, but row flowing/wrapping is disabled. |

No option is provided for the hybrid condition of row wrap + column flow behavior (or vice-versa) in the 
same grid. If this combination of behavior is needed, we want to hear this feedback.

### 6.4. Expanding and connecting linear focusgroups together (`extend`)

By default, a focusgroup definition's focusgroup candidates are its direct children. To "extend the
reach" of a linear focusgroup's candidates, a linear focusgroup definition can declare that it intends
to `extend` an ancestor linear focusgroup. If there is an anscestor linear focusgroup of the same name,
the extending focusgroup becomes an extension of that ancestor's focusgroup. Extending a linear 
focusgroup is also an opportunity to change the directionality (and, conditionally, the wrappping) of
the newly extended focusgroup candidates (as described later).

Using `extend` in a focusgroup definition is only valid for linear focusgroups. Grid focusgroups 
**cannot** use `extend` to become a part of linear focusgroup. Similarly, linear focusgroups **cannot**
use `extend` to become part of a grid focusgroup. And grid focusgroups cannot use `extend` to join
an anscestor grid focusgroup.

Below, the `<my-accordion>` element with a focusgroup attribute defines a focusgroup with nothing
focusable in it; the focusable `<button>` elements are separated by an `<h3>` element. The `<h3>` and 
`<div>` elements are the focusgroup candidates, and are not focusable:

Example 4:
```html
<my-accordion focusgroup>
  <h3><button aria-expanded=true aria-controls=p1>Panel 1</button></h3>
  <div id=p1 role=region>Panel 1 contents</div>
  <h3><button aria-expanded=true aria-controls=p2>Panel 2</button></h3>
  <div id=p2 role=region>Panel 2 contents</div>
</my-accordion> 
```

To make the `<button>`s belong to one focusgroup, a focusgroup definition must placed on the `<h3>`
elements that explicitly declares `extend`, causing `<h3>` children to become focusgroup candidates.

Example 5:
```css
my-accordion[focusgroup] > h3 {
   focus-group-name: auto extend;
}
```

The `extend` value employs an ancestor lookup to attempt to locate-and-extend a same-named
linear focusgroup. It is not necessary that an extending linear focusgroup be a direct
child of an existing focusgroup. The first-located focusgroup definition in the ancestor 
chain of elements is the focusgroup definition that is considered for extending.

When extending a focusgroup, traversal order is based on document order. Given the following: 

Example 6:
```html
<div focusgroup> 
  <div id=A tabindex=0></div> 
  <div id=B tabindex=-1>
    <div>
      <div focusgroup=extend>
        <div id=B1 tabindex=-1></div> 
        <div id=B2 tabindex=-1></div>
      </div>
    </div>
  </div> 
  <div id=C tabindex=-1></div> 
</div> 
```

Sequentially pressing the right arrow (assuming `horizontal-tb` + LTR writing-mode) would move
through the `<div>`s: A, B, B1, B2, C. (And in reverse direction: C, B2, B1, B, A, as expected.)

When the extending linear focusgroup is axis-aligned (see following sections), the wrapping state 
of an ancestor focusgroup definition is applied to it. For example: specifying `wrap` on an
extending focusgroup definition when "nowrap" (even implicitly) was specified on a parent
focusgroup (of the same supported axis) does not make sense; the extending focusgroup candidates
join the rest of the ancestor focusgroup candidates to form one logical ordering--they do not
define a separate range of focusgroup candidates to apply different wrapping logic onto.

Example 7:
```html
<!-- This is an example of what NOT TO DO -->
<div focusgroup> 
  <div id=A tabindex=0></div> 
  <div id=B tabindex=-1 focusgroup="extend wrap"> <!-- 'wrap' will not apply -->
    <div id=B1 tabindex=-1></div> 
    <div id=B2 tabindex=-1></div> 
  </div> 
  <div id=C tabindex=-1></div> 
</div> 
```

In this, `wrap` specified on the extending focusgroup definition will not cause any wrapping
behavior to apply. The extending focusgroup (id=B) extended a "nowrap" state from its ancestor
focusgroup and will use that value regardless of the presence of `wrap`.

### 6.5. Limiting linear focusgroup directionality

In many cases, having multi-axis directional movement (both right arrow and down arrow linked to 
the forward direction) is not desirable, such as when implementing a tablist, and it may not make
sense for the up and down arrows to also move the focus left and right. Likewise, when moving up
and down in a vertical menu, the author might wish to make use of the left and right arrow keys to
provide behavior such as opening or closing sub-menus. In these situations, it makes sense to limit
the linear focusgroup to one-axis traversal.

Note that the following only apply to linear focusgroup definitions (they have no effect on grid
focusgroups).

| HTML attribute value | CSS property & value | Explanation |
|----------------------|----------------------|-------------|
| focusgroup="horizontal" | focus&#8209;group&#8209;direction:&nbsp;horizontal | The focusgroup items will respond to forward and backward movement only with the "horizontal" arrow keys (left and right). |
| focusgroup="vertical" | focus&#8209;group&#8209;direction:&nbsp;vertical | The focusgroup items will respond to forward and backward movement only with the "vertical" arrow keys (up and down). |
| focusgroup="" (unspecified) | focus&#8209;group&#8209;direction:&nbsp;both | The focusgroup items will respond to forward and backward movement with both directions (horizontal and vertical). The default/initial value. |

Example 8:
```html
<style>
  tab-group { 
     focus-group-name: auto;
     focus-group-direction: horizontal;
     focus-group-wrap: wrap;
  }
</style>
<!-- ... -->
<tab-group role=tablist> 
  <a-tab role=tab tabindex=0>…</a-tab> 
  <a-tab role=tab tabindex=-1>…</a-tab> 
  <a-tab role=tab tabindex=-1>…</a-tab> 
</tab-group> 
```

In the above example, when the focus is on the first `<a-tab>` element, pressing either the up or
down arrow key does nothing because the focusgroup is configured to only respond to the left/right
arrow keys.

Because 2-axis directionality is the default, specifying both `horizontal` and `vertical` at the
same time on one focusgroup is not allowed:

Example 9:
```html
<!-- This is an example of what NOT TO DO -->
<radiobutton-group focusgroup="horizontal vertical wrap"> 
  This focusgroup configuration is an error--neither constraint will be applied (which is actually 
  what the author intended).
</radiobutton-group> 
```

### 6.6. Interactions with directionality + extending

Powerful scenarios are possible when extending single-axis linear focusgroups. For example, authors
can create tiles that are navigated with left and right arrow keys, and within each tile use 
sub-menus that are navigated with the up and down keys (all in one logical focusgroup!). Vertical email
lists can be navigated with up and down keys, while email actions can be easily accessed with right
and left keys. Alternating horizontal and vertical interactions can be combined arbitrarily deep 
in the DOM. 

When a focusgroup extends another focusgroup, it never extends the parent's directionality values
(`horizontal` or `vertical`). Each extending focusgroup declares (or take the default)
directionality. 

#### 6.6.1. Axis-aligned extending linear focusgroups

When a focusgroup is processing an arrow keypress, if it has an extending
focusgroup that supports the direction requested, then the arrow keypress is forwarded to that 
focusgroup. When the axes are aligned, this is how the focusgroup is extended into a contiguous 
linear group as described previously.

Example 10:
```html
<vertical-menu focusgroup="vertical wrap">
  <menu-item tabindex="-1">Action 1</menu-item>
  <menu-item tabindex="0">Action 2</menu-item>
  <menu-group focusgroup="vertical extend">
    <menu-item tabindex="-1">Sub-Action 3</menu-item>
    <menu-item tabindex="-1">Sub-Action 4</menu-item>
  </menu-group>
  <menu-item tabindex="-1">Action 5</menu-item>
</vertical-menu>
```

Because the parent and the extending focusgroup are axis-aligned, they form an **extended 
linear focusgroup**.

#### 6.6.2. Orthogonal-axis extending linear focusgroups

Example 11:
```html
<style>
  horizontal-menu {
    focus-group-name: auto;
    focus-group-direction: wrap;
    focus-group-wrap: wrap;
  }
  omni-menu {
    focus-group-name: auto extend;
  }
</style>
<!-- ... -->
<horizontal-menu>
  <menu-item tabindex="-1">Action 1</menu-item>
  <menu-item tabindex="0">Action 2</menu-item>
  <container-element tabindex="-1">
    <omni-menu>
      <menu-item tabindex="-1">Sub-Action 3</menu-item>
      <menu-item tabindex="-1">Sub-Action 4</menu-item>
    </omni-menu>
  </container-element>
  <menu-item tabindex="-1">Action 5</menu-item>
</horizontal-menu>
```

The above is an example of a vertical menu nested inside of a horizontal menu. When 
"Action 2" is focused and a down arrow key is pressed, the `<horizontal-menu>` focusgroup 
ignores the key because it is configured to only handle `horizontal` keys. However, when 
focus moves to the `<container-element>` and a down arrow key is pressed, the 
`<omni-menu>`'s extending focusgroup (a child of the currently focused element) supports 
the given axis ('both' axes is the initial value), and so the focus is moved "forward" to 
"Sub-Action 3". What was different in this case, is that the down arrow key which was not
supported by the `<horizontal-menu>`'s focusgroup definition, was handled by the 
`<omni-menu>`'s focusgroup.

The above is a **descent** operation.

Interestingly, this configuration is not bi-directional. Once focus has descended into the 
`<omni-menu>`'s focusgroup the down arrow key (when focus is on "Sub-Action 4") cannot be used
to continue to the `<horizontal-menu>`'s "Action 5" because the `<horizontal-menu>`'s focusgroup
will reject that axis. Conversely, with "Sub-Action 3" focused, the up arrow key will not move focus
to the `<omni-menu>` element because the vertical axis arrow keys are rejected by the owning
`<horizontal-menu>`'s focusgroup.

Once descended into the `<omni-menu>`'s focusgroup, the way to **ascend** again is through an arrow
keypress that is axis-aligned with the parent's focusgroup (when focus is at the start or end of the
child's focusgroup since the child's focusgroup handles both axes). Continuing with Example 11 and 
"Sub-Action 3" focused, a left arrow key press (reverse direction) causes an ascension into the parent's
focusgroup (focusing the `<container-element>` element). Similarly, when "Sub-Action 4" is focused, a right 
arrow key will cause an ascension to the parent's focusgroup and focus "Action 5". The horizontal axis
is aligned between the focusgroups and so horizontal arrow key requests are extensions of the parent's 
focusgroup, while vertical arrow key presses stay "stuck" in the child focusgroup.

When extending focusgroups have orthogonal directionality they create ascender or descender 
relationships.

The arrow key interactions will be clearer to users when nested focusgroups are strictly orthogonal
to each other. Authors should **not** extend `both` direction linear focusgroups with single-directional 
linear focusgroups (and vice-versa) as a best practice. The following example is a best-practice:

Example 12:
```html
<horizontal-menu focusgroup="horizontal wrap">
  <menu-item tabindex="-1">Action 1</menu-item>
  <menu-item tabindex="0">Action 2</menu-item>
  <vertical-menu tabindex="-1" focusgroup="vertical extend">
    <menu-item tabindex="-1">Sub-Action 3</menu-item>
    <menu-item tabindex="-1">Sub-Action 4</menu-item>
  </vertical-menu>
  <menu-item tabindex="-1">Action 5</menu-item>
</horizontal-menu>
```

When focus is on the `<vertical-menu>` focusgroup item, only a down arrow key will descend into the 
nested focusgroup (not a right arrow key because this is disallowed by the vertical extending 
focusgroup). Similarly, only a left arrow key will ascend from "Sub-Action 3" focusgroup item back 
to the `<vertical-menu>` focusgroup item. Using alternating directions in nested focusgroups ensures
natural symmetry for users (cross-axis forward to descend, cross-axis reverse to ascend).

When a focusgroup is considering a cross-axis arrow key to descend, only the currently focused
element and any of its extending focusgroup descendants are considered. This behavior ensures that
no unexpected descents occur when focus is not on a currently descendible element. Conversely, 
*any* of a focusgroup's focused children will check the parent focusgroup for a cross-axis ascent
(if that axis is not already handled by the current focusgroup--and if it is handled, only the
extremities of the focusgroup's children perform this check as in Example 11). This means that
ascending to the parent focusgroup is possible from any extending children.

#### 6.6.3. Notes about wrapping while extending

As noted previously, the wrapping state of a focusgroup definition is extended only when two
focusgroups have an axis-aligned relationship:

Example 13:
```html
<!-- attributes making these elements focusable are elided -->
<div focusgroup=wrap>
  <span focusgroup=extend>…</span> 
</div> 
```

Both the `<div>` and `<span>` have focusgroups configured with default 2-axis directionality.
Both sets of axes are aligned, and so the `wrap` value is extended down and cannot be overridden
by the `<span>`'s focusgroup definition. (Because the axes are aligned, they are an extended 
linear focusgroup. As one logical linear focusgroup, it does not make sense to try to change
the wrapping behavior for a subset of the focusgroup.) 

Example 14:
```html
<div focusgroup=wrap> 
  <span focusgroup="extend horizontal">…</span> 
</div> 
```

The above is a case where the focusgroups make an extended linear focusgroup in the horizontal
direction (`wrap` state cannot be changed by the child for the horizontal direction), and a 
descender/ascender relationship in the vertical direction (it's one-way: from the `<span>` to the
`<div>` not vice-versa). But because the `<span>`'s focusgroup defintion does not support the 
vertical direction, wrapping state is not extended from the parent. Conversely:

Example 15:
```html
<style>
  div  { focus-group: auto wrap horizontal; }
  span { focus-group: auto extend; }
</style>
<!-- ... -->
<div> 
  <span>…</span> 
</div>
```

The focusgroups are axis aligned in the horizontal direction (`wrap` in the horizontal direction cannot 
be changed by the child), and a descender/ascender relationship in the vertical direction (also one-way
from `<div>` to `<span>` and not vice-versa). The `<span>`'s focusgroup supports a direction (vertical)
that it doesn't extend from the `<div>`'s focusgroup and so vertical arrow keys (while focused inside 
the `<span>`'s focusgroup) can be independently configured to wrap or not wrap (in Example 15 they 
won't wrap because `nowrap` is the initial value). In Example 16, the up/down arrow keys will wrap 
around (exclusively) in the `<span>`'s focusgroup, but not when using the left/right arrow keys:

Example 16:
```html
<style>
  /* spacing aligned for comparison */
  div  { focus-group: auto        nowrap horizontal; }
  span { focus-group: auto extend wrap   both; }
</style>
<!-- ... -->
<div> 
  <span>…</span> 
</div> 
```

When the relationships are descender/ascender in both directions, then the wrap state can't
extend in any direction, and will apply to each focusgroup's chosen direction independently:

Example 17:
```html
<style>
  /* spacing aligned for comparison */
  div  { focus-group: auto        horizontal nowrap; }
  span { focus-group: auto extend vertical   wrap; }
</style>
<!-- ... -->
<div> 
  <span>…</span> 
</div> 
```

##### 6.6.4. Deep combinations

Nesting focusgroups can be applied to arbitrary depths to create either extended linear groups 
or ascender/descender relationships as needed--all forming a single logical `focusgroup`.
Consider vertical menus (3) inside of cards oriented horizontally (2) nested inside of rows
structures (1):

![image of tabular data in four rows, where each row contains four cells, and in each cell is a vertical menu structure of three items](nested_combos.png)

Structurally: 

Example 18:
```html
<style>
   table-row, card-view, .somestructure { focus-group-name: auto extend; }
   table-row { focus-group-direction: horizontal; }
   card-view, .somestructure { focus-group-direction: vertical; }
   table-row, card-view { focus-group-wrap: wrap; }
</style>
<!-- ... -->
<data-table focusgroup=vertical> 
  <table-row tabindex=-1> 
    <card-view tabindex=-1> 
      <focusable-entry tabindex=-1></focusable-entry> 
      <div class=somestructure> 
        <focusable-entry tabindex=-1></focusable-entry> 
        <focusable-entry tabindex=-1></focusable-entry> 
      </div> 
    </card-view> 
    …n card-view similar siblings 
  </table-row> 
  …m table-row similar siblings 
</data-table> 
```

In this example, the `<data-table>`'s rows can be navigated with up/down arrows. When the 
user has focused a row they would like to explore, the right arrow key moves them into 
the `<card-view>` items in the row, and they can use left and right arrow keys (that wrap 
around start-to-end) to cycle through the cards. If desired, while at any card, the up
arrow will take them back to the parent `<table-row>` to move up/down to the next row.
Alternatively, while looking at a card with a nested vertical list, they can press the
down arrow to descend into the first `<focusable-entry>` in the list items, and cycle 
through them (with wrapping). The `<focusable-entry>` elements have some `<div>` support
structure in the markup. To "unify" the `<focusable-entry>`s into one logical list for 
arrow navigation, the focusgroup on the `<div>` just extends in the same direction as 
the parent (and the wrapping value is also extended).

### 6.7. Opting-out

Focusgroup definitions are assigned to an element in order to define the behavior for 
their *child elements* which become focusgroup candidates. Because all *child elements*
are focusgroup candidates, any child element that is (or becomes) focusable will
automatically become a focusgroup item belonging to it's parent's focusgroup.

What if an element should be focusable, exists as a child of an element with a focusgroup
definition (because some of its other focusable siblings *should* belong to the focusgroup), 
but does not want to participate in the focusgroup?

Individual focusgroup candidates have the option of "opting-out" of participation in any
focusgroup. Opting-out is a local focusgroup item decision (it should not be managed at the
focusgroup definition attached to the parent element). In order for a focusgroup item to
opt-out, a new (local) mechanism is needed.

In this proposal, there is no way for a focusgroup item to opt-out using HTML alone (a 
proposal would likely require a new attribute with different focusgroup semantics, and
this opt-out scenario is considered an edge-case).

To opt-out, a CSS property is used, which applies only to focusgroup candidates (not
focusgroup definitions):

| CSS property & value | Explanation |
|----------------------|-------------|
| focus&#8209;group&#8209;item:&nbsp;none | This focusgroup item will not participate in **any** focusgroup. (`none` is the initial value when there is no focusgroup definition on a parent element; `auto` is the initial value when there is a parent focusgropu definition.)  |

Example 19:
```html
<style>
  #container { focus-group: auto; }
  .optout { focus-group-item: none; }
</style>
<!-- ... -->
<control-row id=container>
  <options-widget class=optout> ... </options-widget>
  <action-button>...</action-button>
  <action-button>...</action-button>
  <action-button>...</action-button>
  <action-button>...</action-button>
</control-row>
```

### 6.8. Multiple focusgroups among siblings

Similar to how some focusgroup candidates may want to opt-out (see prior section), other
focusgroup candidates among a set of sibling elements may desire to participate in a 
separate focusgroup from their other siblings.

We elect to only provide this advanced scenario with CSS. Using `focus-group-item`, a 
focusgroup candidate can specify the custom identifier of a matching parent focusgroup
definition it would like to belong to (assuming it is focusable).

CSS quite easily allows multiple focusgroup definitions to be applied to a single 
container element via custom identifiers (this would be less elegant with HTML 
attributes). The name `auto` (and the grid focusgroup names) are reserved, but other
values are treated as custom identifiers and define new focusgroup definitions that
focusgroup candidates can opt-into.

**Note**: a focusgroup candidate can **only** be in one focusgroup at a time, and the 
focusgroup it belongs to is the one specified by its `focus-group-item` value.

| CSS property & value | Explanation |
|----------------------|-------------|
| focus&#8209;group&#8209;name:&nbsp;<custom&nbsp;ident> | Gives the focusgroup a custom identifiers. Only focusgroup candidates that opt-in to this named identifier will belong to this focusgroup. |
| focus&#8209;group&#8209;item:&nbsp;<custom&nbsp;ident> | Declares this focusgroup candidates intention to belong to a focusgroup definition with the given identifier. |
| focus&#8209;group&#8209;name, focus&#8209;group&#8209;direction, and focus&#8209;group&#8209;wrap | Each allows comma-separated list to accomodate multiple definitions. |

The following example shows one parent element that has two focusgroups defined, and 
opts half of the children into one and half into the other.

Example 20:
```html
<style>
  tabs { 
    focus-group-name: redtab, bluetab;
    focus-group-direction: horizontal, horizontal;
  }
  .redtab { focus-group-item: redtab; }
  .bluetab { focus-group-item: bluetab; }
</style>
<!-- ... -->
<tabs focusgroup>
  <tab class=redtab>...</tab>
  <tab class=redtab>...</tab>
  <tab class=redtab>...</tab>
  <tab class=bluetab>...</tab>
  <tab class=bluetab>...</tab>
  <tab class=bluetab>...</tab>
</tab>
```

### 6.9. Grid focusgroups

Some focusable data is structured not as a series of nested linear groups, but as a 
2-dimensional grid such as in the Excel app, where focus can move logically from 
cell-to-cell either horizontally or vertically. In these data structures, it makes 
sense to support the user's logical usage of the arrow keys to move around the data.

Grid navigation is expected to happen within well-structured content with consistent
rows and columns where DOM structure reflects this organization.

#### 6.9.1. Applicability to tabular data

The arrow navigation in the grid (and in the previous non-grid scenarios) should
reflect the accessible structure of the document, not the presentation view made
possible with CSS. For example, it is easy to create views that visually appear
grid-like, but do not make sense to navigate like a grid if considering that the 
data model is fundamentally a list, which is how users of accessibility technology
would perceive it. Wrapping a list of contact cards on screen in a grid-like
presentation allows for more content density on screen for sighted users. In that 
scenario, arrow key navigation to move linearly (left-to-right following the 
line-breaking across each line) through the contents makes sense (especially if 
these are alphabetized), but orthogonal movement through the "grid" (up/down when 
cards are aligned or in a masonry layout) jumps the focus to seemingly arbitrary
locations. Multi-directional arrow key navigation may seem appropriate for sighted 
users that have the visual context only, but are not appropriate for assistive
technology. In the case of the list-presented-as-a-grid scenario, a linear 
focusgroup will make the most sense for sighted as well as users with accessibility 
needs.

When considering using a grid focusgroup, be sure that the data is structured
like a grid and that the structure makes semantic sense in two dimensions (and not
just for a particular layout or presentation).

Tabular data can be structured using column-major or row-major organization. Given
that HTML tables and ARIA attributes for grids (role=grid, role=row, role=gridcell)
only exist for row-major grid types, this proposal does **not define** grid focusgroup
organization for column-major data structures (and assumes row-major data structures 
throughout).

#### 6.9.2. Grid isolation

As noted previously the `extend` value is not applicable to grid focusgroups, and 
grid focusgroups cannot be combined with linear focusgroups. While it is obviously
possible to create linear focusgroups inside of a grid cell datastructure, and 
vice-versa (a grid as a value of a list), this proposal does not allow these different
focusgroup types to be connected automatically. Some additional scripting may be
necessary to add explicit "cell enter/exit" behavior (or just use the Tab key).

#### 6.9.2. Setting up a grid focusgroup

Two interrelated grid focusgroup definitions are necessary to properly setup a
grid. First, the grid's row elements must be identified, and then the cells 
within the row. 

This proposal provides two ways of identifying these grid parts: 
* using a focusgroup definition (applied to the appropriate parent container)
* using a focusgroup item override

The first technique will be preferable when the grid contents are uniform and
consistent (typical). It is also the only way of defining a grid focusgroup using
HTML attributes.

The second approach may be necessary when the grid structure is not uniform or 
structurally consistent (atypical), and involves identifying the specific parts 
of the grid on the specific focusgroup items.

As with linear focusgroup definitions, the child elements of the element with a
grid focusgroup definition become focusgroup candidates. A focusgroup reserved
name of `gridrows` automatically creates row focusgroup candidates on 
its children. Similarly, a focusgroup name of `gridcells` automatically creates
cell focusgroup candidates on its children.

Elements with the `gridcells` focusgroup definition must be descendants of an
element with a `gridrows` focusgroup definition (but not necessarily direct 
children of each other).

| HTML attribute value | CSS property & value | Explanation |
|----------------------|----------------------|-------------|
| focusgroup="gridrows" | focus&#8209;group&#8209;name:&nbsp;gridrows | Establishes the root of a grid focusgroup, and designates its children as `focus-group-item: row` focusgroup candidates. |
| focusgroup="gridcells" | focus&#8209;group&#8209;name:&nbsp;gridcells | Must be a descendant of a grid focusgroup root (i.e., the `gridrows` element). Designates its children as `focus-group-item: cell` focusgroup candidates. |

Example 21:
```html
<tbody focusgroup=gridrows> 
  <tr focusgroup=gridcells>…</tr> 
  <tr focusgroup=gridcells>…</tr> 
  <tr focusgroup=gridcells>…</tr> 
</tbody> 
```

The `<tbody>`'s "gridrows" focusgroup definition establishes each of its children (`<tr>`s)
as focusgroup candidate rows. The `<tr>`'s "gridcells" focusgroup definition makes each of 
its children (anticipated to be `<td>`'s) focusgroup candidate cells. Left/right 
arrow keys in this grid focusgroup will navigate between cells in the table, and 
up/down arrow keys will compute the new target based on the DOM position of the
current focusgroup candidate cell in relation to the focusgroup candidate row. 

#### 6.9.3. Implicit row and cell connections

Grid focusgroup rows and cells do not need to be direct children of the element
that includes the grid focusgroup definition (either "gridrows" or "gridcells") in
order to participate in the grid structure. Each focusgroup candidate will 
perform an ancestor search to locate its nearest grid structural component: cells
will look for their nearest row, and rows will look for their nearest grid root.

In the following example, the `<my-cell>`s are all meant to be on the same row of the
grid, and the rows are designated by `<my-row>` elements:

Example 22:
```html
<style>
   my-root { focus-group-name: gridrows; }
   my-root > div { focus-group-item: none; } /* opt-out these extra wrappers from being considered rows */
   cell-container { focus-group-name: gridcells; }
</style>
<!-- ... -->
<my-root>
  <div class="presentational_wrapper">...</div>
  <my-row>
    <first-thing>...</first-thing>
    <cell-container>
      <my-cell>...</my-cell>
      <my-cell>...</my-cell>
    </cell-container>
    <cell-container>
      <my-cell>...</my-cell>
      <my-cell>...</my-cell>
    </cell-container>
  </my-row>
  <!-- repeat pattern of div/my-row pairs... -->
</my-root>
```

Using CSS, specific row and cell focusgroup candidates can be set directly 
using the `focus-group-item` property. Reserved values of `row` and `cell`
opt-in a focusgroup candidate to that behavior. Cells cannot be children of 
other cells, and rows cannot be children of rows. `focus-group-item: none` 
can be used to disable candidate children that might otherwise prevent the 
grid focusgroup from having the proper structure.

| HTML attribute value | CSS property & value | Explanation |
|----------------------|----------------------|-------------|
| n/a | focus&#8209;group&#8209;item:&nbsp;row | Designates this element as a grid focusgroup candidate row. Must have a `gridrows` ancestor. Does not need to be focusable. All `focus-group-item: cell` candidates that are descendants of this row are considered included in this row (in DOM order). |
| n/a | focus&#8209;group&#8209;item:&nbsp;cell | Designates this element as a grid focusgroup candidate cell. Must have a `focus-group-item: row` ancestor. Must be focusable in order to be a focusgroup item. |

The grid focusgroup root (element with the `gridrows` focusgroup definition)
only operates on the focusgroup candidates of `row` and `cell` in order to 
properly navigate the grid. This implies that the grid focusgroup definition
of `gridcells` is completely optional, assuming that `focus-group-item: cell`
is manually designated in CSS:

Example 23:
```html
<style>
   [focusgroup=gridrows] > * { focus-group-item: none; }
   .row { focus-group-item: row; }
   .cell { focus-group-item: cell; }
</style>
<!-- ... -->
<div class="soup" focusgroup=gridrows>
  <div class="row">
    <div>
      <div class="cell"></div>
      <div class="cell"></div>
    </div>
  </div>
  <div>
    <div class="row">
      <div class="cell"></div>
      <div class="cell"></div>
    </div>
  </div>
  <div>
    <div>
      <div class="row">
        <div>
          <div class="cell"></div>
          <div class="cell"></div>
        </div>
      </div>
    </div>
  </div>
```

#### 6.9.4. Empty Cell data 

Like linear focusgroups, focus is only set on elements that are focusable.
The arrow key navigation algorithms look for grid focusgroup cells in the
direction the arrow was pressed. Non-focusable grid focusgroup candidate cells
are passed over in the search.

#### 6.9.5. Non-uniform cells

It is entirely possible to have rows with non-uniform numbers of cells. In these
cases, focusgroup navigation behaviors may not work as visibly desired. Algorithms
for navigating grid focusgroups will work based on content the grid content structure
as specified. If the algorithms conclude that there is not "next candidate cell" to
move to (e.g., in a grid with two rows, and the bottom row has three cells, and the
top row only two, if the focus is on the 3rd cell, a request to move "up" to the prior
row cannot be honored because there is no "3rd cell" in that row.

## 7. Privacy and Security Considerations

### 7.1. Privacy

No considerable privacy concerns are expected, but we welcome community feedback.

### 7.2. Security

No significant security concerns are expected.

## 8. Alternative Solutions

We considered various alternative solutions before arriving at the current proposal:

1. We considered a design more closely aligned with HTML's radio button groups, wherein
    to form a 'focusgroup' each participating element used a similarly-named moniker.
    The platform was expected to automatically link same-named groups together. This 
    enabled groups to be widely dispersed across the DOM. In practice few scenarios 
    require that degree of flexibility and data locality helps ensure that lists of
    items stay relatively adjacent to each other structurally. Furthermore, this approach
    provided no common "controller" element, and additional attributes were proposed to
    potentially link these groups together. Finally, this proposal suggested that the
    attribute also enable the element to get keyboard focus if it didn't already have
    it--another new way of making elements focusable wasn't deemed a great idea.
 2. In another iteration, we considered codifying the ARIA authoring practices applying
    platform behavior automatically based on the presence of certain ARIA attributes
    (such as role="tab"). This idea didn't get too far, as we ultimately felt that
    aria attributes really shouldn't have native behavior locked into them as that sets
    a bad precedent. It was also considered that aria in some fundamental ways is a
    patch on top of the native HTML engine for support that should eventually become
    a native part of the platform. That was the insight that took us in the direction 
    of building a native HTML feature to expose the built-in platform arrow-key
    navigation of certain controls.

## 9. Related Work

### 9.1. CSS Basic UI 4 Keyboard Navigation properties

[Since at least 2002](https://www.w3.org/TR/2002/WD-css3-ui-20020802/#nav-dir) the CSS WG
has defined related CSS properties `nav-up`, `nav-right`, `nav-down`, `nav-left` in 
[CSS Basic UI 4's Keyboard Control](https://drafts.csswg.org/css-ui-4/#keyboard). These 
properties are expected to provide focus navigation control similar to `focusgroup`. They 
differ in some significant ways:

* `nav-*` are defined using CSS (vs HTML). Not that HTML-without-CSS is really a modern 
    concern, but proposing focusgroup in HTML enables the user agent to setup focusgroups 
    without the CSS dependency (or behavior change should CSS application be delayed due to 
    network conditions).
* Each of `nav-up`, etc., require an explicit content selector (id) for ordering, which
    makes them relatively brittle. This design presents at least three challenges:
    
    * The possibility of mis-alignment to content. If stylesheet `nav-*` selectors are not
        updated in terms of changes to document content (at authoring time) the navigation 
        expectations can get out of sync.
    * Unexpected side-effects with responsive design. If the wrapping and reflow of 
        presentational content changes depending on device characteristics (such as orientation,
        zoom level), authors must likely provide dynamic run-time updates to `nav-*` properties 
        in order to keep top/left/bottom/right navigation logical per the current layout.
    * Related to the previous point, it can be easy to make logical errors in navigation 
        sequences when targetting specific directions. This can lead to directions that don't
        match the property names (e.g., `nav-left` actually navigates up or right) while also
        opening up the possibility of unidirectional navigation (e.g., after navigating right,
        the user can't go "back" to the left due to missing or erroneous selectors).
* Ordering is not based on content. These properties serve visual presentations, but possibly
    make focus navigation illogical for accessibility users (especially when *any* element
    can be targeted by selector).
* Verbose descriptors. To get four-direction navigation on one element requires specifying 
    four unique CSS properties.
* Special focus handling. The use of a selector on one of the `nav-*` properties has the unique
    property of making that element focusable upon keyboard navigation to it. Additional 
    clarity on how this special semantic applies would be needed for implementation. It
    is unclear (especially given the related Note in the spec) if this is a desirable 
    behavior.

In nearly 20 years, user agents have not implemented these properties. It is likely that 
`focusgroup` will create an incongruency in the platform with these `nav-*` CSS properties.
Should the two exist simultaneously, the `nav-*` properties might provide override semantics
for directional movement, and take precedence over the `focusgroup` attribute. However, we 
hope that such a conflict will not occur.

### 9.2. Spatial Navigation

Another approach to focusable navigation has been defined in
[CSS Spatial Navigation](https://drafts.csswg.org/css-nav-1/). This specification enables 
user agents to deterministically navigate focusable elements in logical directions 
(top, left, bottom, and right) according to those element's visual presentation. It assumes
that a user agent will use some undefined trigger to enter a "spatial navigation mode" in 
which the specification-defined behavior will apply. This mechanism of navigating content
can be an alternative (or addition to) traditional TAB key navigation (or equivalent) for 
a variety of devices (like TVs).

Spatial navigation occurs in the context of a "spatial navigation container" which defaults
to any scroll container (e.g., the viewport). The specification provides an API to enable
programmatic navigation, and offers several CSS properties: to enable additional spatial 
navigation containers, to control the behavior of focus and scroll actions by navigation 
keys, and to customize the algorithm used for finding the next focusable element in a given
direction.

The specification does not presume to use spatial navigation in a limited (e.g., scoped
and grouped) way as `focusgroup` implies. It appears to assume that arrow key direction
navigation will be a primary navigation technique, thus any and all focusable content 
should participate.

It may be possible for Spatial Navigation and `focusgroup` to coexist simultaneously in 
the same content. In the case that spatial navigation is only enabled via a special mode,
it would be likely that its navigation model would take precedence over `focusgroup`, as 
it is meant to make all visual, focusable content navigable, and would provide a 
super-set of navigational movement for visual content. It is worth noting that accessibility
tools would not likely enable spatial navigation mode.

It seems desirable to have a feature to easily enable spatial-navigation-like behavior 
for a subset of elements in a presentation. While this would not be ideal for an 
accessibility-view of the content, it is possible that particular spatial navigation metaphors
could be omitted by accessibility tools when performing navigation. For example, when an
AT interfaces with the user agent, the AT might limit navigation to "forward/backward" content
navigation modes, while a user not working with an AT (or ATs designed for visual navigation)
would enable the full spatial navigation model. An opt-in for spatial navigation would certainly
be a requirement and could be an extension to `focusgroup` (e.g., `focusgroup=spatial`).

## 10. Open Questions

<b id="note1">1.</b> It may not make sense to support focusgroup on every HTML element,
especially those that already have platform-provide focusgroup-like internal behavior 
(e.g., &lt;select&gt;). Then again, if the key navigation behavior is explained by the
presence of an external attribute on these elements, perhaps the internal behavior 
should defer to the external specified behavior (usage of the attribute would cancel 
the element's preexisting built-in behavior in favor of the new generic behavior).
Implementation experience and additional community feedback will be necessary to land 
a reasonable plan for this case.

### 9.1. Additional Keyboard support 

In addition to arrow keys, the focusgroup should also enable other navigation keys such as
pageup/down for paginated movement (TBD on how this could be calculated and in what 
increments), as well as the home/end keys to jump to the beginning and end of groups.

It might also be interesting to add support for typeahead scenarios (though what values to
look for when building an index would need to be worked out, and may ultimately prove to be
too complicated).

## Acknowledgments

Special thanks to those have have reviewed, commented on, filed issues, and talked with us
offline about focusgroup. Your insight and ideas and contributions have helped dramatically
improve this proposal.
