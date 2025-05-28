# A More Precise Way to Measure Animation Smoothness

[comment]: < ** (*Same-Origin*) >

Authors: [Jenna Sasson](https://github.com/jenna-sasson)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C Web Performance Working Group](https://www.w3.org/groups/wg/webperf/)
* **Current version: this document**

## Introduction

Smooth web animation is essential for a positive user experience. To understand the user’s experience with animation, quantifying their experience is an important initial step that allows web and browser developers to optimize their pages/engines and generate a more pleasing user experience.

Various metrics have been used in the past to try and understand the user’s experience in this space. Some of these were accessible to the webpage, while others were internal browser metrics. Examples of these include:

* Framerate – the number of frames displayed to the user over time.
* Frame latency – the time it takes for a single frame to work through a browser’s pipelines and display to the user.
* Interaction to Next Paint – the time from a user interaction until the result of that interaction is displayed to the user.
* Consistency of the animation – a measure of how consistent the framerate is over time.
* High framerate variations – framerate classifications that differentiate between changes the user may not notice (variations but still high framerates) and those they may notice (variations involving transitions between high and low framerates).
* Completeness of content – frame classification that includes information about whether the frame includes updates from all desired sources for a given display update or only a subset (or none) of them.

This proposal attempts to define an API that offers a comprehensive quantification of the user’s experience regarding animation smoothness, enabling developers to create better user experiences.

## Goals

* Webpage accessible API that captures user-perceived framerate accurately, taking into account both the main and compositor threads.
* An approach that doesn’t cause webpage performance regressions.
* Enabling a web developer to control what time interval is considered.
* The solution will measure as many of the above properties as possible

## Non-goals

* Improving/controlling animation smoothness. This proposal is purely for an API to better understand existing behavior.
* Evaluate an individual animation’s smoothness. The API is focused on the user’s overall experience for entire browser window’s content.

## User Research

## Use Cases

### 1. Web Developers Understanding On-demand Animations

Animation smoothness can be difficult to measure when relating to user interaction. An average metric isn't always effective because in certain apps, animation begins on a user click. There doesn't need to be a continuous measurement since without a user click, there is no animation. Some examples of this include scrolling a long grid or document, selecting or highlighting large areas of the screen, resizing images, dragging objects across the screen, or animations triggered by mouse movement or clicks.

### 2. Measuring animation and graphics performance of browsers

The public benchmark, MotionMark, measures how well different browsers render animation. For each test, MotionMark calculates the most complex animation that the browser can render at certain frame rate. The test starts with a very complex animation that makes the frame rate drop to about half of the expected rate. Then, MotionMark gradually reduces the animation's complexity until the frame rate returns to the expected rate. Through this process, MotionMark can determine the most complex animation that the browser can handle while maintaining an appropriate frame rate and uses this information to give the browser a score. To get an accurate score, it is crucial that MotionMark can measure frame rate precisely. Currently, MotionMark measures frame rate based on rAF calls, which can be impacted by other tasks on the main thread besides animation. It also doesn't take into account animations on the compositor thread. The method using rAF to measure frame rate doesn't reflect the user's actual experience.

### 3. Gaming

Higher frames per second (fps) lead to smoother animations and a more enjoyable gaming experience. Additionally, poor animation can significantly impact gameplay elements, like how quickly characters can move or decisions can be made, which affects the overall user experience. In continual tension with the desire for smooth animations, game developers are constantly striving to make their visuals higher quality and immersive. To guarantee smooth gameplay, developers need a way to understand how their game’s animations are performing.

### 4. Testing animation performance on different hardware

Testing the performance of animation on different hardware/browser combinations may expose performance issues that could not be seen with existing metrics.

### 5. Improving animation libraries

Animation libraries measure frame rate in different ways. For example, GSAP and PixiJS use tickers to measure FPS, but the developer must add custom logic to run each tick to measure frame rate. Three.js uses a second library, stats.js, to measure frame rate, and anime.js and Motion libraries use rAF calling. It would be beneficial for libraries to have a built-in way to measure FPS. A built-in method would be more convenient and allow for more seamless integration with each library's animation loop, leading to more accurate results. Immediate feedback would make debugging and resolving issues easier. Ideally, this would also standardize a way to measure FPS leading to consistency across libraries.

## Prior Art

The below prior art exists for understanding animation smoothness today.

### RAF

#### Description

One of the current ways to measure smoothness is by measuring frames per second (fps) using `requestAnimationFrame()` polling.

Animation frames are rendered on the screen when there is a change that needs to be updated. If they are not updated in a certain amount of time, the browser drops a frame, which may affect animation smoothness.

The rAF method has the browser call a function (rAF) to update the animation before the screen refreshes. By counting how often rAF is called, you can determine the FPS. If the browser skips calling rAF, it means a frame was dropped. This method helps understand how well the browser handles animations and whether any frames are being dropped.

#### Limitations

Using rAF to determine the FPS can be energy intensive and inaccurate. This approach can negatively impact battery life by preventing the skipping of unnecessary steps in the rendering pipeline. While this is not usually the case, using rAF inefficiently can lead to dropped or partially presented frames, making the animation less smooth. It’s not the best method for understanding animation smoothness because it does not take into account factors like compositor offload and offscreen canvas. While rAF can be useful, it isn’t the most accurate and relying on it too heavily can lead to energy waste and suboptimal performance.

#### [Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

### Long Animation Frames API

#### Description

A long animation frame (LoAF) occurs when a frame takes more than 50ms to render. The Long Animation Frames API allows developers to identify long animation frames by keeping track of the time it takes for frames to complete. If the frame exceeds the threshold, it is flagged.

#### Limitations
Unlike requestAnimationFrame() (rAF), which measures FPS, LoAF focuses on pinpointing performance issues and responsiveness. The two APIs provide different metrics and are called at different frequencies. While both APIs track animation frames, neither provides the precision needed for measuring animation smoothness.

####  [Reference](https://github.com/w3c/long-animation-frames)

### RequestVideoFrameCallback

#### Description

requestVideoFrameCallback() is a method used with HTMLVideoElement. It allows a developer to run a callback every time a new frame of video is about to appear. It functions similarly to requestAnimationFrame() but is specific to video elements. requestVideoFrameCallback() is called based on the video's frame rate, while rAF is called based on the display's refresh rate. Additionally, requestVideoFrameCallback() provides the callback time and video frame metadata, whereas rAF only provides a timestamp.

#### Limitations

requestVideoFrameCallback() can offer developers metrics like video frame render delays and Real-Time Transport Protocol (RTP) timestamps, and it's relatively easy to implement, but there are some limitations. requestVideoFrameCallback() may be inconsistent between browsers, with varying timestamp references for the same video frame. It may also be unreliable for precisely measuring frame times, as callbacks can be delayed or skipped if the system is busy, especially on slower machines.

#### [Reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)

### FPS-Emitter

#### Description

In the past, Edge had a library called fps-emitter that emits an update event. Once a new instance of FPS-emitter is called, it starts tracking frames per second via the rAF method. When the FPS changes, the result is returned as an EventEmitter. This method builds off the rAF method described above and faces similar limitations.

#### Limitations

While FPS-emitter is a helpful way to measure events that slow down performance, it is not the most precise way to measure the actual smoothness of the animation. This is because there are other processes in addition to UI-blocking events executing independently to render the animation, which can impact the user perceived frame rate and can't be detected just by looking at rAF calls.

#### [Reference](https://github.com/MicrosoftEdge/fps-emitter)

## Proposed Approach

There is no proposed approach yet identified by this explainer. Instead, there are a variety of alternatives that we would like to discuss with the broader community.

### Option 1: Direct Query

This solution would involve querying the animation smoothness data directly. JavaScript would call an API that measures some frame information at a specific point in time. To measure the frame information, the API would be called multiple times, using the values to calculate an average frame rate.

`window.frameinfo() ` or `performance.frameinfo()`

### Option 2: Start and End Markers

JavaScript Performance markers are used to track points in time. In this solution, developers could mark a start and end point on the performance timeline and measure the duration between the two markers, with frame information as a property.

* 2a

  `performance.mark("myMarker")`

  `window.frameinfo("myMarker")` <- Framerate since that marker

* 2b

  `performance.mark("myMarker")`

  `performance.measure("myMarker", "endMarker")`

This option works similarly to the [Frame Timing API](https://wicg.github.io/frame-timing/#dom-performanceframetiming) by using start and end markers. Frame startTime and frame endTime are returned by the Performance object's now() method; the distance between the two points is frame duration. When the duration of a frame is too long, it is clear that there was a rendering issue. A PerformanceFrameTiming object is created and added to the performance entry buffer of each active web page, which developers can then access for information.

### Option 3: Event Listener

Adding an event listener for frame rate changes would alert developers about large drops in frame rate. Since it would not be necessary to know if the rate drops by a frame or two. Instead, the developer could set the event listener to alert when the frame rate drops by n. Or, similarly to the long task API's duration threshold, the developer could set a min and max fps. The event listener would fire only if the FPS is above the max or below the min.

`window.addEventListener("frameratechange", (event) =>{doSomething();})`

### Option 4: Performance Observer

This option works similarly to both [LoAF API](https://github.com/w3c/long-animation-frames) and the [Paint Timing API](https://www.w3.org/TR/paint-timing/), which both use the performance observer and follow a pattern that developers expect to use when improving performance. When observing long animation frames, developers can specify the entry types they want to the performance observer to processes. Like the performance observer reports which animation frames are too long, the event listener would send an alert when the frame rate drops by a certain amount. The two APIs differ in the amount of information given. The LoAF API can give more specific metrics for long animations, while event listeners provide a more general way of monitoring frame rate.

```javascript
function perfObserver(list, observer) {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === "frameSmoothness") {
      console.log(${entry.name}'s startTime: ${entry.startTime});
    }
  });
}

const observer = new PerformanceObserver(perfObserver);
observer.observe({ entryTypes: ["frameSmoothness"] });
```

## Alternatives Considered

For the event listener scenario, it was determined that using granularity would not give a useful measure of frame info due to lack of detail. The granularity was modeled after the compute pressure API.
`window.addEventListener("frameratechange", (event) =>{doSomething();})`

## Concerns/Open Questions

1. The user-perceived smoothness is influenced by both the main thread and the compositor thread. Accurate measurement of frame rates must account for both. Since the compositor thread operates independently of the main thread, it can be difficult to get its frame rate data. However, an accurate frame rate measurements needs to take into account both measurements.
1. Similar to the abandoned [Frame Timing interface](https://wicg.github.io/frame-timing/#introduction). We are currently gathering historical context on how this relates and why it is no longer being pursued.
1. Questions to Consider:
   * Should content missing from the compositor frame due to delayed tile rasterization be tracked?
   * Should the fps be something that a web page can query anytime? Or only reported out when the browser misses some target?
   * How will this API work with variable rate monitors or on screens with higher refresh rates?
   * How will this API take into account situations where the compositor thread produces frames that are missing content from the main thread?
   * How will this API measure both the compositor and the main thread when they may have differing frame rates. The compositor thread can usually run at a higher frame rate than the main thread due to its simpler tasks.
   * Should a developer be able to target a subset of time based on an interaction triggering an animation?

## Acknowledgements

Thank you to Sam Fortiner, Olga Gerchikov, and Andy Luhrs for their valuable feedback.
