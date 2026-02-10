# Platform-Provided Behavior Mixins for Custom Elements

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

## Participate

- No issue filed yet.
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/PlatformProvidedMixins)

## Introduction

Custom element authors frequently need their elements to leverage platform behaviors that are currently exclusive to native HTML elements, such as [form submission](https://github.com/WICG/webcomponents/issues/814), [popover invocation](https://github.com/whatwg/html/issues/9110), [label behaviors](https://github.com/whatwg/html/issues/5423#issuecomment-1517653183), [form semantics](https://github.com/whatwg/html/issues/10220), and [radio button grouping](https://github.com/whatwg/html/issues/11061#issuecomment-3250415103). This proposal introduces platform-provided mixins as a mechanism for autonomous custom elements to adopt specific native HTML element behaviors. Rather than requiring developers to reimplement native behaviors in JavaScript or extend native elements (customized built-ins), this approach exposes native capabilities as composable mixins.

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
   - [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation from custom elements
   - [whatwg/html#5423](https://github.com/whatwg/html/issues/5423) - Label behaviors
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

This proposal introduces a `mixins` option to `attachInternals()` and a `mixinList` property on `ElementInternals` which allows custom elements to attach, inspect, and dynamically update native behaviors. This approach enables composition while keeping the API simple, supporting both initialization-time configuration and runtime updates.

```javascript
// Attach a mixin during initialization.
this._internals = this.attachInternals({ mixins: [HTMLSubmitButtonMixin] });

// Access and modify mixin state.
this._internals.mixins.htmlSubmitButton.formAction = '/custom';

// Dynamically update the mixin list.
this._internals.mixinList = [HTMLResetButtonMixin];
```

### Configuration via attachInternals

- Behaviors are exposed as objects that can be passed to `attachInternals` in a `mixins` array.
- `ElementInternals` instances expose a read-only `mixins` property returning the list of attached behaviors.
- Supports composition as web authors can pass many behaviors.

### Platform-Provided Behavior Mixins

The platform would expose the following behavior mixin, mirroring the submission capability of `HTMLButtonElement`:

| Behavior Mixin | Provides |
|----------------|----------|
| `HTMLSubmitButtonMixin` | Click/keyboard activation, form submission triggering, `:default` pseudo-class, implicit submission participation, implicit ARIA `role="button"`. |

*Note: While `HTMLButtonElement` also supports generic button behavior (type="button") and reset behavior (type="reset"), this proposal focuses exclusively on the submit behavior.*

Each platform behavior mixin must provide:

- Event handling: Automatic wiring of platform events (click, keydown, etc.)
- ARIA defaults: Implicit roles and properties for accessibility.

### Accessing mixin state

Platform-provided mixins expose useful public properties and methods of their corresponding native elements. Authors can expose these capabilities on their custom element's public API by defining accessors that delegate to the mixin state.

These APIs are accessed via the `mixins` property on `ElementInternals`. This property provides access to their instance-specific state via properties named after the mixin.

For `HTMLSubmitButtonMixin`, the state object exposes the following properties found on [`HTMLButtonElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLButtonElement):

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
        this._internals = this.attachInternals({ mixins: [HTMLSubmitButtonMixin] });
    }

    get disabled() {
        return this._internals.mixins.htmlSubmitButton.disabled;
    }

    set disabled(val) {
        this._internals.mixins.htmlSubmitButton.disabled = val;
    }

    get formAction() {
        return this._internals.mixins.htmlSubmitButton.formAction;
    }

    set formAction(val) {
        this._internals.mixins.htmlSubmitButton.formAction = val;
    }
}
```

This ensures web authors don't have to reimplement the state logic that the mixin is supposed to provide.

### Updating mixins dynamically

To support dynamic behavior changes (e.g., when the `type` attribute changes), `ElementInternals` exposes a settable `mixinList` property that allows developers to replace the entire mixin list at once:

```javascript
// Get the current mixin list.
console.log(this._internals.mixinList); // [HTMLButtonMixin]

// Replace with a different mixin.
this._internals.mixinList = [HTMLSubmitButtonMixin];
```

#### Mixin lifecycle

When the `mixinList` is updated, the implementation compares the old and new lists:

| Scenario | Behavior |
|----------|----------|
| Mixin added | The mixin is attached. Its event handlers become active. Default ARIA role is applied unless overridden by `ElementInternals.role`. |
| Mixin removed | The mixin is detached. Its event handlers are deactivated. Mixin-specific state (e.g., `formAction`, `disabled`) is cleared to default values. |
| Mixin retained (in both lists) | The mixin's state is preserved. Its position in the list may change. |

*Note:* Mixin state is preserved when the custom element is disconnected and reconnected to the DOM (e.g., moved within the document). State is only cleared when a mixin is explicitly removed from `mixinList`.

#### Mixin state

When a mixin is removed from the list, its state is cleared. If the same mixin is added back later, it starts with default state:

```javascript
// Set `formAction` on the submit mixin.
this._internals.mixins.htmlSubmitButton.formAction = '/custom-action';

// Replace with a different mixin — submit mixin state is cleared.
this._internals.mixinList = [HTMLResetButtonMixin];

// Re-add the submit mixin — it starts with default state.
this._internals.mixinList = [HTMLSubmitButtonMixin];

// formAction is now back to default (empty string).
console.log(this._internals.mixins.htmlSubmitButton.formAction); // ''
```

If web authors need to preserve state when swapping mixins, they should save and restore it explicitly.

### Other considerations

This proposal supports common web component patterns:

- Authors can define a single class that handles multiple modes (submit, reset, button) by updating `mixinList` at runtime in response to attribute changes, without needing to define separate classes for each behavior.
- A child class extends the parent's functionality and retains access to the `ElementInternals` object and its active mixins.
- While this proposal uses an imperative API, the design supports future declarative custom elements. Once a declarative syntax for `ElementInternals` is established, attaching mixins could be modeled as an attribute, decoupling behavior from the JavaScript class definition. The following snippet shows a hypothetical example:

  ```html
  <custom-button name="custom-submit-button">
      <element-internals mixins="html-submit-button-mixin"></element-internals>
      <template>Submit</template>
  </custom-button>
  ```

### Use case: Design system button

While this proposal only introduces `HTMLSubmitButtonMixin`, the example below references `HTMLResetButtonMixin` and `HTMLButtonMixin` to illustrate how switching would work once additional mixins become available in the future.

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
        this._updateMixins();
        this._syncAttributes();
        this._render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'type') {
            this._updateMixins();
        }
        this._syncAttributes();
        this._render();
    }

    _updateMixins() {
        const type = this.getAttribute('type');
        // Set the appropriate mixin based on type.
        if (type === 'submit') {
            this._internals.mixinList = [HTMLSubmitButtonMixin];
        } else if (type === 'reset') {
            this._internals.mixinList = [HTMLResetButtonMixin];
        } else {
            this._internals.mixinList = [HTMLButtonMixin];
        }
    }

    _syncAttributes() {
        // Sync HTML attributes to mixin state.
        const submitMixin = this._internals.mixins.htmlSubmitButton;
        if (submitMixin) {
            submitMixin.formAction = this.getAttribute('formaction') || '';
        }
        // Other attributes like `disabled`, `value`, etc. would be set on
        // the proper mixin interface.
    }

    // Expose element state.
    get type() {
        return this.getAttribute('type') || 'button';
    }
    set type(val) {
        this.setAttribute('type', val);
    }

    get formAction() {
        return this._internals.mixins.htmlSubmitButton?.formAction ?? '';
    }
    set formAction(val) {
        if (this._internals.mixins.htmlSubmitButton) {
            this._internals.mixins.htmlSubmitButton.formAction = val;
        }
    }

    // Additional getters/setters for `disabled`, `formMethod`, `formEnctype`,
    // `formNoValidate`, `formTarget`, `name`, and `value` would follow the
    // same pattern.

    _render() {
        const isSubmit = this._internals.mixinList.includes(HTMLSubmitButtonMixin);
        const isReset = this._internals.mixinList.includes(HTMLResetButtonMixin);

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
- Implicit ARIA `role="button"` that can be overriden by the web author.
- Form submission on activation.
- `:default` pseudo-class matching.
- Participation in implicit form submission.
- Ability to inspect its own properties via `this._internals.mixins`.
- The `type` attribute can be changed at runtime to switch between behaviors.
- Mixin properties like `disabled` and `formAction` are accessible and can be exposed.

## Future Work

The mixin pattern can be extended to other behaviors in the future:

- **Generic Buttons**: `HTMLButtonMixin` for non-submitting buttons (popover invocation, commands).
- **Reset Buttons**: `HTMLResetButtonMixin` for form resetting.
- **Inputs**: `HTMLInputMixin` for text entry, validation, and selection APIs.
- **Labels**: `HTMLLabelMixin` for `for` attribute association and focus delegation.
- **Forms**: `HTMLFormMixin` for custom elements acting as form containers.
- **Radio Groups**: `HTMLRadioGroupMixin` for `name`-based mutual exclusion.
- **Tables**: `HTMLTableMixin` for table layout semantics and accessibility.

### User-defined mixins

An extension of this proposal would be to allow web developers to define their own reusable mixins. Considerations for user-defined mixins:

- How would custom mixins be defined and registered? Extend `PlatformMixin` or a dedicated registry?
- Custom mixins would need access to lifecycle hooks (connected, disconnected, attribute changes) similar to custom elements.
- The same conflict resolution strategies that apply to platform mixins would need to work with user-defined mixins.

### Mixins in native HTML elements

This proposal currently focuses on custom elements, but the mixin pattern could potentially be generalized to all HTML elements (e.g., a `<div>` element gains button behavior via mixins). Extending mixins to native HTML elements would also raise questions about correctness and accessibility.

### Conflict Resolution

As the number of available mixins grows, we must address how to handle collisions when multiple mixins attempt to control the same attributes or properties. We should explore several strategies to make composition possible without getting unexpected or conflicting behaviors:

1. **Order of Precedence (Default)**: The order of mixins in the array passed to `attachInternals` determines precedence (e.g., "last one wins"). This is simple to implement but may hide subtle incompatibilities.
2. **Compatibility Allow-lists**: Each mixin could define a short list of "compatible" mixins that can be used in combination. Any combination not explicitly allowed would be rejected by `attachInternals`, preventing invalid states (like being both a button and a form).
3. **Explicit Conflict Resolution**: If conflicts occur, the platform could require the author to explicitly exclude specific properties.

### Future use case: Inheritance and composition

The following example demonstrates how the API supports future scenarios with multiple mixins and inheritance, assuming additional mixins like `HTMLResetButtonMixin` become available.

This example illustrates:
1. How a parent and subclass cooperate to define the `mixins` array before calling `attachInternals`.
2. How a class determines which mixin "wins" when multiple mixins provide conflicting behaviors.

```javascript
class CustomButton extends HTMLElement {
    static formAssociated = true;

    constructor() {
        super();
    }

    // Protected method to extend the mixin list.
    _getInitialMixins() {
        // Default to submit behavior.
        return [HTMLSubmitButtonMixin];
    }

    connectedCallback() {
        if (this._internals) { 
            return;
        }

        // Gather mixins.
        const mixins = this._getInitialMixins();
        // Initialize internals with the composed list.
        this._internals = this.attachInternals({ mixins });
        this.render();
    }

    render() {
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>...</style>
            <slot></slot>
        `;
    }
}

class ResetButton extends CustomButton {
    _getInitialMixins() {
        // Append HTMLResetButtonMixin.
        return [...super._getInitialMixins(), HTMLResetButtonMixin];
    }

    render() {
        super.render();

        // Inspect the mixins to determine the "winning" behavior.
        // This assumes the platform rule is "last mixin wins" for conflicts (order matters).
        const mixins = this._internals.mixinList;
        const effectiveBehavior = mixins[mixins.length - 1];

        if (effectiveBehavior === HTMLResetButtonMixin) {
            // Visual indication of reset behavior
            const style = document.createElement('style');
            style.textContent = ':host { border: 1px dashed red; }';
            this.shadowRoot.appendChild(style);
        }
    }
}
```

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

- Platform behaviors must provide appropriate default ARIA roles and states (e.g., `role="button"` for `HTMLSubmitButtonMixin`).
- Custom elements using a platform-provided mixin must gain the same keyboard handling and focus management as their native counterparts (e.g., Space/Enter activation).
- Authors must be able to override default semantics using `ElementInternals.role` and `ElementInternals.aria*` properties if the default behavior does not match their specific use case.

### Security

- This proposal exposes existing platform capabilities to custom elements, rather than introducing new capabilities.
- Form submission triggered by mixins must respect the same security policies as native form submission.
- All security checks that apply to native elements (e.g., form validation, submission restrictions) apply to custom elements using these mixins.

### Privacy

- The presence of specific mixins in the API surface can be used for fingerprinting or browser version detection. This is consistent with the introduction of any new Web Platform feature.
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
- [Kevin Babbitt](https://github.com/kbabbitt)
- [Kurt Catti-Schmidt](https://github.com/KurtCattiSchmidt)
- [Mason Freed](https://github.com/mfreed7)
- [Rob Eisenberg](https://github.com/EisenbergEffect)

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
