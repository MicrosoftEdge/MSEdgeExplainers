# A More Precise Way to Measure Animation Smoothness

[comment]: < ** (*Same-Origin*) >

Authors: [Jenna Sasson](https://github.com/jenna-sasson)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Performance Working Group](https://www.w3.org/groups/wg/webperf/)
* **Current version: this document**

##  Introduction
Animation frames are rendered on the screen when there is a change that needs to be updated. Ideally, these frames are completed in a certain amount of time. If they are not updated in time,  the browser drops a frame,. For the user, this looks like remaining on the same frame for longer, but it some instances, it may not even be noticeable.

requestAnimationFrame() polling can help decipher whether or not a frame has been dropped. The method works by  having the browser call a function (rAF) to update the animation before the screen refreshes (paint stage). Keeping track of the number of times rAF is called provides a count for the number of frames being shown per second, which helps understand the smoothness of the browser's animation. If the browser does not call the function, that is an indicator that a frame was dropped.

In the past, Edge had a library for this purpose called fps-emitter. While that is a helpful way to measure events that slow down performance, it is not the most precise way to measure the actual smoothness of the animation. This is because there are other processes executing independently to render the animation, which can impact the user perceived frame rate and can't be detected just by looking at rAF calls.

Using the rAF method can actually slow down performance because it creates more tasks for the browser on the main thread. The extra work can cause the frame to drop by not executing before the deadline. An increase in dropped frames causes a less smooth animation.

Our goal is to create an API for a more precise measure of animation smoothness, specifically one that captures user-perceived frame rate. Prototyping an API that measures animation smoothness more accurately would help developers gain insights about performance issues they can improve without slowing down their performance using rAF.

## Goals
* Needs to be queryable from JavaScript
* Capture the user-perceived frame rate accurately
* Ensure that our solution does not slow down performance
* Should be able to query the frame rate at any specific point in time, rather than relying on events to indicate changes in frame rate

## Non-goals
* Former solutions to calculate fps have used rAF polling. We do not want to rely on rAF polling.
* We are not trying to improve animation, rather smoothness so we can solve other performance issues in the future

## Use Cases

###	1. Gaming
* Higher frames per second (fps) lead to smoother animations and a more enjoyable gaming experience. However, since rAF calls can be affected by how busy the main thread is, this method may overlook animation tasks performed by a compositor thread. Specific metrics can significantly impact gameplay elements, like how quickly characters can move or decisions can be made, which affects the overall user experience. Game developers are constantly striving to make their visuals more consistent and immersive. To guarantee smooth gameplay, developers need to test animations repeatedly. Knowing their animation metrics will allow developers to increase or decrease animation quality based on user experience.
	
###	2. Continuously scrolling or selecting
* Animation smoothness can be difficult to measure when relating to user interaction. An average metric isn't always effective because in certain apps, animation begins on a user click. There doesn't need to be a continuous measurement since without a user click, there is no animation. Some examples of this include scrolling a long grid or document, selecting or highlighting large areas of the screen, resizing images, or dragging objects across the screen.
  
### 3. Measuring animation and graphics performance of browsers
* The public benchmark, MotionMark, measures how well different browsers render animation. For each test, MotionMark calculates the most complex animation that the browser can render at certain frame rate. The test starts with a very complex animation that makes the frame rate drop to about half of the expected rate. Then, MotionMark gradually reduces the animation's complexity until the frame rate returns to the expected rate. Through this process, MotionMark can determine the most complex animation that the browser can handle while maintaining an appropriate frame rate and uses this information to give the browser a score.
To get an accurate score, it is crucial  that MotionMark can measure frame rate precisely. Currently, MotionMark measures frame rate based on rAF calls, which can be impacted by other tasks on the main thread besides animation. It also doesn't take into account animations on the compositor thread. The method using rAF to measure frame rate doesn't reflect the user's actual experience.

### 4. Testing animation performance on different hardware
* Testing the performance of animation on different hardware/browser combinations may expose performance issues that could not be seem with imprecise metrics.

### 5. Improving animation libraries
* Animation libraries measure frame rate in different ways. For example, GSAP and PixiJS use tickers to measure FPS, but the developer have to add custom logic to run each tick to measure frame rate. Three.js uses a second library, stats.js, to measure frame rate, and anime.js and Motion libraries use rAF calling. It would be beneficial for libraries to have a built-in way to measure FPS. A built-in method would be more convenient and allow for a more seamless integration with each library's animation loop, leading to more accurate results. Immediate feedback would make debugging and resolving issues easier. Ideally, this would also standardize a way to measure FPS leading to consistency across libraries.


## Proposed Solutions
#### Option 1: Direct Query
This solution would involve querying the frame rate directly. JavaScript would call an API that measures the fps at a specific point in time. To measure the overall frame rate, the API would be called multiple times, using the values to calculate an average frame rate.
* window.framerate()
  
#### Option 2: Start and End Markers
JavaScript Performance markers are used to track points in time. In this solution, developers could mark a start and end point on the performance timeline and measure the duration between the two markers, with FPS as a property.
* window.framerate("perfMarker") <- Framerate since that marker
* performance.mark("myMarker")
* performance.measure("myMarker", "endMarker")
* FPS could be a property on performance measure

This option works similarly to the [Frame Timing API](https://wicg.github.io/frame-timing/#dom-performanceframetiming) by using start and end markers. Frame startTime and frame endTime are returned by the Performance object's now() method; the distance between the two points is frame duration. When the duration of a frame is too long, it is clear that there was a rendering issue. A PerformanceFrameTiming object is created and added to the performance entry buffer of each active web page, which developers can then access for information.

#### Option 3: Event Listener
Adding an event listener for frame rate changes would alert developers about large drops in frame rate. Since it would not be necessary to know if the rate drops by a frame or two. Instead, the developer could set the event listener to alert when the frame rate drops by n. Or, similarly to the long task API's duration threshold, the developer could set a min and max fps. The event listener would fire only if the FPS is above the max or below the min.

This options works similarly to both [LoAF API](https://github.com/w3c/long-animation-frames) and the [Paint Timing API](https://www.w3.org/TR/paint-timing/), which both use the performance observer and follow a pattern that developers expect to use when improving performance. When observing long animation frames, developers can specify the entry types they want to the performance observer to processes. Like the performance observer reports which animation frames are too long, the event listener would send an alert when the frame rate drops by a certain amount. The two APIs differ in the amount of information given. The LoAF API can give more specific metrics for long animations, while event listeners provide a more general way of monitoring frame rate.

## Alternatives Considered
For the event listener scenario, it was determined that using granularity would not give a useful measure of FPS due to lack of detail. The granularity was modeled after the compute pressure API.
* window.addEventListener("frameratechange", (event) =>{doSomething();})

## Concerns/Open Questions
1. The user-perceived frame rate is influenced by both the main thread and the compositor thread. Accurate measurement of frame rates must account for both. Since the compositor thread operates independently of the main thread, it can be difficult to get its frame rate data. However, an accurate frame rate measurements needs to take into account both measurements.
2. Similar to the abandoned [Frame Timing interface](https://wicg.github.io/frame-timing/#introduction). We are currently gathering historical context on how this relates and why it is no longer being pursued.
3. Questions to Consider:
	* Should content missing from the compositor frame due to delayed tile rasterization be tracked? 
	* Should the fps be something that a web page can query anytime? Or only reported out when the browser misses some target?
	* How will this API work with variable rate monitors or on screens with higher refresh rates?
	* How will this API take into account situations where the compositor thread produces frames that are missing content from the main thread?
	* How will this API measure both the compositor and the main thread when they may have differing frame rates. The compositor thread can usually run at a higher frame rate than the main thread due to its simpler tasks.
	* Should a developer be able to target a subset of time based on an interaction triggering an animation?




## Glossary

## Acknowledgements


