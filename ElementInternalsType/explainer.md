# ElementInternals.type

## Authors:
- [Sanket Joshi](https://github.com/sanketj)
- [Alex Keng](https://github.com/alexkeng)
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
- Supporting as many as customized built-in use cases as possible, though not necessarily all at once. Support for more `type` values can be added over time.

### Non-goals
- Deprecation of `extends`/`is`. This is something that can be considered independently, once `elementInternals.type` addresses developer needs sufficiently.
- A declarative version of `elementInternals.type`. This requires finding a general solution for declarative custom elements with declarative `elementInternals`. This is a broader problem that should be explored separately.

## Proposal: add `type` property to `ElementInternals`
The `ElementInternals` interface gives web developers a way to participate in HTML forms and integrate with the accessibility OM. This will be extended to support the creation of customized built-ins by adding a `type` property, which can be set to string values that represent native element types. The initial set of `type` values being proposed are listed below. Support for additional values may be added in the future.
- `'' (empty string)` - this is the default value, indicating the custom element is not a customized built-in
- `button` - for [button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-button) like behavior
- `submit` - for [submit button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-submit) like behavior
- `reset` - for [reset button](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type-reset) like behavior
- `label` - for [label](https://html.spec.whatwg.org/multipage/forms.html#the-label-element) like behavior

If `elementInternals.type` is assigned any other value, a ["NotSupportedError"](https://webidl.spec.whatwg.org/#notsupportederror) [DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException) should be thrown.

`elementInternals.type` should only be set once. If `elementInternals.type` has a non-empty string value and is attempted to be set again, a ["NotSupportedError"](https://webidl.spec.whatwg.org/#notsupportederror) [DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException) should be thrown. This works similar to how [`attachInternals` throws an error if called on an element more than once](https://html.spec.whatwg.org/multipage/custom-elements.html#dom-attachinternals:~:text=If%20this%27s%20attached%20internals%20is%20non%2Dnull%2C%20then%20throw%20an%20%22NotSupportedError%22%20DOMException).

Setting `elementInternal.type` allows the custom element to support additional attributes. The full list for each type is provided in the sub-sections below. If any of the properties have been set prior to setting `elementInternals.type`, the attribute will be "reset" to the default state for that type. Below is an example showcasing this with the `disabled` attribute.

```js
    class CustomButton extends HTMLElement {
        static formAssociated = true;

        constructor() {
            super();
            this.disabled = true;
            this.internals_ = this.attachInternals();
            this.internals_.type = 'button';
            console.log(this.disabled);  // logs `false`
        }
    }
    customElements.define('custom-button', CustomButton);
```

### `elementInternals.type = 'button'`
When `elementInternals.type = 'button'` is set in a custom element's constructor, the custom element will gain support for the attributes listed below.
- [`disabled`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fe-disabled)
- [`labels`](https://html.spec.whatwg.org/multipage/forms.html#dom-lfe-labels)
- [`form`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fae-form)
- [`popovertarget`](https://html.spec.whatwg.org/multipage/popover.html#attr-popovertarget)
- [`popovertargetaction`](https://html.spec.whatwg.org/multipage/popover.html#attr-popovertargetaction)
- [`command`](https://html.spec.whatwg.org/#attr-button-command)
- [`commandfor`](https://html.spec.whatwg.org/#attr-button-commandfor)
- [`interesttarget`](https://github.com/whatwg/html/pull/11006/files#:~:text=span%3E%20the%20%3Ccode%20data%2Dx%3D%22attr%2Dinteresttarget%22%3E-,interesttarget,-%3C/code%3E%20attribute.%3C/p%3E) - [currently experimental in Chromium](https://groups.google.com/a/chromium.org/g/blink-dev/c/LLgsMjTzmAY/m/5GUjSYC2AQAJ)

Below is an example showcasing a custom button being used as a popup invoker. When the custom button is activated, ex. via a click, `div id="my-popover"` will be shown as a popover.

```js
    class CustomButton extends HTMLElement {
        static formAssociated = true;

        constructor() {
            super();
            this.internals_ = this.attachInternals();
            this.internals_.type = 'button';
        }
    }
    customElements.define('custom-button', CustomButton);
```
```html
    <custom-button popovertarget="my-popover">Open popover</custom-button>
    <div id="my-popover" popover>This is popover content.</div>
```

Like with native buttons, if the `disabled` attribute is set, a custom button cannot be activated and thus cannot invoke popovers.

### `elementInternals.type = 'submit'`
Custom elements with `elementInternals.type = 'submit'` set will support the following attributes.
- [`disabled`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fe-disabled)
- [`labels`](https://html.spec.whatwg.org/multipage/forms.html#dom-lfe-labels)
- [`form`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fae-form)
- [`formAction`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-formaction)
- [`formEnctype`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-formenctype)
- [`formMethod`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-formmethod)
- [`formNoValidate`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-formnovalidate)
- [`formTarget`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-formtarget)
- [`name`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fe-name)
- [`value`](https://html.spec.whatwg.org/multipage/form-elements.html#dom-button-value)
- [`willValidate`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-willvalidate)
- [`validity`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-validity)
- [`validationMessage`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-validationmessage)
- [`checkValidity`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity)
- [`reportValidity`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-reportvalidity)
- [`setCustomValidity`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-setcustomvalidity)
- [`name`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fe-name)
- [`value`](https://html.spec.whatwg.org/multipage/form-elements.html#dom-button-value)

Below is an example showcasing a custom submit button being used to submit a form. When the custom button is activated, ex. via a click, the form will be submitted and the page will navigate.

```js
    class CustomSubmitButton extends HTMLElement {
        static formAssociated = true;

        constructor() {
            super();
            this.internals_ = this.attachInternals();
            this.internals_.type = 'submit';
        }
    }
    customElements.define('custom-submit-button', CustomSubmitButton);
```
```html
    <form action="http://www.bing.com">
        <custom-submit-button>Submit</custom-submit-button>
    </form>
```

If the `disabled` attribute is set on a custom submit button, it cannot be activated and thus cannot submit forms.

### `elementInternals.type = 'reset'`
Custom elements with `elementInternals.type = 'reset'` set will support the following attributes.
- [`disabled`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fe-disabled)
- [`labels`](https://html.spec.whatwg.org/multipage/forms.html#dom-lfe-labels)
- [`form`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fae-form)

### `elementInternals.type = 'label'`
Custom elements with `elementInternals.type = 'label'` set will support the following attributes.
- [`form`](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fae-form)
- [`for`](https://html.spec.whatwg.org/multipage/forms.html#dom-label-htmlfor)
- [`control`](https://html.spec.whatwg.org/multipage/forms.html#dom-label-control)

Below is an example showcasing a custom label being used to label a checkbox. When the custom label is activated, ex. via a click, the checkbox is also activated, resulting in its state changing to checked.

```js
    class CustomLabel extends HTMLElement {
        static formAssociated = true;

        constructor() {
            super();
            this.internals_ = this.attachInternals();
            this.internals_.type = 'label';
        }
    }
    customElements.define('custom-label', CustomLabel);
```
```html
   <custom-label for='my-checkbox'>Toggle checkbox</custom-label>
   <input type='checkbox' id='my-checkbox' />
```

### Order of precedence for used values: Element properties > `ElementInternals` properties > default properties via `elementInternals.type`
When `elementInternals.type` is set, the custom element will be assigned the same defaults as the corresponding native element. For example, if `elementInternals.type = 'button'` is set, the custom element's default ARIA role will become `button` and this will be the used role if no explicit role is specified by the author. If the author sets `elementInternals.role`, the value of `elementInternals.role` will be the used role, taking precedence over the default role. If the author sets the `role` attribute on the custom element, the value of the `role` attribute will be the used role, taking precedence over both `elementInternals.role` and the default role.

### `elementInternals.type` does not conflict with `extends`
Per spec, [`attachInternals`](https://html.spec.whatwg.org/multipage/custom-elements.html#dom-attachinternals) cannot be called on custom elements that are defined with `extends`. Therefore, it is not possible to create a custom element that is defined with `extends` and also sets `elementInternals.type`.

### `elementInternals.type` does not change element appearance
Setting `elementInternals.type` gives a custom element native element like behavior, but the custom element's appearance does not change. In other words, the custom element does not take on default, author-specified or user-specified styles from the native element.

### Customized built-ins must be [form-associated](https://html.spec.whatwg.org/multipage/custom-elements.html#concept-custom-element-definition-form-associated) to participate in forms
Today, custom elements need to be defined as [form-associated](https://html.spec.whatwg.org/multipage/custom-elements.html#concept-custom-element-definition-form-associated) to participate in forms. This is done by including `static formAssociated = true;` in its definition. Customized built-ins created by setting `elementInternals.type` will also need to be defined with `static formAssociated = true;` to participate in forms.

## Alternatives considered

A partial solution for this problem already exists today. Authors can specify the `extends` option when [defining a custom element](https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-define). Authors can then use the `is` attribute to give a built-in element a custom name, thereby turning it into a customized built-in element.

Both `extends` and `is` are supported in Firefox and Chromium-based browsers. However, this solution has limitations, such as not being able to attach shadow trees to (most) customized built-in elements. Citing these limitations, Safari doesn't plan to support customized built-ins in this way and have shared their objections here: https://github.com/WebKit/standards-positions/issues/97#issuecomment-1328880274. As such, `extends` and `is` are not on a path to full interoperability today.

The `elementInternals.type` proposal addresses many of the limitations with `extends`/`is`, including allowing customized built-ins to support shadow DOM. The proposal also has support from the WHATWG and multiple browser vendors (including Safari) as noted by a WG resolution here: https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455.

## Questions of Interest
If a declarative implementation is considered, how should it be done so it would [align with the future creation of a declarative implementation](https://github.com/openui/open-ui/issues/1088#issuecomment-2375184147) for custom elements?

## Stakeholder Feedback / Opposition

- Chromium : Positive
- WebKit : Positive based on https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455
- Gecko : No official signal, but no objections shared in the discussion here: https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455

[WHATWG resolution to accept `elementInternals.type = 'button'`](https://github.com/openui/open-ui/issues/1088#issuecomment-2372520455)

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Mason Freed](https://github.com/mfreed7)
- [Open UI Community Group](https://www.w3.org/community/open-ui/)

## Feedback

Please leave feedback by following the instructions on the [readme](https://github.com/MicrosoftEdge/MSEdgeExplainers/tree/main#) page to submit an issue, contribute to an existing issue, or submit a PR on the explainer document itself.
