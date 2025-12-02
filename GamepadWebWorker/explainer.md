# Gamepad Web Worker

**Authors**
* [Nishitha Burman Dey](https://github.com/nishitha-burman)
* [Sneha Agarwal](https://github.com/snehagarwal_microsoft)

## Participate
* [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/GamepadWebWorker)
* [Discussion forum](https://github.com/w3c/gamepad/issues/37)

## Introduction
The [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) currently exposes input exclusively on the main JavaScript thread via [navigator.getGamepads()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads), forcing developer to implement high-frequency polling loops on the UI thread alongside heavy DOM operations such as layout calculations, rendering, and media handling. These loops compete for resources with garbage collection and rendering tasks, causing latency spikes, input jitter, and frame drops in real-time scenarios like cloud gaming and immersive web experiences.  

While an effort is underway to introduce an [event-driven Gamepad Input API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/GamepadEventDrivenInputAPI/explainer.md) to reduce reliance on polling, this proposal focuses on extending Gamepad access to Web Workers. By isolating input handling from the main thread, we can minimize jank, improve latency, and enable smoother gameplay and more predictable haptics timing without impacting UI performance.  

## User-Facing Problem

While the GamepadInputChange event reduces the need for continuous polling, it does not eliminate all latency and responsiveness issues because event dispatch still occurs on the main thread. This creates several challenges for developers building real-time, latency-sensitive experiences: 

* Main Thread Contention: Heavy DOM operations, rendering tasks, and garbage collection pauses can delay event delivery. Even with event-driven input, the main thread remains a bottleneck for input responsiveness. Additionally, raw input events dispatch only on the main thread and workers cannot receive event-driven input today. This proposal is complementary to the [raw-event proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/GamepadEventDrivenInputAPI/explainer.md). 

* GC-Induced Jitter: Garbage collection pauses on the UI thread can introduce unpredictable latency spikes. For competitive gaming or cloud streaming scenarios requiring sub-10ms responsiveness, these delays degrade user experience. 

* Haptics Timing Accuracy: Advanced rumble effects and force-feedback controllers require precise scheduling. When haptics logic runs on the main thread, timing accuracy suffers under layout and GC pressure. 

* Isolation for real-Time Loops: Developers need deterministic timing for high-frequency loops (e.g. 120Hz sampling) without interference from rendering or memory management tasks. Event-driven APIs alone do not provide off-main-thread execution. 

Exposing Gamepad APIs to Web Workers allows input handling to run off the main thread, providing:  

* Predictable, low-latency input processing unaffected by UI thread stalls. 
* Resilience against GC pauses and DOM workloads. 
* A foundation for advanced haptics and real-time feedback loops without impacting rendering performance. 

** Why loops are needed even when event-driven APIs exist**
* Continuous State sampling: event driven APIs only notify when something changes (e.g. button press). But for features like analog stick (report continuous values, not just discrete changes) and motion smoothing (requires reading the latest state every frame to interpolate movement) you cannot just rely on events because you might miss intermediate values between changes. This matters for racing games (steering precision) and VR/AR scenarios (tracking orientation). 

* Deterministic Timing: Event-driven delivery depends on the main thread’s event loop. If the thread is busy or paused by GC, events can be delayed. For scenarios like competitive gaming (sub-10ms latency is critical) and force feedback/haptics (effects need precises timing like rumble sync with collisions), a dedicated loop in worker ensures fixed cadence and isolation from UI thread stalls and GC pauses.  

## Goals
* Maintain compatibility with existing Gamepad API semantics while introducing worker-safe extensions.  

* Enable developers to access gamepad input from Dedicated Web Workers, isolating input loops from UI thread stalls. 

* Support high-frequency polling for latency-critical scenarios without impacting rendering performance. 

* Provide a foundation for future event-driven models to coexist with worker-based polling.  

## Non-goals
* This proposal complements, not replaces, the [GamepadRawInputChangeEvent proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/GamepadEventDrivenInputAPI/explainer.md).
* The aim is not to redesign the Gamepad API surface.

# User Research
This [W3C issue thread](https://github.com/w3c/gamepad/issues/37) shows strong interest in Gamepad support in Web Workers for cloud gaming developers (e.g. Xbox Cloud Gaming and others). It highlights: 
* **Latency sensitivity**: Competitive gaming scenarios require sub-10ms input-to-action latency. Current main-thread polling cannot guarantee this under GC pressure. 

* **Haptics precision**: Force-feedback controllers (e.g. racing wheels) demand tight timing loops for realistic effects. 

* **Cross-platform parity**: Native game engines already offload input to dedicated threads; web developers expect similar capabilities for parity with native experiences.  

* In engines like **Unity** and **[Unreal](https://forums.unrealengine.com/t/multithreading-and-performance-in-unreal/1216417)**, latency-sensitive input handling runs on dedicated threads or systems, separate from UI/renderer, so sampling and haptics remain deterministic under load. Web developers also increasingly run WebGL + OffscreenCanvas in workers to match native responsiveness and avoid main-thread stalls.

# Proposed Approach
TODO
* Define the data structures the workers will receive.
    * Whether workers get snapshots
    * Whether they are dictionaries or typed arrays
    * Whether they are transferable
    * What fields are included
    * Whether they match the existing Gamepad interface

# Alternatives Considered

# Relationship to RawGamepadInputChangeEvent
* Main-thread only
* Uses DOM events, which workers do not support
* Event objects contain DOM binding types
* Workers need structured-coloneable state instead

# Accessibility, privacy, and security considerations

# Stakeholder Feedback/Opposition

# References & Acknowledgements

# Appendix
