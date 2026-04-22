# Platform-Provided Behaviors for Custom Elements

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

## Participate

- [WHATWG tracking issue](https://github.com/whatwg/html/issues/12150)

## Introduction

Custom element authors frequently need their elements to use platform behaviors that are currently exclusive to native HTML elements, such as [form submission](https://github.com/WICG/webcomponents/issues/814), [popover invocation](https://github.com/whatwg/html/issues/9110), [label behaviors](https://github.com/whatwg/html/issues/5423#issuecomment-1517653183), [form semantics](https://github.com/whatwg/html/issues/10220), and [radio button grouping](https://github.com/whatwg/html/issues/11061#issuecomment-3250415103). This proposal introduces platform-provided behaviors as a mechanism for autonomous custom elements to adopt specific native HTML element behaviors. Rather than requiring developers to reimplement native behaviors in JavaScript or extend native elements (customized built-ins), this approach exposes native capabilities as composable behaviors.

## User-facing problem

Custom element authors can't access native behaviors that are built into native HTML elements. This forces them to either:

1. Use customized built-ins (`is/extends` syntax), which have [Shadow DOM limitations](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to) and [can't use the ElementInternals API](https://github.com/whatwg/html/issues/5166).
2. Try to reimplement native logic in JavaScript, which is error-prone, often less performant, and cannot replicate certain platform-internal behaviors.
3. Accept that their custom elements simply can't do what native elements can do.

This creates a gap between what's possible with native elements and custom elements, limiting web components and forcing developers into suboptimal patterns.

### Goals

- Establish an extensible framework for custom elements to adopt native behaviors for built in elements.
- Enable autonomous custom elements to trigger form submission like `<button type="submit">` as the initial capability of this framework.

### Non-goals

- Recreating all native element behaviors in this initial proposal.
- Making updates to customized built-ins.

## User research

This proposal is informed by:

1. Issue discussions spanning multiple years:

   - [WICG/webcomponents#814](https://github.com/WICG/webcomponents/issues/814) - Form submission
   - [whatwg/html#11061](https://github.com/whatwg/html/issues/11061) - ElementInternals.type proposal
   - [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation from custom elements (via the [popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) or the [invoker commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API))
   - [whatwg/html#5423](https://github.com/whatwg/html/issues/5423) and [whatwg/html#11584](https://github.com/whatwg/html/issues/11584) - Label behaviors
   - [whatwg/html#10220](https://github.com/whatwg/html/issues/10220) - Custom elements as forms

2. TPAC discussions in [2023](https://www.w3.org/2023/09/tpac-breakouts/44-minutes.pdf) and [2025](https://www.w3.org/2025/11/12-custom-attrs-minutes.html) exploring alternatives to customized built-ins.

3. Real-world use cases from frameworks that work around these limitations:

   - [Shoelace](https://github.com/shoelace-style/shoelace/blob/next/src/components/button/button.component.ts#L180): Uses `ElementInternals` but still requires manual wiring to intercept the click event on its internal shadow button (as shown below) and can't support implicit submission ("Enter to submit").

   ```javascript
   // button.component.ts
   handleClick(event) {
     if (this.type === 'submit') {
       this._internals.form.requestSubmit(this);
     }
   }
   ```

   - [Material Web](https://github.com/material-components/material-web/blob/main/button/internal/button.ts): Renders a `<button>` inside the Shadow DOM for accessibility/clicks. They created a [dedicated class](https://github.com/material-components/material-web/blob/main/internal/controller/form-submitter.ts) to handle form submission and intercept the click event to call `form.requestSubmit(this)`.

   - Older method (used by earlier design systems): To enable implicit submission, the component injects a hidden `<button type="submit">` into its own light DOM. This approach breaks encapsulation, risks unintended layout effects by participating in the parent’s flow or the surrounding container, and can pollute the accessibility tree.

   ```html
   <ds-button>
     #shadow-root
     <button>Click Me</button>
     <button type="submit" style="display: none;"></button> 
   </ds-button>
   ```

### Why start with form submission?

1. There's a clear gap with implicit form submission.
2. Form submission has clear semantics, making it useful for validating the overall pattern (lifecycle, conflict resolution, accessibility integration) before expanding to more complex behaviors.
3. There's no API to make a custom element participate in implicit form submission as `form.requestSubmit()` only handles explicit activation.

## Proposed approach

This proposal introduces a `behaviors` option to `attachInternals()`. Behaviors are instantiated with `new` and attached via the options object. Once attached, behaviors can't be added, removed, or replaced but the behavior instances themselves remain mutable.

```javascript
// Instantiate the behavior and attach it.
this._submitBehavior = new HTMLSubmitButtonBehavior();
this._internals = this.attachInternals({ behaviors: [this._submitBehavior] });

// Access behavior state directly via the stored reference.
this._submitBehavior.formAction = '/custom';

// Or find a behavior in the array.
const submitBehavior = this._internals.behaviors.find(
  b => b instanceof HTMLSubmitButtonBehavior
);
submitBehavior?.disabled = true;
```

### Platform-provided behaviors

Platform behaviors give custom elements capabilities that would otherwise require reimplementation or workarounds. Each behavior automatically provides:

- Event handling: Platform events (click, keydown, etc.) are wired up automatically using the standard DOM event infrastructure (respecting `stopPropagation`, `preventDefault`, etc.)
- ARIA defaults: Implicit roles and properties for accessibility.
- Focusability: The element participates in the tab order as appropriate for the behavior.
- CSS pseudo-classes: Behavior-specific pseudo-classes are managed by the platform.

Bundling these capabilities as high-level units lets the platform provide accessible defaults, wire up events correctly, and manage pseudo-class state.

This proposal introduces `HTMLSubmitButtonBehavior`, which mirrors the submission capability of `<button type="submit">`:

| Capability | Details |
|------------|---------|
| Activation | Click and keyboard (Space/Enter) trigger form submission. |
| Implicit submission | The element participates in "Enter to submit" within forms. |
| ARIA | Implicit `role="button"`. |
| Focusability | Participates in tab order; removed when `disabled` is `true`. |
| CSS pseudo-classes | `:default`, `:disabled`/`:enabled`, `:focus`, `:focus-visible`. |

*Note: While `HTMLButtonElement` also supports generic button behavior (type="button") and reset behavior (type="reset"), this proposal focuses exclusively on introducing the submit behavior.*

`HTMLSubmitButtonBehavior` doesn't require the custom element to be form-associated (`static formAssociated = true`), but form association is needed for submission to work. Without it, `behavior.form` is always `null` and activation is a no-op even if the element is inside a form. This is a divergence from native `<button>`, which submits its form without any explicit opt-in.

| Scenario | Behavior |
|----------|----------|
| Form-associated element inside a form | Full functionality: activation triggers submission, participates in implicit submission, matches `:default`. |
| Form-associated element outside a form | `behavior.form` returns `null`, activation is a no-op (like a native button outside a form). |
| Non-form-associated element | `behavior.form` is `null`, activation is a no-op even inside a form. Implicit submission and `:default` don't apply. The element still gets `role="button"` and implicit focusability. |

### Accessing behavior state

Each behavior exposes properties and methods from its corresponding native element. Behaviors can be accessed directly via the stored reference. For `HTMLSubmitButtonBehavior`, the following properties are available (mirroring [`HTMLButtonElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLButtonElement)):

**Properties:**
- `disabled` - The element is effectively disabled if either `behavior.disabled` is `true` or the element is disabled via attribute or is a descendant of `<fieldset disabled>` ([spec](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-disabled)).
- `form` - read-only, delegates to `ElementInternals.form`.
- `formAction`
- `formEnctype`
- `formMethod`
- `formNoValidate`
- `formTarget`
- `labels` - read-only, delegates to `ElementInternals.labels`
- `name`
- `value`

To expose properties like `disabled` or `formAction` to external code, authors define getters and setters that delegate to the behavior.

```javascript
class CustomSubmitButton extends HTMLElement {
  constructor() {
    super();
    this._submitBehavior = new HTMLSubmitButtonBehavior();
    this._internals = this.attachInternals({ behaviors: [this._submitBehavior] });
  }

  get disabled() {
    return this._submitBehavior.disabled;
  }

  set disabled(val) {
    this._submitBehavior.disabled = val;
  }

  get formAction() {
    return this._submitBehavior.formAction;
  }

  set formAction(val) {
    this._submitBehavior.formAction = val;
  }
}
```

Authors are responsible for attribute reflection. If the author wants HTML attributes on their custom element to affect the `behavior`, they need to observe and forward those attributes using `attributeChangedCallback`:

```javascript
class CustomButton extends HTMLElement {
  static observedAttributes = ['disabled', 'formaction'];

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'disabled') {
      this._submitBehavior.disabled = newValue !== null;
    } else if (name === 'formaction') {
      this._submitBehavior.formAction = newValue ?? '';
    }
  }
}
```

Form override values (`formAction`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `value`) are read from `behavior` properties. Setting a value declaratively in markup (e.g., `<my-button formaction="/save">`) or programmatically (e.g. `setAttribute('formaction', '/save')`) has no effect on form submission unless the author explicitly forwards that attribute to the `behavior`. However, some element attributes are applied to form submission as part of the existing [form-associated custom element](https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements) mechanism, independently of behaviors:

| Element attribute | Applied via form-associated custom element mechanics | Notes |
|-------------------|------------------------------------------------------|-------|
| `form` | Yes | Standard form association by ID. `behavior.form` is read-only and delegates to `ElementInternals.form`, which reflects this association. |
| `disabled` | Yes | Standard form control disabling. Combined with `behavior.disabled`. |
| `name`, `value` | No | Only `behavior.name` and `behavior.value` are read on submission. |
| `formaction`, `formenctype`, `formmethod`, `formtarget` | No | Only `behavior` properties are read. |

### Behavior lifecycle

When `attachInternals()` is called with behaviors, each behavior is attached to the element:

| Event | Effect |
|-------|--------|
| `attachInternals()` called with behaviors | Each behavior is attached. Event handlers become active. Default ARIA role is applied unless overridden by `ElementInternals.role`. |
| Element disconnected from DOM | Behavior state is preserved. Event handlers remain conceptually attached but inactive. |
| Element reconnected to DOM | Event handlers become active again. Behavior state (e.g., `formAction`, `disabled`) is preserved. |

*Note: Behaviors are immutable after `attachInternals()`. Dynamic behavior updates (adding, removing, or replacing behaviors after attachment) are not supported, as developer feedback indicated that the problems with `<input>`'s mutable `type` attribute (state migration, event handler cleanup, property compatibility) should not be replicated.*

### Duplicate behaviors

Including the same behavior instance twice in the behaviors array, or attaching multiple instances of the same behavior type to a single element, throws a `TypeError`.

Throws `TypeError` due to duplicate behavior instance in the array:
```javascript
const sharedBehavior = new HTMLSubmitButtonBehavior();
this._internals = this.attachInternals({
  behaviors: [sharedBehavior, sharedBehavior]  // Throws `TypeError`.
});
```

Throws if multiple instances of the same behavior type are attached to one element, even if they are separate objects:
```javascript
const behavior1 = new HTMLSubmitButtonBehavior();
const behavior2 = new HTMLSubmitButtonBehavior();
this._internals = this.attachInternals({
  behaviors: [behavior1, behavior2]  // Throws `TypeError`.
});
```
This restriction exists because having two instances of the same behavior type on one element creates ambiguity.

A behavior instance can only be attached to one element. Attempting to attach an already-attached instance to another element throws a `TypeError`:
```javascript
const sharedBehavior = new HTMLSubmitButtonBehavior();
element1._internals = element1.attachInternals({ behaviors: [sharedBehavior] });
element2._internals = element2.attachInternals({ behaviors: [sharedBehavior] });  // Throws `TypeError`.
```
This ensures that element-specific properties like `behavior.form` and `behavior.labels` have unambiguous meaning, and avoids potential confusion where changing a property on one element unexpectedly affects another.

### API design

Behaviors are instantiated with `new` and passed to `attachInternals()`:

- `behaviors` option in `attachInternals({ behaviors: [...] })` accepts behavior instances.
- `behaviors` property on `ElementInternals` is a read-only `FrozenArray`.
- Developers hold direct references to their behavior instances.

*Note: An ordered array is preferred over a set because order may be significant for [conflict resolution](#behavior-composition-and-conflict-resolution). `behaviors` uses a `FrozenArray` because behaviors are immutable after attachment.*

Developers hold direct references to their behavior instances. This follows the [W3C design principle that classes should have constructors](https://www.w3.org/TR/design-principles/#constructors) that allow authors to create and configure instances, and it extends naturally to future developer-defined behaviors that follow the same `new` + attach pattern.

*For future developer-defined behaviors:*

```javascript
class TooltipBehavior {
  #content = '';

  behaviorAttachedCallback(internals) { /* ... */ }

  get content() { return this.#content; }
  set content(val) { this.#content = val; }
}

// In custom element constructor:
this._tooltipBehavior = new TooltipBehavior();
this._internals = this.attachInternals({ behaviors: [this._tooltipBehavior] });

// Access state directly.
this._tooltipBehavior.content = 'Helpful tooltip text';
```

### Behavior composition and conflict resolution

For the built-in behaviors currently under consideration and mentioned in this document (`HTMLSubmitButtonBehavior`, `HTMLButtonBehavior`, `HTMLResetButtonBehavior`, etc.), there probably isn't a practical use case for combining them. However, attaching multiple behaviors is not prohibited. If multiple behaviors are provided, conflicts are resolved using order of precedence: the position of behaviors in the array determines which behavior's value takes effect.

Consider the following example of behaviors that could potentially be compatible, `HTMLLabelBehavior` and `HTMLSubmitButtonBehavior`:

```javascript
class LabeledSubmitButton extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this._labelBehavior = new HTMLLabelBehavior();
    this._submitBehavior = new HTMLSubmitButtonBehavior();
    this._internals = this.attachInternals({
      behaviors: [this._labelBehavior, this._submitBehavior]
    });

    this.addEventListener('click', (event) => {
      console.log('Author click handler');
    });
  }
}
customElements.define('labeled-submit-button', LabeledSubmitButton);

const btn = document.createElement('labeled-submit-button');

// For properties where an element can only have one value (ARIA role, `disabled`,
// `formAction`, etc.), last-in-wins applies:

// The element's implicit role is "button" (from HTMLSubmitButtonBehavior, last in list).
console.log(btn.computedRole);  // "button"

// If the author sets `internals.role`, that takes precedence over all behavior defaults.
this._internals.role = 'link';
console.log(btn.computedRole);  // "link"

// However, the element is disabled if any behavior's `disabled` is `true`. When
// disabled, the entire element is affected: all behavior default actions are blocked,
// the element is removed from tab order, and it matches `:disabled`.
submitBehavior.disabled = true;
labelBehavior.disabled = false;
console.log(btn.matches(':disabled'));  // true
```

For events, behavior responses follow the platform's existing default action model:

1. The event dispatches through the DOM.
2. All author-registered event listeners run during dispatch.
3. After dispatch completes, each behavior's default action runs unless a listener called `preventDefault()`.

When `btn` is clicked:
- Author event listeners run during event dispatch.
- `HTMLSubmitButtonBehavior`'s default action runs (form submits).
- `HTMLLabelBehavior`'s default action runs (delegates focus to associated control).
- If any listener called `preventDefault()`, both form submission and focus delegation are cancelled
- `stopImmediatePropagation()` prevents subsequent listeners on the same element from running, but does not affect behavior default actions.

### Feature detection

Web authors can detect whether behaviors are supported by checking for the existence of behavior classes on the global scope:

```javascript
if (typeof HTMLSubmitButtonBehavior !== 'undefined') {
  // Behaviors are supported.
  this._submitBehavior = new HTMLSubmitButtonBehavior();
  this._internals = this.attachInternals({ behaviors: [this._submitBehavior] });
} else {
  // Fall back to manual event handling.
  this._internals = this.attachInternals();
  this.addEventListener('click', () => {
    this._internals.form?.requestSubmit(this);
  });
}
```

### Other considerations

This proposal supports common web component patterns:

- A child class extends the parent's functionality and retains access to the `ElementInternals` object and its active behaviors.
- `HTMLSubmitButtonBehavior` and subsequent platform-provided behaviors should be understood as bundles of state, event handlers, and accessibility defaults and not opaque tokens. Web authors can reason about what a behavior provides (e.g., click/Enter triggers form submission, implicit `role="button"`, focusability, `:disabled` pseudo-class) and anticipate how it composes with other behaviors. This framework would also enable polyfilling: because behaviors have well-defined capabilities, authors can approximate new behaviors in *userland* before native support ships (see [Developer-defined behaviors](#developer-defined-behaviors) in [Future Work](#future-work)).
- This proposal targets autonomous custom elements that need platform behaviors (e.g., when needing Shadow DOM and custom APIs or building a design system component that is an autonomous custom element). Making native elements more flexible (Customizable Select, open-stylable controls) is valuable and complementary, but doesn't completely eliminate the need for autonomous custom elements.
- Platform-provided behaviors are JavaScript-dependent, as is any autonomous custom element. If script fails to load, the element receives no behavior—this is true with or without this proposal.
- Custom elements using behaviors can still follow progressive enhancement patterns: use `<slot>` to render fallback content, provide `<noscript>` alternatives, and design markup to be readable without JavaScript.
- While this proposal uses an imperative API, the design supports future declarative custom elements. Once a declarative syntax for `ElementInternals` is established, attaching behaviors could be modeled as an attribute, decoupling behavior from the JavaScript class definition. The following snippet shows a hypothetical example:

  ```html
  <custom-button name="custom-submit-button">
    <element-internals behaviors="html-submit-button-behavior"></element-internals>
    <template>Submit</template>
  </custom-button>
  ```

### Use case: Design system button

While this proposal only introduces `HTMLSubmitButtonBehavior`, the example below references `HTMLResetButtonBehavior` and `HTMLButtonBehavior` to illustrate how switching would work once additional behaviors become available in the future.

A design system can use delayed `attachInternals()` to determine the behavior based on the initial `type` attribute. This approach uses a single class while keeping behaviors immutable after attachment.

```javascript
class DesignSystemButton extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['type', 'disabled', 'formaction'];

  // Behavior reference (set once in connectedCallback).
  #behavior = null;
  #internals = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Attach behaviors once based on initial type attribute.
    if (!this.#internals) {
      const type = this.getAttribute('type') || 'button';
      this.#behavior = this.#createBehaviorForType(type);
      this.#internals = this.attachInternals({ behaviors: [this.#behavior] });
    }
    this.#render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#behavior) {
      return;
    }

    switch (name) {
      case 'type': {
        // Type changes after connection are intentionally ignored.
        console.warn('ds-button: type attribute changes after connection have no effect.');
        break;
      }
      case 'disabled': {
        this.#behavior.disabled = newValue !== null;
        break;
      }
      case 'formaction': {
        if ('formAction' in this.#behavior) {
          this.#behavior.formAction = newValue ?? '';
        }
        break;
      }
    }
  }

  #createBehaviorForType(type) {
    switch (type) {
      case 'submit': {
        return new HTMLSubmitButtonBehavior();
      }
      case 'reset': {
        return new HTMLResetButtonBehavior();
      }
      default: {
        return new HTMLButtonBehavior();
      }
    }
  }

  // Expose behavior properties.
  get disabled() {
    return this.#behavior?.disabled ?? false;
  }
  set disabled(val) {
    this.toggleAttribute('disabled', val);
  }
  get formAction() {
    return this.#behavior?.formAction ?? '';
  }
  set formAction(val) {
    if (this.#behavior && 'formAction' in this.#behavior) {
      this.#behavior.formAction = val;
    }
  }

  // Additional getters/setters for formMethod, formEnctype,
  // formNoValidate, formTarget, name, and value would follow
  // the same pattern.

  #render() {
    const isSubmit = this.#behavior instanceof HTMLSubmitButtonBehavior;
    const isReset = this.#behavior instanceof HTMLResetButtonBehavior;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; padding: 8px 16px; cursor: pointer; }
        :host(:disabled) { opacity: 0.5; cursor: not-allowed; }
      </style>
      ${isSubmit ? '💾' : isReset ? '🔄' : ''} <slot></slot>
    `;
  }
}
customElements.define('ds-button', DesignSystemButton);
```

```html
<form action="/save" method="post">
  <input name="username" required>

  <!-- Submit button with custom form action. -->
  <ds-button type="submit" formaction="/draft">Save Draft</ds-button>

  <!-- Default submit button (matches :default). -->
  <ds-button type="submit">Save</ds-button>

  <!-- Reset button. -->
  <ds-button type="reset">Reset</ds-button>

  <!-- Regular button (default when no type specified). -->
  <ds-button>Cancel</ds-button>
</form>
```

The element gains:

- Click and keyboard activation (Space/Enter).
- Focusability (participates in tab order; removed when disabled).
- Implicit ARIA `role="button"` that can be overridden by the web author.
- Behavior-specific capabilities (form submission, reset, etc.) based on initial `type`.
- CSS pseudo-class matching: `:default`, `:disabled`/`:enabled`.
- Participation in implicit form submission (for submit buttons).
- Behavior properties like `disabled` and `formAction` are accessible via the stored behavior reference.

*Note: Dynamically switching `type` after the element is connected is not supported because `internals.behaviors` can't be changed after `ElementInternals` is attached. If it turns out that dynamically switching `type` is needed, future work could consider removing this restriction.*

### Framework use cases

#### Compatible behaviors

Call-to-action elements like "Sign Up" or "Download Now" often need to look like buttons but navigate to new pages. Web authors may:

1. Use `<a>` styled as a button, but lose button keyboard semantics: Space doesn't activate, only Enter does.

```html
<!-- <a> styled as a button. -->
<a href="/signup" class="button-styles">Sign Up</a>

<script>
  const link = document.querySelector('a.button-styles');
  // Add Space key activation (buttons activate on Space, links don't).
  link.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      link.click();
    }
  });
</script>
```

2. Use `<button>` with JavaScript navigation but lose native anchor features: no right-click "Open in new tab", `download` attribute, `target="_blank"` for external links nor native prefetching.

```html
<!-- <button> with JavaScript navigation. -->
<button class="button-styles">Sign Up</button>

<script>
  const btn = document.querySelector('button.button-styles');
  const href = '/signup';

  btn.addEventListener('click', () => {
    window.location.href = href;
  });

  // May implement prefetch on hover.
  btn.addEventListener('mouseenter', () => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  });

  // To implement download behavior author would have to create a temporary <a> element.
</script>
```

3. Some frameworks use polymorphic component patterns, where a component can change the underlying HTML element it renders via a prop, to render a button as a link or vice versa (e.g., [MUI's `component` prop](https://mui.com/material-ui/guides/composition/#component-prop), [styled-components' `as` prop](https://styled-components.com/docs/api#as-polymorphic-prop), [Chakra UI's `as` prop](https://chakra-ui.com/docs/components/button#button-as-a-link)). However, the underlying element can only be one or the other.

```jsx
// MUI: Button rendered as an anchor
<Button component="a" href="/signup">Sign Up</Button>

// styled-components: Button rendered as an anchor
<StyledButton as="a" href="/signup">Sign Up</StyledButton>

// Chakra UI: Button rendered as an anchor
<Button as="a" href="/signup">Sign Up</Button>
```

In all cases, the rendered element is an `<a>`, so it loses button keyboard semantics (Space doesn't activate). Alternatively, rendering a link as a button loses anchor features (no right-click "Open in new tab", no `download` attribute).

Combining `HTMLButtonBehavior` (from `<button type=button>`) with `HTMLAnchorBehavior` (from `<a>`) could solve this by giving the element:

- Button keyboard activation (Space and Enter both work).
- Right-click context menu offers navigation-related options.
- Native anchor navigation with all its features (`href`, `target`, `download`, browser prefetching).
- A single component that design systems can style once.

```javascript
class NavButton extends HTMLElement {
  constructor() {
    super();
    this._buttonBehavior = new HTMLButtonBehavior();
    this._anchorBehavior = new HTMLAnchorBehavior();
    this._internals = this.attachInternals({ 
      behaviors: [this._buttonBehavior, this._anchorBehavior]
    });
    // Explicitly set the role.
    this._internals.role = 'link';
  }

  connectedCallback() {
    // Set navigation target.
    this._anchorBehavior.href = this.getAttribute('href');
  }
}
customElements.define('nav-button', NavButton);
```

```html
<!-- A button-styled element that navigates like a link. -->
<nav-button href="/dashboard">Sign Up</nav-button>
```

These behaviors are *technically* compatible because:

- Button provides keyboard activation (Space/Enter) and anchor provides navigation on the same `click` event.
- They have complementary properties: button has `disabled`, anchor has `href`, `target`, `download`.
- Both are focusable elements.

**Role conflict and accessibility implications:** `HTMLButtonBehavior` provides `role="button"` while `HTMLAnchorBehavior` provides `role="link"`. Under the last-in-wins rule, the element would have `role="link"` (or `role="button"` if the order is reversed). However, authors should:

1. Explicitly set `internals.role` to the appropriate value based on the element's primary purpose.
2. Consider user expectations of screen reader users. They might expect buttons to perform actions and links to navigate.
3. Test with assistive technologies to ensure the element behaves as users expect based on its announced role.

Even with an explicit role, this pattern may confuse users who expect consistent behavior from elements announced as buttons or links. Authors should evaluate whether their use case requires both behaviors or if a single semantic (button or link) would better serve users.

#### Conflicting behaviors

Some behaviors are inherently mutually exclusive.

```javascript
this._checkboxBehavior = new HTMLCheckboxBehavior();
this._radioBehavior = new HTMLRadioGroupBehavior();
this.attachInternals({ 
  behaviors: [this._checkboxBehavior, this._radioBehavior]
});
```

| Capability | HTMLCheckboxBehavior | HTMLRadioGroupBehavior |
|------------|---------------------|------------------------|
| `checked` property | Toggles independently on/off | Checking one unchecks others from the group |
| Click handling | Toggles `checked` state | Sets `checked = true` (radios don't toggle off) |
| ARIA role | `role="checkbox"` | `role="radio"` |
| `aria-checked` | `"true"` / `"false"` / `"mixed"` | `"true"` / `"false"` |

The result is incoherent: the element has radio semantics for the `checked` property (group coordination) but the checkbox's click handler might still try to toggle off, or vice versa depending on event handler ordering (if applying "last-in-wins"). An element cannot meaningfully be both a checkbox and a radio button.

## Future work

The behavior pattern can be extended to additional behaviors:

- **Generic Buttons**: `HTMLButtonBehavior` for non-submitting buttons (popover invocation, commands).
- **Reset Buttons**: `HTMLResetButtonBehavior` for form resetting.
- **Inputs**: `HTMLInputBehavior` for text entry, validation, and selection APIs.
- **Labels**: `HTMLLabelBehavior` for `for` attribute association and focus delegation.
- **Forms**: `HTMLFormBehavior` for custom elements acting as form containers.
- **Radio Groups**: `HTMLRadioGroupBehavior` for `name`-based mutual exclusion.
- **Tables**: `HTMLTableBehavior` for table layout semantics and accessibility.

Future behaviors would also manage their own relevant pseudo-classes:

| Behavior | CSS Pseudo-classes |
|----------|--------------------|
| `HTMLCheckboxBehavior` | `:checked`, `:indeterminate` |
| `HTMLInputBehavior` | `:valid`, `:invalid`, `:required`, `:optional`, `:placeholder-shown` |
| `HTMLRadioGroupBehavior` | `:checked` |
| `HTMLResetButtonBehavior` | `:default` (if only reset button in form) |

### Developer-defined behaviors

A future extension of this proposal could allow developers to define their own reusable behaviors by subclassing an `ElementBehavior` base class. This would enable patterns like custom tooltip behaviors, polyfilling upcoming platform behaviors, and composing developer-defined behaviors with platform-provided ones.

This direction is explored in a separate document: [Developer-defined behaviors](developer-defined-behaviors.md). It is not part of the current proposal and should be treated as forward-looking exploration.

### Behaviors in native HTML elements

Although this proposal currently focuses on custom elements, the behavior pattern could potentially be generalized to all HTML elements (e.g., a `<div>` element gains button behavior via behaviors). However, extending behaviors to native HTML elements would raise questions about correctness and accessibility.

## Open questions

### Is there a better name than "behavior" for this concept?

The American English spelling of behavior throughout this proposal follows the [WHATWG spec style guidelines](https://wiki.whatwg.org/wiki/Specs/style#:~:text=Use%20standard%20American%20English%20spelling). However, the word "behavior" has some drawbacks:

- "behaviour" vs "behavior" may cause some friction for contributors.
- Shorter names would improve ergonomics.
- "Behavior" is used in other contexts (such as CSS scroll-behavior), which could cause confusion.

Alternatives:

| Name | Example class | Example API | Notes |
|------|--------------|-------------|-------|
| **mixin** | `HTMLSubmitButtonMixin` | `attachInternals({ mixins: [...] })` | Related term, familiar concept but implies class-level composition |
| **conduct** | `HTMLSubmitButtonConduct` | `attachInternals({ conducts: [...] })` | Short |
| **action** | `HTMLSubmitButtonAction` | `attachInternals({ actions: [...] })` | Intuitive but overloaded (form `action` attribute) |
| **trait** | `HTMLSubmitButtonTrait` | `attachInternals({ traits: [...] })` | Related term and short |

## Alternatives considered

### Alternative 1: Static Class Mixins

Behaviors are exposed as functions that take a superclass and return a subclass.

```javascript
class CustomSubmitButton extends HTMLSubmitButtonMixin(HTMLElement) { ... }
```

**Pros:**
- Familiar JavaScript pattern.
- Prototype-based composition.

**Cons:**
- Behavior is fixed at class definition time (e.g. A design system couldn't offer a single `<ds-button>` that changes behavior based on the `type` attribute as it would need separate classes like `<ds-submit-button>`, `<ds-reset-button>`, `<ds-button>`, increasing bundle sizes and API surface).
- Authors might need to generate many class variations for different behavior combinations.
- It strictly binds behavior to the JavaScript class hierarchy, making a future declarative syntax hard to implement without creating new classes.

Rejected in favor of the imperative API because it doesn't allow behavior composition (attaching multiple complementary behaviors to a single element), requires multiple classes instead of a single element that adapts to initial configuration, and doesn't support configuring behavior state before attachment.

### Alternative 2: ElementInternals.type ([Proposed](../ElementInternalsType/explainer.md))

Set a single "type" string that grants a predefined bundle of behaviors.

```javascript
class CustomButton extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this.attachInternals().type = 'button';
  }
}
```

**Pros:**
- Simple API.
- Easy to understand for common cases.

**Cons:**
- No composability as one custom element can only have one type.
- Bundling behavior can get confusing as it isn't obvious what behaviors and attributes are added.
- String APIs are error-prone and hard to debug.

Too inflexible for the variety of use cases web developers need. While simpler, it doesn't solve the composability problem and it might be confusing for developers to use in practice.

### Alternative 3: Custom Attributes ([Proposed](https://github.com/WICG/webcomponents/issues/1029))

Define custom attributes with lifecycle callbacks that add behavior to elements.

```javascript
class SubmitButtonAttribute extends Attribute {
  connectedCallback() {
    this.ownerElement.addEventListener('click', () => {
      // Submit form logic.
    });
  }
}
HTMLElement.attributeRegistry.define('submit-button', SubmitButtonAttribute);
```

```html
<custom-element submit-button>Submit</custom-element>
```

**Pros:**
- Would work with both native and custom elements.
- Would have a declarative version.
- Would provide composability (multiple attributes).

**Cons:**
- Would require authors to implement all behavior in JavaScript (no access to platform internals).
- There are performance concerns with `Attr` node creation.
- Namespace conflicts need resolution.
- Doesn't solve the platform integration problem.
- Still a proposal without implementation commitment.

Custom attributes are complementary but don't provide access to native behaviors. They're useful for *userland* behavior composition but can't trigger form submission, invoke popovers through platform code, etc.

### Alternative 4: Customized Built-ins

Extend native element classes directly.

```javascript
class FancyButton extends HTMLButtonElement {
  constructor() {
    super();
  }
}
customElements.define('fancy-button', FancyButton, { extends: 'button' });
```

```html
<button is="fancy-button">Click me</button>
```

**Pros:**
- Full access to all native behaviors.
- Natural inheritance model.

**Cons:**
- Interoperability issues across browsers.
- [Limited Shadow DOM support](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to) - only certain elements can be shadow hosts
- Can't use `ElementInternals` API.
- The `is=` syntax isn't considered developer-friendly to some.
- Doesn't support composing behaviors from different base elements.

While customized built-ins are useful where supported, the issues listed above makes them unsuitable as the primary solution.

### Alternative 5: Expose certain behavioral attributes via ElementInternals (Proposed)

Expose specific behavioral attributes (like `popover`, `draggable`, `focusgroup`) via `ElementInternals` so custom elements can adopt them without exposing the attribute to the user. See [issue #11752](https://github.com/whatwg/html/issues/11752).

**Pros:**
- Solves specific use cases like popovers and drag-and-drop.
- Hides implementation details from the consumer.

**Cons:**
- Doesn't currently address form submission behavior.
- Scoped to specific attributes rather than general behaviors.
- Since the composition doesn't have an order/sequence to it, web authors would not be able to specify a desired "winner" when using multiple behaviors that happen to impact a shared value or behavior.

### Alternative 6: Fully Customizable Native Elements

Modify existing native HTML elements to be fully stylable and customizable, similar to [Customizable Select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select).

**Pros:**
- Developers can use standard HTML elements (`<button>`, `<select>`, etc.) without needing custom elements.
- Accessibility and behavior are handled entirely by the browser.

**Cons:**
- Requires specification and implementation for every single HTML element.
- Does not help developers who need to create a custom element for semantic or architectural reasons (e.g., a specific design system component with custom API).
- Doesn't solve the problem of "autonomous custom elements" needing native capabilities; it just improves native elements.

While valuable, this can be a parallel effort. Even if all native elements were customizable, there would still be valid use cases for autonomous custom elements that need to participate in native behaviors (like form submission) while maintaining their own identity and API.

### Alternative 7: Low-level primitives on ElementInternals

Expose individual primitives (focusability, disabled, keyboard activation) directly on `ElementInternals`.

**Pros:**
- Maximum flexibility—authors compose exactly what they need.
- Each primitive is independently useful.

**Cons:**
- Primitives like `disabled` and `focusable` interact with each other, with accessibility, and with event handling. Setting `internals.disabled = true` without the associated behavior might result in the element *looking* disabled but still receiving clicks, remaining in the tab order, and submitting with a form.
- Even seemingly simple primitives like focusability could have significant complexity around accessibility integration. This is why `popovertarget` is limited to buttons(it was originally intended for any element, but the accessibility requirements around focusability and activation made buttons the practical choice). See [design-principles tradeoff between high-level and low-level APIs](https://www.w3.org/TR/design-principles/#high-level-low-level).
- Form submission participation can be seen as a primitive itself (it can't be broken down further due to accessibility concerns).

### Alternative 8: TC39 Decorators

Use [TC39 decorators](https://github.com/tc39/proposal-decorators) to attach behaviors to custom element classes.

```javascript
@HTMLSubmitButtonBehavior
class CustomButton extends HTMLElement {
  // Decorator applies submit button behavior to the class.
}
```

**Pros:**
- Clean, declarative syntax at the class level.
- Familiar pattern for developers coming from other languages (Python, Java annotations) or TypeScript.
- Allows composition.

**Cons:**
- Decorators operate at class definition time, not instance creation time. This creates the same limitation as static class mixins: behavior is fixed when the class is defined, not when instances are created (e.g., a design system couldn't offer a single `<ds-button>` class that adapts behavior based on the `type` attribute).
- Instance-specific behavior configuration (e.g., setting `formAction` before attachment) isn't supported.
- Decorators are inherently JavaScript syntax and don't support a future declarative, JavaScript-less approach to custom elements. This proposal's design decouples behaviors from the class definition, enabling future declarative syntax (see [Other considerations](#other-considerations)).

`HTMLSubmitButtonBehavior` could itself be designed as a decorator, but decorators can't easily access `ElementInternals` or instance state during application. Decorators would need to coordinate with `attachInternals()` timing, and getting a reference to the behavior instance for property access (e.g., `behavior.formAction`) would require additional wiring.

### Alternative API design: Class references

Pass behavior classes (not instances) to `attachInternals()`:

```javascript
// Attach a behavior during initialization (class reference).
this._internals = this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });

// Access behavior state via named accessor.
this._internals.behaviors.htmlSubmitButton.formAction = '/custom';
```

**Pros:**
- Named access via `this._internals.behaviors.<behaviorName>` requires no iteration.
- Less setup code as developers don't manage behavior instances.

**Cons:**
- Platform instantiates the behavior, so constructor parameters aren't available. This conflicts with the [design principle that classes should have constructors](https://www.w3.org/TR/design-principles/#constructors) that allow authors to create and configure instances.
- Requires a `behaviors` interface for named access.
- *Future* developer-defined behaviors would need a way to name their behaviors.

### Alternative conflict resolution: Compatibility allow-list

Compatibility between behaviors could be defined in the specification. This follows the pattern used by [`attachShadow`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow), where the [list of valid shadow host names](https://dom.spec.whatwg.org/#valid-shadow-host-name) is spec-defined and enforced at runtime. Web authors can reference documentation or DevTools errors to determine which combinations are valid.

Any combination not explicitly allowed would be rejected by `attachInternals()`, preventing invalid states (like being both a button and a form):

```javascript
// This would work if anchor were made compatible with button (nav-button pattern).
this._buttonBehavior = new HTMLButtonBehavior();
this._anchorBehavior = new HTMLAnchorBehavior();
this.attachInternals({
  behaviors: [this._buttonBehavior, this._anchorBehavior]
});

// Throws: checkbox is not compatible with submit button.
this._submitBehavior = new HTMLSubmitButtonBehavior();
this._checkboxBehavior = new HTMLCheckboxBehavior();
this.attachInternals({
  behaviors: [this._submitBehavior, this._checkboxBehavior]
});
// Error message: "HTMLSubmitButtonBehavior is not compatible with HTMLCheckboxBehavior".
```

There can be two interpretations of what "compatible behaviors" means:

1. Compatible behaviors have completely disjoint capabilities (e.g., one provides `disabled`, the other provides `href`). No conflict resolution is needed because they never touch the same property or event.
2. Compatible behaviors may share some capabilities (e.g., both provide a role or handle click). In this case, a conflict resolution strategy (order of precedence or explicit resolution) is still required for overlapping capabilities.

**Pros:**
- Clear error messages guide developers to do the *right thing*.
- The platform can expand compatibility lists in future versions without breaking existing code.

**Cons:**
- More restrictive as authors can't experiment with novel combinations.
- May block legitimate use cases that weren't anticipated.

### Alternative conflict resolution: Explicit resolution

An alternative to the compatibility allow-list would be to require authors to explicitly resolve all conflicts. This applies to properties, methods, and event handlers:

```javascript
this._labelBehavior = new HTMLLabelBehavior();
this._submitBehavior = new HTMLSubmitButtonBehavior();
this._internals = this.attachInternals({ 
  behaviors: [this._labelBehavior, this._submitBehavior],
  resolve: {
    role: 'button',  // Use button role.
    click: 'all',  // Both handlers run. Also could be 'first', 'last'.
  }
});
```

**Pros:**
- Authors have full control over conflict resolution.
- Supports complex use cases where default resolution isn't appropriate.
- Authors can mix strategies (e.g., last-in-wins for role, additive for events).

**Cons:**
- More verbose API.
- Adds complexity for simple cases where order-based resolution would suffice.
- Authors must understand all potential conflicts to resolve them correctly.

## Accessibility, security, and privacy considerations

### Accessibility

- Platform behaviors must provide appropriate default ARIA roles and states (e.g., `role="button"` for `HTMLSubmitButtonBehavior`).
- Custom elements using a platform-provided behavior must gain the same keyboard handling and focus management as their native counterparts (e.g., Space/Enter activation).
- Authors must be able to override default semantics using `ElementInternals.role` and `ElementInternals.aria*` properties if the default behavior does not match their specific use case.

### Security

- This proposal exposes existing platform capabilities to custom elements, rather than introducing new capabilities.
- Form submission triggered by behaviors must respect the same security policies as native form submission.
- All security checks that apply to native elements (e.g., form validation, submission restrictions) apply to custom elements using these behaviors.

### Privacy

- The presence of specific behaviors in the API surface can be used for fingerprinting or browser version detection. This is consistent with the introduction of any new Web Platform feature.
- This proposal does not introduce new mechanisms for collecting or transmitting user data beyond what is already possible with native HTML elements.

## Stakeholder feedback / opposition

### Browser vendors

- Chromium: Positive
- Gecko: No signal
- WebKit: No signal

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Alex Russell](https://github.com/slightlyoff)
- [Andy Luhrs](https://github.com/aluhrs13)
- [Daniel Clark](https://github.com/dandclark)
- [Hoch Hochkeppel](https://github.com/mhochk)
- [Justin Fagnani](https://github.com/justinfagnani)
- [Keith Cirkel](https://github.com/keithamus)
- [Kevin Babbitt](https://github.com/kbabbitt)
- [Kurt Catti-Schmidt](https://github.com/KurtCattiSchmidt)
- [Mason Freed](https://github.com/mfreed7)
- [Rob Eisenberg](https://github.com/EisenbergEffect)
- [Steve Orvell](https://github.com/sorvell)

Thanks to the following proposals, articles, frameworks, and languages for their work on similar problems that influenced this proposal.

- [A "story" about `<input>`](https://meowni.ca/posts/a-story-about-input/) by [Monica Dinculescu](https://meowni.ca) — analysis of `<input>` element design problems that informed our decision to use static behaviors.
- [Real Mixins with JavaScript Classes](https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/) by [Justin Fagnani](https://github.com/justinfagnani).
- [ElementInternals.type proposal](https://github.com/whatwg/html/issues/11061).
- [Custom Attributes proposal](https://github.com/WICG/webcomponents/issues/1029).
- [TC39 Maximally Minimal Mixins proposal](https://github.com/tc39/proposal-mixins).
- [TC39 Decorators proposal](https://github.com/tc39/proposal-decorators).
- Lit framework's [reactive controllers pattern](https://lit.dev/docs/composition/controllers/).
- [Expose certain behavioural attributes via ElementInternals proposal](https://github.com/whatwg/html/issues/11752).

### Related issues and discussions

- [WICG/webcomponents#814](https://github.com/WICG/webcomponents/issues/814) - Form submission from custom elements
- [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation
- [whatwg/html#5423](https://github.com/whatwg/html/issues/5423), [whatwg/html#11584](https://github.com/whatwg/html/issues/11584) - Label behaviors
- [whatwg/html#10220](https://github.com/whatwg/html/issues/10220) - Custom elements as forms
- [w3c/tpac2023-breakouts#44](https://github.com/w3c/tpac2023-breakouts/issues/44) - TPAC 2023 discussion
- [WebKit/standards-positions#97](https://github.com/WebKit/standards-positions/issues/97) - WebKit position on customized built-ins
