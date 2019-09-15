# Frame Timing Use Cases 
The purpose of this document is to describe use cases which may be relevant to the [Frame Timing API](https://wicg.github.io/frame-timing/).

Authors:
* [Noam Helfman](https://github.com/nhelfman) - Engineer at Microsoft Excel Online
* [Amiya Gupta](https://github.com/amiyagupta) - Engineer at Microsoft News (MSN.com)


## Introduction
Many complex web apps suffer from poor responsiveness and animation rate (also known as "jank"). This causes a poor user experience and users may complain about the UI being "slow", "stuck" or "not smooth". The common symptom for these poor experiences is the occurrence of long frames. In many cases the UI response to the user takes longer than 100ms or an animation’s frame rate drops below 60 FPS - which indicates frames longer than 16.5ms have occurred. See [RAIL guidelines](https://developers.google.com/web/fundamentals/performance/rail) for more details.

Detecting, tracking and diagnosing these degraded experiences is not a trivial task for engineers building and running the apps. Engineers need ways to detect and track long frame occurrences during a user interaction.

## Existing solutions
Browsers currently do not provide Web APIs to detect and track long frames. In order to detect and track long frames in web apps developers came up with different solutions which all have significant downsides as will be outlined below.

### Measuring long frames
The requestAnimationFrame Web API (rAF) is often used to measure frame length. A common pattern is to instrument a callback that records a timestamp once every frame using rAF. The gap between any two consecutive timestamps is considered “frame length”.

This approach has several downsides:
* Design intent - the rAF API is intended to be used to execute rendering related code which needs to run at a deterministic frequency to ensure high frame rate. Using it for other purposes violates the design intent. Many software vendors and libraries have abused this API by using it as high priority task scheduling mechanism. Using it for frame performance tracking is yet another such kind of abuse which should be discouraged.
* Accuracy - the “frame length” measurement is an approximation because the time between callbacks is not guaranteed to align exactly with the actual frame boundaries. Other rAF callbacks can compete with and affect the scheduling of the frame measurement callback.
* Idle blocking - when rAF is used continuously, no idle callbacks can be executed because the callback queue always contains the next rAF callback. This prevents the effective use of more optimal scheduling techniques (e.g. requestIdleCallback API) which are intended to run when user is not interacting with the application. To work around this limitation, the tracking of frames using rAF must be limited in time to ensure idle periods exist and have a chance to execute code. Limiting the measurement period means some long frame measurements might get missed, especially those who are caused by long idle callbacks.
* CPU/Battery - running rAF callback code on every frame causes a significant increase in CPU consumption which in turn hurts battery life. This can be addressed by limiting the time window for frame length measurement; however this results in the inability to detect long frames which occur before or after that interval.
* Memory - tracking long frames using rAF requires maintaining in-memory data structures in JavaScript that can be aggregated and sent to a central telemetry system. This may increase memory usage and must be done in a careful way to avoid increasing GC rates.
* Frame breakdown - measuring long frames using this method provides signals about the existence and approximate length of long frames but no information about what may have caused them. It does not provide any insight into whether a long frame was caused by long Javascript execution or time spent in the rendering pipeline.

### Measuring long tasks
* Wrapping callbacks - to measure long executing JavaScript tasks developers may attempt to instrument the code for every possible callback before it enters the event queue. This is hard to scale due to the many code paths callbacks can be initiated from and is also error prone. It may not be possible to apply this approach to third-party code. It can also impact CPU, battery life and memory consumption.
* Long Tasks API - it is possible to use the Long Tasks API to detect long running JS code. It is however non-trivial task to correlate between long tasks to long frames. Building a mechanism to do that would also have cost in terms of CPU, battery life and memory consumption.
* Missing long frames - it is possible to have many “short” tasks execute consecutively, resulting in a long frame. These long frames may go undetected when looking at long tasks in isolation.

### Detecting long idle callbacks
Similar to long task measuring methods, idle callbacks are essentially JavaScript code running when the callback queue is empty. Therefore, it can be tracked using techniques similar to the aforementioned methods. Understanding the duration of tasks scheduled during idle callbacks is important to understand the user response time when interacting with the UI using input devices. 

### Detecting rendering bottlenecks
Browser do not provide any Web API to directly understand rendering related bottlenecks. Long rendering operations could be caused by a complex page layout or frequent repetitive layout calculations (known as layout thrashing). In addition, there are cases where the compositor render phase can take extensive time to complete (although running on a separate thread in modern browsers). Since no relevant Web API exist to observe these operations, engineers are left with relatively narrow options.
* Performance profiler - modern browsers provide tools to manually profile web app execution and analyze results later. Using this technique is helpful when there is a known local repro case for long frames, and it can be clear the there is a rendering bottleneck by using such tools.
* Measuring DOM size - large DOM sizes impact rendering phase performance since layout and style calculations as well as painting phases may take significantly longer as the DOM size increases. To get a signal towards potential rendering bottlenecks engineers can use Web API to report the DOM tree size. This method can be expensive and can only provide indirect inference of potential rendering issues.

## Summary of use cases
The use cases here directly derive from the described challenges.

### Use case 1: Troubleshoot slow UI responsiveness and animations
When web application users complain about certain actions in the UI being “slow”, “stuck”, “not smooth” it is not trivial to troubleshoot and diagnose these cases, particularly when there is no local repro for the engineer investigating this. A common challenge is to understand what caused long frames in terms of specific code paths or rendering inefficiencies. The Frame Timing API could provide data about long frames that occurred during a certain time frame. With the addition of other context around user actions and application state, developers can use correlation and analysis to identify sources of problems.

### Use case 2: Collect RUM for user actions
When building web applications, it is a common practice to build KPIs based on Real User Monitoring data to measure and track the overall user experience. Developers can create KPIs to quantify user experience using metrics derived from long frame data. One of the main challenges besides detecting that a long frame occurred is to understand the root cause of those long frames.

### Use case 3: Identify regressions related to JavaScript and rendering
When an engineer builds a feature or fixes a bug in a web app, they want to know if they introduced UX regressions by increasing JavaScript execution time or rendering overhead, such as layout thrashing. It is possible to measure long tasks (long JS execution time) using [Long Tasks API](https://w3c.github.io/longtasks/) but not the length of entire frames and the rendering time within those frames. This is a blind spot in the ability to detect performance regressions.

## Use case 4 – identify regressions in asynchronous animations
In modern browsers, part of the rendering pipeline is executed in parallel with JS execution, for example, threaded scrolling, or slow composited effects like blurs. It should be possible to use this API to identify when asynchronous animations are slow.

## Conclusion
As outlined in this document, it is very challenging for engineers of complex web apps to track and detect long frames and identify their root causes. A new Web API is required to provide the ability to natively track long frames and provide a breakdown into phases for more effective root cause analysis. Such an API would give engineers the ability to develop and build more responsive and interactive web applications with smooth and rich animations which will benefit the web apps ecosystem.
