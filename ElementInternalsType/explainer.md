# Custom Elements with Button Activation Behaviors

## Authors:
- [Sanket Joshi](https://github.com/sanketj)
- [Alex Keng](https://github.com/alexkeng)
- [Ana Sollano Kim](https://github.com/anaskim)
- [Chris Holt](https://github.com/chrisdholt)

## Participate
- [WHATWG tracking issue](https://github.com/whatwg/html/issues/11061)
- [OpenUI issue tracking initial discussions and WHATWG resolution to accept `elementInternals.type = 'button'`](https://github.com/openui/open-ui/issues/1088)

## Introduction
Web component authors often want to create custom elements that have the  activation behaviors from the native button element. Some of the key use cases are listed below:

- Custom buttons can be a [popover invoker](https://html.spec.whatwg.org/multipage/popover.html#popoverinvokerelement) while providing unique styles and additional functionality. 
- Custom buttons can provide native [submit button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-submit) behavior so that the custom button can implicitly [submit forms](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-submit). Similarly, custom buttons can also provide native [reset button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-reset) behavior that can implicitly [reset forms](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-reset).

Currently, web developers face challenges when trying to implement these behaviors in custom elements. The existing customized built-in approach using `extends` and `is` provides built-in button functionality but lacks full cross-browser support. As a result, developers are forced to manually reimplement button behaviors from scratch, leading to inconsistent implementations, accessibility issues, and development overhead.

This proposal addresses these challenges by introducing a standardized way for custom elements to opt into specific button activation behaviors through a simple static property declaration. By building on the established pattern of [form-associated custom elements](https://html.spec.whatwg.org/dev/custom-elements.html#form-associated-custom-elements), this approach provides a familiar developer experience while ensuring cross-browser compatibility and proper integration with platform features like the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API).

### Goals
- A solution to support key button activation use cases, particularly command invocation and form submission

### Non-goals
- Providing a comprehensive solution as an alternative to the customized built-in solution.
- A declarative version of this proposal. This requires finding a general solution for declarative custom elements, which should be explored separately.

## Proposal: add static `buttonActivationBehaviors` property 
We propose enabling web component authors to create custom elements with button activation behaviors by adding a static `buttonActivationBehaviors` property to their custom element class definition.
This proposal focuses on decomposing native element behaviors into granular, specific functionalities that can be individually exposed through `ElementInternals`. This approach builds on the existing pattern established by form-associated custom elements ([FACEs](https://html.spec.whatwg.org/dev/custom-elements.html#form-associated-custom-elements)) and accessibility semantics ([ARIAMixin](https://www.w3.org/TR/wai-aria-1.2/#ARIAMixin)), where specific capabilities are exposed as discrete APIs that web developers can combine as needed.

```js
class CustomButton extends HTMLElement {
    static buttonActivationBehaviors = true;
}
customElements.define('custom-button', CustomButton);
```

**Supported attributes:**

When `static buttonActivationBehaviors = true` is set, the custom element would gain support for button activation-specific attributes:

- `commandfor` - Targets another element to be invoked
- `command` - Indicates to the targeted element which action to take

**Supported properties:**

The `ElementInternals` interface would be extended with button activation-specific properties:

- `commandForElement` - reflects the `commandfor` attribute
- `command` - reflects the `command` attribute

**Supported events:**

- `command` event - Fired on the element referenced by `commandfor`.

**IDL definitions:**
```webidl
partial interface ElementInternals {
  attribute Element? commandForElement;
  attribute DOMString command;
};
```

## Examples

### Custom button with popover invocation

This example shows how to create a custom button that can invoke a popover element using the `commandfor` and `command` attributes:

```js
class CustomButton extends HTMLElement {
    static buttonActivationBehaviors = true;
}

customElements.define('custom-button', CustomButton);
```

```html
<custom-button commandfor="my-popover" command="toggle-popover">
    Toggle the popover
</custom-button>

<div id="my-popover" popover>
    <p>This popover is controlled by the custom button!</p>
</div>
```

### Custom button with dialog invocation

This example demonstrates invoking a dialog:

```js
class CustomButton extends HTMLElement {
    static buttonActivationBehaviors = true;
}

customElements.define('custom-button', CustomButton);
```

```html
<custom-button commandfor="my-dialog" command="showModal">
    Open Dialog
</custom-button>

<dialog id="my-dialog">
    <p>This is a dialog opened by the custom button!</p>
    <custom-button commandfor="mydialog" command="close">Close</custom-button>
</dialog>
```

### Custom button with imperative property configuration

This example shows how to configure the `commandForElement` and `command` properties imperatively:

```js
class CustomButton extends HTMLElement {
    static buttonActivationBehaviors = true;

    constructor() {
        super();
        this.internals_ = this.attachInternals();
    }

    get commandForElement() {
        return this.internals_.commandForElement ?? null;
    }

    set commandForElement(element) {
        this.internals_.commandForElement = element;
    }

    get command() {
        return this.internals_.command ?? '';
    }

    set command(value) {
        this.internals_.command = value;
    }
}

customElements.define('custom-button', CustomButton);
```

```html
<custom-button id="my-button">Custom button</custom-button>
<div id="my-popover" popover>Popover content</div>

<script>
  const button = document.getElementById('my-button');
  const popover = document.getElementById('my-popover');
  
  button.commandForElement = popover;
  button.command = 'toggle-popover';
</script>
```

## add `buttonType` property in `ElementInternals`

To provide submit and reset functionality, this proposal also introduces a `buttonType` property to `ElementInternals` that controls the behavior when the custom button is activated.

The `ElementInternals` interface would be extended with:

- `buttonType` - controls the activation behavior of the button (values: "button", "submit", "reset")

**IDL definitions:**
```webidl
partial interface ElementInternals {
  attribute DOMString buttonType;
};
```

**Button type behaviors:**

- `"button"` (default) - No special form behavior, only fires click events and command invocation
- `"submit"` - Submits the associated form when activated
- `"reset"` - Resets the associated form when activated

**Example usage:**

```js
class CustomButton extends HTMLElement {
    static buttonActivationBehaviors = true;
    static observedAttributes = ['type'];

    constructor() {
        super();
        this.internals_ = this.attachInternals();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'type') {
            this.internals_.buttonType = newValue;
        }
    }
}

customElements.define('custom-button', CustomButton);
```

```html
<form>
    <!-- Submit button -->
    <custom-button type="submit">Submit Form</custom-button>
    
    <!-- Reset button -->
    <custom-button type="reset">Reset Form</custom-button>
    
    <!-- Regular button -->
    <custom-button commandfor="my-dialog" command="showModal">
        Open Dialog
    </custom-button>
</form>
```

**Rationale for the `buttonType` property:**

The `buttonType` property is essential because it allows custom element authors to create a single custom button class that can handle all three native button behaviors without requiring separate class definitions. Without this property, new static properties (eg. `enableSubmitBehavior = true`) would be needed to support the submit and reset behaviors, and developers would need to create three different custom element classes (e.g., `custom-submit-button`, `custom-reset-button`, `custom-regular-button`) just to support the different type values from the native button element. This approach provides the same flexibility as the native `<button>` element's `type` attribute, wihch let custom element users configure the behaviors declaratively through the custom element's attributes.

## Alternatives considered

### Static `behavesLike` property with behavior-specific interface mixins

An alternative approach enables web component authors to create custom elements with native behaviors by adding a static `behavesLike` property to their custom element class definition. This property can be set to string values that represent native element types:

```js
    class CustomButton extends HTMLElement {
        static behavesLike = 'button';
    }
    customElements.define('custom-button', CustomButton);
```

Additionally, this approach includes behavior-specific interface mixins that expose the full set of properties available to each element type. These mixins are available through `buttonMixin` and `labelMixin` properties on `ElementInternals`.

The initial set of `behavesLike` values being proposed are listed below. Support for additional values may be added in the future.
- `'button'` - for [button](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element) like behavior
- `'label'` - for [label](https://html.spec.whatwg.org/multipage/forms.html#the-label-element) like behavior

If `behavesLike` is assigned any other value, a ["NotSupportedError"](https://webidl.spec.whatwg.org/#notsupportederror) [DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException) should be thrown during `customElements.define()`.

`behavesLike` is a static property that must be set in the class definition and cannot be changed after the custom element is defined. This works similarly to the static [`formAssociated`](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-face-example) property that determines form association capabilities.

#### `static behavesLike = 'button'` and `elementInternals.buttonMixin`
When `static behavesLike = 'button'` is set in a custom element's class definition, the custom element will gain support for all button-specific attributes, properties, and methods.

**Supported attributes:**
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
The `elementInternals.buttonMixin` property provides access to button-specific properties:
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

**Supported methods:**
The `elementInternals.buttonMixin` property also provides access to button-specific methods:
- `checkValidity()` - returns true if the element's value has no validity problems; If false, the method also fires an invalid event on the custom element.
- `reportValidity()` - performs the same validity checking steps as the checkValidity() method, and if the invalid event isn't canceled, reports the problem to the user
- `setCustomValidity(message)` - sets a custom error message that is displayed when the form is submitted

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

#### `static behavesLike = 'label'` and `elementInternals.labelMixin`
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

#### Behavior-specific interfaces

This approach includes behavior-specific interfaces (`buttonMixin`, `labelMixin`) that provide access to DOM properties corresponding to element-specific attributes.

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

#### Order of precedence for used values: Element content attributes > `ElementInternals` properties > default properties via `behavesLike`

When `behavesLike` is set, the custom element will be assigned the same defaults as the corresponding native element. For example, if `behavesLike = 'button'` is set, the custom element's default ARIA role will become `button` and this will be the used role if no explicit role is specified by the author. If the author sets `elementInternals.role`, the value of `elementInternals.role` will be the used role, taking precedence over the default role. If the author sets the `role` attribute on the custom element, the value of the `role` attribute will be the used role, taking precedence over both `elementInternals.role` and the default role.

#### `behavesLike` with `extends`/`is` customized built-ins
If a custom element is defined with both `static behavesLike` and  `extends`/`is`, a ["NotSupportedError"](https://webidl.spec.whatwg.org/#notsupportederror) [DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException) should be thrown during `customElements.define()`.

This is because `behavesLike` functionality depends on `ElementInternals` (for its interface mixins, e.g., `elementInternals.buttonMixin`, `elementInternals.labelMixin`) which won't be available if the element is defined with `extends`/`is` (https://html.spec.whatwg.org/multipage/custom-elements.html#dom-attachinternals)

#### `behavesLike` does not change element appearance
Setting `behavesLike` gives a custom element native element like behavior, but the custom element's appearance does not change. In other words, the custom element does not take on default, author-specified or user-specified styles that target the native element, since the custom element has a different tag name (e.g., `<fancy-button>` instead of `<button>`).

#### `behavesLike` and `formAssociated`
If the element type specified by `behavesLike` is already a [form-associated element](https://html.spec.whatwg.org/multipage/forms.html#form-associated-element) (such as `'button'`), then `static formAssociated = true/false;` becomes a no-op since the element will automatically gain form association capabilities from its specified behavior.

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

## Stakeholder Feedback / Opposition

- Chromium : Positive
- WebKit : Positive based on https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455
- Gecko : No official signal, but no objections shared in the discussion here: https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455

[WHATWG resolution to accept `elementInternals.type = 'button'`](https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455)

[WHATWG resolution to accept using static property instead of `elementInternals.type`](https://github.com/whatwg/html/issues/11390#issuecomment-3190443053)

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Mason Freed](https://github.com/mfreed7)
- [Justin Fagnani](https://github.com/justinfagnani)
- [Keith Cirkel](https://github.com/keithamus)
- [Steve Orvell](https://github.com/sorvell)
- [Anne van Kesteren](https://github.com/annevk)
- [Lea Verou](https://github.com/LeaVerou)
- [Luke Warlow](https://github.com/lukewarlow)
- [Daniel Clark](https://github.com/dandclark)
- [Leo Lee](https://github.com/leotlee)
- [Open UI Community Group](https://www.w3.org/community/open-ui/)