## Open Issues

How to deal with EditContext focus when the focused element itself is editable? In the current proposed model, the focused element doesn't receive things like composition events &mdash; should an editable element receive these? It feels like we should treat these the same as when the text input operations are redirected and not deliver those events to the editable element.

Is there a reason we might want to fire keypress on the focused element for non-IME input to EditContext. I couldn't think of one and this is generally a synthesized event anyways.

How does EditContext integrate with accessibility [Accessibility Object Model?](http://wicg.github.io/aom/explainer.html) so that screen readers also have context as to where the caret/selection is placed as well as the surrounding contents. This is another major complaint about implementing editors today - without a contenteditable with a full fidelity view, the default accessibility implementations report incorrect information.

Additionally, how can we provide better guidance around accessibility w.r.t. to the `textformatupdate` event.

It feels like we may need a mechanism by which ```layoutChanged()``` is more easily integrated. Currently there is no single point that the web developer knows it may need to report updated bounds, and the current model may encourage layout thrashing by computing bounds early in the process of producing a frame. Instead we may need to provide a callback during the rendering steps where the EditContext owner can set the updated layout bounds themselves. Perhaps IntersectionObservers is a good model where we can queue a microtask that will fire after the frame has been committed and layout has been computed &mdash; the layout update may be delayed by a frame, but the update is asynchronous anyways.


#### What services do editable elements provide?
* Integrate with focus so keyboard, composition, clipboard and other ambient input events have a sensible place to be routed
* Integrate with the browser's native selection so the user can express where editing operations should occur
    * This includes displaying a caret to mark an insertion point for text
    * Includes implementing boundaries for selection so that it doesn't extend across the boundary of an editable element.
* Editable elements participate in the view such that they have a size and position known to the browser for themselves and their contents
* Provide editing operations that are specific to the type of editable element.
* Describe themselves to the OS input services:
    * To indicate if a specialized software keyboard could be used to facilitate input.
    * To enable composition and other forms of input like handwriting recognition and shape-writing.
    * To communicate position information so specialized UI for input can be displayed nearby editable regions and software keyboards can scroll the viewport to avoid occluding the editable area.
    * To provide a plain-text view of the document for context so that suggestions for auto-completion, spell-checking, and other services can be effectively provided.
* Handle specialized input requests from the OS
    * To highlight text to, for example, indicate where composition is occurring
    * Replace arbitrary runs of text to, for example, facilitate composition updates, provide auto-correction, and other services.
    * Change the location of selection or the caret.
    * Blur to lose focus.
* Describe themselves to accessibility services in a special way to indicate that they are editable regions of the document.
* Enable clipboard operations
* Automatically become a drop target
* Undo Manager that maintains the stack of user actions.

#### If we build an editor without editable elements, i.e. using the DOM to render the view of the editable document, what are we missing?
* APIs to manage focus exist and can be applied to elements that are not editable.
* Size and position can be computed for elements in the view that represent the editable document. APIs exist so this information can be queried and fulfill requests for accessibility and the OS input services if new APIs were created to communicate with those services.
* We lose the ability receive OS input-oriented requests.  An API is needed to replace this.
* We lose edit pattern support for accessibility.  An API is needed to replace this.
* To compensate for the loss of caret the editing app must provide its own and may also provide its own selection.
* APIs exist to register parts of the view as a drop target
* Clipboard events will still fire on paste even when the area is not editable, but the editing app must take actions on its own.
* The app must implement its own Undo Manager.

#### Lower-level APIs provided by modern operating systems
* To facilitate input using a variety of modalities, OSX, iOS, Android, Windows, and others have developed a stateful intermediary that sits between input clients (e.g. IMEs) and input consumers (i.e. an editing app).
* This intermediary asks the editing app to produce an array-like, plain-text view of its document and allows various input clients to query for that text, for example, to increase the accuracy of suggestions while typing.  It also can request that regions of the document be highlighted or updated to facilitate composition.  It also can request the location of arbitrary parts of the document so that the UI can be augmented with input-client specific UI.
* Browsers take advantage of these OS input services whenever an editable element is focused by registering for callbacks to handle the requests to highlight or update the content of the DOM and to fulfill the queries mentioned above.
