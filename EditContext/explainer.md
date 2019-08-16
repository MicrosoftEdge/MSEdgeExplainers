# EditContext API Explained
This document proposes a new API for integrating web applications with the input services of the operating system to allow clean separation of document object model and data model, as well as richer functionality that web apps can take advantage of much like desktop apps.

## Motivation:
The built-in edit controls of the browser are no longer sufficient as the editing experience has evolved from filling in form data to rich editing experiences in web applications like CKEditor, GSuite, TinyMCE, Office 365, Visual Studio Online and many others.
Contenteditable, the most recent editing innovation developed as part of HTML5, was meant to provide a new editing primitive suitable for building rich editing experiences, but came with a design flaw in that it couples the document model and view. As a result, contenteditable is only suitable for editing HTML in a WYSIWYG fashion, and doesn't meet the needs of many editing applications.
Despite their shortcomings, contenteditable and the good old textarea element are used by many web-based editors today, as **without a focused, editable element in the DOM, there is no way for an author to leverage the advanced input features of modern operating systems including composition, handwriting recognition, shape-writing, and more**.

Each approach comes with its own set of drawbacks that include

1. Contenteditable approach limits the app's ability to enhance the view, as the view (i.e. the DOM) is also the authoritative source on the contents of the document being edited.
1. Additional issue with using contenteditable is that the editing operations built-in to the browser are designed to edit HTML, which produces results that are unrelated to the change in the actual editable document.  For example, shown in "Use Cases" section below, typing an 'x' after keyword `public` in the document when using a contenteditable element would continue with the preceding blue color making "publicx" look like a keyword. To avoid the issue, authors may prevent the default handling of input (e.g. on keydown). This can be done, but only for regular keyboard input and when a composition is not in progress, specifically, **there is no way to prevent modification of the DOM during composition without  disabling composition**.
1. In textarea approach, native selection cannot be used as part of the view (because its being used in the hidden textarea instead), which adds complexity (since the editing app must now build its own representation of selection and the caret), and (unless rebuilt by the editing app) eliminates specialized experiences for touch where selection handles and other affordances can be supplied for a better editing experience.
1. When the location of selection in the textarea doesn't perfectly match the location of selection in the view, it creates problems when software keyboards attempt to reposition the viewport to where the system thinks editing is occurring. Input method-specific UI meant to be positioned nearby the selection, for example the UI presenting candidates for phonetically composed text, can also be negatively impacted (in that they will be placed not nearby the composed text in the view).
1. Accessibility is negatively impacted. Assistive technologies may highlight the textarea to visually indicate what content the assisted experience applies to. Given that the textarea is likely hidden and not part of the view, these visual indicators will likely appear in the wrong location. Beyond highlighting, the model for accessibility should often match the view and not the portion of the document copied into a textarea. For assistive technology that reads the text of the document, the wrong content may be read as a result.

To summarize: EditContext API will help to alleviate problems and provide new functionalities, such as:
* Code complexity which in turn would increase developer productivity.
* A number of composition scenarios. e.g., long running composition in collaboration scenarios.
* Native-like functionality, allowing Web Apps to handle OS input in a more efficient fashion.

## Goals:
The goal of the EditContext is to expose the lower-level APIs provided by modern operating systems to facilitate various input modalities to unlock advanced editing scenarios.

## Non-Goals:
* EditContext API does not intend to replace existing edit controls that can still be used for simple editing scenarios on the web. 
* It does not attempt to solve any of the accessibility issues that are observed in editors, today. [AOM](https://wicg.github.io/aom/explainer.html) may be the answer to that.

### Use cases
#### Editing in online code editor:
Visual Studio editing experience. This would be difficult to replicate on the web using a contenteditable element as the view contains more information that the plain-text document being edited. Specifically, the grey text shows commit history and dependency information that is not part of the plain-text C# document being edited. Because input methods query for the text of the document nearby the selection for context, e.g. to provide suggestions, the divergence in document content and presentation can negatively impact the editing experience.

![Visual Studio's rich view of a plain-text document](visual_studio_editing_experience.png)

#### Native selection gripper support
Below the two animated gifs contrast the experience touching the screen to place a caret for Visual Studio Online (uses a hidden textarea for input and recreates its own selection and caret), versus placing a caret in a contenteditable div in Chrome (grippers shown).

|  No grippers  | Native Grippers    |
| ------------- | ------------------ |
|  ![Missing Grippers in Visual Studio Online](NOGrippersGif.gif) | ![With Grippers in Visual Studio Online](withGrippers.gif) ||

## Proposal:
To avoid the side-effects that come from using editable elements to integrate with input services, we propose using a new object, EditContext, that when created provides a connection to the operating system's input services.

The EditContext is an abstraction over a shared, plain-text input buffer that provides the underlying platform with a view of the content being edited. Creating an EditContext conceptually tells the browser to instantiate the appropriate machinery to create a target for text input operations. In addition to maintaining a shared buffer, the EditContext also has the notion of selection, expressed as offsets into the buffer, state to describe the layout bounds of the view of the editable region, as well as the bounds of the selection. These values are provided in JavaScript to the EditContext in terms of client coordinates and communicated by the browser to the underlying platform to enable rich input experiences.

Having a shared buffer and selection for the underlying platform allows it to provide input methods with context regarding the contents being edited, for example, to enable better suggestions while typing. Because the buffer and selection are stateful, updating the contents of the buffer is a cooperative process between the characters coming from user input and changes to the content that are driven by other events. Cooperation takes place through a series of events dispatched on the EditContext to the web application &mdash; these events are requests from the underlying platform to read or update the text of the web application. The web application can also proactively communicate changes in its text to the underlying platform by using methods on the EditContext.

A web application is free to create multiple EditContexts if there are multiple distinct editable areas in the application. Only the focused EditContext (designated by calling the focus method on the EditContext object) receives updates from the system's input services. Note that the concept of the EditContext being focused is separate from that of the document's activeElement, which will continue to determine the target for dispatching keyboard events.

[API usage examples](examples.md)

While an EditContext is active, the text services framework may read the following state:
* Text content
* Selection offsets into the text content
* The location (on the screen) of selection
* The location (on the screen) of the content this EditContext represents

The text services framework can also request that the buffer or view of the application be modified by requesting that:

* The text contents be updated
* The selection of be relocated
* The text contents be marked over a particular range, for example to indicate visually where composition is occurring

The web application is free to communicate before, after or during a request from the underlying platform that its:

* Text content has changed
* Selection offsets have changed
* The location (on the screen) of selection or content has changed
* The preferred mode of input has changed, for example, to provide software keyboard specialization 

## Alternatives:
Multiple approaches have been discussed during F2F editing meetings and through online discussions.
* New `ContentEditable` attributes. The group has [considered](https://w3c.github.io/editing/contentEditable.html) adding new attribute values to contenteditable (events, caret, typing) that in would allow web authors to prevent certain input types or to modify some input before it has made it into the markup. This approach hasn’t gotten much traction since browsers would still be building these behaviors on top of content editable thus, inheriting existing limitations.

* `beforeInput` event. It eventually diverged into two different specs, [Level 1](https://www.w3.org/TR/input-events-1/) (Blink implementation) and [Level 2](https://www.w3.org/TR/input-events-2/) (Webkit implementation). The idea behind this event was to allow developer to preventDefault user input (except for IME cases) and provide information about the type of the input. Due to Android IME constraints, Blink made most of the `beforeInput` event types non-cancelable except for a few formatting input types. This divergence would only get worse over time and since it only solves a small subset of problems for the web, it can’t be considered as a long-term solution.

* As an alternative to `beforeInput` Google has proposed a roadmap in [Google Chrome Roadmap Proposal](https://docs.google.com/document/d/10qltJUVg1-Rlnbjc6RH8WnngpJptMEj-tyrvIZBPSfY/edit) where it was proposed to use existing browser primitives solving CE problems with textarea buffer approach, similar to what developers have already been doing. While we agree with it in concept, we don't think there is a clean way to solve this with existing primitives. Hence, we are proposing EditContext API.

## Additional Material:

[Dev Design Draft](dev-design.md)

[Open Issues](open-issues.md)
