# Alternative: HTMLButtonBehavior with internal type attribute

This document explores an alternative direction for [platform-provided behaviors](explainer.md). This alternative differs in two ways:

1. It collapses the three button modes into a single `HTMLButtonBehavior` whose `type` property mirrors the `type` attribute of native `<button>`. The behavior's `type` toggles which button mode the host participates in. Everything else (focusability, role, pseudo-classes, the activation path) is constant across types.
2. It declares behaviors via a `static behaviors` class property, letting the platform own behavior instantiation. Authors access the platform-created instances through a new `behaviors` collection on `ElementInternals`.

Four things motivate this alternative:

1. Modeling the button types as three separate behaviors duplicates most of the surface to express activation differences.
2. Web authors who want a single custom element class that can switch between submit, reset, and generic-button at runtime want one element with one mutable property. A single `HTMLButtonBehavior` with a mutable `type` avoids having to define what happens when two button-shaped behaviors are attached at once and one is toggled off.
3. It matches native `<button>` and frameworks also use this shape.
4. The platform owns instantiation; authors look up state through `ElementInternals`.

The composition rules in this alternative are the same as the main proposal: multiple behaviors of different shapes can be attached together, and behavior composition and conflict resolution defines how they interact.

## Proposed approach

A platform-provided behavior is a set of methods, values, and platform-protocol hooks that a custom element can participate in, which today are reserved to native HTML elements. This alternative introduces a `behaviors` static class property that declares which behaviors the platform attaches to instances of the class.

The platform reads `static behaviors` at `customElements.define()` time and stores it on the custom element definition, the same way it reads `static formAssociated`. When an element is created (`new`, parser upgrade, or `customElements.upgrade()`), the platform instantiates one of each declared behavior per host and associates them with the element. This mirrors how a form-associated custom element participates in form submission and form-related lifecycle callbacks.

`attachInternals()` is the author's access route to those already-existing instances, exposed through a new `behaviors` collection on `ElementInternals`. The set of behaviors attached to a host is fixed at the class declaration; the behavior instances themselves remain mutable post-attach.

```javascript
class CustomButton extends HTMLElement {
  static formAssociated = true;
  // Declare which behaviors the platform attaches to each instance.
  static behaviors = [HTMLButtonBehavior];

  #internals;
  constructor() {
    super();
    // attachInternals() is the access route to the platform-created behaviors.
    this.#internals = this.attachInternals();

    // Access the behavior state directly.
    const buttonBehavior = this.#internals.behaviors.get(HTMLButtonBehavior);

    // Modify the behavior's properties.
    buttonBehavior.formAction = '/custom';
    buttonBehavior.type = 'reset';
  }
}
```

In this model authors never construct behaviors. `new HTMLButtonBehavior()` throws an `"Illegal constructor"` `TypeError`, the same as other platform-owned objects such as `ElementInternals`, because a free-standing instance would have no host to act on. The instance is obtained only through `internals.behaviors.get(HTMLButtonBehavior)` after `attachInternals()`.

Each behavior names the specific platform logic it engages:

- Event handling and activation
- ARIA defaults (implicit role and ARIA properties)
- Focusability
- CSS pseudo-classes
- Configurable data and state owned by the behavior
- Platform protocol hooks

### HTMLButtonBehavior

This alternative introduces `HTMLButtonBehavior`, which mirrors native `<button>`.

- The behavior has a `type` property (`'submit'` (default), `'reset'`, or `'button'`) that selects the active button mode. The `type` is mutable for the life of the behavior.
- User activation (click, Enter, Space, implicit submission) reaches the behavior through the same DOM event-dispatch path as native elements.
- The behavior provides a default implicit `role="button"`. Authors can override the role through `internals.role`.
- The custom element with HTMLButtonBehavior participates in sequential focus navigation, with `tabindex` and disabled state following established rules.
- The same logic that toggles `:default`, `:disabled`/`:enabled`, `:focus`, and `:focus-visible` on native elements applies to the behavior's host. The `:default` pseudo-class only matches when `type === 'submit'` and the host is the form's default submit button.
- Mirrored `HTMLButtonElement` properties are available on the behavior instance. They are configurable per-element and mutable for the life of the behavior.
- Form ownership applies whenever `type` is `'submit'` or `'reset'`. Activation behavior depends on `type`: `'submit'` triggers form submission and implicit submission; `'reset'` triggers form reset; `'button'` does generic activation.

`HTMLButtonBehavior` builds on top of [form-associated custom elements (FACEs)](https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements). The custom element still has to opt in to form association with `static formAssociated = true` for submission to actually fire when `type` is `'submit'` or `'reset'`. Without it, `behavior.form` is always `null` and activation is a no-op even when the element is inside a form. This is a divergence from native `<button>`, which submits its form without any explicit opt-in.

| Scenario | Behavior |
|----------|----------|
| Form-associated element inside a form, `type === 'submit'` | Activation triggers submission, participates in implicit submission, matches `:default`. Invoker attributes on the host (`commandfor`, `popovertarget`) are ignored, matching native `<button type="submit">`. |
| Form-associated element inside a form, `type === 'reset'` | Activation triggers form reset. Invoker attributes on the host are ignored, matching native `<button type="reset">`. |
| Form-associated element inside a form, `type === 'button'` | Activation is a no-op for form behavior. Invoker attributes on the host (`commandfor`, `popovertarget`) fire as usual. |
| Form-associated element outside a form, or non-form-associated element | `behavior.form` is `null`. With no form owner, the host behaves like a native `<button>` without a form owner for all `type` values: there is no form to submit or reset, but invoker attributes on the host (`commandfor`, `popovertarget`) fire as usual and the element still gets `role="button"` and implicit focusability. |

### Behaviors are not opaque tokens

A recurring concern about consolidating form-control semantics into an opt-in is that web authors will not be able to figure out what a given opt-in actually does. This proposal addresses that concern:

- Each element behavior maps to a single native pattern (e.g., `HTMLButtonBehavior` provides exactly the semantics of `<button>`). Future element behaviors will need to follow the same naming convention.
- Each behavior is specified in terms of existing HTML algorithms. The behavior is the union of those algorithms, applied to a custom element.
- Web authors can override individual defaults. This already works today for role: `internals.role` overrides a behavior's default role without replacing the behavior. The same layering pattern can extend to other defaults (focusability, keyboard activation, and similar) if and when future proposals add the corresponding primitives on `ElementInternals`. The [layering example in Alternative 7](#explainer.md#alternative-7-low-level-primitives-on-elementinternals) walks through what that would look like.

### Accessing behavior state

Each behavior exposes properties and methods from its corresponding native element. Behaviors can be accessed via `internals.behaviors`. For `HTMLButtonBehavior`, the following properties are available (mirroring [`HTMLButtonElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLButtonElement)):

**Properties:**
- `type` - selects the active button mode (`'submit'`, `'reset'`, or `'button'`); defaults to `'submit'`.
- `disabled` - The element is effectively disabled if either `behavior.disabled` is `true` or the element is disabled via attribute or is a descendant of `<fieldset disabled>` ([spec](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-disabled)).
- `form` - read-only, delegates to `ElementInternals.form`. Form ownership only affects activation when `type` is `'submit'` or `'reset'`.
- `name`, `value` - submitter name and value. Read on submission (`type === 'submit'`).
- `formAction`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget` - submission overrides. Read on submission (`type === 'submit'`).
- `labels` - read-only, delegates to `ElementInternals.labels`.

*Note: `HTMLButtonElement` adds the properties listed above on top of `HTMLElement`. Custom elements already inherit the global `HTMLElement` IDL surface (`title`, `tabIndex`, `hidden`, etc.). Web authors can use these properties on the host as they would on any element.*

To expose these properties to external code, authors define getters and setters on the host that delegate to the behavior. See [Use case: Design system button](#use-case-design-system-button) for a complete worked example.

### Behavior lifecycle

| Event | What happens |
|-------|--------------|
| Element creation (`new`, parser upgrade, or `customElements.upgrade()`) | The platform instantiates each declared behavior with its defined defaults. The behavior's `type` selects the initial active button mode (`'submit'` by default). Role, focusability, and pseudo-class participation are active from this point. |
| `attachInternals()` | `internals.behaviors` is populated with the already-existing behavior instances. Authors now have read/write access through `internals.behaviors.get(ElementBehavior)`. |
| Host connected | Form association runs if `formAssociated = true`. The behavior's `form` is resolved. |
| `behavior.type` set to a new value | Form ownership, role, focusability, and pseudo-class state are recomputed. See [Mutating the `type` property](#mutating-the-type-property). |
| Host disconnected | Form association detaches. The behavior remains attached for when the host re-connects. |

### Mutating the `type` property

Setting `behavior.type` to a new value toggles the activation path and which pseudo-classes match.

```javascript
const buttonBehavior = this.#internals.behaviors.get(HTMLButtonBehavior);
buttonBehavior.type = 'reset'; // Was 'submit', now 'reset'.
```

Each subsystem affected by `type` is recomputed through the same paths the platform already runs for native `<button>` when its `type` attribute changes.

| Subsystem | Recompute when `behavior.type` is set |
|-----------|--------------------------------------|
| Form ownership | Re-association runs. `type === 'button'` detaches the behavior from form ownership; `type === 'submit'` or `'reset'` attaches it. |
| Activation behavior | The next activation runs against the new `type`. |
| `:default` match | Re-evaluated. Only matches when `type === 'submit'` and the host is the form's default submit button. |
| Implicit ARIA role | Unchanged. The role is `"button"` for all `type` values, so no recompute is needed. |
| Focusability | Unchanged. Focusability is the same for all `type` values. |

Setting `behavior.type` to an unknown string does not throw. The behavior coerces the value to the default state (`'submit'`), and the getter returns the canonical keyword for the active state. This matches the [Auto state](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-auto-state) that `<button>`'s `type` content attribute uses as the missing-value and invalid-value default.

Changing `behavior.type` between events of a single interaction (for example, between `mousedown` and `mouseup`, or between `keydown` and `keyup` on a key activation) queues the change. The change applies at end-of-interaction, between event tasks. This mirrors how the platform already handles `type` mutations on a native `<button>` during click dispatch.

### Duplicate behaviors

Listing the same behavior class twice in `static behaviors` (for example, `static behaviors = [HTMLButtonBehavior, HTMLButtonBehavior]`) throws a `TypeError` at `customElements.define()` time. A host has at most one instance of each behavior class.

### API design

Authors declare behaviors via a static class property; the platform creates and exposes the instances:

- `static behaviors` is an array of behavior classes (not instances).
- The platform instantiates each declared behavior with its defined defaults at element creation.
- `ElementInternals.behaviors` is a read-only, Map-like collection keyed by behavior class. `internals.behaviors.get(HTMLButtonBehavior)` returns the instance for this host. Entries can't be added or removed at runtime.
- Web authors hold references to behavior instances by looking them up through `internals.behaviors` once and caching the reference.

### Feature detection

Web authors can detect whether behaviors are supported by checking for the existence of behavior classes on the global scope:

```javascript
if (typeof HTMLButtonBehavior !== 'undefined') {
  // Behaviors are supported.
  class MyButton extends HTMLElement {
    static formAssociated = true;
    static behaviors = [HTMLButtonBehavior];

    #internals;
    constructor() {
      super();
      this.#internals = this.attachInternals();
    }
  }
  customElements.define('my-button', MyButton);
} else {
  // Fall back to manual event handling.
  class MyButton extends HTMLElement {
    static formAssociated = true;

    #internals;
    constructor() {
      super();
      this.#internals = this.attachInternals();
      this.addEventListener('click', () => {
        this.#internals.form?.requestSubmit(this);
      });
    }
  }
  customElements.define('my-button', MyButton);
}
```

### Other considerations

This proposal supports common web component patterns:

- Custom elements using behaviors can follow progressive enhancement patterns: use `<slot>` to render fallback content, provide `<noscript>` alternatives, and design markup to be readable without JavaScript. If script fails to load, the element receives no behavior, which is true for any autonomous custom element with or without this proposal.
- Because behaviors are pinned to existing algorithms, this framework also enables polyfilling: authors can approximate new behaviors in *userland* before native support ships.
- While this proposal uses an imperative API, the design supports future declarative custom elements. A declarative form would attach behaviors by a registered string name rather than a class reference. Each built-in behavior would have a canonical token (for example, `HTMLButtonBehavior` registered as `"button"`).

```html
<my-button behaviors="button">Help</my-button>
```

### Use case: Design system button

A design system can use a single class with one `HTMLButtonBehavior` and forward the host's `type` attribute to the behavior.

```javascript
class DesignSystemButton extends HTMLElement {
  static formAssociated = true;
  static behaviors = [HTMLButtonBehavior];
  static observedAttributes = ['type', 'formaction'];

  #internals;
  #buttonBehavior;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#buttonBehavior = this.#internals.behaviors.get(HTMLButtonBehavior);
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = '<slot></slot>';
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    switch (name) {
      case 'type': {
        if (newValue === 'submit' || newValue === 'reset' || newValue === 'button') {
          this.#buttonBehavior.type = newValue;
        }
        break;
      }
      case 'formaction': {
        this.#buttonBehavior.formAction = newValue ?? '';
        break;
      }
    }
  }
}

customElements.define('ds-button', DesignSystemButton);
```

```html
<form action="/save">
  <ds-button type="submit">Save</ds-button>
  <ds-button type="reset">Reset</ds-button>
  <ds-button type="button" onclick="openHelp()">Help</ds-button>
</form>
```

Setting the `type` attribute at runtime flips the active mode through `attributeChangedCallback`, the way an author would expect:

```javascript
document.querySelector('ds-button').setAttribute('type', 'reset');
// The behavior's type is now 'reset'. The next activation triggers form reset.
```

## Comparison with current [explainer](explainer.md)

| Question | Main proposal | This alternative |
|----------|---------------|------------------|
| How is the behavior attached? | `attachInternals({ behaviors: [ new HTMLSubmitButtonBehavior, ...] })`. | `static behaviors = [HTMLButtonBehavior]`. |
| How are submit, reset, and generic-button modes modeled? | `HTMLSubmitButtonBehavior`, `HTMLResetButtonBehavior`, `HTMLButtonBehavior`. | `HTMLButtonBehavior` with a `type` property. |
| How does the author access the behavior? | Through the cached instance reference. | `internals.behaviors.get(HTMLButtonBehavior)`. |
| How do authors switch modes at runtime? | See [Use case: Design system button](explainer.md#use-case-design-system-button) and [Alternative API design 3](explainer.md#alternative-api-design-3-behavior-scoped-behaviordisabled). | Set `behavior.type` to the new value. |
| Conflict between two button-shaped behaviors attached together | Defined by array-order / last-in-wins among participating behaviors. | A host can only have one `HTMLButtonBehavior`, last-in-wins for the rest of the participating behaviors. |
| Mapping to native `<button>` | Three behaviors mapping to the three `type` values. | One-to-one with `HTMLButtonElement`, including the `type` attribute. |
