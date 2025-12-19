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

This proposal introduces a `mixins` option to `attachInternals()` and a read-only `mixins` property on `ElementInternals` which allows custom elements to attach and inspect specific native behaviors. This approach enables composition while keeping the API simple, allowing elements to adopt behaviors during initialization.

### Configuration via attachInternals

- Behaviors are exposed as objects that can be passed to `attachInternals` in a `mixins` array.
- `ElementInternals` instances expose a read-only `mixins` property returning the list of attached behaviors.
- Supports composition as web authors can pass many behaviors.

*Note: The API uses the term "mixins" instead of "behaviors" to avoid potential confusion with the spelling of "behavior" vs "behaviour".*

### Platform-Provided Behavior Mixins

The platform would expose the following behavior mixin, mirroring the submission capability of `HTMLButtonElement`:

| Behavior Mixin | Provides |
|----------------|----------|
| `HTMLSubmitButtonMixin` | Click/keyboard activation, form submission triggering, `:default` pseudo-class, implicit submission participation, implicit ARIA `role="button"`. |

*Note: While `HTMLButtonElement` also supports generic button behavior (type="button") and reset behavior (type="reset"), this proposal focuses exclusively on the submit behavior.*

Each platform behavior mixin must provide:

- Event handling: Automatic wiring of platform events (click, keydown, etc.).
- ARIA defaults: Implicit roles and properties for accessibility.

### Composition via attachInternals

Passing behaviors to `attachInternals()` provides several advantages for web component authors:

- Behaviors are defined once during initialization, avoiding the complexity of managing behavior lifecycle (adding/removing) and state synchronization.
- Authors can define a single class that handles multiple modes (submit, reset, button) by checking attributes before attaching internals, without needing to define separate classes for each behavior.
- While this proposal focuses on an imperative API, the underlying model of attaching mixins via `ElementInternals` is compatible with future declarative APIs.
- A child class extends the parent's functionality and retains access to the `ElementInternals` object and its active mixins, allowing for standard object-oriented extension patterns.

### Use case: Design system button

A design system button that maps semantic variants to platform behaviors.

```javascript
class DesignSystemButton extends HTMLElement {
    static formAssociated = true;

    constructor() {
        super();
    }

    connectedCallback() {
        if (this._internals) {
            return;
        }

        // Map design system variants to native behaviors.
        const variant = this.getAttribute('variant') || 'neutral';
        const mixins = [];

        // 'primary' and 'destructive' variants imply form submission.
        if (['primary', 'destructive'].includes(variant)) {
            mixins.push(HTMLSubmitButtonMixin);
        }

        this._internals = this.attachInternals({ mixins });
        this.render();
    }

    render() {
        // Inspect attached behaviors to determine styling.
        const isSubmit = this._internals.mixins.includes(HTMLSubmitButtonMixin);
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host { 
                    display: inline-block; 
                    background: 'blue';
                    color: white;
                    cursor: pointer;
                }
                :host(:default) {
                    box-shadow: 0 0 0 2px gold;
                    font-weight: bold;
                }
            </style>
            ${isSubmit ? '💾' : ''} <slot></slot>
        `;
    }
}
customElements.define('ds-button', DesignSystemButton);
```

```html
<form action="/save" method="post">
    <input name="username" required>

    <!-- Becomes a submit button based on variant. -->
    <ds-button variant="primary">Save</ds-button>

    <!-- Remains a regular button. -->
    <ds-button variant="neutral">Cancel</ds-button>
</form>
```

The element gains:
- Click and keyboard activation (Space/Enter).
- Implicit ARIA `role="button"` that can be overriden by the web author.
- Form submission on activation.
- `:default` pseudo-class matching.
- Participation in implicit form submission.
- Ability to inspect its own behaviors via `this._internals.mixins`.

## Future Work

While this proposal focuses on form submission, the mixin pattern can be extended to other behaviors in the future:

- **Generic Buttons**: `HTMLButtonMixin` for non-submitting buttons (popover invocation, commands).
- **Reset Buttons**: `HTMLResetButtonMixin` for form resetting.
- **Inputs**: `HTMLInputMixin` for text entry, validation, and selection APIs.
- **Labels**: `HTMLLabelMixin` for `for` attribute association and focus delegation.
- **Forms**: `HTMLFormMixin` for custom elements acting as form containers.
- **Radio Groups**: `HTMLRadioGroupMixin` for `name`-based mutual exclusion.
- **Tables**: `HTMLTableMixin` for table layout semantics and accessibility.

*Conflict Resolution: As the number of available mixins grows, we must address how to handle collisions when multiple mixins attempt to control the same attributes or properties. We propose that the order of mixins in the array passed to `attachInternals` should determine precedence (e.g., last one wins), but specific heuristics for complex clashes need to be defined.*

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
            <style>
                :host {
                    display: inline-block;
                    cursor: pointer;
                    border: 1px solid #767676;
                    padding: 2px 6px;
                }
            </style>
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
        const mixins = this._internals.mixins;
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

### Alternative 2: ElementInternals.type (Proposed)

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

### Alternative 3: Custom Attributes (Proposed)

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

### Alternative 5: Expose certain behavioural attributes via ElementInternals (Proposed)

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

- Chromium: No signal
- Gecko: No signal
- WebKit: No signal

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Alex Russell](https://github.com/slightlyoff)
- [Andy Luhrs](https://github.com/aluhrs13)
- [Kevin Babbitt](https://github.com/kbabbitt)
- [Kurt Catti-Schmidt](https://github.com/KurtCattiSchmidt)

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
