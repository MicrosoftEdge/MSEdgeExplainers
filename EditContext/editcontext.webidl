// Proposed webidl
[Exposed=Window]
[Constructor()]
interface EditContextTextRange {
    attribute long start;
    attribute long end;
};

[Exposed=Window]
interface TextUpdateEvent : Event {
    readonly attribute EditContextTextRange updateRange;
    readonly attribute DOMString updateText;
    readonly attribute EditContextTextRange newSelection;
};

[Exposed=Window]
interface TextFormatUpdateEvent : Event {
    readonly attribute EditContextTextRange formatRange;
    readonly attribute DOMString underlineColor;
    readonly attribute DOMString backgroundColor;
    readonly attribute DOMString textDecorationColor;
    readonly attribute DOMString textUnderlineStyle;
};

enum EditContextInputMode { 
    "text", 
    "password", 
    "search", 
    "email", 
    "number", 
    "telephone", 
    "url", 
    "date", 
    "datetime" 
};

enum EditContextInputAction { 
    "enter", 
    "done", 
    "go", 
    "next", 
    "previous", 
    "search", 
    "send" 
};

dictionary EditContextInit {
    EditContextInputMode inputMode;
    DOMString text;
    EditContextTextRange selection;
    EditContextInputAction action;
};

/// @event name="textupdate", type="TextUpdateEvent"
/// @event name="textformatupdate", type="TextFormatUpdateEvent"
/// @event name="focus", type="FocusEvent"
/// @event name="blur", type="FocusEvent"
/// @event name="compositionstart", type="CompositionEvent"
/// @event name="compositionend", type="CompositionEvent"
[Exposed=Window]
[Constructor(optional EditContextInit options)]
interface EditContext : EventTarget {
    void focus();
    void blur();
    void updateSelection(unsigned long start, unsigned long end);
    void updateLayout(DOMRect controlBounds, DOMRect selectionBounds);
    void updateText(unsigned long start, unsigned long end, DOMString updateText);

    readonly attribute DOMString text;
    readonly attribute EditContextTextRange selection;
    readonly attribute EditContextInputMode inputMode;
    readonly attribute EditContextInputAction action;

    // Event handler attributes
    attribute EventHandler ontextupdate;
    attribute EventHandler ontextformatupdate;
    attribute EventHandler oncompositionstart;
    attribute EventHandler oncompositionend;
};
