Formatted Text
=============
**Status**: explainer.

Formatted text API enables text rendering with wrapping in canvas.

Canvas text rendering APIs fillText and strokeText are limited in that they do 
not support text wrapping also known as line breaking.

The complexity in breaking text into lines arises from several key things line 
breaking algorithms must do
* Identify grapheme clusters - Graphemes are character combinations (Diacritics,
  Ligatures) that result in a single glyph and hence should not be broken up.
  Eg: g (latin small letter G 0067) + ◌̈  (Combining diaeresis 0308) = g̈
* Identify break oppertunities based primarily on the Unicode Spec but also uses
  dictonaries for languages like Thai and French that dictate additional line 
  breaking rules.
* Handle Bidi text. For proper Bidi rendering the bidi level context needs to be 
  considered across lines.
* Text Shaping and Kerning that can affect measured pixel length of a line.

While Javascript libraries could perform line breaking this is an arduous task.
The browser already has a powerful line breaking, text shaping component used 
for regular HTML layout. Formatted text API surfaces this capability to the web 
platform for use in Canvas. 

Usage
-----

Consider a use case where the developer wants to render the text “the quick 
**brown** fox jumps over the lazy dog” into lines 350px wide. Inorder to enable 
this scenario we introduce two new objects CanvasTextRun, CanvasTextSequence and
extend the canvas fillText/strokeText API to work with CanvasTextSequence.

The first problem here is in representing the bold formatting style.
Regular HTML uses markup elements to style parts of text. 
For a javascript API we split the text into CanvasTextRun segments that can be styled.

```js
const textSequence = new CanvasTextSequence([
    new CanvasTextRun("the quick"),
    new CanvasTextRun("brown", "bold"),
    new CanvasTextRun("fox jumps over the lazy dog")
]);
```

The CanvasTextSequence object now represents the text together with styling information.
Next in order to render the text into multiple lines, the canvas fillTextSequence API
takes a max width to wrap text at.

```js
var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
ctx.fillTextSequence(textSequence.beginPosition(), /*x*/0, /*y*/30, /*maxWidth*/350); 
```
This would produce the following output on the canvas

<img src="Example1.png" alt="Wrapped text rendered in a canvas." align="center"/>


Advanced Usage
--------------

While the one shot fillTextSequence API gets us a long way in adding multiline text
support, it is also concievable that developers will want to render text one line at
a time. This would offer control over both position and available width used for
each line. For example, in the sample article that follows each line is rendered
with a different available width.

<img src="Available-Width.png" alt="Example use case for rendering multiline text with varying available width" align="center" style="border:2px solid black;"/>

Rendering text one line at a time also provides flexibilty to render only the 
content visible onscreen or content that changed, which can also be valuable to web devlopers. 

It turns out that, in both bidi and regular text scenarios the next position to 
start a line from can be represented with a single offset in the text stream. 
A new object CanvasTextSequencePosition is introduced to represent that position 
within a text sequence. 

Additional draw API overloads allows for fillTextSequence, strokeTextSequence to
return a continuation position the nextPosition for use in subsequent fillTextSequence, 
strokeTextSequence calls.

The additional fillTextSequence overload can be used as follows, to render text
that is wrapped at 350 px.

```js
var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
const textSequence = new CanvasTextSequence([
    new CanvasTextRun("the quick"),
    new CanvasTextRun("brown", "bold"),
    new CanvasTextRun("fox jumps over the lazy dog")
]);
var startPosition = textSequence.beginPosition();
var y = 30;
while (startPosition) {
  var result = ctx.fillTextSequence(textSequence.beginPosition(), 
                                    /*x*/0, y, /*maxWidth*/350,
                                    /*stopAtLineEnd*/true); 
  startPosition = result.nextPosition;
  y += (result.lineBoxHeight);
} 
```

Proposal
--------
```webidl

interface CanvasTextRun {
  constructor(DOMString text);
  constructor(DOMString text, DOMString font);
  constructor(DOMString text, DOMString font, DOMString fontColor);
  attribute DOMString text;
  attribute DOMString font;
  attribute DOMString fontColor;
  
  // Every run belongs to a text sequence, initially null and is set
  // when the run is added to a text sequence
  readonly attribute CanvasTextSequence? textSequence;
}

enum CanvasLineBreakOptions {
  "default",
  "ignoreTrailingSpaces"
};

interface CanvasTextSequencePosition {
  readonly attribute unsigned long long textRunIndex;
  readonly attribute unsigned long textRunOffset;
  readonly attribute CanvasTextSequence? textSequence;
}

interface CanvasTextSequence {
  constructor();  
  constructor(sequence<CanvasTextRun> runs);

  CanvasTextSequencePosition beginPosition();

  iterable<CanvasTextRun>;
  getter CanvasTextRun? (unsigned long index);
  setter void (unsigned long index, CanvasTextRun run);
  void append(CanvasTextRun run);
  void remove(unsigned long index);
  void removeAll();

  readonly attribute unsigned long length;
  attribute CanvasLineBreakOptions lineBreakOptions;
}

interface CanvasTextLineBreakResult {
  readonly attribute CanvasTextSequencePosition? nextPosition;
  readonly attribute double lineBoxWidth;
  readonly attribute double lineBoxHeight;
  readonly attribute double lineBoxSpacing;
  readonly attribute double lineBoxAscent;
  readonly attribute double lineBoxDescent;
}

partial interface CanvasText {
    // Render entire CanvasTextSequence with line wrapping.
    void fillTextSequence(CanvasTextSequencePosition beginPosition, 
                          double x, 
                          double y, 
                          double maxWidth);

    void strokeTextSequence(CanvasTextSequencePosition beginPosition, 
                            double x,
                            double y,
                            double maxWidth);

    // Render a single line and return the start position to use for the next Line.
    CanvasTextLineBreakResult fillTextSequence(CanvasTextSequencePosition beginPosition, 
                                              double x, 
                                              double y, 
                                              double maxWidth,
                                              bool stopAtLineEnd);
    CanvasTextLineBreakResult strokeTextSequence(CanvasTextSequencePosition beginPosition,
                                                double x, 
                                                double y, 
                                                double maxWidth,
                                                bool stopAtLineEnd);
}
```

### CanvasTextRun
The CanvasTextRun object represents text content along with the text style overrides 
for the text. Developers would provide contiguous text with identical style as a
single run. The font, fontColor values when specified override the default values that would be used from the canvas context [Text Styles](https://www.w3.org/TR/2dcontext/#text-styles).

The proposal avoids using indices to indicate styling ranges, as 
these indices change with text run insertion and deletion. 

CanvasTextDrawingStyles for a run does not depend on or apply on top of the
previous run. This is because in such a design removing a run from a text sequence
would have an undesirable ripple effect of changing styles on all subsequent runs.

### CanvasTextSequence
The CanvasTextSequence object represents a collection of text runs. Implementations can
use the CanvasTextSequence object to cache bidi level analysis results or the level stack
at the end of the last line.

The other text styles textAlign, textBaseline on the canvas context control 
justification and baseline alignment of the multiline text.

CSS styles on the canvas element affect text rendering. These CSS properties are

- line-height - Specifies height of a line.
- direction - Sets the initial direction for bidi analysis.
- word-break / word-wrap - Controls break oppertunitites for text wrapping.

MeasureText
-----------

Measuring is a counter part to the drawing APIs that allow web developers to reason
about where lines and their glyphs would render.

Current measure text APIs work for single line text as follows

```webidl
interface TextMetrics {
    // x-direction
    readonly attribute double width; // advance width
    readonly attribute FrozenArray<double> advances;
    readonly attribute double actualBoundingBoxLeft;
    readonly attribute double actualBoundingBoxRight;

    // y-direction
    readonly attribute double fontBoundingBoxAscent;
    readonly attribute double fontBoundingBoxDescent;
    readonly attribute double actualBoundingBoxAscent;
    readonly attribute double actualBoundingBoxDescent;
    readonly attribute double emHeightAscent;
    readonly attribute double emHeightDescent;
    Baselines getBaselines();
};

partial interface CanvasText {
  TextMetrics measureText(DOMString text);
};
```

In order to support multiline text metrics, we add a variant of measure text

```webidl
interface CanvasTextSequenceMetrics {
  attribute CanvasTextSequencePosition? nextPosition;
}
CanvasTextSequenceMetrics includes TextMetrics;

partial interface CanvasText {
  CanvasTextSequenceMetrics measureTextSequence(
    CanvasTextSequencePosition beginPosition, 
    double maxWidth);
};
```

### Open issues and questions

- Vertical Writing Modes - text drawing needs to be aware of vertical writing mode
in order to rotate glyphs in some fonts / languages while rendering a line. 
Topic needs further investigation.
- Measure API may require a way to identify grapheme clusters and thier position
within a line box, so that Caret and Selection can be rendered accurately.
- Measure API will require a way to identify grapheme clusters and thier position
within a line box, so that caret, backspacde and Selection can be rendered accurately.
- Measure API does not provide any information about direction chnages and flow
direction/position of glyphs.

Alternatives Considered
----------------------

### Imperative model
The proposal here addresses two seperate problems. One of styling ranges of text
and having an object model and two of auto wrapping text. 

An alternative design considered was to support auto wrapping without requiring 
that the developer provides all the text upfront. Similar to canvas path, the developer would call setTextBox(double availableWidth) and follow through with multiple calls to addText on the canvas context that renders text and advances a cursor forward.

Such an imperative model does not work for two reasons.
- With bidi text, the entire width of a right-to-left segment needs to be 
determined before any of the addText calls can be rendered.
- The bidi issue can be adressed by adding a finalization step say closeTextBox().
 However still, such an imperative API adds a performance cost that is undesirable when the developer may simply be rerendering same text content for a changing available
 width.

Privacy Considerations
----------------------
HTML5 Canvas is a browser finger printing vector - [canvas fingerprinting](https://en.wikipedia.org/wiki/>Canvas_fingerprinting),
the fingerprinting happens through APIs (getImageData, toDataURL) that allow 
readback of renderer content exposing machine specific rendering artifacts. 
This proposal adds the ability to render multiple lines of text, potential 
differences in text wrapping across browsers could contribute to additional 
fingerprinting. The existing implementer mitigations in some user agents that 
prompt users on canvas readback continues to work here. 

We are currently evaluating whether this API would increase fingerprinting surface
area and will update this section with our findings. We welcome any community feedback.

References
----------
* https://en.wikipedia.org/wiki/Grapheme
* https://en.wikipedia.org/wiki/Diacritic

