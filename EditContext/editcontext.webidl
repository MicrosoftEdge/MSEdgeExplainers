// Proposed webidl

interface EditContextTextRange {
    readonly attribute unsigned long start;
    readonly attribute unsigned long end;
};

interface EditEvent : Event {
};

interface TextUpdateEvent : EditEvent {
    readonly attribute EditContextTextRange updateRange;
    readonly attribute USVString updateText;
    readonly attribute EditContextTextRange newSelection;
};

interface SelectionUpdateEvent : EditEvent {
    readonly attribute EditContextTextRange updatedSelectionRange;
};

interface TextFormatUpdateEvent : EditEvent {
    readonly attribute EditContextTextRange formatRange;
    readonly attribute USVString color;
    readonly attribute USVString backgroundColor;
    readonly attribute USVString textDecorationColor;
    readonly attribute USVString textUnderlineStyle;
};

enum EditContextInputType { "text, "tel", "email" };

/// @event name="keydown", type="KeyboardEvent"
/// @event name="keyup", type="KeyboardEvent"
/// @event name="textupdate", type="TextUpdateEvent"
/// @event name="selectionupdate", type="SelectionUpdateEvent"
/// @event name="textformatupdate", type="TextFormatUpdateEvent"
/// @event name="focus", type="FocusEvent"
/// @event name="blur", type="FocusEvent"
/// @event name="compositionstart", type="CompositionEvent"
/// @event name="compositioncompleted", type="CompositionEvent"
interface EditContext : EventTarget {
    void focus();
    void blur();
    void selectionChanged(unsigned long start, unsigned long end);
    void layoutChanged(DOMRect controlBounds, DOMRect selectionBounds);
    void textChanged(unsigned long start, unsigned long end, USVString updateText);
    
    readonly attribute USVString currentTextBuffer;
    readonly attribute EditContextTextRange currentSelection;

    attribute EditContextInputType type;
};

