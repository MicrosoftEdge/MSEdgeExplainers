// Proposed webidl

interface EditContextTextRange {
    void setStart(long start);
    void setEnd(long end);
    attribute long start;
    attribute long end;
};

interface TextUpdateEvent : Event {
    readonly attribute EditContextTextRange updateRange;
    readonly attribute DOMString updateText;
    readonly attribute EditContextTextRange newSelection;
};

interface TextFormatUpdateEvent : Event {
    readonly attribute EditContextTextRange formatRange;
    readonly attribute DOMString underlineColor;
    readonly attribute DOMString backgroundColor;
    readonly attribute DOMString textDecorationColor;
    readonly attribute DOMString textUnderlineStyle;
};

enum EditContextInputType { "text", "password", "search", "email", "number", "telephone", "url", "date", "datetime" };
enum EditContextInputAction { "enter", "done", "go", "next", "previous", "search", "send" };

dictionary EditContextInit {
    EditContextInputType editContextType;
    DOMString editContextText;
    EditContextTextRange editContextSelection;
    EditContextInputAction action;
    boolean autocorrect;
    boolean spellcheck;
};

/// @event name="textupdate", type="TextUpdateEvent"
/// @event name="textformatupdate", type="TextFormatUpdateEvent"
/// @event name="focus", type="FocusEvent"
/// @event name="blur", type="FocusEvent"
/// @event name="compositionstart", type="CompositionEvent"
/// @event name="compositionend", type="CompositionEvent"
interface EditContext : EventTarget {
    void focus();
    void blur();
    void selectionChanged(EditContextTextRange updateSelection);
    void layoutChanged(DOMRect controlBounds, DOMRect selectionBounds);
    void textChanged(unsigned long start, unsigned long end, DOMString updateText);

    readonly attribute DOMString text;
    readonly attribute EditContextTextRange selection;
    readonly attribute EditContextInputType type;
    readonly attribute EditContextInputAction action;
    readonly attribute boolean autocorrect;
    readonly attribute boolean spellcheck;

    // Event handler attributes
    attribute EventHandler ontextupdate;
    attribute EventHandler ontextformatupdate;
    attribute EventHandler oncompositionstart;
    attribute EventHandler oncompositionend;
};
