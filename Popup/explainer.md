# Enabling Popups

Authors:

* [Ionel Popescu](https://github.com/ipopescu93) (Microsoft)
* [Melanie Richards](https://github.com/melanierichards) (Microsoft)
* [Dan Clark](https://github.com/dandclark) (Microsoft)
* [Bo Cupp](https://github.com/BoCupp) (Microsoft)
* [Mason Freed](https://github.com/mfreed7) (Google)
* [Yu Han](https://github.com/yuzhe-han) (Google)
* [Joey Arhar](https://github.com/josepharhar) (Google)
* [Greg Whitworth](https://github.com/gregwhitworth) (Salesforce)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **`ARCHIVED`**
* Current venue: [Open UI Community Group](https://www.w3.org/community/open-ui/)
* Current version: [Enabling popups](https://open-ui.org/components/popup.research.explainer)

## Introduction
When building a web application, there are many cases in which an author needs to create transient user interface (UI) elements that are displayed on top of all other web app UI. These include user-interactive elements like action menus, form element suggestions, content pickers, and teaching UI. These paradigms will be collectively referred to as *popups*.

![A popup menu displayed beneath a menu button; an explanatory popup with links pointing to a random button; and the popup portion of a select element](use-cases.png)

_Examples of popups may include action menus, teaching UI, or the listbox portion of a `<select>` control_

For many such use cases, it is incumbent upon the author to handle the popup’s styling, positioning and z-index stacking, focus management, keyboard interactions, and accessibility semantics. Because no platform-native solutions exist to comfortably handle all these use cases, individual authors and framework developers must continuously re-write the same classes of controls. This results in duplicative work for the web development community, and inconsistent experiences for users of these web applications.

The web platform can be extended such that authors can get popup interactions and styling “for free”, but have enough flexibility to support their individual use cases.

## Goals
Authors can efficiently create popups which:

* Can contain arbitrary content
* Can be fully styled, including properties which require compositing with other layers of the host web application (e.g. the `box-shadow` or `backdrop-filter` CSS properties)
* Can be sized and positioned to the author’s discretion
* Are rendered on top of all other content in the host web application
* Include an appropriate user input management experience “out of the box”, with flexibility to modify behaviors such as initial focus
* Are accessible by default, with the ability to further extend semantics/behaviors as needed for the author’s specific use case

## Non-Goals

### Addressing all top-layer UI elements
There are many different types of elements that are meant to be displayed in the top layer of a web application, but not all may be popups. We propose that all popups share “[light dismiss](#light-dismiss)” behaviors. Other elements which are aesthetically similar to popups, but do not light dismiss, may be better addressed with the `<dialog>` element or other new purpose-built elements. Such examples include: alerts, toasts, custom tooltips, and miscellaneous, persistent popover UI.

## Proposed Solution
We propose a new HTML element called `popup`. This new element can be used for any transient UI that “pops up” over all other web app UI. A `popup` may be its own standalone element (such as a teaching bubble) or it may be part of a larger composited component (such as a combobox).

`popup` will include:

* A few options to invoke/show the `popup`:
  * A `popup` attribute, applied to whichever elements should invoke a given popup (if applicable).
  * An optional `open` attribute, applied to the `popup` to express that it should be shown.
  * A `show()` JavaScript method, for invoking the `popup`.
* When visible, a default set of behaviors as well as a default positioning scheme.
* Logic for an optional `autofocus` attribute which enables moving focus to the `popup` or to a descendent.
* An optional `delegatesfocus` attribute, for passing focus to descendants.
* An optional `anchor` attribute, which both relates the `popup` to an activating element and can be used in a separately-proposed, CSS-based anchor positioning scheme.
* A couple means to dismiss the `popup`:
  * Behaviors tied to the aforementioned `popup` attribute.
  * Removing the `open` attribute from `popup`.
  * A `hide()` method for hiding the `popup`.
  * [Light dismiss](#light-dismiss) behaviors.

### Showing Popups

#### Option A: the `popup` attribute

One use case for a `popup` is a popup menu triggered by a menu button:

![A popup menu displayed beneath a button that says "menu". The popup obscures other text on the page.](menu.png)

An author could produce this popup menu using the following markup:

```html
<button id="menuButton" popup="menuPopup">Menu</button>
<popup id="menuPopup" role="menu" anchor="menuButton">
    <!-- Markup for menuitems goes here -->
</popup>
```

The `popup` attribute on the `button` element (referred to later in this document as the “invoking element”) takes an IDREF pointing to the relevant popup. Invoking this button will likewise invoke the popup with the matching ID.

This `popup` attribute will apply accessibility semantics equivalent to `aria-haspopup="true"` and `aria-controls="menuPopup"` on the button (as well as a “controlled by” reverse relationship mapping on the `popup` itself). This attribute is valid only on a subset of interactive elements:

* `button` or `input` in the button state (`input type="button"`). Invoking one of these elements will show the relevant popup.
* `input` in the `text`, `email`, `phone`, or `url` states. Setting focus in one of these elements will show the relevant popup. Note: we may need to explore means of suppressing this invocation on focus, for instances where the author instead wishes to show the `popup` based on text-entry logic.

#### Option B: the `open` attribute

![An explanatory popup with links pointing to a button](teaching-bubble.png)

Some popups, such as teaching UI, might be shown to the user upon initial “page load”. For popups which aren’t shown as the result of a user interaction or JavaScript-controlled logic, apply the `open` attribute to show the `popup`:

```html
<popup open>
  <p><strong>New!</strong> I’m some sort of educational UI…</p>
  …
</popup>
```

#### Option C: the `show()` method

Suppose that an author instead wants to show their teaching UI upon some app-internal logic. Such an author could instead call `show()` on the `popup` from script:

```javascript
if (upsellNewFeature) {
  document.getElementById('newFeatureUI').show();
}
```

#### What happens when a popup is shown

Until the author has used the `popup` attribute, `open` attribute, or `show()` method, the `popup` does not display (has a computed value of `none` for its `display` property). Showing a popup places the `popup` into a browser-managed stack of top-layer elements that allow the `popup` to produce a box in accordance with author-supplied styles. Initial styles from the user agent stylesheet consist of: 

```css
popup {
    display: block;
    position: fixed; 
    top: 0; 
    left: 0;
}
```

Only one “top-level” `popup` may be displayed at a time. When a `popup` is shown and placed on the stack, it will remove all `popup`s from the stack until it encounters an “ancestral” `popup`, or the list is empty. In this way, the user agent will ensure that only one `popup` and its child `popup`s are ever displayed at a time—even across uncoordinated code.

The following would be considered an “ancestral” `popup`:

* A `popup` ancestor of the new `popup`’s invoking element (based on the `popup` attribute)
* A `popup` ancestor of the new `popup`’s anchoring element (based on the `anchor` attribute)
* A `popup` ancestor of the new `popup` itself

Other events also remove a `popup` from the stack, including loss of focus, or hitting `ESC` (often referred to as [light dimiss](#light-dismiss) behaviors). Interactions with other elements like `dialog`, or other future types of popup-like elements, for example, showing a menu, must also remove the `popup`s from the top-layer stack. [Dismissing a `popup`](#dismissing-the-popup) will also remove any child `popup`s from the stack.

`popup`s in the stack are laid out and rendered from the bottom of the stack to the top. Each `popup` will paint atomically as its own stacking context.

Showing a `popup` via options A (`popup` attribute) or C (calling the `show()`) method will also cause the `open` attribute to be set on the `popup`.

### `autofocus` logic

By default, focus remains on the current active element when the `popup` is invoked.  If this element is somehow destroyed, focus moves to a focusable ancestral element.

`popup` is inherently focusable, but is not reachable by sequential keyboard navigation by default (equivalent to `tabindex=-1`).  Authors can explicitly move focus to the `popup` by calling `focus()`, or implicitly to the `popup` or one of its descendants  using the `autofocus` attribute.

To move focus to the `popup` itself when `show` is called—without the need to explicitly call `popupElement.focus()`—place the attribute directly on the `popup`:

```html
<popup autofocus>...</popup>
```

To move focus to a descendent upon invocation, place the attribute on that descendent:

```html
<popup>
    <button autofocus>My cool button</button>
</popup>
```

These `autofocus` rules will be processed each time `show` is called, as opposed to initial document load.

### `delegatesfocus`

Some authors may need to automatically focus the popup’s first focusable descendent, and may not wish to write script to determine at runtime which element that is. In such cases  the  `delegatesfocus` attribute can be applied to the popup:

```html
<popup delegatesfocus>
    <p>I am not a focusable element.</p>
    <p>Nor am I.</p>
    <button>I will be focused whenever the popup becomes focused.</button>
</popup>
```

In the markup above, the `button` element will receive focus any time the `popup` would normally receive focus. For, example when `popupElement.focus()` is called.

### Anchoring

`popup` supports an `anchor` attribute which takes an ID reference to another element in the `popup`’s owner document. The `anchor` attribute is significant in that:

1. It enables a hierarchical relationship to be established between the `popup` and its anchor element separate from the DOM hierarchy. The hierarchy determines if a `popup` is a descendant of another `popup`. A descendant `popup` does not dismiss its ancestor `popup`s when shown.
2. It is also used with anchored positioning.

#### Anchored positioning

By default, `popup` has a fixed position in the top-left corner of the viewport. With many popup use cases, however, authors need to be able to pin the position of one element to another element in the document; this is the case with our popup menu. Absolute positioning schemes sometimes suffice for this purpose, but require specific DOM structures and provide no functionality for repositioning.

We will soon make an additional proposal for a CSS anchored positioning scheme, which can be applied to `popup` and other top-layer, interactive elements. For now, it is worth noting that a `popup`’s anchor element (the element it will be “pinned” to) can be expressed using a new `anchor` attribute on the popup:

```html
<button id="myButton">Anchor element</button>
<popup open anchor="myButton">
  <p><strong>New!</strong> I’m some sort of educational UI…</p>
  …
</popup>
```

Note: for many `popup`s, the element which invokes the `popup` and the element the `popup` is anchored to will be one and the same. However, there are cases where the author may want to anchor to a child/parent of the element which invoked the popup. Similiarly, there are cases (such as this teaching UI example) where no such invoking element exists. Therefore, we do not propose collapsing invocation and anchoring responsibilities to one attribute, as they are distinct responsibilities. In cases where the `anchor` attribute is unset, but there is an associated invoking element, we could explore treating this as the anchor element. There would be complexities to think through if more than one element is associated to a `popup` via the `popup` attribute, or if the `anchor` association causes reordering of trees (refer to [Open Questions](#open-questions)).

### Dismissing the `popup`

#### Removing the `open` attribute

Recall that authors can apply the `open` attribute in order to show the `popup`:

```html
<popup open>
  <p><strong>New!</strong> I’m some sort of educational UI…</p>
  …
</popup>
```

Removing the attribute will dismiss the `popup`.

All other following methods of dismissing the `popup` will automatically remove the `open` attribute from the `popup`.

#### The `popup` attribute

When the `popup` was shown as a result of user interaction on an element with the `popup` attribute…

```html
<button id="menuButton" popup="menuPopup">Menu</button>
<popup id="menuPopup" role="menu" anchor="menuButton">
    <!-- Markup for menuitems goes here -->
</popup>
```

…repeating/reversing that action will dismiss the popup. In this example, invoking the `button` again when the `popup` is visible will hide the `popup`. Moving focus from `input type="text"` (so long as focus does not then move to the `popup`) will hide an associated `popup`.

#### The `hide()` method

A `popup` can be hidden by calling the `hide()` method:

```javascript
// Author calls hide() according to some app logic, such as choosing a menu item
document.getElementById('menuPopup').hide();
```

#### Light dismiss

The `popup` may also be implicitly dismissed due to user interactions which trigger [light dismissal](#light-dismiss). When dismissal occurs:

* The `popup` is removed from the browser-managed, top-layer stack so that it is no longer rendered.
* A non-cancellable `hide` event is fired on the `popup` when the `popup` is hidden in response to [light dismissal](#light-dismiss).

An opened `popup` will have “light dismiss” behavior, meaning that it will be automatically hidden when:

* The user hits the escape key,
* The layout of the `popup` or its anchor element is changed.
* Focus moves outside of the `popup` (_and_ its invoking and anchor elements, if applicable).

A generalized definition of “light dismiss” is being developed at
[Open UI](https://open-ui.org/components/select#light-dismiss).

### Applicability to the `select` control

While some `popup`s may be entire components in and of themselves, other `popup`s may be a part of a larger whole. For example, the native `select` element includes a `popup` (sometimes rendered as a wheel) to present `option`s to the user:

![A select control displaying an open listbox with 3 options](select-popup.png)

Per [“Enabling Custom Control UI”](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ControlUICustomization/explainer.md), authors should be able to customize parts of a native control, including the `select` `popup`. While we anticipate discussing the anatomy of a `select` in depth in the [Open UI venue](https://open-ui.org/components/select), any solution for providing arbitrary `popup`s will also be applied to the `select`’s Shadow DOM.

For example, `popup` may be used in the `select` Shadow DOM like so:

```html
<template>
    <slot name="entire">
        <slot name="button-wrap">
            <div part="button">
                <slot name="selected-value-wrap">
                    <div part="selected-value"></div>
                </slot>
            </div>
        </slot>
        <slot name="listbox-wrap">
            <popup part="listbox">
                <slot><!-- All the options will end up in this unnamed slot if none of the parent slots are replaced by authors --></slot>
            </popup>
        </slot>
    </slot>
</template>
```

If it fits their use case, an author could then entirely replace this listbox with their own `popup` in markup:

```html
<select>
    <div slot="button-container" part="button" style="display: flex;">
        <div part="selected-value-wrap">Option One</div>
        <svg>... arrow down svg ..</svg>
    </div>
    <popup class="my-custom-listbox" slot="listbox-wrap" part="listbox">
        <!-- Contents of the select popup -->
        <option>Option One</option>
        <option>Option Two</option>
        <details>
            <summary>Show more options</summary>
            <option>Option Three</option>
            <option>Option Four</option>
        </details>
    </popup>
</select>
```

## Privacy and Security Considerations

Freedom over the size and position of a `popup` could enable an author to spoof UI belonging to the browser or documents other than the `popup`’s document. For this reason the `popup` will be constrained as all other elements of the relevant document are, by clipping the element to the document's layout viewport.

## Alternate Solutions Considered

* **Extending the `dialog` element** with `popup`-specific methods and new options. This option wasn't pursued because it would result in a “mashed-up” API surface and collection of behaviors that seem better separate than together. Here are some examples of the semantic differences between the two elements to illustrate the point: 
    * `popup`s have lightweight UI that dismises automatically when the user interacts with other UI, or when a task is completed within the `popup` (such as selecting an option).  
    * `dialogs` are more persistent and are generally dismissed explicitly by the user.
    * Only one `popup` can be shown at a time.
    * More than one `dialog` can be presented at a time.  
    * `dialog` can be modal, such that user interaction with other UX elements is prevented.
    * A `dialog` will dismiss a `popup` when shown but the converse isn’t true.
* **Introducing a `type` attribute for `popup`**, which would provide a set of default styles, user input behaviors, and accessibility semantics for various classes of popups. However, with the availability of the proposed HTML attributes and CSS property values, this approach did not provide much added authoring value past platform-managed accessibility semantics to the parent popup. Because this approach did not provide accessibility semantics or input behaviors for popup descendents, the authoring story was unclear in cases where the type of popup (e.g. `type="menu"`) must contain particular *descendents* whose semantics could only be managed through ARIA (`role="menuitem"`) unless a new mechanism was proposed.	

## Open questions

1. **Collision with CSS contain.** It’s worth noting that using the [`contain` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) on an ancestor of `popup` will prevent `popup` from being positioned and painted correctly. How common is this use case? How might the platform resolve this unintentional effect?

2. **Could we require popups to use the DOM hierarchy for event propagation and establishing hierarchical popup relationships?** Elements used for popup UI today are frequently appended to the end of the DOM to ensure they appear on top of other UI. With the new capabilities of the `popup` element, that isn't necessary, yet we still assume in this proposal that DOM positioning of the `popup` needs to be separate from the anchor. One reason why that might still be needed is for anchor elements that can't accept a `popup` descendant, for example, image or input elements or custom-elements that expect a particular content model. Eliminating this requirement would also eliminate the complexity to modify the event propagation path based on the anchor attribute, and would make hierarchical relationships between popups clear just by observing the DOM hierarchy.

3. **Should one of the attributes hoist up a `popup` in trees (e.g. accessibility trees)?** Today, it is common practice to include popup UI as a direct child of the root node. This practice is a workaround for top-layer positioning issues, and it is our hope that this proposal renders this practice obsolete. However, there might still be cases where an author includes a `popup` in a separate point in the DOM to its anchor/invoking element(s). We may want to explore reordering trees such that `popup` is moved into the proper context. Should the `popup` attribute and/or `anchor` attribute cause this reordering? What happens if both these attributes are present but refer to different elements? What happens if multiple `popup` attributes refer to the same `popup` element?

4. **Show/hide or show/close?** This proposal introduces a symmetrical `show`/`hide` method pair on the proposed `popup` element. `dialog`, however, sets a precedent for a `show` and `close` method pairing. That seemed less intuitive, but perhaps the existing pattern should be followed. Alternatively, the platform could introduce `hide` on `dialog` and consider `close` deprecated.

## Areas for exploration

* **Focus trapping:** the [`inert` attribute](https://whatpr.org/html/4288/interaction.html#the-inert-attribute) enables authors to mark portions of a document as inert, such that user input events are ignored. Inverting this model, new primitives could enable focus trapping with parts of a document, e.g. a `popup`. New focus trapping primitives could be useful in cases where the tab cycle should be constrained to the `popup`, but the rest of the document would receive other types of user input.

* **Animating state transitions:** applying animations and transitions to interactive elements’ show/hide states can be difficult. For example, to apply a CSS transition the element must first produce an initial box before its properties can be transitioned to new values. That requires a two step process to first show the element, and in a subsequent frame, initiate a transition by applying a class. Likewise, since the browser manages the visibility of the popup for light dismiss behaviors, it is impossible to apply a close animation. To address this issue perhaps the answer is to invent a new CSS animation primitive that is triggered when an element stops producing a box.

## Appendix

### The `hidden` attribute

This proposal specifies that, similarly to the `dialog` element, the `open` attribute can be used to show a `popup`. Currently, authors are advised to add a `hidden` attribute to `dialog` when hiding it, as there are [some quirks with removing the `open` attribute](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element). Rather than porting over this behavior to `popup`, it would be ideal to [adjust the behavior on `dialog`](https://github.com/whatwg/html/issues/5802). As a result and to provide simpler authoring, we are proposing that authors solely remove/add the `open` attribute in order to toggle visibility of a `popup`, as opposed to introducing the `hidden` attribute to this new element.

### Anchoring and event bubbling

In a previous version of this document, we proposed that the hierarchy created by the `anchor` attribute relationship affects the event propagation path. With the introduction of a separate `popup` attribute which creates an invocation relationship, it is less clear whether event bubbling should be changed as a result of the `popup` attribute and/or the `anchor` attribute.

This behavior as previously proposed adds complexity to the platform, and it is not clear whether there is enough value to authors for the platform to take on that complexity. We welcome feedback on this point and preserve the previous proposal here.

#### Example of event bubbling

In the markup below, a table with many rows is rendered, each of which displays a custom popup filled with commands when right-clicked. The popup is defined once and its anchor attribute is adjusted so that it is shown aligned with the table row when the contextmenu event is received.

After a command is selected from the menu, the menu dispatches a custom command event which is then handled by the table row.  The table row receives the event even though it isn’t a DOM ancester of the popup. This is because the event target parent of a popup is its anchor element.

```html
<table id="work-table">
    <tr data-type="task">...</tr>
    <tr data-type="bug">...</tr>
    <tr data-type="task">...</tr>
    ...
</table>
<popup id="bug-commands">
    <button id="command1" onclick="dispatchCommandEvent(event)">command 1</button>
    <button id="command2" onclick="dispatchCommandEvent(event)">command 2</button>
    ...
</popup>
<script type="module">
    class CommandEvent extends CustomEvent {
        constructor(name) {
            super("command", { detail: name })
        }
    }

    function dispatchCommandEvent(e) {
        e.stopPropagation()
        e.currentTarget.dispatchEvent(new CommandEvent(e.currentTarget.id))
    }

    let bugCommands = document.querySelector("#bug-commands")
    let bugs = document.querySelectorAll("[data-type=bug]")
    for (let bug of bugs) {
        bug.addEventListener("command", handleBugCommand)
        bug.addEventListener("contextmenu", showBugCommands)
    }

    function handleBugCommand(e) {
        ...
    }

    function showBugCommands(e) {
        bugCommands.anchor = e.currentTarget
        bugCommands.show()

        e.preventDefault()
    }
</script>
```

Note: if event bubbling remains unchanged by the `anchor` attribute, authors in this case would need to query for the `popup`’s anchor element and dispatch the event from that element. So, `e.currentTarget.dispatchEvent(new CommandEvent(e.currentTarget.id))` becomes `bugCommands.anchor.dispatchEvent(new CommandEvent(e.currentTarget.id))`.