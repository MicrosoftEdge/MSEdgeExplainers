# Platform-Provided Behaviors for Custom Elements

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

## Participate

- [WHATWG tracking issue](https://github.com/whatwg/html/issues/12150)

## Introduction

Custom element authors frequently need their elements to leverage platform behaviors that are currently exclusive to native HTML elements, such as [form submission](https://github.com/WICG/webcomponents/issues/814), [popover invocation](https://github.com/whatwg/html/issues/9110), [label behaviors](https://github.com/whatwg/html/issues/5423#issuecomment-1517653183), [form semantics](https://github.com/whatwg/html/issues/10220), and [radio button grouping](https://github.com/whatwg/html/issues/11061#issuecomment-3250415103). This proposal introduces platform-provided behaviors as a mechanism for autonomous custom elements to adopt specific native HTML element behaviors. Rather than requiring developers to reimplement native behaviors in JavaScript or extend native elements (customized built-ins), this approach exposes native capabilities as composable behaviors.

## User-Facing Problem

Custom element authors can't access native behaviors that are built into native HTML elements. This forces them to either:

1. Use customized built-ins (`is/extends` syntax), which have [Shadow DOM limitations](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to) and [can't use the ElementInternals API](https://github.com/whatwg/html/issues/5166).
2. Try to reimplement native logic in JavaScript, which is error-prone and often less performant.
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

## Proposed Approach

This proposal introduces a `behaviors` option to `attachInternals()` and two properties on `ElementInternals`: a read-only `behaviors` property for accessing behavior state, and a `behaviorList` property for dynamically updating attached behaviors. This enables composition while keeping the API simple.

```javascript
// Attach a behavior during initialization.
this._internals = this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });

// Access and modify behavior state.
this._internals.behaviors.htmlSubmitButton.formAction = '/custom';

// Dynamically update the behavior list (ObservableArray).
this._internals.behaviorList[0] = HTMLButtonBehavior;  // Replace at index
```

### Platform-Provided Behaviors

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

If the same behavior is specified multiple times, it appears only once in `behaviorList`. This prevents confusion about which "instance" of a behavior is active and avoids questions like "which duplicate's state am I modifying?"

```javascript
this._internals = this.attachInternals({
  behaviors: [HTMLSubmitButtonBehavior, HTMLSubmitButtonBehavior]
});

// Despite passing the same behavior twice, it only appears once.
console.log(this._internals.behaviorList.length);  // 1
console.log(this._internals.behaviorList[0] === HTMLSubmitButtonBehavior);  // true
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

#### Alternative 1: Use `behaviors` everywhere

- `attachInternals({ behaviors: [...] })` for the initial attachment.
- `internals.behaviors` returns the mutable `ObservableArray`.
- Remove the separate read-only named-access object.

```javascript
// Attach behaviors.
this._internals = this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });

// Mutate the array directly.
this._internals.behaviors[0] = HTMLButtonBehavior;

// To access a behavior state, iteration is required.
for (const behavior of this._internals.behaviors) {
  if (behavior instanceof HTMLSubmitButtonBehavior) {
    behavior.formAction = '/custom';
  }
}
```

**Pros:**
- Simpler API with a single property name.
- Consistent naming throughout.
- Fewer concepts to learn.

**Cons:**
- Loses the convenience of named access (`behaviors.htmlSubmitButton`).
- Authors must iterate and/or use `instanceof` checks to access a specific behavior's state.
- Mixing state access and array mutation on the same property could be confusing.

#### Alternative 2: Add a getter for named access

- `attachInternals({ behaviors: [...] })` for the initial attachment.
- `internals.behaviors` returns the mutable `ObservableArray`.
- Add a `getBehavior(name)` method for named access.

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

### Behavior composition and conflict resolution

When multiple behaviors are attached to an element, they may provide overlapping capabilities. The conflict resolution strategy should:

- Allow the platform to add new low-level behaviors to existing bundled behaviors without creating compatibility issues.
- Enable authors to reason about which behavior "wins" for any given capability.
- Give authors control over the outcome when behaviors conflict in meaningful ways.

Behaviors can conflict in several ways:

| Conflict Type | Example |
|---------------|---------|
| ARIA role | Two behaviors each provide a default role |
| Event handling | Two behaviors both handle `click` |
| CSS pseudo-class | Two behaviors both contribute to `:disabled` |
| Form participation | Two behaviors both want to submit form data |
| Mutually exclusive | Checkbox behavior + radio behavior |

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

// When clicked:
// - HTMLLabelBehavior's click handler is skipped.
// - HTMLSubmitButtonBehavior's click handler runs → form submits.
// Result: Form submits; no focus delegation occurs.
```

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

##### Option B: Last-in-wins for properties, additive for events

Properties are inherently exclusive—an element can only have one `role`, one `disabled` state, one `formAction` value. However, events are inherently additive in the DOM: multiple listeners can respond to the same event. Behaviors following this pattern align with how authors already think about event handling.

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

// When clicked:
// 1. HTMLLabelBehavior's click handler runs → delegates focus to associated control.
// 2. HTMLSubmitButtonBehavior's click handler runs → form submits.
// Result: Delegates focus and form submits.
```

**Pros:**
- Matches DOM event semantics (multiple listeners can coexist).
- Enables composition where behaviors handle different aspects of the same event.

**Cons:**
- Split rules may confuse authors ("why does `role` use last-in-wins but `click` doesn't?").
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

Each behavior defines a list of compatible behaviors that can be used in combination. Any combination not explicitly allowed is rejected by `attachInternals()`, preventing invalid states (like being both a button and a form):

```javascript
// Platform-defined allow-lists:
HTMLButtonBehavior.compatibleWith = [HTMLAnchorBehavior, HTMLLabelBehavior];
HTMLSubmitButtonBehavior.compatibleWith = [HTMLLabelBehavior];
```
in *userland*:
```javascript
// This works: anchor is in the button's allow-list (nav-button pattern).
this.attachInternals({ 
  behaviors: [HTMLButtonBehavior, HTMLAnchorBehavior]
});

// This throws: checkbox is not in submit button's allow-list.
this.attachInternals({ 
  behaviors: [HTMLSubmitButtonBehavior, HTMLCheckboxBehavior]
});
// Error message: "HTMLSubmitButtonBehavior is not compatible with HTMLCheckboxBehavior".
```

**Pros:**
- Prevents nonsensical combinations at attachment time.
- Clear error messages guide developers to do the *right thing*.
- The platform can expand compatibility lists in future versions without breaking existing code.

**Cons:**
- More restrictive as authors can't experiment with novel combinations.
- Requires the platform to update compatibility lists.
- May block legitimate use cases that weren't anticipated.

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

### Other Considerations

This proposal supports common web component patterns:

- Authors can define a single class that handles multiple modes (submit, reset, button) by updating `behaviorList` at runtime in response to attribute changes, without needing to define separate classes for each behavior.
- A child class extends the parent's functionality and retains access to the `ElementInternals` object and its active behaviors.
- `HTMLSubmitButtonBehavior` and subsequent platform-provided behaviors should be understood as bundles of state, event handlers, and accessibility defaults and not opaque tokens. Web authors can reason about what a behavior provides (e.g., click/Enter triggers form submission, implicit `role="button"`, focusability, `:disabled` pseudo-class) and anticipate how it composes with other behaviors. This framework would also enable polyfilling: because behaviors have well-defined capabilities, authors can to approximate new behaviors in *userland* before native support ships (see [User-defined behaviors](#user-defined-behaviors) in [Future Work](#future-work)).
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

    <!-- Submit button with custom form action -->
    <ds-button type="submit" formaction="/draft">Save Draft</ds-button>

    <!-- Default submit button (matches :default) -->
    <ds-button type="submit">Save</ds-button>

    <!-- Reset button -->
    <ds-button type="reset">Reset</ds-button>

    <!-- Regular button -->
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

1. Use `<a>` styled as a button, but lose button keyboard semantics: Space doesn't activate, only Enter does and screen readers announce it as a link, not a button.

```html
<!-- <a> styled as a button -->
<!-- Add button role for screen readers. -->
<a href="/signup" class="button-styles" role="button">Sign Up</a>

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
<!-- <button> with JavaScript navigation -->
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

  // "Open in new tab" isn't possible, as author can't intercept the context menu.
  // To implement download behavior author would have to create a temporary <a> element.
</script>
```

3. Design systems may create separate `<Button>` and `<LinkButton>` components with duplicated styling and logic. React Router's `<Link as={Button}>` pattern attempts to merge these, but the underlying element can only be one or the other.

Combining `HTMLButtonBehavior` (from `<button type=button>`) with `HTMLAnchorBehavior` (from `<a>`) solves this by giving the element:

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

These behaviors are compatible because:

- Button provides keyboard activation (Space/Enter) and anchor provides navigation on the same `click` event.
- They have complementary properties: button has `disabled`, anchor has `href`, `target`, `download`.
- Both are focusable elements.

**Role conflict:** `HTMLButtonBehavior` provides `role="button"` while `HTMLAnchorBehavior` provides `role="link"`. Under the last-in-wins rule, the element would have `role="link"`. If the author wants `role="button"`, they can either reorder the behaviors or set `internals.role = 'button'` explicitly. The conflict resolution strategy matters as even compatible behaviors may overlap in specific capabilities.

#### Conflicting Behaviors

Some behaviors are inherently mutually exclusive.

```javascript
this.attachInternals({ 
  behaviors: [HTMLCheckboxBehavior, HTMLRadioGroupBehavior]
});
```

| Capability | HTMLCheckboxBehavior | HTMLRadioGroupBehavior | Last-in-wins result |
|------------|---------------------|------------------------|---------------------|
| `checked` property | Toggles independently on/off | Checking one unchecks others from the group | Radio's `checked` wins: setting `true` unchecks other radios in the group |
| Click handling | Toggles `checked` state | Sets `checked = true` (radios don't toggle off) | Radio's handler wins: clicking sets `checked = true` but doesn't toggle off |
| ARIA role | `role="checkbox"` | `role="radio"` | `role="radio"` |
| `aria-checked` | `"true"` / `"false"` / `"mixed"` | `"true"` / `"false"` | Radio's semantics (no `"mixed"` state) |

The result is incoherent: the element has radio semantics for the `checked` property (group coordination) but the checkbox's click handler might still try to toggle off—or vice versa depending on event handler ordering. An element cannot meaningfully be both a checkbox and a radio button.

## Future Work

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

### User-defined behaviors

A future extension of this proposal could allow developers to define their own reusable behaviors:

```javascript
class TooltipBehavior extends PlatformBehavior {
  #content = '';
  #tooltipElement = null;

  onAttached(internals) {
    this.element.addEventListener('mouseenter', this.#show);
    this.element.addEventListener('mouseleave', this.#hide);
    this.element.addEventListener('focus', this.#show);
    this.element.addEventListener('blur', this.#hide);
  }

  onDetached() {
    this.element.removeEventListener('mouseenter', this.#show);
    this.element.removeEventListener('mouseleave', this.#hide);
    this.element.removeEventListener('focus', this.#show);
    this.element.removeEventListener('blur', this.#hide);
    this.#hide();
  }

  #show = () => {
    if (!this.#content) return;
    this.#tooltipElement = document.createElement('div');
    this.#tooltipElement.className = 'tooltip';
    this.#tooltipElement.textContent = this.#content;
    this.#tooltipElement.setAttribute('role', 'tooltip');
    document.body.appendChild(this.#tooltipElement);
    // Position tooltip near element...
  };

  #hide = () => {
    this.#tooltipElement?.remove();
    this.#tooltipElement = null;
  };

  get content() { return this.#content; }
  set content(val) { this.#content = val; }
}
// Registration
PlatformBehavior.define('tooltip', TooltipBehavior);
```

`TooltipBehavior` could be combined with platform-provided behaviors. Here, `CustomButton` gains both tooltip functionality (show on hover/focus) and submit button semantics (click/Enter submits forms, implicit submission, `role="button"`):

```javascript
class CustomButton extends HTMLElement {
  constructor() {
    super();

    this._internals = this.attachInternals({ 
      behaviors: [TooltipBehavior, HTMLSubmitButtonBehavior] 
    });
  }

  connectedCallback() {
    this._internals.behaviors.tooltip.content = this.getAttribute('tooltip');
  }
}
```

#### Polyfilling behaviors

This design also would enable **polyfilling** new platform behaviors before they ship natively. Consider `HTMLDialogBehavior` (from `<dialog>`):

```javascript
// Polyfill for HTMLDialogBehavior:
class HTMLDialogBehaviorPolyfill extends PlatformBehavior {
  #open = false;
  #returnValue = '';
  #modal = false;
  #previouslyFocused = null;

  onAttached(internals) {
    this.setDefaultRole('dialog');
    this.element.addEventListener('keydown', this.#handleKeydown);
    this.element.addEventListener('click', this.#handleBackdropClick);
  }

  onDetached() {
    this.element.removeEventListener('keydown', this.#handleKeydown);
    this.element.removeEventListener('click', this.#handleBackdropClick);
    this.close();
  }

  show() {
    this.#open = true;
    this.#modal = false;
    this.element.setAttribute('open', '');
    // Focus first focusable element...
  }

  showModal() {
    this.#open = true;
    this.#modal = true;
    this.#previouslyFocused = document.activeElement;
    this.element.setAttribute('open', '');
  }

  close(returnValue) {
    if (!this.#open) return;
    if (returnValue !== undefined) this.#returnValue = returnValue;
    this.#open = false;
    this.element.removeAttribute('open');
    this.#previouslyFocused?.focus();
    this.element.dispatchEvent(new Event('close'));
  }

  #handleKeydown = (e) => {
    if (e.key === 'Escape' && this.#open) {
      const cancelEvent = new Event('cancel', { cancelable: true });
      this.element.dispatchEvent(cancelEvent);
      if (!cancelEvent.defaultPrevented) this.close();
    }
  };

  // Implementation of focus trapping, backdrop click handling, etc.

  get open() { return this.#open; }
  get returnValue() { return this.#returnValue; }
  set returnValue(val) { this.#returnValue = val; }
}
PlatformBehavior.define('dialog', HTMLDialogBehaviorPolyfill);

// Use polyfill until native support arrives.
const HTMLDialogBehavior = 
  globalThis.HTMLDialogBehavior ?? HTMLDialogBehaviorPolyfill;
```

Although the polyfill above can't fully replicate a native `<dialog>` element (no true top layer, no `::backdrop`, no `:modal`), it provides a reasonable approximation.

#### Considerations for user-defined behaviors

- Lifecycle hooks: `onAttached(internals)`, `onDetached()`, `onAttributeChanged(name, oldVal, newVal)`
- `PlatformBehavior` would need to provide utilities like `setDefaultRole()`, `setFocusable()`, `invalidatePseudoClass()`, and access to `this.element`.
- User behaviors can compose with platform-provided behaviors
- The same conflict resolution strategies that apply to platform behaviors would need to work with user-defined behaviors.
- How would custom behaviors be defined and registered? `Behavior.define(name, BehaviorClass)` registers for named access via `internals.behaviors.<name>`?

### Behaviors in Native HTML Elements

This proposal currently focuses on custom elements, but the behavior pattern could potentially be generalized to all HTML elements (e.g., a `<div>` element gains button behavior via behaviors). Extending behaviors to native HTML elements would raise questions about correctness and accessibility.

## Open Questions

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
// Explicit delegation (default)
this.attachInternals({ behaviors: [HTMLSubmitButtonBehavior] });

// Opt-in to automatic exposure
this.attachInternals({ 
    behaviors: [HTMLSubmitButtonBehavior],
    exposeProperties: true  // or list specific properties
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
            // Submit form logic
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

Custom attributes are complementary but don't provide access to native behaviors. They're useful for userland behavior composition but can't trigger form submission, invoke popovers through platform code, etc.

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

## Accessibility, Security, and Privacy Considerations

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

## Stakeholder Feedback / Opposition

### Browser Vendors

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

### Related Issues and Discussions

- [WICG/webcomponents#814](https://github.com/WICG/webcomponents/issues/814) - Form submission from custom elements
- [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation
- [whatwg/html#5423](https://github.com/whatwg/html/issues/5423), [whatwg/html#11584](https://github.com/whatwg/html/issues/11584) - Label behaviors
- [whatwg/html#10220](https://github.com/whatwg/html/issues/10220) - Custom elements as forms
- [w3c/tpac2023-breakouts#44](https://github.com/w3c/tpac2023-breakouts/issues/44) - TPAC 2023 discussion
- [WebKit/standards-positions#97](https://github.com/WebKit/standards-positions/issues/97) - WebKit position on customized built-ins
