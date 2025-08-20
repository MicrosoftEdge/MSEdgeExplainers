# Custom Elements with Native Element Behaviors

## Authors:
- [Sanket Joshi](https://github.com/sanketj)
- [Alex Keng](https://github.com/alexkeng)
- [Ana Sollano Kim](https://github.com/anaskim)
- [Chris Holt](https://github.com/chrisdholt)

## Participate
- [WHATWG tracking issue](https://github.com/whatwg/html/issues/11061)
- [OpenUI issue tracking initial discussions and WHATWG resolution to accept `elementInternals.type = 'button'`](https://github.com/openui/open-ui/issues/1088)

## Introduction
Web component authors often want to create custom elements that inherit the behaviors and properties of native HTML elements. These types of custom elements are referred to as "customized built-in elements" or just "customized built-ins". By customizing built-in elements, custom elements can leverage the built-in functionality of standard elements while extending their capabilities to meet specific needs. Some of the use cases enabled by customized built-ins are listed below.

- Custom buttons can provide unique styles and additional functionality, such as split or toggle button semantics, while still maintaining [native button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-button) behavior such as being a [popover invoker](https://html.spec.whatwg.org/multipage/popover.html#popoverinvokerelement).
- Custom buttons can extend native [submit button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-submit) behavior so that the custom button can implicitly [submit forms](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-submit). Similarly, custom buttons that extend native [reset button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-reset) behavior can implicitly [reset forms](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-reset).
- Custom labels can provide additional functionality, such as tooltips and icons, while still supporting associations with [labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label) via the `for` attribute or nesting a labelable element inside the custom label.

### Goals
- A solution for customized built-in elements that provides an improvement over `extends`/`is`, in terms of interoperability and functionality.
- Supporting key customized built-in use cases, starting with button and label behaviors. Support for additional behaviors can be added over time.

### Non-goals
- Deprecation of `extends`/`is`.
- A declarative version of this proposal. This requires finding a general solution for declarative custom elements. This is a broader problem that should be explored separately.

## Proposal: add static `behavesLike` property with behavior-specific interface mixins

We propose enabling web component authors to create custom elements with native behaviors by adding a static `behavesLike` property to their custom element class definition. This property can be set to string values that represent native element types:

```js
    class CustomButton extends HTMLElement {
        static behavesLike = 'button';
    }
    customElements.define('custom-button', CustomButton);
```

Additionally, the proposal includes behavior-specific interface mixins that expose the full set of properties available to each element type. These mixins are available through `buttonMixin` and `labelMixin` properties on `ElementInternals`.

The initial set of `behavesLike` values being proposed are listed below. Support for additional values may be added in the future.
- `'button'` - for [button](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element) like behavior
- `'label'` - for [label](https://html.spec.whatwg.org/multipage/forms.html#the-label-element) like behavior

If `behavesLike` is assigned any other value, a ["NotSupportedError"](https://webidl.spec.whatwg.org/#notsupportederror) [DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException) should be thrown during `customElements.define()`.

`behavesLike` is a static property that must be set in the class definition and cannot be changed after the custom element is defined. This works similarly to the static [`formAssociated`](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-face-example) property that determines form association capabilities.


### `static behavesLike = 'button'` and `elementInternals.buttonMixin`
When `static behavesLike = 'button'` is set in a custom element's class definition, the custom element will gain support for all button-specific attributes and properties.

**Supported attributes:**
- `autofocus` - Automatically focus the form control when the page is loaded
- `disabled` - Whether the form control is disabled
- `form` - Associates the element with a form element
- `formaction` - URL to use for form submission
- `formenctype` - Entry list encoding type to use for form submission
- `formmethod` - Variant to use for form submission
- `formnovalidate` - Bypass form control validation for form submission
- `formtarget` - Navigable for form submission
- `name` - Name of the element to use for form submission
- `type` - Type of button (submit/reset/button)
- `value` - Value to be used for form submission
- `popovertarget` - Targets a popover element to toggle, show, or hide
- `popovertargetaction` - Indicates whether a targeted popover element is to be toggled, shown, or hidden
- `command` - Indicates to the targeted element which action to take
- `commandfor` - Targets another element to be invoked
- `interesttarget` - [currently experimental in Chromium](https://chromestatus.com/feature/4530756656562176?gate=4768466822496256)

**Supported properties:**
The `elementInternals.buttonMixin` property provides access to a `ButtonInternals` interface that exposes button-specific properties:
- `disabled` - reflects the `disabled` attribute
- `form` - returns the associated HTMLFormElement
- `formAction` - reflects the `formaction` attribute  
- `formEnctype` - reflects the `formenctype` attribute
- `formMethod` - reflects the `formmethod` attribute
- `formNoValidate` - reflects the `formnovalidate` attribute
- `formTarget` - reflects the `formtarget` attribute
- `labels` - returns a NodeList of associated label elements
- `name` - reflects the `name` attribute
- `type` - reflects the `type` attribute
- `value` - reflects the `value` attribute
- `willValidate` - indicates whether the element is a candidate for constraint validation
- `validity` - returns the ValidityState representing validation states
- `validationMessage` - returns localized validation message
- `command` - returns the value of the `command` attribute
- `commandForElement` - returns the Element referenced by the `commandfor` attribute  
- `popoverTargetAction` - returns the value of the `popovertargetaction` attribute
- `popoverTargetElement` - returns the Element referenced by the `popovertarget` attribute

Below is an example showcasing a custom button being used as a popup invoker with access to both attributes and DOM properties:

```js
    class CustomButton extends HTMLElement {
        static behavesLike = 'button';

        constructor() {
            super();
            this.internals_ = this.attachInternals();
        }

        get popoverTargetElement() {
            return this.internals_.buttonMixin?.popoverTargetElement ?? null;
        }
        
        set popoverTargetElement(element) {
            if (this.internals_.buttonMixin) {
                this.internals_.buttonMixin.popoverTargetElement = element;
            }
        }
    }
    customElements.define('custom-button', CustomButton);
```
```html
    <custom-button popovertarget="my-popover">Open popover</custom-button>
    <div id="my-popover" popover>This is popover content.</div>
```

**Implicit button behavior:**
Beyond attributes and properties, custom elements with `behavesLike = 'button'` also gain native button behaviors:
- **Default submit behavior**: The default `type` is "submit", the button will submit its associated form when activated
- **Implicit form submission**: When associated with a `<form>`, pressing Enter on an associated form control (eg, a text input) will trigger the custom button's submit behavior if the button's `type` is "submit".
- **Form association**: The custom element automatically becomes form-associated and participates in form submission and validation
- **Click event activation**: Fire click events when activated via mouse click, Enter key, Space key, or other activation methods
- **Focusable by default**: The element becomes focusable and participates in tab navigation without requiring `tabindex`
- **Default ARIA semantics**: Have an [button](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role) default ARIA role

### `static behavesLike = 'label'` and `elementInternals.labelMixin`
When `static behavesLike = 'label'` is set in a custom element's class definition, the custom element will gain support for all label-specific attributes and properties.

**Supported attributes:**
- `for` - Associates the label with a form control via the referenced element's ID

**Supported properties:**
The `elementInternals.labelMixin` property provides access to a `LabelInternals` interface that exposes label-specific properties:
- `htmlFor` - reflects the `for` attribute
- `control` - returns the Element referenced by the `for` attribute (the labeled control)
- `form` - returns the HTMLFormElement that the labeled control is associated with, or null if none

Below is an example showcasing a custom label being used to label a checkbox with access to both attributes and DOM properties:

```js
    class CustomLabel extends HTMLElement {
        static behavesLike = 'label';

        constructor() {
            super();
            this.internals_ = this.attachInternals();
        }

        get control() {
            return this.internals.labelMixin?.control ?? null;
        }
    }
    customElements.define('custom-label', CustomLabel);
```
```html
   <custom-label for='my-checkbox'>Toggle checkbox</custom-label>
   <input type='checkbox' id='my-checkbox' />
```
**Implicit label behavior:**
Beyond attributes and properties, custom elements with `behavesLike = 'label'` also gain native label behaviors:
- **Implicit association**: If no `for` attribute is specified, the first labelable element descendant automatically becomes the labeled control
- **Click delegation**: Clicking the custom label will activate its associated control (focus text inputs, toggle checkboxes, etc.)
- **Accessibility integration**: The label becomes the associated element's accessible name for screen readers and other assistive technologies


### Behavior-specific interfaces

The proposal includes behavior-specific interfaces (`buttonMixin`, `labelMixin`) that provide access to DOM properties corresponding to element-specific attributes.

**Interface availability:**
- `elementInternals.buttonMixin` returns a `ButtonInternals` interface when `behavesLike` is `'button'`, otherwise `null`
- `elementInternals.labelMixin` returns a `LabelInternals` interface when `behavesLike` is `'label'`, otherwise `null`

**Benefits of the interface mixin approach:**
- **Complete API surface**: Provides both attribute and property access, matching native elements
- **Discoverability**: Grouped interfaces make it clear which properties are available for each behavior
- **No naming conflicts**: Avoids conflicts when different element types have properties with the same name.

**IDL definitions:**
```webidl
partial interface ElementInternals {
  readonly attribute ButtonInternals? buttonMixin;
  readonly attribute LabelInternals? labelMixin;
};

interface ButtonInternals {
  attribute Element? popoverTargetElement;
  attribute Element? commandForElement; 
  attribute DOMString popoverTargetAction;
  // ... additional properties skipped for brevity
};

interface LabelInternals {
  attribute DOMString htmlFor;
  readonly attribute Element? control;
  // ... additional properties skipped for brevity
};
```

### Order of precedence for used values: Element content attributes > `ElementInternals` properties > default properties via `behavesLike`

When `behavesLike` is set, the custom element will be assigned the same defaults as the corresponding native element. For example, if `behavesLike = 'button'` is set, the custom element's default ARIA role will become `button` and this will be the used role if no explicit role is specified by the author. If the author sets `elementInternals.role`, the value of `elementInternals.role` will be the used role, taking precedence over the default role. If the author sets the `role` attribute on the custom element, the value of the `role` attribute will be the used role, taking precedence over both `elementInternals.role` and the default role.

### `behavesLike` with `extends`/`is` customized built-ins
If a custom element is defined with both `static behavesLike` and  `extends`/`is`, a ["NotSupportedError"](https://webidl.spec.whatwg.org/#notsupportederror) [DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException) should be thrown during `customElements.define()`.

This is because `behavesLike` functionality depends on `ElementInternals` (for its interface mixins, e.g., `elementInternals.buttonMixin`, `elementInternals.labelMixin`) which won't be available if the element is defined with `extends`/`is` (https://html.spec.whatwg.org/multipage/custom-elements.html#dom-attachinternals)

### `behavesLike` does not change element appearance
Setting `behavesLike` gives a custom element native element like behavior, but the custom element's appearance does not change. In other words, the custom element does not take on default, author-specified or user-specified styles that target the native element, since the custom element has a different tag name (e.g., `<fancy-button>` instead of `<button>`).

### `behavesLike` and `formAssociated`
If the element type specified by `behavesLike` is already a [form-associated element](https://html.spec.whatwg.org/multipage/forms.html#form-associated-element) (such as `'button'`), then `static formAssociated = true/false;` becomes a no-op since the element will automatically gain form association capabilities from its specified behavior.

## Alternatives considered

### `elementInternals.type` property approach

An earlier version of this proposal used a `type` property on `ElementInternals` that could be set at runtime in the constructor. This approach had several characteristics:

- `elementInternals.type` could be set to values like `'button'`, `'submit'`, `'reset'`, `'label'`
- The property could only be set once and would throw if set again
- Setting occurred in the constructor after calling `attachInternals()`

```js
// Earlier elementInternals.type approach
class CustomButton extends HTMLElement {
    constructor() {
        super();
        this.internals_ = this.attachInternals();
        this.internals_.type = 'button'; // Runtime setting
    }
}
```
This approach had several design issues:

**Semantic inconsistency:**
- **Mixed abstraction levels**: Values like `'button'`, `'submit'`, `'reset'`, `'label'` mixed element types (button, label) with button subtypes (submit, reset), creating unclear semantics about what the property actually represented

**Timing and mutability concerns:**
- **When to set**: Unclear whether the property should be set in the constructor, `connectedCallback()`, or elsewhere
- **Immutability enforcement**: Additional logic needed to prevent the property from being changed after initial setting

### `extends` and `is` attribute approach

A partial solution for this problem already exists today. Authors can specify the `extends` option when [defining a custom element](https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-define). Authors can then use the `is` attribute to give a built-in element a custom name, thereby turning it into a customized built-in element.

Both `extends` and `is` are supported in Firefox and Chromium-based browsers. However, this solution has limitations, such as not being able to attach shadow trees to (most) customized built-in elements. Citing these limitations, Safari doesn't plan to support customized built-ins in this way and have shared their objections here: https://github.com/WebKit/standards-positions/issues/97#issuecomment-1328880274. As such, `extends` and `is` are not on a path to full interoperability today.

### Compositional Mixins via `elementInternals.addMixin()`

This alternative proposes a compositional API that allows web developers to opt into specific native behaviors using mixins. These can be added via a method like `elementInternals.addMixin()`, injecting native-like capabilities (e.g., form participation, activation behavior) into custom elements. The approach supports both built-in mixins (provided by the platform) and user-defined ones, enabling flexible combinations of behaviors.

```js
function MyCustomBehaviorMixin(Base) {
  return class extends Base {
    connectedCallback() {
      super.connectedCallback?.();
      this.setAttribute('data-enhanced', 'true');
      this.addEventListener('mouseover', () => {
        this.style.backgroundColor = 'lightblue';
      });
    }
  };
}

class CustomButton extends HTMLElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    // Add browser built-in behavior for activation
    internals.addMixin(ButtonActivationMixin);
    // Add custom behavior
    internals.addMixin(MyCustomBehaviorMixin);
  }
}
customElements.define('custom-button', CustomButton);
```

#### ButtonActivationMixin (Built-in Mixin)

A browser-implemented mixin that encapsulates the native behavior of a  element. When applied, it enables:

- Keyboard activation (e.g., triggering on `Enter` or `Space`).
- Click handling and dispatching of click events.
- Participation in form submission if applicable.
- All properties and attributes from the native element's implementation.
- Accessibility roles and ARIA integration.

This mixin would be part of the platform, with the goal of ensuring consistent behavior across custom elements that opt into it.

#### MyCustomBehaviorMixin (User-defined Mixin)

A web author-implemented mixin that adds custom logic or features to an element. In the sample code above, it:

- Adds a data-enhanced attribute when the element is connected.
- Changes the background color on mouseover.
- Demonstrates how web developers can encapsulate reusable behaviors.

Compositional Mixins via `elementInternals.addMixin()` has the following disadvantages:

- **Blurs the boundary of built-in elements**: Custom elements could combine capabilities from multiple built-in elements (e.g., behave like both a button and a label), potentially introducing confusion in expected behavior. The platform may need more concrete real-world use cases before moving in this direction.
- **Implicit behavior flags still needed**: Some behaviors (e.g., native button or label functionality) still require implicit flags to activate. This reintroduces the need for a static property like `static behavesLike = 'button'`, which the mixin model aimed to avoid.

### Compositional Mixins via Subclass Factories

This alternative proposes leveraging JavaScript subclass factories to compose native-like behaviors into custom elements. This approach aligns with existing JavaScript patterns and avoids introducing new platform-level APIs.
Web authors would use mixin functions that return subclasses of `HTMLElement`, each encapsulating a specific behavior (e.g., form association, activation). These mixins could be layered to create elements with multiple built-in capabilities.

```js
function ButtonCustomMixin(Base) {
  return class extends Base {
    static get observedAttributes() {
      return ['command'];
    }

    constructor() {
      super();
      this._command = null;
    }

    get command() {
      return this._command;
    }

    set command(value) {
      this._command = value;
      this.setAttribute('command', value);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'command') {
        this.command = newValue;
      }
    }

    connectedCallback() {
      if (this.hasAttribute('command')) {
        this.command = this.getAttribute('command');
      }

      this.addEventListener('click', (e) => {
        if (this.command) {
          // Custom behavior: dispatch a command event with the command name
          this.dispatchEvent(new CustomEvent('custom-command', {
            detail: { name: this.command },
            bubbles: true,
            composed: true
          }));
        }
      });
    }
  };
}

class CustomButton extends ButtonCustomMixin(HTMLButtonElement) {
  constructor() {
    super();
    this.internals = this.attachInternals();
  }
}
customElements.define('custom-button', CustomButton, { extends: 'button' });
```

In the sample code above,  a custom command behavior is shown. Instead of linking to a `<command>` element (as in native HTML), this implementation dispatches a custom-command event when clicked, passing the command name in the event's detail. This pattern allows web authors to define their own command-handling logic elsewhere in the application, offering greater flexibility than the native model.

Compositional Mixins via Subclass Factories has the following disadvantages:

- **Blurs the boundary of built-in elements**: Similar to the compositional mixins via `elementInternals.addMixin()` alternative, custom elements could combine capabilities from multiple built-in elements. This may introduce ambiguity in behavior and expectations.
- **Increased complexity for declarative usage**: Supporting mixins via subclass factories in declarative HTML (e.g., `<my-element behaves-like="button">`) would be significantly more complex than a single type string.
- **Prototype chain manipulation**: While subclass factories are idiomatic in JavaScript, they can result in deep and complex prototype chains. This may complicate debugging, degrade performance, and hinder interoperability with platform features such as accessibility and form controls
- **Unproven feasibility in the platform**: The subclass factory pattern has never been used in the web platform before. While it is common in userland JavaScript, we currently lack sufficient technical knowledge to confirm whether this approach is feasible or compatible with the platform’s internals. This introduces uncertainty about its viability.
