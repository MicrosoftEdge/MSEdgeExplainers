# Examples

### Example 1

Create an EditContext and have it start receiving events when its associated container gets focus. After creating an EditContext object, the web application should initialize the text and selection (unless the state of the web application is correctly represented by the empty defaults) via a dictionary passed to the constructor.  Additionally, the layout bounds of selection and conceptual location of the EditContext in the view should be provided by calling ```layoutChanged()```.

```javascript
let editContainer = document.querySelector("#editContainer");

let editContextDict = {
    inputmode: "text",
    text: "Hello world",
    selection: { start: 11, end: 11 }
};
let editContext = new EditContext(editContextDict);

let model = new EditModel(editContext, editContextDict.text, editContextDict.selection);
let view = new EditableView(editContext, model, editContainer);

editContainer.addEventListener("focus", () => editContext.focus());
window.requestAnimationFrame(() => {
    editContext.layoutChanged(editContainer.getBoundingClientRect(), computeSelectionBoundingRect());
});

editContainer.focus();
```

Assuming ```model``` represents the document model for the editable content, and ```view``` represents an object that produces an HTML view of the document, registers for textupdate and keyboard related events (note that keydown/keyup are still delivered to the edit container, i.e. the activeElement):

```javascript
editContainer.addEventListener("keydown", e => {
    // Handle control keys that don't result in characters being inserted
    switch (e.key) {
        case "Home":
            model.updateSelection(...);
            view.queueUpdate();
            break;
        case "Backspace":
            model.deleteCharacters(Direction.BACK);
            view.queueUpdate();
            break;
        ...
    }
});

editContext.addEventListener("textupdate", e => {
    model.updateText(e.newText, e.updateRange);

    // Do not call textChanged on editContext, as we're accepting
    // the incoming input.

    view.queueUpdate();
});

editContext.addEventListener("selectionupdate", e => {
    model.setSelection(e.start, e.end);

    // Do not call selectionChanged on editContext, as we're accepting
    // the incoming event.

    // Update the view to render the new selection
    view.queueUpdate();
});

editContext.addEventListener("textformatupdate", e => {
    view.addFormattedRange(e.formatRange)
});
```

### Example 2

Example of a user-defined EditModel class that contains the underlying model for the editable content
```javascript
// User defined class 
class EditModel {
    constructor(editContext, text, selection) {
        // This specific model uses the underlying buffer directly so doesn't
        // store model directly.
        this.editContext = editContext;
        this.text = text;
        this.selection = new Selection();
        this.setSelection(selection.start, selection.end);
    }

    updateText(text, updateRange, newSelection) {
        this.text = this.text.slice(0, updateRange.start) +
            text + this.text.slice(updateRange.end, this.text.length);
    }

    setSelection(start, end) {
        this.selection.start = start;
        this.selection.end = end;
    }

    updateSelection(...) {
        // Compute new selection, based on shift/ctrl state
        let newSelection = computeSelection(this.editContext.currentSelection, ...);
        this.setSelection(newSelection.start, newSelection.end);
        this.editContext.selectionChanged(newSelection.start, newSelection.end);
    }

    deleteCharacters(direction) {
        if (this.selection.start !== this.selection.end) {
            // Notify EditContext that things are changing.
            this.editContext.textChanged(this.selection.start, this.selection.end, "");
            this.editContext.selectionChanged(this.selection.start, this.selection.start);

            // Update internal model state
            this.text = text.slice(0, this.selection.start) +
                text.slice(this.selection.end, this.text.length)
            this.setSelection(this.selection.start, this.selection.start);
        } else {
            // Delete a single character, based on direction (forward or back).
            // Notify editContext of changes
            ...
        }
    }
}
```

### Example 3
Example of a user defined class that can compute an HTML view, based on the text model
```javascript
class EditableView {
    constructor(editContext, editModel, editRegionElement) {
        this.editContext = editContext;
        this.editModel = editModel;
        this.editRegionElement = editRegionElement;

        // When the webpage scrolls, the layout position of the editable view
        // may change - we must tell the EditContext about this.
        window.addEventListener("scroll", this.notifyLayoutChanged.bind(this));

        // Same response is needed when the window is resized.
        window.addEventListener("resize", this.notifyLayoutChanged.bind(this));
    }

    queueUpdate() {
        if (!this.updateQueued) {
            requestAnimationFrame(this.renderView.bind(this));
            this.updateQueued = true;
        }
    }

    addFormattedRange(formatRange) {
        // Replace any previous formatted range by overwriting - there
        // should only ever be one (specific to the current composition).
        this.formattedRange = formatRange;
        this.queueUpdate();
    }

    renderView() {
        this.editRegionElement.innerHTML = this.convertTextToHTML(
            this.editModel.text, this.editModel.selection);

        notifyLayoutChanged();

        this.updateQueued = false;
    }

    notifyLayoutChanged() {
        this.editContext.layoutChanged(this.computeBoundingBox(), this.computeSelectionBoundingBox());
    }

    convertTextToHTML(text, selection) {
        // compute the view (code omitted for brevity):
        // - if there is no selection, return a string with the text contents
        // - surround the selection by a <span> that has the
        //   appropriate background/foreground colors.
        // - surround the characters represented by this.formatRange
        //   with a <span> whose style has properties as specified by
        //   the properties on 'this.formattedRange': color
        //   backgroundColor, textDecorationColor, textUnderlineStyle
    }
}
```
