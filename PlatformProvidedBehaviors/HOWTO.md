# How to experiment with Platform-Provided Behaviors

Platform-provided behaviors allow custom elements to adopt native HTML element capabilities through `attachInternals()`. The initial behavior, `HTMLSubmitButtonBehavior`, gives custom elements the form submission capability of `<button type="submit">`.

**This is an experimental feature available in Microsoft Edge and Chrome Canary channels, subject to change as the specification develops.**

## Enabling the feature

Navigate to `edge://flags/#enable-experimental-web-platform-features` (or `chrome://flags/#enable-experimental-web-platform-features`) and set it to **Enabled**, then restart the browser.

Alternatively, launch the browser with:
```
--enable-features=ElementInternalsBehaviors
```

## Quick test

Open DevTools (F12) and paste the following in the Console:
```javascript
typeof HTMLSubmitButtonBehavior !== 'undefined'
  ? 'Platform-provided behaviors are available!'
  : 'Not available. Check that the flag is enabled.';
```

## Basic example

Create a custom submit button that triggers form submission on click, keyboard activation (Space/Enter), and participates in implicit submission (Enter key inside the form):
```html
<!DOCTYPE html>
<form action="/submit" method="post">
  <label>
    Name: <input name="username" required>
  </label>
  <custom-submit-button>Submit</custom-submit-button>
</form>

<script>
  class CustomSubmitButton extends HTMLElement {
    static formAssociated = true;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          :host {
            display: inline-block;
            padding: 8px 16px;
            border: 1px solid #333;
            border-radius: 4px;
            cursor: pointer;
            user-select: none;
          }
          :host(:disabled) { opacity: 0.5; cursor: not-allowed; }
          :host(:active) { background: #eee; }
        </style>
        <slot></slot>
      `;
      this._submitBehavior = new HTMLSubmitButtonBehavior();
      this._internals = this.attachInternals({
        behaviors: [this._submitBehavior]
      });
    }
  }
  customElements.define('custom-submit-button', CustomSubmitButton);
</script>
```

What to observe:
- **Click the button**: the form submits.
- **Focus the button and press Space or Enter**: the form submits.
- **Focus the text input and press Enter**: implicit submission triggers via the custom submit button.
- **Inspect accessibility**: DevTools Accessibility pane shows `role="button"`.
- **Tab navigation**: the element participates in the tab order.

## Form override properties

`HTMLSubmitButtonBehavior` exposes the same form override properties as a native `<button type="submit">`:
```javascript
class CustomSubmitButton extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['disabled', 'formaction', 'formmethod'];

  constructor() {
    super();
    this._submitBehavior = new HTMLSubmitButtonBehavior();
    this._internals = this.attachInternals({
      behaviors: [this._submitBehavior]
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this._submitBehavior.disabled = newValue !== null;
        break;
      case 'formaction':
        this._submitBehavior.formAction = newValue ?? '';
        break;
      case 'formmethod':
        this._submitBehavior.formMethod = newValue ?? '';
        break;
    }
  }

  get disabled() {
    return this._submitBehavior.disabled;
  }

  set disabled(val) {
    this._submitBehavior.disabled = val;
  }
}
customElements.define('custom-submit-button', CustomSubmitButton);
```

```html
<form action="/default" method="get">
  <input name="data" value="test">
  <!-- This button overrides the form action and method. -->
  <custom-submit-button formaction="/override" formmethod="post">
    Save
  </custom-submit-button>
</form>
```

## Feature detection and fallback

```javascript
class CustomSubmitButton extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    if (typeof HTMLSubmitButtonBehavior !== 'undefined') {
      this._submitBehavior = new HTMLSubmitButtonBehavior();
      this._internals = this.attachInternals({
        behaviors: [this._submitBehavior]
      });
    } else {
      // Fall back to manual event handling.
      this._internals = this.attachInternals();
      this.addEventListener('click', () => {
        this._internals.form?.requestSubmit(this);
      });
    }
  }
}
```

## Disabled state

Setting `disabled` on the behavior removes the element from tab order and prevents activation:
```javascript
button._submitBehavior.disabled = true;
console.log(button.matches(':disabled')); // true
```

The element is also disabled if the `disabled` attribute is present on the element itself (standard form control disabling) or if it's inside a `<fieldset disabled>`.

## Inspecting behaviors in DevTools

```javascript
const button = document.querySelector('custom-submit-button');
const internals = button._internals; // If exposed by the component.
console.log(internals.behaviors); // FrozenArray [HTMLSubmitButtonBehavior]
console.log(internals.behaviors[0].formAction); // Current formAction value.
```

## Key constraints

- Behaviors are **immutable after attachment**: you cannot add, remove, or replace behaviors after calling `attachInternals()`.
- A behavior instance can only be attached to **one element**. Reusing the same instance on another element throws `TypeError`.
- Attaching multiple instances of the **same behavior type** to one element throws `TypeError`.
- The element must be **form-associated** (`static formAssociated = true`) for form submission to work. Without it, activation is a no-op.

## Filing bugs

If you encounter issues, please file a bug at https://issues.chromium.org/issues/new?component=1456278&blocking=486928684.

## Resources

- [Explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/PlatformProvidedBehaviors/explainer.md)
- [WHATWG tracking issue](https://github.com/whatwg/html/issues/12150)
- [Chromium bug](https://issues.chromium.org/issues/486928684)
- [Intent to Prototype](https://groups.google.com/a/chromium.org/g/blink-dev/c/ETKzYhB6BbI/m/0jQaazNHAQAJ)
