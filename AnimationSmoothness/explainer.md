# Main Thread Animation Smoothness 

[comment]: < ** (*Same-Origin*) >

Authors: [Jenna Sasson](https://github.com/jenna-sasson)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

A previous version of this explainer was shared with the title of “A More Precise Way to Measure Animation Smoothness.” After reviewing feedback, we have rescoped to an initial goal of creating a replacement for rAF polling to measure smoothness on the main thread. This is the most up to date version. 

* This document status: **Active**
* Expected venue: [W3C Web Performance Working Group](https://www.w3.org/groups/wg/webperf/)
* **Current version: this document**

## Introduction

Smooth web animation is essential for a positive user experience. To understand the user’s experience with animation, quantifying their experience is an important initial step that allows web and browser developers to optimize their pages/engines and generate a more pleasing user experience. 

It is important to define what it means for the main thread to be considered smooth. Main thread smoothness is achieved when a frame is produced within a predefined threshold when a frame is expected. 

Various metrics have been used in the past to try and understand the user’s experience in this space. Some of these were accessible to the webpage, while others were internal browser metrics. Examples of these include:

* Framerate – the number of frames displayed to the user over time.
* Frame latency – the time it takes for a single frame to work through a browser’s pipelines and display to the user.
* Interaction to Next Paint – the time from a user interaction until the result of that interaction is displayed to the user.
* Consistency of the animation – a measure of how consistent the framerate is over time.
* High framerate variations – framerate classifications that differentiate between changes the user may not notice (variations but still high framerates) and those they may notice (variations involving transitions between high and low framerates).
* Completeness of content – frame classification that includes information about whether the frame includes updates from all desired sources for a given display update or only a subset (or none) of them.

This proposal attempts to define an API that offers a comprehensive quantification of the user’s experience regarding animation smoothness, enabling developers to create better user experiences.

## Current Implementation

One of the current ways to measure smoothness is by measuring frames per second (fps) using `requestAnimationFrame()` polling.

Animation frames are rendered on the screen when there is a change that needs to be updated. If frames are not updated in a certain amount of time, the browser drops a frame, which may affect animation smoothness. 

The rAF method has the browser call a function (rAF) to update the animation before the screen refreshes. By counting how often rAF is called, you can determine the FPS. If the browser skips calling rAF, a potential frame rendering opportunity was missed. This method helps understand how well the browser handles animations and whether any frames are being dropped. 

Using rAF to determine the FPS can be energy intensive and inaccurate. This approach can negatively impact battery life by preventing the skipping of unnecessary steps in the rendering pipeline. While this is not usually the case, using rAF inefficiently can lead to dropped or partially presented frames, making the animation less smooth. It’s not the best method for understanding animation smoothness because it does not take into account factors like compositor offload and offscreen canvas. While rAF can be useful, it isn’t the most accurate and relying on it too heavily can lead to energy waste and suboptimal performance. In addition to negative implications on measurement, rAF can also negatively impact scheduling. Every time rAF is called, the browser assumes there will be a rendering update so it reserves that opportunity even if rAF is only observing. When raF is being used to observe, it wastes the screen refresh and rendering opportunity. It may not hurt performance for animations that are already animating at 60fps, but it may cause concern for less performant animations.

#### [Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

## Other Prior Art

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

## User Research

### Use Cases

### 1. Web Developers Understanding On-demand Animations

Animation smoothness can be difficult to measure when relating to user interaction. An average metric isn't always effective because in certain apps, animation begins on a user click. There doesn't need to be a continuous measurement since without a user click, there is no animation. Some examples of this include scrolling a long grid or document, selecting or highlighting large areas of the screen, resizing images, dragging objects across the screen, or animations triggered by mouse movement or clicks.

### 2. Gaming

Higher frames per second (fps) lead to smoother animations and a more enjoyable gaming experience. Additionally, poor animation can significantly impact gameplay elements, like how quickly characters can move or decisions can be made, which affects the overall user experience. In continual tension with the desire for smooth animations, game developers are constantly striving to make their visuals higher quality and immersive. To guarantee smooth gameplay, developers need a way to understand how their game’s animations are performing.

### 3. Testing animation performance on different hardware

Testing the performance of animation on different hardware/browser combinations may expose performance issues that could not be seen with existing metrics.

### 4. Improving animation libraries

Animation libraries measure frame rate in different ways. For example, GSAP and PixiJS use tickers to measure FPS, but the developer must add custom logic to run each tick to measure frame rate. Three.js uses a second library, stats.js, to measure frame rate, and anime.js and Motion libraries use rAF calling. It would be beneficial for libraries to have a built-in way to measure FPS. A built-in method would be more convenient and allow for more seamless integration with each library's animation loop, leading to more accurate results. Immediate feedback would make debugging and resolving issues easier. Ideally, this would also standardize a way to measure FPS leading to consistency across libraries.

## Scope

Originally, we proposed an API that offers a comprehensive quantification of the user’s experience regarding animation smoothness, enabling developers to create better user experiences.  

However, feedback from developers has led us to redefine the scope of the problem. There is strong interest in a main-thread-only native API that replaces `requestAnimationFrame()` polling. This scoped solution is a foundational step toward the broader and more complicated goal of comprehensively measuring animation smoothness.  

In this explainer, the main-thread-only rAF replacement API is referred to as V0 and the API that measure smoothness comprehensively is referred to as V1. Our current efforts are focused on developing V0, as it addresses the most immediate needs and lays the groundwork for V1.  

## V0 Goals & Non-goals 

Goals 
* A native API to replace rAF-based measurement on the main thread
* Can be used in a prototype API to test the compositor 

Non-goals 
* Measuring the compositor
* Standardization
* Improving/controlling animation smoothness. This proposal is purely for an API to better understand existing behavior.
* Evaluate an individual animation’s smoothness. The API is focused on the user’s overall experience for entire browser window’s content. 


## Former Proposed Approaches

Below are the options that were discussed with the broader community.

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

## Proposed Solution

The best solution is the PerformanceObserver implementation because it is flexible and familiar. 

It will work similarly to other performance APIs (i.e. LoAF and Paint Timing) that developers are familiar with. Developers will also be able to customize the type of data they want and can get multiple types of data from the same listener. V0 focuses on the metrics at the frame level, not per animation, but the design allows for per animation metrics in the future. 

For an animation on the main thread to be considered smooth, each frame must be produced on time within a set window. To know if an animation is smooth, two questions must be answered: 
1. When was the frame produced?
2. What was the expected time window for the frame?

Framerate, consistency, and framerate variations can work together to provide information to help answer these questions. Framerate gives an expected interval but does not explain why frames were late. Consistency measures deviation from the expected intervals. Framerate variations measure whether those deviations are noticeable.  

Using these metrics and modeling after the LoAF and Paint Timing APIs which use the performance observer, the proposed solution is as follows.   

The performance observer could emit an entry for every presented frame, not just long ones.   

```javascript
// Set up function to collect frame data 
function setupFrameObserver() { 
  // Store collected frame data 
  const frames: FrameTiming[] = [];

  // Create the observer 
  const observer = new PerformanceObserver((list) => { 

    for (const entry of list.getEntries()) { 
      if (entry.entryType !== "animation-frame") continue; 
      // frame info (actual vs expected timing) 
      frames.push({ 
        frameDuration: /* extract actual time from entry */, 
        expectedDuration:  /* extract expected time from entry */, 
      }); 
    } 
  });
  // Start observing animation-frame entries 
  observer.observe({ type: "animation-frame", buffered: true }); 
  return frames; // Return collected frames for later analysis 
} 

 ```
The observer collects frame data in FrameTiming.

 
```javascript
// Data per frame 
interface FrameTiming { 
  presentedTime: number; // When the frame was actually presented 
  expectedTime:  number; // The expected time window for that frame 
}  

```
Using all of that data, smoothness metrics can be computed and returned as one smoothness object. 

```javascript
// Compute smoothness metrics from collected frames
function computeSmoothness(frames: FrameTiming[]): Smoothness { 
  // Derive intervals from timestamps
  const actualIntervals   = /* compute differences between presented times */; 
  const expectedIntervals = /* compute differences between expected times */;

  // Calculate metrics: 
  // - Framerate: based on average actual interval 
  // - Consistency: based on variation in actual intervals 
  // - High Variation %: based on deviation from expected intervals 
  return { 
    framerate:    
    consistencyMs:   
    highVariationPct: 
    sampleCount:      frames.length 
  }; 
} 
// Define the metrics object 
interface Smoothness { 
  framerate: number; 
  consistencyMs: number; 
  highVariationPct: number; 
  sampleCount: number; 
} 
```

The metrics calculated here help answer the two questions: 

1. When was the frame produced?
2. What was the expected time window for the frame?  

An animation can be considered smooth if frames are produced on time, regularly, and are stable. Ideally, all three metrics would be optimal, but an animation can still be smooth even if one metric is not optimal.


## Concerns/Open Questions

1. The API must consider concerns about fingerprinting. 
1. Questions to Consider:
   * How will this API work with variable rate monitors or on screens with higher refresh rates?
   * Should a developer be able to target a subset of time based on an interaction triggering an animation?

## Acknowledgements

Thank you to Sam Fortiner, Olga Gerchikov, and Andy Luhrs for their valuable feedback.
