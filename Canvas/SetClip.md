SetClip
=============
**Status**: explainer.

The clip api [spec](https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-clip) in canvas builds on the previous clip by calculating an intersection with it.

> The clip() method, when invoked, must create a new clipping region by calculating the intersection of the current clipping region and the area described by the intended path, using the fill rule indicated by the fillRule argument. Open subpaths must be implicitly closed when computing the clipping region, without affecting the actual subpaths. The new clipping region replaces the current clipping region.

This behavior is consistent with how transforms work but is cumbersome for web developers. Developers have to save() and restore() to go back to the unclipped state which looses transforms and adds additional performance overhead. Canvas provides a setTransform/resetTransform API that enables developers to override the current transform. The proposal here is to add similar API for clip.

Note: The MDN page [link](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip) for clip is misleading.
>The CanvasRenderingContext2D.clip() method of the Canvas 2D API turns the current or given path into the current clipping region. **It replaces any previous clipping region.**

One could interpret "replaces any previous clipping region" to imply it overrides it, however 
empirically the clip is replaced with a new clip that is an intersection of the requested clip with the existing clip.

Proposal
--------
```webidl
interface mixin CanvasDrawPath {
  void setClip(optional CanvasFillRule fillRule = "nonzero");
  void setClip(Path2D path, optional CanvasFillRule fillRule = "nonzero");
  void resetClip();
};
```

setClip changes the current clip on the canvas context to be the path given by the arguments. The first overload with no path argument, sets the clip to the [current default path](https://html.spec.whatwg.org/multipage/canvas.html#current-default-path). Behavior of [save and restore](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-state) remains the same. Restore will restore the clip path to the value it was at the point of calling save.

### Open issues and questions

- Need to understand any historic reason behind not supporting reset on clip.

Example usage
-------------

Example that demonstrates current cumulative clipping behavior

```js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'gold';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Create clipping path 1
let region = new Path2D();
region.rect(0, 0, 50, 130);
ctx.clip(region, "evenodd");

// Draw stuff that gets clipped
ctx.fillStyle = 'blue';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Create clipping path 2
let region2 = new Path2D();
region2.rect(40, 0, 100, 200);
ctx.clip(region2);

// Draw stuff that gets clipped
ctx.fillStyle = 'green';
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

Produces the following rendering

<img src="Cumulative-Clip.png" alt="Example use case for rendering multiline text with varying available width"/>

with the proposed API, the developer can change "clip path 2" to set clip

```js

// Create clipping path 2
let region2 = new Path2D();
region2.rect(40, 0, 100, 200);
ctx.setClip(region2);

```

expected rendering

<img src="Set-Clip.png" alt="Example use case for rendering multiline text with varying available width"/>


Alternatives considered
-----------------------

- None, there isn't a way to undo a clip today other than calling save() and restore(). Even setting an infinite rectangle as clip would not work as it would intersect with the existing clip.

Privacy Considerations
----------------------
We do not expect this API to introduce additional fingerprinting capabilities or other significant privacy concerns, but we welcome community feedback.

References
----------

Example showing the cumulative clip behavior
https://jsfiddle.net/sushrajaMsft/2k1wfg5s/
