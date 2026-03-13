# Developer-defined behaviors

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

*Note: This document is a forward-looking exploration and is **not** part of the [Platform-Provided Behaviors](explainer.md) explainer. The ideas described here represent a possible future direction for extending the behaviors model to developer-defined behaviors. The API surface, semantics, and feasibility are all subject to change as the platform-provided behaviors proposal matures.*

## Overview

The [Platform-Provided Behaviors](explainer.md) proposal introduces a set of browser-supplied behaviors (e.g., `HTMLSubmitButtonBehavior`) that custom elements can opt into via `attachInternals()`. A natural extension of this model is to allow developers to define their own reusable behaviors by subclassing an `ElementBehavior` base class. This would enable patterns such as:

- Encapsulating common interaction patterns (tooltips, drag-and-drop, keyboard shortcuts) as composable units.
- Polyfilling upcoming platform behaviors before they ship natively.
- Composing developer-defined behaviors with platform-provided ones on the same element.

```javascript
class TooltipBehavior extends ElementBehavior {
  #content = '';
  #tooltipElement = null;

  behaviorAttachedCallback(internals) {
    this.element.addEventListener('mouseenter', this.#show);
    this.element.addEventListener('mouseleave', this.#hide);
    this.element.addEventListener('focus', this.#show);
    this.element.addEventListener('blur', this.#hide);
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
}
```

Behaviors are classes with a `behaviorAttachedCallback` method. The behavior is instantiated and passed to `behaviors`:

```javascript
class CustomButton extends HTMLElement {
  constructor() {
    super();

    this._tooltipBehavior = new TooltipBehavior();
    this._submitBehavior = new HTMLSubmitButtonBehavior();
    this._internals = this.attachInternals({
      behaviors: [this._tooltipBehavior, this._submitBehavior]
    });
  }

  connectedCallback() {
    // Access state directly via the stored reference.
    this._tooltipBehavior.content = this.getAttribute('tooltip');
  }
}
```

`TooltipBehavior` could be combined with platform-provided behaviors. Here, `CustomButton` gains both tooltip functionality (show on hover/focus) and submit button semantics (click/Enter submits forms, implicit submission, `role="button"`).

#### ElementBehavior API

For developer-defined behaviors to work, `ElementBehavior` would need to expose an API that lets web developers set accessibility defaults, receive lifecycle notifications, and reference the host element:

| Member | Kind | Description |
|--------|------|-------------|
| `element` | Property (read-only) | Reference to the host element. |
| `setDefaultRole(role)` | Method | Sets the element's implicit ARIA role. |
| `setDefaultTabIndex(index)` | Method | Sets the element's implicit tab index, making it focusable without an explicit `tabindex` attribute. |
| `behaviorAttachedCallback(internals)` | Lifecycle | Called when the behavior is attached to an element via `attachInternals()`. Receives the `ElementInternals` object. |

The following example shows how `HTMLButtonBehavior` (`type="button"`) would be implemented in userland:

```javascript
class HTMLButtonBehaviorExample extends ElementBehavior {
  #disabled = false;
  #internals = null;
  #name = '';
  #value = '';

  #popoverTargetElement = null;
  #popoverTargetAction = 'toggle';
  #commandForElement = null;
  #command = '';

  behaviorAttachedCallback(internals) {
    this.#internals = internals;

    this.setDefaultRole('button');
    this.setDefaultTabIndex(0);

    this.element.addEventListener('click', this.#handleClick);
    this.element.addEventListener('keydown', this.#handleKeydown);
    this.element.addEventListener('keyup', this.#handleKeyup);
  }

  #handleClick = (e) => {
    if (this.#disabled) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    if (this.#popoverTargetElement) {
      switch (this.#popoverTargetAction) {
        case 'show': {
          this.#popoverTargetElement.showPopover();
          break;
        }
        case 'hide': {
          this.#popoverTargetElement.hidePopover();
          break;
        }
        default: {
          this.#popoverTargetElement.togglePopover();
          break;
        }
      }
      return;
    }

    if (this.#commandForElement && this.#command) {
      const commandEvent = new CommandEvent('command', {
        source: this.element,
        command: this.#command,
      });
      this.#commandForElement.dispatchEvent(commandEvent);
    }
  };

  #handleKeydown = (e) => {
    if (this.#disabled) {
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (e.key === 'Enter') {
        this.element.click();
      }
    }
  };

  #handleKeyup = (e) => {
    if (this.#disabled) {
      return;
    }
    if (e.key === ' ') {
      this.element.click();
    }
  };

  // Properties
  get disabled() { return this.#disabled; }
  set disabled(val) {
    this.#disabled = val;
    this.#internals?.setDisabled?.(this.#disabled);
  }

  get name() { return this.#name; }
  set name(val) { this.#name = val; }

  get value() { return this.#value; }
  set value(val) { this.#value = val; }

  // Popover target API.
  get popoverTargetElement() { return this.#popoverTargetElement; }
  set popoverTargetElement(val) { this.#popoverTargetElement = val; }
  get popoverTargetAction() { return this.#popoverTargetAction; }
  set popoverTargetAction(val) { this.#popoverTargetAction = val; }

  // Invoker commands API.
  get commandForElement() { return this.#commandForElement; }
  set commandForElement(val) { this.#commandForElement = val; }
  get command() { return this.#command; }
  set command(val) { this.#command = val; }
}

// Attaching the behavior to a custom element:
class MyButton extends HTMLElement {
  constructor() {
    super();
    this._buttonBehavior = new HTMLButtonBehaviorExample();
    this._internals = this.attachInternals({ behaviors: [this._buttonBehavior] });
  }
}
```

- The subclass overrides `behaviorAttachedCallback(internals)` to receive the `ElementInternals` object; set defaults with `setDefaultRole(role)` and `setDefaultTabIndex(index)`; and register event listeners.
- The platform would set `this.element` before calling `behaviorAttachedCallback`, so it is already available inside the callback. The example uses `this.element` to register event listeners and to trigger clicks during keyboard activation.
- `ElementBehavior` needs to provide a way to affect the `:disabled` pseudo-class. The `setDisabled()` method (called in the `disabled` setter) would need to integrate with `ElementInternals` states.

#### Polyfilling behaviors

This design also would enable **polyfilling** new platform behaviors before they ship natively. Consider `HTMLDialogBehavior` (from `<dialog>`):

```javascript
// Polyfill for HTMLDialogBehavior.
class HTMLDialogBehaviorPolyfill extends ElementBehavior {
  #open = false;
  #returnValue = '';
  #modal = false;
  #previouslyFocused = null;

  behaviorAttachedCallback(internals) {
    this.setDefaultRole('dialog');
    this.element.addEventListener('keydown', this.#handleKeydown);
    this.element.addEventListener('click', this.#handleBackdropClick);
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
