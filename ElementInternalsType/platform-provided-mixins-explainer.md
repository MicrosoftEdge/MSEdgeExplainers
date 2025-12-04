# Platform-Provided Behavior Mixins for Custom Elements (Draft, December 2025)

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

## Participate

- No issue filed yet.
- Venue: WHATWG

## Introduction

Custom element authors frequently need their elements to leverage platform behaviors that are currently exclusive to native HTML elements, such as [form submission](https://github.com/WICG/webcomponents/issues/814), [popover invocation](https://github.com/whatwg/html/issues/9110), [label behaviors](https://github.com/whatwg/html/issues/5423#issuecomment-1517653183), [form semantics](https://github.com/whatwg/html/issues/10220), and [radio button grouping](https://github.com/whatwg/html/issues/11061#issuecomment-3250415103). This proposal introduces platform-provided mixins as a mechanism for autonomous custom elements to adopt specific native HTML element behaviors. Rather than requiring developers to reimplement platform behaviors in JavaScript or extend native elements (customized built-ins), this approach exposes platform capabilities as composable mixins.

## User-Facing Problem

Custom element authors can't access platform behaviors that are built into native HTML elements. This forces them to either:

1. Use customized built-ins (`is/extends` syntax), which [lack WebKit support](https://github.com/WebKit/standards-positions/issues/97#issuecomment-1328880274), have Shadow DOM limitations, and [can't use the ElementInternals API](https://github.com/whatwg/html/issues/5166).
2. Try to reimplement platform logic in JavaScript, which is error-prone.
3. Accept that their custom elements simply can't do what native elements can do.

This creates a gap between what's possible with native elements and custom elements, limiting web components and forcing developers into suboptimal patterns.

### Goals

Enable autonomous custom elements to:

- Submit forms: trigger form submission like `<button type="submit">`.

### Non-goals

- Providing generic button behaviors (like popover invocation) or reset behaviors in this initial proposal.
- Recreating all native element behaviors in this initial proposal.
- Changing customized built-ins.

## User research

This proposal is informed by:

1. Issue discussions spanning multiple years:
   - [WICG/webcomponents#814](https://github.com/WICG/webcomponents/issues/814) - Form submission from custom elements (400+ comments)
   - [whatwg/html#11061](https://github.com/whatwg/html/issues/11061) - ElementInternals.type proposal
   - [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation from custom elements
   - [whatwg/html#5423](https://github.com/whatwg/html/issues/5423) - Label behaviors
   - [whatwg/html#10220](https://github.com/whatwg/html/issues/10220) - Custom elements as forms

2. TPAC discussions in [2023](https://www.w3.org/2023/09/tpac-breakouts/44-minutes.pdf) and [2025](https://www.w3.org/2025/11/12-custom-attrs-minutes.html) exploring alternatives to customized built-ins.

3. Developer feedback from the Web Components community consistently requesting these capabilities. [Note: We should change this when we're ready to engage in the WCCG]

4. Real-world use cases from design frameworks that work around these limitations.

## Proposed Approach

This proposal introduces `addBehavior` to `ElementInternals` which allows custom elements to attach specific platform behaviors.

This approach enables dynamic composition, allowing elements to adopt behaviors based on attributes or state (e.g., a single `<custom-button>` class that can act as a submit button based on a `type` attribute).

### Imperative API Design

- Behaviors are exposed as objects that can be attached to an element instance via `ElementInternals`.
- Supports composition as web authors can add many behaviors.

### Platform-Provided Behavior Mixins

The platform would expose the following behavior mixin, mirroring the submission capability of `HTMLButtonElement`:

| Behavior Mixin | Provides |
|----------------|----------|
| `HTMLSubmitButtonBehavior` | Click/keyboard activation, form submission triggering, `:default` pseudo-class, implicit submission participation, implicit ARIA `role="button"`. |

*Note: While `HTMLButtonElement` also supports generic button behavior (type="button") and reset behavior (type="reset"), this proposal focuses exclusively on the submit behavior.*

Each platform behavior mixin must provide:

- Event handling: Automatic wiring of platform events (click, keydown, etc.).
- ARIA defaults: Implicit roles and properties for accessibility.

### Imperative Composition via ElementInternals

The imperative `addBehavior()` API provides several advantages for web component authors:

1. Dynamic Behavior: Behaviors can be added at runtime based on attributes or property state. This matches the pattern of native elements like `<button>` which change behavior based on the `type` attribute.
2. Single Class Definition: Authors can define a single `CustomButton` class that handles multiple modes (submit, reset, button) without needing to define separate classes for each behavior or create complex inheritance chains.
3. Avoids Static Inheritance Pitfalls: Static mixins lock an element's behavior at definition time. If a developer wants a button that can toggle between "submit" and "button" modes, static mixins require swapping the entire element instance, whereas imperative attachment allows modifying the existing instance.

### Use case: Custom Submit Buttons

A custom button element that can submit its associated form.

```javascript
class CustomButton extends HTMLElement {
    static formAssociated = true;
    static observedAttributes = ['type'];

    constructor() {
        super();
        this._internals = this.attachInternals();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'type') {
            // Dynamically attach behavior based on attribute
            if (newVal === 'submit') {
                this._internals.addBehavior(HTMLSubmitButtonBehavior);
            }
        }
    }
}
customElements.define('custom-button', CustomButton);
```

```html
<form action="/submit" method="post">
    <input name="username" required>
    <custom-button type="submit">Submit Form</custom-button>
</form>
```

The element gains:
- Click and keyboard activation (Space/Enter).
- Implicit ARIA `role="button"` that can be overriden by the web author.
- Form submission on activation.
- `:default` pseudo-class matching.
- Participation in implicit form submission.

## Future Work

While this proposal focuses on form submission, the mixin pattern can be extended to other behaviors in the future:

- **Generic Buttons**: `HTMLButtonBehavior` for non-submitting buttons (popover invocation, commands).
- **Reset Buttons**: `HTMLResetButtonBehavior` for form resetting.
- **Labels**: `HTMLLabelBehavior` for `for` attribute association and focus delegation.
- **Forms**: `HTMLFormBehavior` for custom elements acting as form containers.
- **Radio Groups**: `HTMLRadioGroupBehavior` for `name`-based mutual exclusion.

### Open Questions

1. **Removal**: Should there be a `removeBehavior()`?
2. **Ordering**: Does the order of `addBehavior()` calls matter?
3. **Submit behavior prioritization**: Does solving the submit use case offer greater value over popovertarget, command invokers, label behaviors, etc.?

## Alternatives considered

### Alternative 1: Static Class Mixins

Behaviors are exposed as functions that take a superclass and return a subclass.

```javascript
class CustomSubmitButton extends HTMLSubmitButtonBehavior(HTMLElement) { ... }
```

**Pros:**
- Familiar JavaScript pattern.
- Prototype-based composition.

**Cons:**
- Behavior is fixed at class definition time and authors might need to generate many class variations for different behavior combinations.

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
- String APIs are error prone and hard to debug.

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

Custom attributes are complementary but don't provide access to platform behaviors. They're useful for userland behavior composition but can't trigger form submission, invoke popovers through platform code, etc.

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
- Full access to all platform behaviors.
- Natural inheritance model.

**Cons:**
- Not supported in WebKit (deal-breaker for interoperability).
- Limited Shadow DOM support.
- Can't use `ElementInternals` API.
- The `is=` syntax isn't considered developer-friendly to some.
- Doesn't support composing behaviors from different base elements.

While customized built-ins are useful where supported, lack of WebKit support makes them unsuitable as the primary solution.

## Accessibility and Security Considerations

### Accessibility

- Platform behaviors must include proper ARIA roles and properties.
- Custom elements using a platform-provided mixin must gain the same keyboard handling and focus management as native elements.
- Behaviors must ensure custom elements appear correctly in accessibility trees.

#### Mitigation

- Each platform behavior explicitly specifies its accessibility requirements.
- Behaviors automatically provide implicit ARIA roles that can be overridden by authors through `ElementInternals.role`.
- Platform ensures proper integration with accessibility APIs.

### Security

- Form submission must respect same-origin policies.
- Behaviors must not expose internal browser state.

#### Mitigation

- Behaviors integrate with existing platform security mechanisms.
- No new capabilities beyond what native elements already provide.
- All security checks that apply to native elements apply to custom elements with behaviors.
- Behaviors are provided by the platform, not userland code.

## Stakeholder Feedback / Opposition

### Browser Vendors

- Chromium: No signal
- Gecko: No signal
- WebKit: No signal

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Chris Holt](https://github.com/chrisdholt)
- [Justin Fagnani](https://github.com/justinfagnani)
- [Keith Cirkel](https://github.com/keithamus)
- [Rob Eisenberg](https://github.com/EisenbergEffect)

Thanks to the following proposals, articles, frameworks, and languages for their work on similar problems that influenced this proposal.

- [Real Mixins with JavaScript Classes](https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/) by Justin Fagnani.
- [ElementInternals.type proposal](https://github.com/whatwg/html/issues/11061).
- [Custom Attributes proposal](https://github.com/WICG/webcomponents/issues/1029).
- [TC39 Maximally Minimal Mixins proposal](https://github.com/tc39/proposal-mixins).
- Lit framework's [reactive controllers pattern](https://lit.dev/docs/composition/controllers/).

### Related Issues and Discussions

- [WICG/webcomponents#814](https://github.com/WICG/webcomponents/issues/814) - Form submission from custom elements
- [whatwg/html#9110](https://github.com/whatwg/html/issues/9110) - Popover invocation
- [whatwg/html#5423](https://github.com/whatwg/html/issues/5423) - Label behaviors
- [whatwg/html#10220](https://github.com/whatwg/html/issues/10220) - Custom elements as forms
- [w3c/tpac2023-breakouts#44](https://github.com/w3c/tpac2023-breakouts/issues/44) - TPAC 2023 discussion
- [WebKit/standards-positions#97](https://github.com/WebKit/standards-positions/issues/97) - WebKit position on customized built-ins
