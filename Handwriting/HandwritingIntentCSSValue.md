# CSS Property to Allow/Disallow Handwriting Input (i.e., "ink to text")


Authors: [Rahul Arakeri](https://github.com/rahul8805), [Adam Ettenberger](https://github.com/adettenb), [Ben Mathwig](https://github.com/bmathwig), [Jenny Ma](https://github.com/majenny), [Gastón Rodríguez](https://github.com/gastonr_microsoft)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/), [Pointer Events Working Group](https://w3c.github.io/pointerevents/)
* **Current version: this document**

## Introduction

Multiple platforms have implemented API support for handwriting gestures on touch devices. In these platforms, the OS takes the gestures a user performed (via touch or stylus) and after applying some character recognition technology to the user's handwriting introduces text to the corresponding text editable input.

Web browsers who integrate this capability have to contend with other user agent defined touch behavior, for example, to determine if the gesture is intended to be a scroll or if it should be interpreted as handwriting. Whenever a user starts handwriting near a text editable input field the browser must first discern the user's intention, then change focus to the most appropriate editable input and then fire IME events.

However, browsers that recognize handwriting behave differently from those that don’t, and handwriting input isn’t always desirable for every application.

Developers may need to disable handwriting input for a better user experience or specific app behaviors. Current methods to disable handwriting input cause friction for developers and are not standardized.

This feature introduces a new web standard that simplifies enabling or disabling handwriting input across multiple platforms. By specifying a new keyword in the touch-action CSS property, developers can now easily indicate whether an element or its subtree should allow handwriting input.

## Goals

Give authors granular per-document and per-element control over which content should (dis)allow handwriting input.

## Non-Goals

* Allowing websites to determine whether the user agent supports handwriting as an input method, or whether the user has handwriting input enabled.
* Allowing websites to enable handwriting when it would not otherwise be enabled.
* Describe how handwriting capabilities should be implemented by browsers or platforms.

## Use Cases

Some scenarios where a website or application may want to disable handwriting input:

* Document editor that wants to temporarily disable handwriting input while certain tools are selected, to support using a stylus to seamlessly draw, place, or size non-text content overtop an editable text region.
  * Outlook drawing tools with "text pen"<br>![Outlook drawing tools with "text pen" selected](./drawing_tools.png "Outlook drawing tools with \"text pen\" selected")
* Application with custom form controls that accept sensitive input, have a strict format, or include special characters.
* Application with custom text inputs or editing experiences that override default browser behaviors by observing and handling input events and editing experiences, doesn't support input method editor (IME) or `composition{start|end|update}` events, or if for any reason the experience designed by website authors doesn't behave as they intend when handwriting input is available.
  

![example of handwriting input inserting the text "Hello World"](./handwriting.gif "example of handwriting input inserting the text \"Hello World\"")

## Proposed Solution

Introduce a new value, `handwriting`, to the CSS property `touch-action` which allows authors to specify whether an element should allow handwriting input. 

The [touch-action](https://w3c.github.io/pointerevents/#the-touch-action-css-property) CSS property is used by authors to define for whether user agents should execute their direct manipulation behavior for touch and pen gestures. When the spec was written this only included panning and zooming.
Authors are used to the [recommended practice of adding touch-action: none](https://w3c.github.io/pointerevents/#example_10) to elements over which they wish to handle all events themselves.

The `touch-action` propery also has a `manipulation` value, which when enabled indicates that the user agent may consider interactions only for the purposes of panning and continuous zooming. This value will be expanded to also indicate that the user agent may consider handwriting interactions on the element.


### Keywords and States

The `handwriting` keyword indicates whether an element and the element's descendants will allow handwriting input when supported by the user agent. Handwriting will only be allowed for an element when its computed `touch-action` includes the `handwriting` keyword. By default, `auto` and `manipulation` include the `handwriting` keyword.

#### Determining enablement

All CSS properties have computed values for all elements. The enablement of handwriting in a given `element` can be determined by running the following steps:

1. If the computed value for `touch-action` on `element` does not contain the `handwriting` or `manipulation` keyword, **disable handwriting**.
2. If the computed value for `touch-action` on `element` does contain the `handwriting` or `manipulation` keyword, **enable handwriting**.
3. If the computed value for `touch-action` on `element` is `auto`, search `element`'s parent chain for an ancestor with a non-`auto` computed value for `touch-action`. Apply steps 1 and 2 to the computed value for `touch-action` on the lowest such ancestor.
4. If the computed value for `touch-action` on `element` and all of its ancestors is `auto`, **enable handwriting**.

### Syntax

```html
<textarea></textarea>                                         <!-- the computed handwriting value is true -->
<textarea style="touch-action:handwriting;"></textarea>       <!-- the computed handwriting value is true -->
<textarea style="touch-action:pan-x;"></textarea>             <!-- the computed handwriting value is false -->
<textarea style="touch-action:pan-x handwriting;"></textarea> <!-- the computed handwriting value is true -->
<textarea style="touch-action:manipulation;"></textarea>      <!-- the computed handwriting value is true -->


<div style="touch-action:pan-x;">
  <textarea></textarea>                                       <!-- the computed handwriting value is false -->
  <textarea style="touch-action:handwriting;"></textarea>     <!-- the computed handwriting value is true -->
  <textarea style="touch-action:pan-y;"></textarea>           <!-- the computed handwriting value is false -->
</div>
```


## Privacy and Security Considerations

### Privacy

Since the proposed property should not interact with other HTML or IDL attributes, DOM properties, or JavaScript APIs in an interesting way, and the property doesn't reflect whether a user agent supports or has enabled handwriting input, it shouldn't be possible to use this for fingerprinting. As of writing this, we are not aware of any way the proposed property could be used towards nefarious means since it's merely a hint for the browser to allow handwriting input and the `handwriting` state doesn't expose anything about the user nor their device.

### Security

There are no known security impacts of the features in this specification.

## Alternative Solutions

The proposal is for this to be an CSS property.

* Why not an HTML+IDL attribute?
    * The [first proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Handwriting/explainer.md) was to add the handwriting functionality as an HTML+IDL attribute, but after some discussion it was decided that the better option was to implement the functionality in the `touch-action` CSS attribute. [[1](https://groups.google.com/a/chromium.org/g/blink-dev/c/0r_tV6k0NyA?pli=1)][[2](https://github.com/w3c/pointerevents/issues/516)]

    * [Pro] An HTML attribute can be exposed to JavaScript as a IDL attribute which may be more ergonomic.
    * [Pro] If users or organizations disable CSS for their browsers there would need to be another mechanism to disable handwriting input.
    * [Pro] All websites who currently use `touch-action` won't have to update their rules if they want to enable handwriting. Once this feature is shipped, websites that specify `touch-action` without enabling `handwriting` keyword will lose their handwriting capabilities.
    * [Con] CSS pattern matching is a powerful tool and may be more ergonomic for some use cases.
    * [Con] Developers would have to keep track of both the `touch-action` CSS property and new HTML attribute in order to completely declare the desired behavior of their webpages.

* Why not an HTML+IDL attribute that interacts with `touch-action`?

`touch-action:none;` is the accepted and recommended way of disabling all types of touch interaction with the elements. The HTML attribute would not be able to override the `touch-action` property in these scenarios. By accepting touch-action as a filter, developers would lose the flexibility of disabling scrolling while enabling handwriting.
`✅ touch-action: none + HTML handwriting=false` disables handwriting.
`✅ touch-action: pan-x pan-y + HTML handwriting=false` disables handwriting.
`✅ touch-action: pan-x pan-y + HTML handwriting=true` enables handwriting.
`❌ touch-action: none + handwriting=true` disables handwriting? enables handwriting?

The last entry that fails is equivalent of `touch-action: handwriting`. In order to implement this handwriting control mechanism, the `touch-action:none;` recommendation would have to be modified.

* Why not a JavaScript API? (e.g., `e.enableHandwriting()` or `e.setHandwritingState(...)`, `e.getHandwritingState()` and `e.getComputedHandwritingValue()`)
    * [Pro] Granular control over which elements should allow handwriting input.
    * [Con] Introduces more complexity and is not as simple as an HTML attribute or CSS property.
    * [Con] A CSS property can be exposed to JavaScript as a IDL attribute which may be more ergonomic.
    * [Con] If users, touch  and pen, or organizations disable JavaScript for their browsers there would need to be another mechanism to disable handwriting input.

* Why not some combination of all the above?
    * [Pro] Allows for the greatest flexibility with multiple paths to achieve the same goal, so authors can choose the approach that best fits their use case or preference.
    * [Con] More complex backend implementation and less obvious frontend implementation due to the combination available to specify per-document or per-element `handwriting` state.

* Why not extend a different attribute or property?
    * [HTML] `inputmode`
        * Related to but distinct from &lt;input&gt; `type`. Is only concerned with virtual keyboard inputs.
    * [CSS] `pointer-events`:
        * Is concerned with whether an element or visual components of an element can be the target of a pointer event, not what kinds of pointer devices can be used.
