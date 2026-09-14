# Follow-up behaviors

This document develops the near-term follow-up behaviors named in the [Future work](explainer.md#future-work) section of the platform-provided behaviors for custom elements [explainer](explainer.md). This document's purpose is to provide a concrete picture of what additional behaviors look like, so the API shape, conflict-resolution model, and dynamism choices can be evaluated against a set of behaviors.

## Scope

The four candidates from the explainer's Future work section are developed in this document:

| Element behavior | Native element | Design dimension it stresses |
|----------|--------------------------|-----------------------------|
| `HTMLResetButtonBehavior` | `<button type="reset">` | Form reset behavior |
| `HTMLButtonBehavior` | `<button type="button">` with `popovertarget`/`commandfor` | Generic button behavior |
| `HTMLLabelBehavior` | `<label>` | Associative behavior (pointer to another element; delegates focus) |
| `HTMLRadioGroupBehavior` | `<input type="radio">` | Coordination behavior |

These four are the most directly attested in the [user research](explainer.md#user-research) that motivated this proposal. That section enumerates the WHATWG and WICG issues filed by web authors asking for custom elements to acquire native element behaviors, plus some design system implementations that attempt to re-create those behaviors:

- `HTMLButtonBehavior`: driven by [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) (popover invocation from custom elements).
- `HTMLResetButtonBehavior`: covered by [whatwg/html#11061](https://github.com/whatwg/html/issues/11061) (the `ElementInternals.type` proposal, which also mentions reset). The framework implementations cited in the explainer that work around the submit button gap also work around reset by manually invoking `form.reset()` on click.
- `HTMLLabelBehavior`: requested in [whatwg/html#5423](https://github.com/whatwg/html/issues/5423) and [whatwg/html#11584](https://github.com/whatwg/html/issues/11584). Both issues ask for a way for custom elements to participate in label semantics (click delegation to the labeled control, accessible-name contribution, `:has-slotted`-style scoping) without reimplementing the platform algorithm in JavaScript.
- `HTMLRadioGroupBehavior`: no single dedicated WHATWG issue, but attested in [comment in whatwg/html#11061](https://github.com/whatwg/html/issues/11061#issuecomment-3250415103), where radio buttons are explicitly called out as one of the things custom elements can't replicate today. Design systems mentioned in the explainer ship their own radio group primitives with manual mutual exclusion logic, see [Shoelace](https://github.com/shoelace-style/shoelace/blob/next/src/components/radio-group/radio-group.component.ts), [Material Web](https://github.com/material-components/material-web/blob/main/radio/internal/single-selection-controller.ts) (a dedicated `SingleSelectionController` that reimplements name-based grouping in JS), [Adobe Spectrum](https://github.com/adobe/spectrum-web-components/blob/main/1st-gen/packages/radio/src/RadioGroup.ts), and [Fluent UI](https://github.com/microsoft/fluentui/blob/master/packages/web-components/src/radio-group/radio-group.ts).

This document does not introduce new framework primitives. Lifecycle, duplicate-behavior rules, the `attachInternals({ behaviors: [...] })` shape, and feature detection all follow the framework defined in the [explainer](explainer.md#proposed-approach). Each section below describes only what is specific to that behavior.

## `HTMLResetButtonBehavior`

`HTMLResetButtonBehavior` lets a custom element participate in form reset, a capability today reserved to `<button type="reset">`:

- User activation (click, Enter, Space) reaches the behavior through the same DOM event-dispatch path as native elements, including `stopPropagation` and `preventDefault`. The behavior's activation handler runs after default-prevention checks the same way `<button>`'s does.
- The behavior provides a default implicit `role="button"`. Authors can override the role through `internals.role`.
- The custom element participates in sequential focus navigation using the same focusability logic native elements use, with `tabindex` and disabled state following the established rules.
- The same logic that toggles `:disabled`/`:enabled`, `:focus`, and `:focus-visible` on native elements applies to the behavior's host.
- Mirrored `HTMLButtonElement` properties are available on the behavior instance. They are configurable per-element and mutable for the life of the behavior.
- The form-reset algorithm is invoked when the host's activation behavior runs and the host has a form owner. Reset clears each resettable form control to its default value per [HTML §form-submission-algorithm reset](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-reset-algorithm).

`HTMLResetButtonBehavior` builds on top of [form-associated custom elements (FACEs)](https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements). The custom element still has to opt in to form association with `static formAssociated = true` for reset to actually fire. Without it, `behavior.form` is always `null` and activation is a no-op even when the element is inside a form.

| Scenario | Behavior |
|----------|----------|
| Form-associated element inside a form | Full functionality: activation invokes the form-reset algorithm on the form owner. |
| Form-associated element outside a form | `behavior.form` returns `null`, activation is a no-op (like a native reset button outside a form). |
| Non-form-associated element | `behavior.form` is `null`, activation is a no-op even inside a form. The element still gets `role="button"` and implicit focusability. |

### Accessing behavior state

`HTMLResetButtonBehavior` exposes a subset of `HTMLButtonElement`'s form-related surface.

**Properties:**
- `disabled`
- `form`: read-only, delegates to `ElementInternals.form`.
- `labels`: read-only, delegates to `ElementInternals.labels`.

Global properties (`title`, `tabIndex`, `hidden`, etc.) come from `HTMLElement` and are not duplicated on the behavior.

## `HTMLButtonBehavior` (non-submitting)

`HTMLButtonBehavior` gives a custom element the activation, focus, and invoker semantics today provided by `<button type="button">`.

- User activation (click, Enter, Space) reaches the behavior through the same DOM event-dispatch path as native elements, including `stopPropagation` and `preventDefault`.
- The behavior provides a default implicit `role="button"`. Authors can override the role through `internals.role`.
- The custom element participates in sequential focus navigation using the same focusability logic native elements use.
- The same logic that toggles `:disabled`/`:enabled`, `:focus`, and `:focus-visible` on native elements applies.
- Invoker semantics. The behavior dispatches popover and command actions through the same machinery `<button>` uses ([Popover API](https://html.spec.whatwg.org/multipage/popover.html#popover-target-attributes), [Invoker Commands](https://open-ui.org/components/invokers.explainer/)). `popoverTargetElement`, `popoverTargetAction`, `commandForElement`, and `command` are exposed on the behavior so authors can wire invocation without having to forward content attributes.
- Does not require form association.

### Accessing behavior state

`HTMLButtonBehavior` exposes the invocation surface from `HTMLButtonElement` and omits everything form-action related.

**Properties:**
- `disabled`
- `popoverTargetElement`: the element this button invokes as a popover, or `null`. Mirrors [`HTMLButtonElement.popoverTargetElement`](https://html.spec.whatwg.org/multipage/popover.html#dom-popovertargetelement).
- `popoverTargetAction`: `"toggle"`, `"show"`, or `"hide"`.
- `commandForElement`: the element this button targets with a command, or `null`. Mirrors [`HTMLButtonElement.commandForElement`](https://html.spec.whatwg.org/multipage/form-elements.html#dom-button-commandforelement).
- `command`
- `labels`: read-only, delegates to `ElementInternals.labels`.

## `HTMLLabelBehavior`

`HTMLLabelBehavior` lets a custom element act as a caption for a form control (reserved to `<label>`) associating itself with the control either by `htmlFor` or by containment, and delegating click activation to the associated control.

- Exposes `htmlFor` (a property holding an `id` reference to the labeled control) and `control` that resolves to the labeled control on demand.
- Does not provide a default ARIA role as native `<label>` has no implicit role,.
- Click activation on the host is delegated to the labeled control's activation behavior.
- The host contributes to the labeled control's accessible name through the existing accessible-name algorithm.
- The custom element isn't focusable as `<label>`s don't participate in the sequential focus order.

| Scenario | Behavior |
|----------|----------|
| `behavior.htmlFor` references an existing labelable control in the same tree | Click activation is delegated to that control and the host contributes to its accessible name. |
| `behavior.htmlFor` references nothing, or a non-labelable element | Activation is a no-op and no accessible-name contribution. `behavior.control` returns `null`. |
| `behavior.htmlFor` is unset and the host contains a labelable descendant | The descendant is the labeled control. Click delegation and accessible-name contribution apply. |
| Host is `disabled` | Activation does not delegate. The label still contributes to accessible name. |

### Accessing behavior state

**Properties:**
- `htmlFor`: DOMString. A property stored on the behavior instance; it does not reflect to or from any content attribute on the host. Authors who want declarative markup forward a host attribute to the behavior themselves (see [`for` attribute reflection on the host](#resolved-question--for-attribute-reflection-on-the-host)).
- `control`: read-only `HTMLElement?` resolving to the labeled control.
- `form`: read-only `HTMLFormElement?`. Returns the labeled control's form owner, or `null` if there is no labeled control or it has no form owner.

`behavior.htmlFor` is a property stored on the behavior instance, and the behavior never reads or writes any attribute on the host. The framework leaves the choice of content-attribute name (and whether to expose one at all) to the consuming custom element, which is free to use `for=`, `data-for=`, or no attribute at all:

```javascript
class MyLabel extends HTMLElement {
  static observedAttributes = ['for'];

  constructor() {
    super();
    this._labelBehavior = new HTMLLabelBehavior();
    this._internals = this.attachInternals({ behaviors: [this._labelBehavior] });
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'for') {
      this._labelBehavior.htmlFor = value ?? '';
    }
  }
}
```

## `HTMLRadioGroupBehavior`

`HTMLRadioGroupBehavior` lets a custom element participate in the radio-group mutual-exclusion semantics today reserved to `<input type="radio">`. Together with other elements sharing a `name` within the same form scope, the host forms a group in which exactly one member can be checked at a time.

- Exposes a mutable `checked` property and a read-only `defaultChecked` property.
- Setting `behavior.checked = true` uses the [radio button group](https://html.spec.whatwg.org/multipage/input.html#radio-button-group) algorithm to set every other member of the same group to `false`.
- Provides a default implicit `role="radio"`. Authors can override the role through `internals.role`.
- The custom element participates in sequential focus navigation using the same focusability logic native radio buttons use, including the "roving tabindex" behavior within a group.
- Arrow keys move focus and checkedness within the group.
- The same logic that toggles `:checked`, `:default`, `:indeterminate`, `:disabled`/`:enabled`, `:focus`, and `:focus-visible` on native radios applies to the behavior's host.
- Form submission contributes `name=value` to the form entry list iff the behavior is checked at submission time, matching native radio semantics.
- Constraint validation with `behavior.required = true`.

When the host is form-associated, the radio group participates in form submission, validity, and grouping by form scope.

| Scenario | Behavior |
|----------|----------|
| Form-associated element inside a form, with siblings sharing `name` | Full functionality: mutual exclusion, roving tabindex, form participation, `:default` matches the initially-checked member. |
| Form-associated element inside a form, no siblings sharing `name` | The element is its own group of size 1. Activation toggles it; constraint validation may flag it if `required`. |
| Form-associated element outside a form | The group is computed over root-scoped siblings sharing `name`. No form participation. |
| Non-form-associated element | Form behavior is inert, but `role="radio"`, focusability, mutual exclusion within root-scoped siblings sharing `name`, and arrow-key navigation still apply. `behavior.form` and `behavior.labels` return `null`. Form-control pseudo-classes (`:checked`, `:default`, `:disabled`) don't match the host because it isn't a form control. |

### Accessing behavior state

**Properties:**
- `checked`
- `defaultChecked`
- `value`
- `name`
- `required`
- `disabled`
- `form`: read-only `HTMLFormElement?`, delegates to `ElementInternals.form`.
- `labels`: read-only `NodeList`, delegates to `ElementInternals.labels`.

The writable properties (`checked`, `value`, `name`, `required`, `disabled`) are stored on the behavior instance, and the behavior never reads or writes any content attribute on the host. In particular, `behavior.name` is the only signal the behavior consults when computing group membership; the behavior does not look for a `name=` attribute on the host element. Authors who want declarative markup forward content attributes to the behavior themselves.

### Group computation scope

The set of elements that participate in the same radio button group as the host is computed per [HTML §radio-button-group](https://html.spec.whatwg.org/multipage/input.html#radio-button-group). A radio button group can mix native `<input type="radio">` elements and custom elements with `HTMLRadioGroupBehavior` that share a name and form owner. They participate in the same exclusion set. Two design points applied:

1. Cross-tree groups: A radio behavior attached to an element inside a shadow root forms a group with siblings inside the same shadow root only, not with siblings in the light tree. This matches native `<input type="radio">`. Component authors who need a group whose members span trees can use `<slot>` so the radios remain light-tree children of the outer scope, the same pattern that works for native radios.
2. `fieldset` ancestor: Native radios respect `<fieldset disabled>` for exclusion.

Consider a component whose shadow DOM contains two radios, placed next to two more radios in the light tree:

```javascript
class MyRadio extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['name', 'value'];

  constructor() {
    super();
    this._radio = new HTMLRadioGroupBehavior();
    this._internals = this.attachInternals({ behaviors: [this._radio] });
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'name') {
      this._radio.name = value ?? '';
    }
    if (name === 'value') {
      this._radio.value = value ?? '';
    }
  }
}
customElements.define('my-radio', MyRadio);

class MyFieldset extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <my-radio name="opt" value="1"></my-radio>
      <my-radio name="opt" value="2"></my-radio>
    `;
  }
}
customElements.define('my-fieldset', MyFieldset);
```

```html
<my-fieldset></my-fieldset>
<my-radio name="opt" value="3"></my-radio>
<my-radio name="opt" value="4"></my-radio>
```

Result: two independent groups, even though all four hosts share `name="opt"`:

- Inside `MyFieldset`'s shadow root: one of `{1, 2}` can be checked.
- In the light tree: one of `{3, 4}` can be checked.

A component that needs its radio children to participate in a group with surrounding light-tree radios uses `<slot>` so the children remain in the outer tree:

```javascript
class MyGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<slot></slot>`;
  }
}
customElements.define('my-group', MyGroup);
```

Using the `MyRadio` class defined above:

```html
<my-group>
  <my-radio name="opt" value="1"></my-radio>
  <my-radio name="opt" value="2"></my-radio>
</my-group>
<my-radio name="opt" value="3"></my-radio>
```

Result: a single group spanning all three hosts. Slotted children stay in the light tree, so they share a tree (and therefore a group) with their surrounding siblings — at most one of `{1, 2, 3}` can be checked.

## Composition across follow-up behaviors

The explainer's [Behavior composition and conflict resolution](explainer.md#behavior-composition-and-conflict-resolution) section establishes that combining the built-in behaviors is allowed, conflicts on single-valued properties are resolved last-in-wins, and default actions stack additively. The examples below show how that policy lands on the four follow-up behaviors.

### Combining button-family behaviors

Two shapes for achieving the composition of all the button behavior types are for discussion: the main proposal's [design system button use case](explainer.md#use-case-design-system-button) (one class, one `type` content attribute, the appropriate behavior attached at connection time via delayed `attachInternals()`), and the [`HTMLButtonBehavior` with `type` attribute alternative](htmlbuttonbehavior-with-type-attribute.md) (a single behavior carrying a mutable `type` property that routes its default action accordingly).

### Combining `HTMLLabelBehavior` with a button-family behavior

The main explainer's [`LabeledSubmitButton`](explainer.md#behavior-composition-and-conflict-resolution) example demonstrates this case end to end. It generalizes directly to the other button-family behaviors.

### Combining `HTMLRadioGroupBehavior` with other follow-up behaviors

Attaching `HTMLRadioGroupBehavior` together with any button-family or label behavior is allowed by the framework's duplicate rule but is semantically incoherent.

### Composing with developer-defined behaviors

Developer-defined behaviors, sketched in the [developer-defined behaviors follow-on](developer-defined-behaviors.md), can be composition partners for the follow-up behaviors in this document.

**`HTMLSubmitButtonBehavior` + `ConfirmActionBehavior`**
A submit button that asks for confirmation first:

```javascript
class ConfirmActionBehavior extends ElementBehavior {
  #message = '';
  #internals = null;

  behaviorAttachedCallback(internals) {
    this.#internals = internals;
    this.element.addEventListener('click', this.#handleClick);
  }

  #handleClick = (event) => {
    if (event[ConfirmActionBehavior.confirmed]) {
      return;
    }
    event.preventDefault();
    if (window.confirm(this.#message)) {
      const replay = new MouseEvent('click', { bubbles: true, cancelable: true });
      replay[ConfirmActionBehavior.confirmed] = true;
      this.element.dispatchEvent(replay);
    }
  };

  static confirmed = Symbol('ConfirmActionBehavior.confirmed');

  get message() { return this.#message; }
  set message(value) { this.#message = value; }
}

class ConfirmSubmit extends HTMLElement {
  static formAssociated = true;
  constructor() {
    super();
    this._submitBehavior = new HTMLSubmitButtonBehavior();
    this._confirmBehavior = new ConfirmActionBehavior();
    this._confirmBehavior.message = 'Submit this form?';
    this._internals = this.attachInternals({
      behaviors: [this._confirmBehavior, this._submitBehavior],
    });
  }
}
customElements.define('confirm-submit', ConfirmSubmit);
```

The platform behavior contributes form ownership, `role="button"`, Enter-key activation, implicit submission, and the actual form submission default action. The developer-defined behavior contributes only the confirmation gate.

**`HTMLButtonBehavior` + `TelemetryBehavior`**
A generic action button that logs activations to analytics:

```javascript
class TelemetryBehavior extends ElementBehavior {
  #event = '';

  behaviorAttachedCallback(internals) {
    this.element.addEventListener('click', this.#handleClick);
  }

  #handleClick = () => {
    navigator.sendBeacon('/telemetry', JSON.stringify({ event: this.#event }));
  };

  get event() { return this.#event; }
  set event(value) { this.#event = value; }
}

class TrackedButton extends HTMLElement {
  constructor() {
    super();
    this._buttonBehavior = new HTMLButtonBehavior();
    this._telemetryBehavior = new TelemetryBehavior();
    this._telemetryBehavior.event = this.getAttribute('event') ?? 'click';
    this._internals = this.attachInternals({
      behaviors: [this._buttonBehavior, this._telemetryBehavior],
    });
  }
}
customElements.define('tracked-button', TrackedButton);
```

**`HTMLLabelBehavior` + `FloatingLabelBehavior`**
Material-style floating label that animates based on the labeled control's focus and value state:

```javascript
class FloatingLabelBehavior extends ElementBehavior {
  #labelBehavior = null;

  constructor(labelBehavior) {
    super();
    this.#labelBehavior = labelBehavior;
  }

  behaviorAttachedCallback(internals) {
    queueMicrotask(() => {
      const control = this.#labelBehavior.control;
      if (!control) {
        return;
      }
      control.addEventListener('focus', this.#update);
      control.addEventListener('blur', this.#update);
      control.addEventListener('input', this.#update);
      this.#update();
    });
  }

  #update = () => {
    const control = this.#labelBehavior.control;
    const floated =
      control && (document.activeElement === control || control.value !== '');
    this.element.classList.toggle('floating', !!floated);
  };
}

class FloatingLabel extends HTMLElement {
  constructor() {
    super();
    this._labelBehavior = new HTMLLabelBehavior();
    this._floatBehavior = new FloatingLabelBehavior(this._labelBehavior);
    this._internals = this.attachInternals({
      behaviors: [this._labelBehavior, this._floatBehavior],
    });
  }
}
customElements.define('floating-label', FloatingLabel);
```

The platform behavior contributes click delegation, accessible-name contribution, and the labeled-control cross-reference (which the animation behavior reads through `labelBehavior.control`).

**`HTMLRadioGroupBehavior` + `HoverPreviewBehavior`**
A star-rating custom element where the platform handles single-selection within the group, the `role="radio"` ARIA exposure, arrow-key navigation, and roving tabindex, and the author behavior adds non-committal hover preview that never reaches the radio selection default action:

```javascript
class HoverPreviewBehavior extends ElementBehavior {
  behaviorAttachedCallback(internals) {
    this.element.addEventListener('pointerenter', this.#preview);
    this.element.addEventListener('pointerleave', this.#clear);
  }

  #preview = () => {
    const name = this.element.getAttribute('name');
    if (!name) {
      return;
    }
    const root = this.element.getRootNode();
    const peers = root.querySelectorAll(`[name="${name}"]`);
    const index = Array.from(peers).indexOf(this.element);
    for (let i = 0; i < peers.length; i++) {
      peers[i].classList.toggle('previewed', i <= index);
    }
  };

  #clear = () => {
    const name = this.element.getAttribute('name');
    if (!name) {
      return;
    }
    const root = this.element.getRootNode();
    for (const peer of root.querySelectorAll(`[name="${name}"]`)) {
      peer.classList.remove('previewed');
    }
  };
}

class RatingStar extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this._radioBehavior = new HTMLRadioGroupBehavior();
    this._previewBehavior = new HoverPreviewBehavior();
    this._internals = this.attachInternals({
      behaviors: [this._radioBehavior, this._previewBehavior],
    });
  }
}
customElements.define('rating-star', RatingStar);
```