# Developer-defined behaviors

## Authors:

- [Ana Sollano Kim](https://github.com/anaskim)

*Note: This document is a forward-looking exploration and is **not** part of the [Platform-Provided Behaviors](explainer.md) explainer. The ideas described here represent a possible future direction for extending the behaviors model to developer-defined behaviors. The API surface, semantics, and feasibility are all subject to change as the platform-provided behaviors proposal matures.*

## Overview

The [Platform-Provided Behaviors](explainer.md) proposal introduces a set of browser-supplied behaviors (e.g., `HTMLSubmitButtonBehavior`) that custom elements can opt into via `attachInternals()`. An extension of this model is to allow developers to define their own reusable behaviors by subclassing an `ElementBehavior` base class. This would enable patterns such as:

- Encapsulating common interaction patterns (tooltips, drag-and-drop, keyboard shortcuts) as composable units.
- Polyfilling upcoming platform behaviors before they ship.
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

  behaviorDisconnectedCallback() {
    // #show appends the tooltip to document.body, so a tooltip left
    // showing at disconnect time would be orphaned in the body. Hide it
    // here to tear down anything the behavior created outside the host.
    this.#hide();
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

The behavior is instantiated and passed to `behaviors`:

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

## Goals

- Let developers define reusable behaviors as `ElementBehavior` subclasses that attach through the same `attachInternals({ behaviors: [...] })` entry point as platform-provided behaviors.
- Give a behavior a complete, well-defined lifecycle (attach, connect, disconnect) and a clear story for cleaning up resources it creates outside the host element.
- Encourage behaviors to be self-contained units with isolated effects — a convention, not a platform-enforced guarantee — so well-written behaviors combine cleanly with each other and with platform-provided behaviors.
- Reuse the platform-provided-behaviors conflict-resolution model for developer-defined behaviors.

## Non-goals

- Cooperate through a shared `super` chain.
- Contribute to the host's shadow tree. Rendering remains the custom element's responsibility.
- Grant capabilities a behavior cannot already reach from script.

## ElementBehavior API

`ElementBehavior` exposes an API that lets web developers reference the host element, set accessibility and form defaults through `ElementInternals`, receive lifecycle notifications, and clean up resources. The members below mirror the subset of the custom-element lifecycle a behavior needs, without re-exposing callbacks that belong to the element itself:

| Member | Kind | Description |
|--------|------|-------------|
| `element` | Property (read-only) | The custom element the behavior is attached to. Set by the platform before `behaviorAttachedCallback` runs. |
| `behaviorAttachedCallback(internals)` | Lifecycle | Called once when the behavior is attached via `attachInternals()`. Receives the host's `ElementInternals`. The place to set defaults (e.g. `internals.role`) and register listeners on `element`. |
| `behaviorConnectedCallback()` | Lifecycle | Called when the host is inserted into the document, after the element's own `connectedCallback`. Use for work that only makes sense while connected (positioning, document-scoped listeners). May run multiple times if the host moves in and out of the document. |
| `behaviorDisconnectedCallback()` | Lifecycle | Called when the host is removed from the document. The place to tear down anything the behavior created outside the host (elements appended to `document.body`, listeners on `document`/`window`, observers, timers). |

Because behaviors cannot be detached once attached (per the [platform-provided behaviors model](explainer.md#proposed-approach)), there is no `behaviorDetachedCallback`. A behavior's teardown point is `behaviorDisconnectedCallback`. Listeners registered directly on `element` are released together with the host when it is garbage-collected, so they do not need explicit removal; resources a behavior creates outside the host do.

Because a behavior is just an `ElementBehavior` subclass, the same mechanism can polyfill a platform-provided behavior, letting custom elements adopt the semantics and switch to the native behavior once the browser provides it. The following polyfills `HTMLButtonBehavior` (`type="button"`) in userland:

```javascript
class HTMLButtonBehaviorPolyfill extends ElementBehavior {
  #internals = null;
  #name = '';
  #value = '';

  #popoverTargetElement = null;
  #popoverTargetAction = 'toggle';
  #commandForElement = null;
  #command = '';

  behaviorAttachedCallback(internals) {
    this.#internals = internals;
    this.#internals.role = 'button';
    this.element.setAttribute('tabindex', '0');

    this.element.addEventListener('click', this.#handleClick);
    this.element.addEventListener('keydown', this.#handleKeydown);
    this.element.addEventListener('keyup', this.#handleKeyup);
  }

  #handleClick = (e) => {
    if (this.#internals.states.has('disabled')) {
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
    if (this.#internals.states.has('disabled')) {
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
    if (this.#internals.states.has('disabled')) {
      return;
    }
    if (e.key === ' ') {
      this.element.click();
    }
  };

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

// Use the native behavior when available, otherwise fall back to the polyfill.
const HTMLButtonBehavior = globalThis.HTMLButtonBehavior ?? HTMLButtonBehaviorPolyfill;

class MyButton extends HTMLElement {
  constructor() {
    super();
    this._buttonBehavior = new HTMLButtonBehavior();
    this._internals = this.attachInternals({ behaviors: [this._buttonBehavior] });
  }
}
```

- The polyfill overrides `behaviorAttachedCallback(internals)` to receive the `ElementInternals` object; sets defaults such as `internals.role`; and registers event listeners.
- The platform would set `this.element` before calling `behaviorAttachedCallback`, so it is already available inside the callback. The polyfill uses `this.element` to register event listeners and to trigger clicks during keyboard activation.
- `ElementBehavior` needs a single place to hold disabled state. The polyfill stores it in the host's [`CustomStateSet`](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet) (`internals.states`) rather than mirroring it into a private field, so the getter, setter, and event handlers all read one source of truth. A developer-defined behavior cannot make the real `:disabled` UA pseudo-class match (that is reserved to platform-provided behaviors) so authors style the polyfilled state with `:state(disabled)`. A native `HTMLButtonBehavior` would instead drive `:disabled` directly.
- A well-designed behavior should own a distinct slice of the host's interaction: its own listeners, its own private state, at most one default per `ElementInternals` slot. Behaviors written this way can be listed in any order with the same result.

## Composition and cooperation

Developer-defined behaviors compose the same way platform-provided behaviors do: each is an independent instance passed in the `behaviors` array, and each acts on the shared host element and its `ElementInternals`. There is no shared prototype chain between behaviors, so cooperation is mediated by the host rather than inheritance-based.

### Coordinating across behaviors

When two behaviors genuinely need to share state, the coordination point is the host element. The custom element holds references to its behaviors and wires them together through ordinary DOM events:

```javascript
class RatingItem extends HTMLElement {
  static formAssociated = true;
  constructor() {
    super();
    this._radio = new HTMLRadioGroupBehavior();
    this._hoverPreview = new HoverPreviewBehavior();
    this._internals = this.attachInternals({
      behaviors: [this._radio, this._hoverPreview],
    });
  }

  connectedCallback() {
    // HoverPreviewBehavior dispatches 'preview-commit' on the host when the
    // user commits a hovered rating. The host translates that into a change
    // on the radio behavior.
    this.addEventListener('preview-commit', () => {
      this._radio.checked = true;
    });
  }
}
customElements.define('rating-item', RatingItem);
```

Whether the platform should offer a first-class way for behaviors to cooperate is an [open question](#open-questions).

## Polyfilling behaviors

The `HTMLButtonBehavior` polyfill above is a close approximation to the platform-provided behavior: a polyfill can set `internals.role`, manage `tabindex`, and wire up activation, but it cannot make UA pseudo-classes match. Consider `HTMLDialogBehavior` (from `<dialog>`):

```javascript
// Polyfill for HTMLDialogBehavior.
class HTMLDialogBehaviorPolyfill extends ElementBehavior {
  #open = false;
  #returnValue = '';
  #modal = false;
  #previouslyFocused = null;

  behaviorAttachedCallback(internals) {
    internals.role = 'dialog';
    this.element.addEventListener('keydown', this.#handleKeydown);
    this.element.addEventListener('click', this.#handleBackdropClick);
  }

  behaviorDisconnectedCallback() {
    // If the host leaves the document while open, restore focus so it is not
    // stranded on a detached element.
    if (this.#open) {
      this.#previouslyFocused?.focus();
      this.#previouslyFocused = null;
    }
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

Although the polyfill above can't fully replicate a native `<dialog>` element (no true top layer, no `::backdrop`, no `:modal`), it provides a reasonable approximation. It also illustrates the lifecycle: the polyfill registers its listeners on the host (released with the host) and uses `behaviorDisconnectedCallback` to restore focus if the host is removed while open.

## Open questions

- Should the platform offer a channel for one behavior to observe or extend another or is host-mediated coordination enough?
- Do developer-defined behaviors need any registration, naming convention, or are they purely local to the author's code?

## References

- [Elix functional mixins](https://elix.org/elix/mixins). A component library that composes reusable behavior as class-level functional mixins (cooperating along the prototype chain via `super`, designed for order-independence and isolated effects). Useful prior art for how a behavior-composition system can be designed.