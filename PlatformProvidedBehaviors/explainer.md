# Platform-Provided Behaviors for Custom Elements

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

## Participate

- [WHATWG tracking issue](https://github.com/whatwg/html/issues/12150)

## Introduction

Custom element authors frequently need their elements to leverage platform behaviors that are currently exclusive to native HTML elements, such as [form submission](https://github.com/WICG/webcomponents/issues/814), [popover invocation](https://github.com/whatwg/html/issues/9110), [label behaviors](https://github.com/whatwg/html/issues/5423#issuecomment-1517653183), [form semantics](https://github.com/whatwg/html/issues/10220), and [radio button grouping](https://github.com/whatwg/html/issues/11061#issuecomment-3250415103). This proposal introduces platform-provided behaviors as a mechanism for autonomous custom elements to adopt specific native HTML element behaviors. Rather than requiring developers to reimplement native behaviors in JavaScript or extend native elements (customized built-ins), this approach exposes native capabilities as composable behaviors.

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
- Replacing native elements—this proposal targets autonomous custom elements that need platform behavior, not developers who should use native `<button>` or `<input>` directly.

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

Some platform behaviors are impossible or impractical to implement in JavaScript:

- Implicit form submission: When a user presses Enter in a text field, the browser submits the form via its first submit button. There's no API to make a custom element participate in this as `form.requestSubmit()` only handles explicit activation.
- Native event timing: Platform-provided keyboard and click handling integrates with the UA's event dispatch at the correct phase, ensuring proper interaction with `preventDefault()`, focus management, and accessibility APIs.
- CSS pseudo-class: While [`ElementInternals.states`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/states) enables custom states, native pseudo-classes like `:disabled` have semantic meaning (affect the tab order, preventing activation, and excluding from form submission). This can be implemented in JS, but it's error-prone and hard to maintain because all the interdependencies must be wired up manually.

### Why start with form submission?

1. There's a clear gap with implicit form submission.
3. Form submission has clear semantics, making it useful for validating the overall pattern (lifecycle, conflict resolution, accessibility integration) before expanding to more complex behaviors.
4. The value also lies in establishing a composable pattern for exposing platform behaviors that can extend to inputs, labels, popovers, and more.

## Proposed approach

This proposal introduces a `behaviors` option to `attachInternals()` and two properties on `ElementInternals`: a read-only `behaviors` property for accessing behavior state, and a `behaviorList` property for dynamically updating attached behaviors. This enables composition while keeping the API simple.

```javascript
// Attach a behavior during initialization.
this._internals = this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });

// Access and modify behavior state.
this._internals.behaviors.htmlSubmitButton.formAction = '/custom';

// Dynamically update the behavior list (ObservableArray).
this._internals.behaviorList[0] = HTMLButtonBehavior;  // Replace at index.
```

### Platform-provided behaviors

Platform behaviors give custom elements capabilities that would otherwise require reimplementation or workarounds. Each behavior automatically provides:

- Event handling: Platform events (click, keydown, etc.) are wired up automatically.
- ARIA defaults: Implicit roles and properties for accessibility.
- Focusability: The element participates in the tab order as appropriate for the behavior.
- CSS pseudo-classes: Behavior-specific pseudo-classes are managed by the platform.

This proposal introduces `HTMLSubmitButtonBehavior`, which mirrors the submission capability of `<button type="submit">`:

| Capability | Details |
|------------|---------|
| Activation | Click and keyboard (Space/Enter) trigger form submission. |
| Implicit submission | The element participates in "Enter to submit" within forms. |
| ARIA | Implicit `role="button"`. |
| Focusability | Participates in tab order; removed when `disabled` is `true`. |
| CSS pseudo-classes | `:default`, `:disabled`/`:enabled`, `:focus`, `:focus-visible`. |

*Note: While `HTMLButtonElement` also supports generic button behavior (type="button") and reset behavior (type="reset"), this proposal focuses exclusively on introducing the submit behavior.*

`HTMLSubmitButtonBehavior` doesn't require the custom element to be form-associated (`static formAssociated = true`). This design mirrors native behavior: a `<button type="submit">` outside of a form is valid but has no effect when active.

| Scenario | Behavior |
|----------|----------|
| Form-associated element inside a form | Full functionality: activation triggers submission, participates in implicit submission, matches `:default`. |
| Form-associated element outside a form | `behavior.form` returns `null`, activation is a no-op (like a native button outside a form). |
| Non-form-associated element | Limited functionality: `behavior.form` returns `null`, implicit submission and `:default` don't apply. |

### Accessing behavior state

Each behavior exposes properties and methods from its corresponding native element. These are accessed via `this._internals.behaviors.<behaviorName>`. For `HTMLSubmitButtonBehavior`, the following properties are available (mirroring [`HTMLButtonElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLButtonElement)):

**Properties:**
- `disabled`
- `form` (read-only)
- `formAction`
- `formEnctype`
- `formMethod`
- `formNoValidate`
- `formTarget`
- `labels` (read-only)
- `name`
- `value`

### Property synchronization

`HTMLSubmitButtonBehavior` properties fall into three categories:

| Property | Sync behavior |
|----------|--------------|
| `disabled` | **Combined** with element's disabled state (see below). |
| `form` | **Read-only**, delegates to `ElementInternals.form`. |
| `labels` | **Read-only**, delegates to `ElementInternals.labels`. |
| `name`, `value` | **Independent** (behavior-specific, submitted with form). |
| `formAction`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget` | **Independent** (behavior-specific, override form attributes). |

##### Disabled state combination

The element is effectively disabled if either:
- `behavior.disabled` is `true`, or
- The element is disabled via attribute or ancestor `<fieldset disabled>`.

This allows:
- Element-level disabling (via `disabled` attribute or ancestor `<fieldset disabled>`) to automatically disable submission.
- Behavior-specific disabling without affecting other element functionality.

```javascript
class CustomSubmitButton extends HTMLElement {
    static formAssociated = true;

    constructor() {
        super();
        this._internals = this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });
    }
}

const btn = document.createElement('custom-submit-button');

// Disable via the behavior.
btn._internals.behaviors.htmlSubmitButton.disabled = true;
// Element is effectively disabled — clicking won't submit.

// Or disable via the element attribute.
btn.setAttribute('disabled', '');
// Also effectively disabled.

// Or disable via ancestor fieldset.
const fieldset = document.createElement('fieldset');
fieldset.disabled = true;
fieldset.appendChild(btn);
// Also effectively disabled.
```

```javascript
class CustomSubmitButton extends HTMLElement {
    constructor() {
        super();
        this._internals = this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });
    }

    get disabled() {
        return this._internals.behaviors.htmlSubmitButton.disabled;
    }

    set disabled(val) {
        this._internals.behaviors.htmlSubmitButton.disabled = val;
    }

    get formAction() {
        return this._internals.behaviors.htmlSubmitButton.formAction;
    }

    set formAction(val) {
        this._internals.behaviors.htmlSubmitButton.formAction = val;
    }
}
```

Behavior state is only accessible through `ElementInternals`, which is private to the element. To expose properties like `disabled` or `formAction` to external code, authors must define getters and setters. Authors are also responsible for attribute reflection (observing HTML attributes and mapping them to the corresponding properties). This gives authors full control over their element's public API.

### Updating behaviors dynamically

To support dynamic behavior changes (e.g., when the `type` attribute changes), `ElementInternals` exposes a `behaviorList` property as an [`ObservableArray`](https://webidl.spec.whatwg.org/#idl-observable-array) which supports in-place mutations:

```javascript
// Replace the entire list.
this._internals.behaviorList = [HTMLSubmitButtonBehavior];

// Replace a behavior at a specific index.
this._internals.behaviorList[0] = HTMLButtonBehavior;
```

### Behavior lifecycle

When the `behaviorList` is modified (via assignment or indexed assignment), the implementation observes the changes:

| Scenario | Behavior |
|----------|----------|
| Behavior added | The behavior is attached. Its event handlers become active. Default ARIA role is applied unless overridden by `ElementInternals.role`. |
| Behavior removed | The behavior is detached. Its event handlers are deactivated. Behavior-specific state (e.g., `formAction`, `disabled`) is cleared to default values. |
| Behavior retained (in both lists) | The behavior's state is preserved. Its position in the list may change. |

*Note: Behavior state is preserved when the custom element is disconnected and reconnected to the DOM (e.g., moved within the document).*

When a behavior is removed from the list, its state is cleared. If the same behavior is added back later, it starts with default state:

```javascript
// Set `formAction` on the submit behavior.
this._internals.behaviors.htmlSubmitButton.formAction = '/custom-action';

// Re-add the submit behavior — it starts with default state.
this._internals.behaviorList.push(HTMLSubmitButtonBehavior);

// formAction is now back to default (empty string).
console.log(this._internals.behaviors.htmlSubmitButton.formAction);  // ''
```

If web authors need to preserve state when swapping behaviors, they should save and restore it explicitly.

### Duplicate behaviors

Specifying the same behavior multiple times throws a `TypeError`. This applies to both the initial `attachInternals()` call and later modifications to `behaviorList`.

Throws `TypeError` due to duplicate behavior in behaviors list:
```javascript
this._internals = this.attachInternals({
  behaviors: [HTMLSubmitButtonBehavior, HTMLSubmitButtonBehavior]
});
```

Also throws if duplicates are added later:
```javascript
this._internals.behaviorList = [HTMLSubmitButtonBehavior];
this._internals.behaviorList.push(HTMLSubmitButtonBehavior);  // Throws `TypeError`.
```

### Naming Consistency

The current API uses:

- `behaviors` option in `attachInternals({ behaviors: [...] })`.
- `behaviors` property for read-only named access (e.g., `internals.behaviors.htmlSubmitButton`).
- `behaviorList` property for mutable array access.

**Pros:**
- Mirrors platform patterns where a concept has both a read-only view and a mutable collection (e.g., `classList` and `class` attribute, `relList` and `rel` attribute).
- Named access via `this._internals.behaviors.<behaviorName>` is convenient (no iteration needed) way to access a specific behavior's state.
- Clear separation of concerns: `behaviors` for reading/modifying behavior state, `behaviorList` for adding/removing behaviors.

**Cons:**
- Two property names (`behaviors` vs `behaviorList`) for related concepts may be confusing.
- Authors must remember which property to use: `behaviors` for state access, `behaviorList` for mutations.
- The name `behaviorList` is less intuitive than simply `behaviors`.

#### Alternative 1: Use `behaviors` everywhere (instantiated behaviors)

Behaviors are instantiated with `new` rather than passed as global class references, that way the author can access the behavior instance on a property (no lookup, no extra getter).

```javascript
// Instantiate the behavior and attach it.
this._submitBehavior = new HTMLSubmitButtonBehavior();
this._internals = this.attachInternals({ behaviors: [this._submitBehavior] });

// Access behavior state directly via the stored reference.
this._submitBehavior.formAction = '/custom';

// To swap behaviors, instantiate and replace.
this._buttonBehavior = new HTMLButtonBehavior();
this._internals.behaviors[0] = this._buttonBehavior;
```

*For future developer-defined behaviors:*

```javascript
class TooltipBehavior {
  #content = '';

  behaviorAttachedCallback(internals) { /* ... */ }
  behaviorDetachedCallback() { /* ... */ }

  get content() { return this.#content; }
  set content(val) { this.#content = val; }
}

// In custom element constructor:
this._tooltipBehavior = new TooltipBehavior();
this._internals = this.attachInternals({ behaviors: [this._tooltipBehavior] });

// Access state directly.
this._tooltipBehavior.content = 'Helpful tooltip text';
```

**Pros:**
- Simpler API with a single property name (no `behaviors` vs `behaviorList` split).
- No array lookup or `instanceof` checks needed as developers hold direct references.
- *Future* developer-defined behaviors are simpler: just instantiate and attach.
- Consistent mental model: behaviors are objects you create and manage.

**Cons:**
- Requires developers to manage behavior instances themselves.
- More setup code compared to passing class references directly.

#### Alternative 2: Add a getter for named access

- `attachInternals({ behaviors: [...] })` for the initial attachment.
- `internals.behaviors` returns the mutable `ObservableArray`.
- Add a `getBehavior(name)` method for named access and remove the separate named-access object (`this._internals.behaviors`).

```javascript
// Named access via method.
const submitBehavior = this._internals.getBehavior('htmlSubmitButton');
if (submitBehavior) {
  submitBehavior.formAction = '/custom';
}
```

**Pros:**
- Simpler API with a single property name.
- Named access is still available via a method.

**Cons:**
- `getBehavior()` is more verbose than `behaviors.htmlSubmitButton`.
- Still two ways to access behaviors (array vs method), which could cause confusion.

#### Alternative 3: Set instead of ObservableArray

Use a `Set<PlatformBehavior>` instead of an array for `behaviorList`:

```javascript
// Add behaviors
this._internals.behaviorList.add(HTMLSubmitButtonBehavior);

// Remove behaviors
this._internals.behaviorList.delete(HTMLSubmitButtonBehavior);

// Check for behavior
if (this._internals.behaviorList.has(HTMLSubmitButtonBehavior)) { ... }

// Clear all
this._internals.behaviorList.clear();
```

**Pros:**
- Natural fit for the "no duplicates" constraint—Sets enforce uniqueness.
- Clear add/delete semantics familiar to JavaScript developers.
- No need for indexed access, which was unintuitive anyway.

**Cons:**
- Sets are unordered in concept (though JS Sets maintain insertion order), which could complicate conflict resolution if order matters.
- WebIDL `ObservableArray` has established patterns; a "set-like" interface would need specification work.

### Behavior composition and conflict resolution

When multiple behaviors are attached to an element, they may provide overlapping capabilities. This section discusses strategies for resolving such conflicts.

For the built-in behaviors currently under consideration and mentioned in this document (`HTMLSubmitButtonBehavior`, `HTMLButtonBehavior`, `HTMLResetButtonBehavior`, etc.), no two are expected to be compatible. However, this framework allows for composability if use cases emerge, at which point a conflict resolution strategy would need to be followed.

The conflict resolution strategy should:

- Allow the platform to add new low-level behaviors to existing bundled behaviors without creating compatibility issues.
- Enable authors to reason about which behavior "wins" for any given capability.
- Give authors control over the outcome when behaviors conflict in meaningful ways.

Behaviors can conflict in several ways, such as:

| Conflict Type | Example |
|---------------|---------|
| ARIA role | Behaviors provide a default role |
| Event handling | Behaviors handle `click` in different ways |
| CSS pseudo-class | Behaviors contribute to `:disabled` |
| Mutually exclusive | Checkbox behavior combined with radio behavior |

#### Alternative 1: Order of precedence (preferred)

The order of behaviors in the array determines precedence. The last behavior in the array "wins" for any capability that can only have one value:

```javascript
// Last behavior's role wins.
this._internals = this.attachInternals({
  behaviors: [HTMLLabelBehavior, HTMLSubmitButtonBehavior]
});

// The element's implicit role is "button" (from HTMLSubmitButtonBehavior, last in list).
console.log(this.computedRole);  // "button"

// If the author sets `internals.role`, that takes precedence over all behavior defaults.
this._internals.role = 'link';
console.log(this.computedRole);  // "link"
```

There are two options for how strictly to apply last-in-wins:

##### Option A: Strict last-in-wins (properties and event handlers)

Last-in-wins applies uniformly to everything: properties, methods, and event handlers. Only the last behavior's handler for a given event runs.

```javascript
class LabeledSubmitButton extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this._internals = this.attachInternals({
      behaviors: [HTMLLabelBehavior, HTMLSubmitButtonBehavior]
    });
  }
}
```

When clicked:
- HTMLLabelBehavior's click handler is skipped.
- HTMLSubmitButtonBehavior's click handler runs → form submits.
Result: Form submits and no focus delegation occurs.

If the author wants both behaviors' handlers to run, they must manually invoke the earlier behavior's logic:

```javascript
this.addEventListener('click', () => {
  // Manually trigger label behavior's focus delegation.
  const labelTarget = this._internals.behaviors.htmlLabel?.control;
  if (labelTarget) {
    labelTarget.focus();
  }
});
```

**Pros:**
- Consistent mental model: authors always know last-in-wins applies.
- No unexpected double-actions (e.g., submit form and delegate focus).

**Cons:**
- Authors who want both handlers must manually wire up the earlier behavior's logic.
- May not match author expectations if they assume events "stack" like regular DOM event listeners.

##### Option B: Last-in-wins for properties, additive for events (preferred)

Properties are inherently exclusive (an element can only have one `role`, one `disabled` state, one `formAction` value), but events are additive in the DOM (multiple listeners can respond to the same event). Behaviors following this pattern align with how authors already think about event handling.

Event handlers run in reverse array order (last-to-first), so the last behavior in the array has priority for both properties and events. For events, "priority" means running first. For example:

```javascript
class LabeledSubmitButton extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this._internals = this.attachInternals({
      behaviors: [HTMLLabelBehavior, HTMLSubmitButtonBehavior]
    });
  }
}
```

When clicked:
- HTMLSubmitButtonBehavior's click handler runs first → form submits.
- HTMLLabelBehavior's click handler runs second → delegates focus to associated control.
Result: Form submits and delegates focus.

**Pros:**
- Matches DOM event semantics (multiple listeners can coexist).
- Enables composition where behaviors handle different aspects of the same event.

**Cons:**
- Risk of unexpected double-actions if authors don't realize both handlers run.

**Shared considerations for both options:**

**Pros:**
- Simple and predictable once understood.
- Enables forward compatibility: if a future version of `HTMLSubmitButtonBehavior` internally composes a new low-level behavior, the existing resolution rules still apply.

**Cons:**
- May hide subtle issues. For example:
  - If two behaviors both provide `disabled`, setting it on one doesn't sync to the other. Authors might not realize which behavior's `disabled` is "winning."
  - An unexpected ARIA role could harm accessibility if the author doesn't notice the last behavior overrode the intended role.
- Authors may accidentally combine behaviors that don't make sense together.

#### Alternative 2: Compatibility allow-list

Compatibility between behaviors are defined in the specification. This follows the pattern used by [`attachShadow`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow), where the [list of valid shadow host names](https://dom.spec.whatwg.org/#valid-shadow-host-name) is spec-defined and enforced at runtime. Web authors can reference documentation or DevTools errors to determine which combinations are valid.

Any combination not explicitly allowed would be rejected by `attachInternals()`, preventing invalid states (like being both a button and a form):

```javascript
// This would work if anchor were made compatible with button (nav-button pattern).
this.attachInternals({ 
  behaviors: [HTMLButtonBehavior, HTMLAnchorBehavior]
});

// Throws: checkbox is not compatible with submit button.
this.attachInternals({ 
  behaviors: [HTMLSubmitButtonBehavior, HTMLCheckboxBehavior]
});
// Error message: "HTMLSubmitButtonBehavior is not compatible with HTMLCheckboxBehavior".
```

There can be two interpretations of what "compatible behaviors" means:

1. Compatible behaviors have completely disjoint capabilities (e.g., one provides `disabled`, the other provides `href`). No conflict resolution is needed because they never touch the same property or event.
2. Compatible behaviors may share some capabilities (e.g., both provide a role or handle click). In this case, a conflict resolution strategy (Alternative 1 or 3) is still required for overlapping capabilities.

**Pros:**
- Prevents nonsensical combinations at attachment time.
- Clear error messages guide developers to do the *right thing*.
- The platform can expand compatibility lists in future versions without breaking existing code.

**Cons:**
- More restrictive as authors can't experiment with novel combinations.
- Requires the platform to update compatibility lists.
- May block legitimate use cases that weren't anticipated.
- Must still be combined with Alternative 1 or 3 when compatible behaviors have overlapping capabilities.

#### Alternative 3: Explicit conflict resolution

If conflicts occur, the platform requires the author to explicitly resolve them. This applies to properties, methods, and event handlers:

```javascript
class LabeledSubmitButton extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this._internals = this.attachInternals({ 
      behaviors: [HTMLLabelBehavior, HTMLSubmitButtonBehavior],
      resolve: {
        role: 'button',  // Use button role.
        click: 'all',  // Both handlers run. Also could be 'first', 'last'.
        disabled: 'HTMLSubmitButtonBehavior'  // Use submit button's disabled.
      }
    });
  }
}
```

**Pros:**
- Authors have full control over conflict resolution, no hidden behavior.
- Supports complex use cases where default resolution isn't appropriate.
- Authors can mix strategies (e.g., last-in-wins for role, additive for events).

**Cons:**
- More verbose API.
- Adds complexity for simple cases where order-based resolution would suffice.
- Authors must understand all potential conflicts to resolve them correctly.

### Other considerations

This proposal supports common web component patterns:

- Authors can define a single class that handles multiple modes (submit, reset, button) by updating `behaviorList` at runtime in response to attribute changes, without needing to define separate classes for each behavior.
- A child class extends the parent's functionality and retains access to the `ElementInternals` object and its active behaviors.
- `HTMLSubmitButtonBehavior` and subsequent platform-provided behaviors should be understood as bundles of state, event handlers, and accessibility defaults and not opaque tokens. Web authors can reason about what a behavior provides (e.g., click/Enter triggers form submission, implicit `role="button"`, focusability, `:disabled` pseudo-class) and anticipate how it composes with other behaviors. This framework would also enable polyfilling: because behaviors have well-defined capabilities, authors can approximate new behaviors in *userland* before native support ships (see [Developer-defined behaviors](#developer-defined-behaviors) in [Future Work](#future-work)).
- This proposal targets autonomous custom elements that need platform behavior (e.g., when needing Shadow DOM and custom APIs or building a design system component that is an autonomous custom element). Making native elements more flexible (Customizable Select, open-stylable controls) is valuable and complementary, but doesn't completely eliminate the need for autonomous custom elements.
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

```javascript
class DesignSystemButton extends HTMLElement {
    static formAssociated = true;
    static observedAttributes = ['type', 'disabled', 'formaction'];

    constructor() {
        super();
        this._internals = this.attachInternals();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this._updateBehaviors();
        this._syncAttributes();
        this._render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'type') {
            this._updateBehaviors();
        }
        this._syncAttributes();
        this._render();
    }

    _updateBehaviors() {
        const type = this.getAttribute('type');
        // Set the appropriate behavior based on type.
        if (type === 'submit') {
            this._internals.behaviorList = [HTMLSubmitButtonBehavior];
        } else if (type === 'reset') {
            this._internals.behaviorList = [HTMLResetButtonBehavior];
        } else {
            this._internals.behaviorList = [HTMLButtonBehavior];
        }
    }

    _syncAttributes() {
        // Sync HTML attributes to behavior state.
        const submitBehavior = this._internals.behaviors.htmlSubmitButton;
        if (submitBehavior) {
            submitBehavior.formAction = this.getAttribute('formaction') || '';
        }
        // Other attributes like `disabled`, `value`, etc. would be set on
        // the proper behavior interface.
    }

    // Expose element state.
    get type() {
        return this.getAttribute('type') || 'button';
    }
    set type(val) {
        this.setAttribute('type', val);
    }

    get formAction() {
        return this._internals.behaviors.htmlSubmitButton?.formAction ?? '';
    }
    set formAction(val) {
        if (this._internals.behaviors.htmlSubmitButton) {
            this._internals.behaviors.htmlSubmitButton.formAction = val;
        }
    }

    // Additional getters/setters for `disabled`, `formMethod`, `formEnctype`,
    // `formNoValidate`, `formTarget`, `name`, and `value` would follow the
    // same pattern.

    _render() {
        const isSubmit = this._internals.behaviorList.includes(HTMLSubmitButtonBehavior);
        const isReset = this._internals.behaviorList.includes(HTMLResetButtonBehavior);

        this.shadowRoot.innerHTML = `
            <style>...</style>
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

    <!-- Regular button. -->
    <ds-button>Cancel</ds-button>
</form>
```

The element gains:

- Click and keyboard activation (Space/Enter).
- Focusability (participates in tab order; removed when disabled).
- Implicit ARIA `role="button"` that can be overriden by the web author.
- Form submission on activation.
- CSS pseudo-class matching: `:default`, `:disabled`/`:enabled`.
- Participation in implicit form submission.
- Attributes can be changed at runtime to switch between behaviors.
- Behavior properties like `disabled` and `formAction` are accessible via `this._internals.behaviors` and can be exposed.

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
    this._internals = this.attachInternals({ 
      behaviors: [HTMLButtonBehavior, HTMLAnchorBehavior]
    });
    // Explicitly set the role.
    this._internals.role = 'link';
  }

  connectedCallback() {
    // Set navigation target.
    this._internals.behaviors.htmlAnchor.href = this.getAttribute('href');
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
this.attachInternals({ 
  behaviors: [HTMLCheckboxBehavior, HTMLRadioGroupBehavior]
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

A future extension of this proposal could allow developers to define their own reusable behaviors:

```javascript
class TooltipBehavior extends PlatformBehavior {
  #content = '';
  #tooltipElement = null;

  behaviorAttachedCallback(internals) {
    this.element.addEventListener('mouseenter', this.#show);
    this.element.addEventListener('mouseleave', this.#hide);
    this.element.addEventListener('focus', this.#show);
    this.element.addEventListener('blur', this.#hide);
  }

  behaviorDetachedCallback() {
    this.element.removeEventListener('mouseenter', this.#show);
    this.element.removeEventListener('mouseleave', this.#hide);
    this.element.removeEventListener('focus', this.#show);
    this.element.removeEventListener('blur', this.#hide);
    this.#hide();
  }

  #show = () => {
    if (!this.#content) {
      return;
    }
    this.#tooltipElement = document.createElement('div');
    this.#tooltipElement.className = 'tooltip';
    this.#tooltipElement.textContent = this.#content;
    this.#tooltipElement.setAttribute('role', 'tooltip');
    document.body.appendChild(this.#tooltipElement);
    // Position tooltip near element.
  };

  #hide = () => {
    this.#tooltipElement?.remove();
    this.#tooltipElement = null;
  };

  get content() {
    return this.#content;
  }
  set content(val) {
    this.#content = val;
  }

  // Name used for `internals.behaviors.<name>` access.
  static behaviorName = 'tooltip';
}
```

Behaviors are classes with the appropriate methods (`behaviorAttachedCallback`, `behaviorDetachedCallback`) and an optional static `behaviorName` property for named access. The behavior class is passed directly to `behaviors`:

```javascript
class CustomButton extends HTMLElement {
  constructor() {
    super();

    this._internals = this.attachInternals({ 
      behaviors: [TooltipBehavior, HTMLSubmitButtonBehavior] 
    });
  }

  connectedCallback() {
    // Named access uses the static behaviorName property.
    this._internals.behaviors.tooltip.content = this.getAttribute('tooltip');
  }
}
```

`TooltipBehavior` could be combined with platform-provided behaviors. Here, `CustomButton` gains both tooltip functionality (show on hover/focus) and submit button semantics (click/Enter submits forms, implicit submission, `role="button"`).

#### Polyfilling behaviors

This design also would enable **polyfilling** new platform behaviors before they ship natively. Consider `HTMLDialogBehavior` (from `<dialog>`):

```javascript
// Polyfill for HTMLDialogBehavior.
class HTMLDialogBehaviorPolyfill extends PlatformBehavior {
  #open = false;
  #returnValue = '';
  #modal = false;
  #previouslyFocused = null;

  behaviorAttachedCallback(internals) {
    this.setDefaultRole('dialog');
    this.element.addEventListener('keydown', this.#handleKeydown);
    this.element.addEventListener('click', this.#handleBackdropClick);
  }

  behaviorDetachedCallback() {
    this.element.removeEventListener('keydown', this.#handleKeydown);
    this.element.removeEventListener('click', this.#handleBackdropClick);
    this.close();
  }

  show() {
    this.#open = true;
    this.#modal = false;
    this.element.setAttribute('open', '');
    // Focus first focusable element.
  }

  showModal() {
    this.#open = true;
    this.#modal = true;
    this.#previouslyFocused = document.activeElement;
    this.element.setAttribute('open', '');
  }

  close(returnValue) {
    if (!this.#open) {
      return;
    }
    if (returnValue !== undefined) {
      this.#returnValue = returnValue;
    }
    this.#open = false;
    this.element.removeAttribute('open');
    this.#previouslyFocused?.focus();
    this.element.dispatchEvent(new Event('close'));
  }

  #handleKeydown = (e) => {
    if (e.key === 'Escape' && this.#open) {
      const cancelEvent = new Event('cancel', { cancelable: true });
      this.element.dispatchEvent(cancelEvent);
      if (!cancelEvent.defaultPrevented) {
        this.close();
      }
    }
  };

  // Implementation of focus trapping, backdrop click handling, etc.

  get open() {
    return this.#open;
  }
  get returnValue() {
    return this.#returnValue;
  }
  set returnValue(val) {
    this.#returnValue = val;
  }

  static behaviorName = 'htmlDialog';
}

// Use polyfill until native support arrives.
const HTMLDialogBehavior = globalThis.HTMLDialogBehavior ?? HTMLDialogBehaviorPolyfill;
```

Although the polyfill above can't fully replicate a native `<dialog>` element (no true top layer, no `::backdrop`, no `:modal`), it provides a reasonable approximation.

#### Considerations for developer-defined behaviors

- They can compose with platform-provided behaviors.
- The same conflict resolution strategies that apply to platform behaviors would need to work with developer-defined behaviors.
- Named access via `internals.behaviors.<name>` uses the static `behaviorName` property on the class. If omitted, the behavior would only be accessible via array iteration or `find()`.

### Behaviors in native HTML elements

Although this proposal currently focuses on custom elements, the behavior pattern could potentially be generalized to all HTML elements (e.g., a `<div>` element gains button behavior via behaviors). However, extending behaviors to native HTML elements would raise questions about correctness and accessibility.

## Open questions

### Should behavior properties be automatically exposed on the element?

The current proposal requires developers to manually create getters/setters that delegate to `this._internals.behaviors.htmlSubmitButton.*`. There are alternative approaches worth considering:

#### Option A: Manual property delegation (current proposal)

**Pros:**
- Authors have full control over their element's public API.
- No naming conflicts.
- Authors can add validation, transformation, or side effects in setters.
- Familiar pattern.

**Cons:**
- Boilerplate for each property the author wants to expose.
- For future behaviors like `HTMLInputBehavior`, not exposing `value` means external code can't read or set the input's data without the developer writing boilerplate getters and setters.

#### Option B: Automatic property exposure

The platform automatically adds behavior properties to the custom element:

```javascript
class CustomSubmitButton extends HTMLElement {
    constructor() {
        super();
        this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });
    }
}

const btn = document.createElement('custom-submit');
// Works without any getter/setter.
btn.disabled = true;
btn.formAction = '/save';
```

**Pros:**
- Zero boilerplate code to get and set properties.
- Matches how native elements work (a `<button>` just has `disabled`).
- For future behaviors like `HTMLCheckboxBehavior` external code can read/write `checked` without the developer writing any delegation code.

**Cons:**
- Naming conflicts if the element already defines a property with the same name.
- Less control over the public API surface.
- Authors can't easily add validation or side effects to setters.
- May feel "magical" compared to explicit delegation.
- Unclear behavior when a behavior is removed. If `formAction` was automatically exposed when `HTMLSubmitButtonBehavior` was attached, what happens to that property after the behavior is removed? Does it remain on the element with a stale value, or is it removed?

```javascript
const btn = document.createElement('custom-submit');
btn.formAction = '/save';
btn.removeBehavior();
btn.formAction;  // Is it still there?
```

#### Option C: Opt-in automatic exposure

A middle ground where authors can choose:

```javascript
// Explicit delegation (default).
this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });

// Opt-in to automatic exposure.
this.attachInternals({ 
    behaviors: [HTMLSubmitButtonBehavior],
    exposeProperties: true  // or list specific properties.
});
```

**Pros:**
- Flexibility: authors choose the right approach for their use case.
- Backwards compatible with explicit delegation.

**Cons:**
- More complex API.
- Still needs to handle naming conflicts when `exposeProperties` is enabled.

#### Why this matters

Future behaviors would likely require developers to expose certain properties for the element to be useful to consumers. Without developer-written delegation, external JavaScript code can't access these properties:

| Behavior | Key property | Impact if not exposed |
|----------|------------------|------|
| `HTMLCheckboxBehavior` | `checked` | The behavior toggles internal state on click, but external scripts can't read or set it. |
| `HTMLInputBehavior` | `value` | External scripts can't programmatically read the input's data or populate it. (Form submission would still work via `setFormValue()`.) |
| `HTMLRadioGroupBehavior` | `checked` | Mutual exclusion happens internally, but external scripts can't query which radio is selected. |

If `HTMLSubmitButtonBehavior` uses manual delegation but `HTMLCheckboxBehavior` uses automatic exposure, we'd have an inconsistent API surface. This argues for deciding on a consistent approach across all behaviors from the start.

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
- Behavior is fixed at class definition time and authors might need to generate many class variations for different behavior combinations.
- It strictly binds behavior to the JavaScript class hierarchy, making a future declarative syntax hard to implement without creating new classes.

Rejected in favor of the imperative API because it prevents the "single class, multiple behaviors" pattern that is common in HTML (e.g., `<input>`, `<button>`).

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

Expose individual primitives (focusability, disabled, keyboard activation) directly on `ElementInternals`:

```javascript
interface ElementInternals extends ARIAMixin {
    disabled: boolean;        // Controls :disabled/:enabled
    focusable: boolean;       // Equivalent to tabindex="-1"
    tabable: boolean;         // Equivalent to tabindex="0"
    checked: boolean;         // Controls :checked
    indeterminate: boolean;   // Controls :indeterminate
    inRange: boolean | null;  // Controls :in-range/:out-of-range
    required: boolean | null; // Controls :required/:optional
    userInteracted: boolean;  // Indirectly controls :user-valid/:user-invalid
    // etc.
}
```

**Pros:**
- Maximum flexibility—authors compose exactly what they need.
- Each primitive is independently useful.
- Mirrors how CSS pseudo-classes work conceptually.

**Cons:**
- **Semantic interdependencies**: As discussed in ["Why bundled behaviors"](#why-bundled-behaviors-not-just-primitives), primitives like `disabled` and `focusable` interact with each other, with accessibility, and with event handling. Setting `internals.disabled = true` without the associated behavior means the element *looks* disabled but still receives clicks, remains in the tab order, and submits with the form.
- **Accessibility complexity**: Even seemingly simple primitives like focusability have [significant complexity](https://github.com/nicoritschel/webcomponents/issues/762) around accessibility integration. This is why `popovertarget` is limited to buttons—it was originally intended for any element, but the accessibility requirements around focusability and activation made buttons the practical choice.
- **Doesn't solve the core problem**: Form submission participation is actually a primitive itself (it can't be broken down further), and there's no API for it today. Exposing `disabled` or `focusable` individually wouldn't give custom elements the ability to participate in implicit form submission.

**Path forward**: Behaviors should come first to establish the pattern and validate semantics. Primitives could be exposed later if use cases emerge where behaviors are too coarse, and future primitives could "explain" behaviors without requiring primitives to ship first.

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

- [Real Mixins with JavaScript Classes](https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/) by [Justin Fagnani](https://github.com/justinfagnani).
- [ElementInternals.type proposal](https://github.com/whatwg/html/issues/11061).
- [Custom Attributes proposal](https://github.com/WICG/webcomponents/issues/1029).
- [TC39 Maximally Minimal Mixins proposal](https://github.com/tc39/proposal-mixins).
- Lit framework's [reactive controllers pattern](https://lit.dev/docs/composition/controllers/).
- [Expose certain behavioural attributes via ElementInternals proposal](https://github.com/whatwg/html/issues/11752).

### Related issues and discussions

- [WICG/webcomponents#814](https://github.com/WICG/webcomponents/issues/814) - Form submission from custom elements
- [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation
- [whatwg/html#5423](https://github.com/whatwg/html/issues/5423), [whatwg/html#11584](https://github.com/whatwg/html/issues/11584) - Label behaviors
- [whatwg/html#10220](https://github.com/whatwg/html/issues/10220) - Custom elements as forms
- [w3c/tpac2023-breakouts#44](https://github.com/w3c/tpac2023-breakouts/issues/44) - TPAC 2023 discussion
- [WebKit/standards-positions#97](https://github.com/WebKit/standards-positions/issues/97) - WebKit position on customized built-ins
