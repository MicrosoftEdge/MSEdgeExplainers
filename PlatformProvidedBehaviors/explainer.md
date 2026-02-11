# Platform-Provided Behaviors for Custom Elements

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

## Participate

- [WHATWG tracking issue](https://github.com/whatwg/html/issues/12150)
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/PlatformProvidedBehaviors)

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
| CSS pseudo-classes | `:default`, `:disabled`/`:enabled`, `:focus`, `:focus-visible`, `:hover`, `:active`. |

*Note: While `HTMLButtonElement` also supports generic button behavior (type="button") and reset behavior (type="reset"), this proposal focuses exclusively on the submit behavior.*

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

#### Behavior lifecycle

When the `behaviorList` is modified (via assignment or indexed assignment), the implementation observes the changes:

| Scenario | Behavior |
|----------|----------|
| Behavior added | The behavior is attached. Its event handlers become active. Default ARIA role is applied unless overridden by `ElementInternals.role`. |
| Behavior removed | The behavior is detached. Its event handlers are deactivated. Behavior-specific state (e.g., `formAction`, `disabled`) is cleared to default values. |
| Behavior retained (in both lists) | The behavior's state is preserved. Its position in the list may change. |

*Note:* Behavior state is preserved when the custom element is disconnected and reconnected to the DOM (e.g., moved within the document). State is only cleared when a behavior is explicitly removed from `behaviorList`.

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

### Other considerations

This proposal supports common web component patterns:

- Authors can define a single class that handles multiple modes (submit, reset, button) by updating `behaviorList` at runtime in response to attribute changes, without needing to define separate classes for each behavior.
- A child class extends the parent's functionality and retains access to the `ElementInternals` object and its active behaviors.
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

## Future Work

The behavior pattern can be extended to other behaviors in the future:

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

An extension of this proposal would be to allow web developers to define their own reusable behaviors. Considerations for user-defined behaviors:

- How would custom behaviors be defined and registered? Extend `PlatformBehavior` or a dedicated registry?
- Custom behaviors would need access to lifecycle hooks (connected, disconnected, attribute changes) similar to custom elements.
- The same conflict resolution strategies that apply to platform behaviors would need to work with user-defined behaviors.

### Behaviors in native HTML elements

This proposal currently focuses on custom elements, but the behavior pattern could potentially be generalized to all HTML elements (e.g., a `<div>` element gains button behavior via behaviors). Extending behaviors to native HTML elements would also raise questions about correctness and accessibility.

### Conflict Resolution

As the number of available behaviors grows, we must address how to handle collisions when multiple behaviors attempt to control the same attributes or properties. We should explore several strategies to make composition possible without getting unexpected or conflicting behaviors:

1. **Order of Precedence (Default)**: The order of behaviors in the array passed to `attachInternals` determines precedence (e.g., "last one wins"). This is simple to implement but may hide subtle incompatibilities.
2. **Compatibility Allow-lists**: Each behavior could define a short list of "compatible" behaviors that can be used in combination. Any combination not explicitly allowed would be rejected by `attachInternals`, preventing invalid states (like being both a button and a form).
3. **Explicit Conflict Resolution**: If conflicts occur, the platform could require the author to explicitly exclude specific properties.

### Future use case: Inheritance and composition

The following example demonstrates how the API supports future scenarios with multiple behaviors and inheritance, assuming additional behaviors like `HTMLResetButtonBehavior` become available.

This example illustrates:
1. How a parent and subclass cooperate to define the `behaviors` array before calling `attachInternals`.
2. How a class determines which behavior "wins" when multiple behaviors provide conflicting behaviors.

```javascript
class CustomButton extends HTMLElement {
    static formAssociated = true;

    constructor() {
        super();
    }

    // Protected method to extend the behavior list.
    _getInitialBehaviors() {
        // Default to submit behavior.
        return [HTMLSubmitButtonBehavior];
    }

    connectedCallback() {
        if (this._internals) { 
            return;
        }

        // Gather behaviors.
        const behaviors = this._getInitialBehaviors();
        // Initialize internals with the composed list.
        this._internals = this.attachInternals({ behaviors });
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
    _getInitialBehaviors() {
        // Append HTMLResetButtonBehavior.
        return [...super._getInitialBehaviors(), HTMLResetButtonBehavior];
    }

    render() {
        super.render();

        // Inspect the behaviors to determine the "winning" behavior.
        // This assumes the platform rule is "last behavior wins" for conflicts (order matters).
        const behaviors = this._internals.behaviorList;
        const effectiveBehavior = behaviors[behaviors.length - 1];

        if (effectiveBehavior === HTMLResetButtonBehavior) {
            // Visual indication of reset behavior
            const style = document.createElement('style');
            style.textContent = ':host { border: 1px dashed red; }';
            this.shadowRoot.appendChild(style);
        }
    }
}
```

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
