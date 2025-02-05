# A More Precise Way to Measure Frames per Second (fps)

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

In the past, Edge had a library for this purpose called fps-emitter. While that is a helpful way to measure events that slow down performance, it is not the most precise way to measure the actual framerate. This is because there are other processes executing independently to render the animation, which can impact fps and can't be detected just by looking at rAF calls.

Using the rAF method can actually slow down performance because it creates more tasks for the browser on the main thread. The extra work can cause the frame to drop by not executing before the deadline. An increase in dropped frames causes a less smooth animation.

Our goal is to create an API for a more precise measure of browser frame rate. Prototyping an API that measures framerate more accurately would help developers gain insights about performance issues they can improve without slowing down their performance using rAF.



## Goals
* Create an API that measures frame rate more accurately
* Ensure that our solution does not slow down performance

## Non-goals
*	Former solutions to calculate fps have used rAF polling. We do not want to rely on rAF polling.
*	We are not trying to increase fps, or improve animation, rather measure fps so we can solve other performance issues in the future

## Use Cases

###	1. Gaming
* Higher frames per second (fps) lead to smoother animations and a more enjoyable gaming experience. However, since (rAF) calls can be affected by how busy the main thread is, this method may overlook animation tasks performed by a compositor thread. Specific metrics can significantly impact gameplay elements, like how quickly characters can move or decisions can be made, which affects the overall user experience. Game developers are constantly striving to make their visuals more consistent and immersive. To guarantee smooth gameplay, developers need to test animations repeatedly.
	
###	2. Continuously scrolling or selecting
* FPS can be difficult to measure when relating to user interaction. An average metric isn't always effective because in certain apps, animation begins on a user click. There doesn't need to be a continuous measurement since without a user click, there is no animation. Some examples of this include scrolling a long grid or document, selecting or highlighting large areas of the screen, resizing images, or dragging objects across the screen.
  
### 3. Measuring animation and graphics performance of browsers
* The public benchmark, MotionMark, measures how well different browsers render animation. Its score tells users the most complex animation that the browser can render at a certain frame rate. The benchmark is most accurate when it gets the most precise measure of frame rate. Currently, the method using rAF to measure frame rate doesn't reflect the user's actual experience.

### 4. Testing animation performance on different hardware
* Testing the performance of animation on different hardware/browser combinations may expose performance issues that could not be seem with imprecise metrics.
	





## Proposed Solution


## Glossary

## Acknowledgements


