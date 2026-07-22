# Developer-defined behaviors

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

*Note: This document is a forward-looking exploration and is **not** part of the [Platform-Provided Behaviors](explainer.md) explainer. The ideas described here represent a possible future direction for extending the behaviors model to developer-defined behaviors. The API surface, semantics, and feasibility are all subject to change as the platform-provided behaviors proposal matures.*

## Overview

The [Platform-Provided Behaviors](explainer.md) proposal introduces a set of browser-supplied behaviors (e.g., `HTMLButtonBehavior`) that custom elements declare via a `static behaviors` class property. A natural extension of this model is to allow developers to define their own reusable behaviors by subclassing one of the platform's [category base classes](explainer.md#behavior-categories-and-composition). This would enable patterns such as:

- Defining new activation or embedded-content identities that the platform does not provide.
- Polyfilling upcoming platform behaviors before they ship natively.
- Composing developer-defined behaviors with platform-provided ones across categories on the same element.

```javascript
class QRCodeBehavior extends EmbeddedContentBehavior {
  // The accessor name on internals.behaviors; here internals.behaviors.qrCode.
  static behaviorName = 'qrCode';

  #value = '';
  #canvas = null;
  #resizeObserver = null;

  behaviorAttachedCallback(internals) {
    // Render into a canvas that fills the host's replaced box.
    this.#canvas = document.createElement('canvas');
    this.element.append(this.#canvas);
    this.#render();
  }

  elementConnectedCallback() {
    // Re-render at the host's size once it is laid out in the document.
    this.#resizeObserver = new ResizeObserver(() => this.#render());
    this.#resizeObserver.observe(this.element);
  }

  elementDisconnectedCallback() {
    // Tear down the observer created outside the host's own subtree.
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  #render() {
    if (!this.#canvas) {
      return;
    }
    const ctx = this.#canvas.getContext('2d');
    // Encode this.#value and draw the QR matrix onto the canvas.
  }

  get value() {
    return this.#value;
  }
  set value(val) {
    this.#value = val;
    this.#render();
  }
}
```

Behaviors are classes with a `behaviorAttachedCallback` method. A behavior is declared as a class reference in `static behaviors`; the platform instantiates it per host, and the author reaches the instance through `internals.behaviors` under a name the behavior declares in a `static behaviorName`. Platform behaviors use canonical names (`HTMLButtonBehavior` declares `"button"`, reached as `behaviors.button`); a developer-defined behavior declares its own (`QRCodeBehavior` declares `static behaviorName = 'qrCode'`, reached as `behaviors.qrCode`):

```javascript
class QRCodeButton extends HTMLElement {
  static behaviors = [HTMLButtonBehavior, QRCodeBehavior];

  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.behaviors.button.type = 'button';

    // On activation, copy the encoded URL to the clipboard.
    this.addEventListener('click', () => {
      const url = this.#internals.behaviors.qrCode.value;
      navigator.clipboard.writeText(url);
    });
  }

  connectedCallback() {
    // Access the platform-created instance via the behaviors collection.
    this.#internals.behaviors.qrCode.value = 'https://example.com';
  }
}
```

`QRCodeBehavior` extends `EmbeddedContentBehavior`, and `HTMLButtonBehavior` is in the activation category. Because the two behaviors are in different categories, they compose: `QRCodeButton` renders a QR code (from `QRCodeBehavior`) and activates like a button (from `HTMLButtonBehavior`), so a click can, for example, copy the encoded link.

## Choosing a category

A developer-defined behavior extends one of the platform's [category base classes](explainer.md#behavior-categories-and-composition) (`ElementBehavior` is the abstract root):

- A behavior that activates (runs an action on click or keyboard) extends `ActivationBehavior`.
- A behavior that renders replaced content extends `EmbeddedContentBehavior`.

The platform enforces composition with the same membership check it uses for platform behaviors, so developer-defined behaviors slot into the model without a separate compatibility mechanism.

A capability that is not an activation or embedded-content identity does not map to a current category.

## Goals

- Let developers define reusable behaviors as subclasses of a platform category base (`ActivationBehavior` or `EmbeddedContentBehavior`) that attach through the same `static behaviors` declaration as platform-provided behaviors.
- Give a behavior a complete, well-defined lifecycle (attach, connect, disconnect) and a clear story for cleaning up resources it creates outside the host element.
- Encourage behaviors to be self-contained units with isolated effects.
- Reuse the platform-provided-behaviors [category composition model](explainer.md#behavior-categories-and-composition) for developer-defined behaviors.

## Non-goals

- Cooperating between sibling behaviors through a shared `super` chain.
- Granting a behavior capabilities it cannot already reach from script.

## ElementBehavior API

`ElementBehavior` exposes an API that lets web developers reference the host element, set accessibility and form defaults through `ElementInternals`, receive lifecycle notifications, and clean up resources. The members below mirror the subset of the custom-element lifecycle a behavior needs, without re-exposing callbacks that belong to the element itself:

| Member | Kind | Description |
|--------|------|-------------|
| `behaviorName` | Static property | The name the behavior is exposed under on `internals.behaviors` (e.g. `static behaviorName = 'qrCode'` is reached as `internals.behaviors.qrCode`). |
| `element` | Property (read-only) | The custom element the behavior is attached to. Set by the platform before `behaviorAttachedCallback` runs. |
| `behaviorAttachedCallback(internals)` | Lifecycle | Called once when the behavior is attached. Receives the host's `ElementInternals`. The place to set defaults (e.g. `internals.role`) and, for a category behavior, to override the category's hooks. |
| `elementConnectedCallback()` | Lifecycle | Called when the host is inserted into the document, after the element's own `connectedCallback`. Use for work that only makes sense while connected (positioning, document-scoped listeners, observers). May run multiple times if the host moves in and out of the document. |
| `elementDisconnectedCallback()` | Lifecycle | Called when the host is removed from the document. The place to tear down anything the behavior created outside the host (elements appended to `document.body`, listeners on `document`/`window`, observers, timers). |

Because behaviors cannot be detached once attached (per the [platform-provided behaviors model](explainer.md#proposed-approach)), there is no `behaviorDetachedCallback`. Listeners registered directly on `element` are released together with the host when it is garbage-collected, so they do not need explicit removal; resources a behavior creates outside the host do.

The following example shows how a userland behavior would implement `HTMLButtonBehavior` (`type="button"`) as an activation identity. Because it reimplements a platform behavior, the same class doubles as a polyfill. As an `ActivationBehavior` subclass, it receives the activation dispatch path from its base (click, keyboard activation via Space and Enter, `element.click()`, and `preventDefault()`/`stopPropagation()` handling) and overrides the activation algorithm to define what the button does when activated.

```javascript
class HTMLButtonBehaviorExample extends ActivationBehavior {
  #internals = null;
  #name = '';
  #value = '';

  #popoverTargetElement = null;
  #popoverTargetAction = 'toggle';
  #commandForElement = null;
  #command = '';

  behaviorAttachedCallback(internals) {
    this.#internals = internals;
    // Declare the identity's defaults.
    this.#internals.role = 'button';
    this.element.setAttribute('tabindex', '0');
  }

  // The ActivationBehavior base calls this when the host is activated and the
  // click was not canceled.
  activationBehavior(event) {
    if (this.#internals.states.has('disabled')) {
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
  }

  // Properties
  get disabled() {
    return this.#internals.states.has('disabled');
  }
  set disabled(val) {
    if (val) {
      this.#internals.states.add('disabled');
    } else {
      this.#internals.states.delete('disabled');
    }
  }

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

// Use the native behavior when available, otherwise the userland polyfill.
const HTMLButtonBehavior = globalThis.HTMLButtonBehavior ?? HTMLButtonBehaviorExample;

class MyButton extends HTMLElement {
  static behaviors = [HTMLButtonBehavior];

  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
  }
}
```

- The subclass overrides `behaviorAttachedCallback(internals)` to receive the `ElementInternals` object and set its defaults, such as `internals.role` and focusability.
- The subclass overrides the activation algorithm `activationBehavior(event)`. The `ActivationBehavior` base invokes it when the host is activated by click, keyboard (Space/Enter), or `element.click()`, so the subclass does not register its own activation listeners.
- The platform sets `this.element` before calling `behaviorAttachedCallback`, so the host is available inside the callback and the activation algorithm.
- A developer-defined behavior cannot make the real `:disabled` UA pseudo-class match (that is reserved to platform-provided behaviors), so the example stores disabled state in the host's [`CustomStateSet`](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet) (`internals.states`) as the single source of truth for its getter, setter, and activation guard. Authors style it with `:state(disabled)`; a native `HTMLButtonBehavior` would drive `:disabled` directly.

## Composition and cooperation

Developer-defined behaviors compose the same way platform-provided behaviors do: each is listed as a class in `static behaviors`, the platform instantiates one per host, and each acts on the shared host element and its `ElementInternals`. Sibling behaviors share no prototype chain, so when two behaviors need to coordinate, the host mediates rather than one behavior reaching into another. The `QRCodeButton` example above already shows this shape: the host adds a `click` listener that reacts to the activation behavior and reads the embedded-content behavior's `value`.

## Open questions

- Should the platform offer a channel for one behavior to observe or extend another, or is host-mediated coordination enough?
- Do developer-defined behaviors need any registration or naming convention, or are they purely local to the author's code?

## References

- [Elix functional mixins](https://elix.org/elix/mixins). A component library that composes reusable behavior as class-level functional mixins (cooperating along the prototype chain via `super`, designed for order-independence and isolated effects). Useful prior art for how a behavior-composition system can be designed.
