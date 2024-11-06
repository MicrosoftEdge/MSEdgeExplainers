
# Extending Long Tasks API to Web Workers

Author: [Joone Hur](https://github.com/joone)

# Introduction

The Long Tasks API allows web developers to monitor long-running tasks on the main thread that affect responsiveness and UI updates. To provide more detailed insights into these tasks, the Long Animation Frames (LoAF) API was introduced. However, neither API monitors long-running tasks in Web Workers, which can also affect user experience. To address this, we propose extending the Long Tasks API to support Web Workers, allowing Web developers to monitor long-running tasks on worker threads.

# Goals

- Enable sites to identify and diagnose worker-side tasks that block progress, including the worker types.
- Improve consistency in telemetry logging across documents and workers by providing a unified monitoring mechanism for main thread and worker threads.

# Non-goals

- Provide a detailed breakdown and attribution of long-task timing similar to what the LoAF API does. We anticipate it may be in-scope for future work.

# Problems

When developers use a WebWorker, they expect to know when the task is done quickly. But when there's a delay, it can be hard to find the root cause. The delay might happen because one task is blocking others from running, a task is waiting for a network request, or other reasons.
To address this, Web developers try to use the Long Tasks or LoAF API to identify long-running tasks that affect responsiveness and UI updates.

This example code simulates long tasks occurring on both the main thread and a worker thread.

## Main script (main.js)

```js
function longTaskMain() {
    console.log('Main task completed: fibonacci value:' + fibonacci(40));
}
 
function longTaskWorker() {
    const worker = new Worker('worker.js');
    worker.postMessage('startWorkerTask');

    worker.onmessage = (event) => {
        console.log('Worker task completed:', event.data);
    };
}

const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    console.log(entries);
});

observer.observe({ entryTypes: ['longtask', 'long-animation-frame']});

longTaskMain();
longTaskWorker();

```

## Web Worker script(worker.js)

```js
self.onmessage = (event) => {
    if (event.data === 'startWorkerTask') {
        postMessage('fibonacci value:' + fibonacci(40));
    }
};
```

However, neither API monitors long-running tasks in Web Workers, which can also impact user experience, particularly when tasks involve fetching or processing data for UI updates. Therefore, this example only shows performance entries monitored from the main thread:

```json
[
    {
        "name": "long-animation-frame",
        "entryType": "long-animation-frame",
        "startTime": 18.899999976158142,
        "duration": 1217,
        "renderStart": 1235.1000000238419,
        "styleAndLayoutStart": 1235.1000000238419,
        "firstUIEventTimestamp": 0,
        "blockingDuration": 1151,
        "scripts": [
            {
                "name": "script",
                "entryType": "script",
                "startTime": 35.19999998807907,
                "duration": 1199,
                "invoker": " https://localhost/explainers/long_tasks_ex/",
                "invokerType": "classic-script",
                "windowAttribution": "self",
                "executionStart": 35.5,
                "forcedStyleAndLayoutDuration": 0,
                "pauseDuration": 0,
                "sourceURL": " https://localhost/explainers/long_tasks_ex/",
                "sourceFunctionName": "",
                "sourceCharPosition": 0
            }
        ]
    },
    {
        "name": "self",
        "entryType": "longtask",
        "startTime": 34.89999997615814,
        "duration": 1199,
        "attribution": [
            {
                "name": "unknown",
                "entryType": "taskattribution",
                "startTime": 0,
                "duration": 0,
                "containerType": "window",
                "containerSrc": "",
                "containerId": "",
                "containerName": ""
            }
        ]
    }
]
```

In addition, the name "the Long Tasks API" might cause misunderstandings among web developers, as it suggests the API could work within web workers (see [this Chromium issue](https://issues.chromium.org/issues/41399667)).

# Proposal

We propose extending the Long Tasks API to support Web Workers. To adapt the API for Web Workers, the `PerformanceLongTaskTiming` interface needs to be updated to account for long tasks in worker threads. The primary change would be within the TaskAttribution interface, where certain properties should reflect the worker context instead of the main thread.

```json
{
    "name": "unknown",
    "entryType": "longtask",
    "startTime": 1448.1000000238419,
    "duration": 297,
    "attribution": [
        {
            "name": "unknown",
            "entryType": "taskattribution",
            "startTime": 0,
            "duration": 0,
            "containerType": "worker",
            "containerSrc": " https://localhost/explainers/long_tasks_ex/worker.js",
            "containerId": "",
            "containerName": ""
        }
    ]
}
```

## TaskAttribution Changes

The table below highlights the differences in the properties of the `TaskAttributionTiming` interface for long tasks on Web Workers compared to the main thread:

|**Property**|**Value(Main Thread)**|**Value(Web Worker)**|
|---|---|---|
|TaskAttributionTiming.duration|Always returns 0|Always returns 0|
|TaskAttributionTiming.entryType|always returns taskattribution|Always returns taskattribution|
|TaskAttributionTiming.name|always returns unknown|Always returns unknown|
|TaskAttributionTiming.startTime|always returns 0|Always returns 0|
|TaskAttributionTiming.containerType|Returns the type of frame container, one of iframe, embed, or object. Defaults to window if no container is identified.|Always return "worker"|
|TaskAttributionTiming.containerSrc|Returns the container's src attribute.|Returns the worker script's URL|
|TaskAttributionTiming.containerId|Returns the container's id attribute.|Always returns an empty string|
|TaskAttributionTiming.containerName|Returns the container's name attribute.|Always returns an empty string|

For Web Workers, the containerType should return "worker" to clearly indicate the context. Additionally, containerSrc can return the URL of the worker script, helping developers differentiate between multiple workers.

## Monitoring multiple web workers

The main thread can create multiple workers. Instead of setting up a `PerformanceObserver` for each worker, the main thread can gather performance entries from all workers and its own long tasks. Therefore, it is only necessary to set up the `PerformanceObserver` for the longtask type on the main thread to collect these entries:

## Main script (main.js)

```js
function longTaskMain() {
  fibonacci(40);
}

function longTaskWorker(url) {
  const worker = new Worker(url);
  worker.postMessage('startWorkerTask');

  worker.onmessage = (event) => {
    console.log('Worker task completed:', event.data);
  };
}

longTaskMain();
longTaskWorker("worker1.js");
longTaskWorker("worker2.js");
```

If you run the `PerformanceObserver` like this in the JavaScript console, you will get three performance entries as shown below:

```js
const observer = new PerformanceObserver((list) => {
  console.log(list.getEntries());
});

observer.observe({ type: 'longtask', buffered: true });

[
    {
        "name": "self",
        "entryType": "longtask",
        "startTime": 183.60000002384186,
        "duration": 1279,
        "attribution": [
            {
                "name": "unknown",
                "entryType": "taskattribution",
                "startTime": 0,
                "duration": 0,
                "containerType": "window",
                "containerSrc": "",
                "containerId": "",
                "containerName": ""
            }
        ]
    },
    {
        "name": "unknown",
        "entryType": "longtask",
        "startTime": 1508.5,
        "duration": 229,
        "attribution": [
            {
                "name": "unknown",
                "entryType": "taskattribution",
                "startTime": 0,
                "duration": 0,
                "containerType": "worker",
                "containerSrc": " https://localhost/explainers/long_tasks_ex/worker1.js ",
                "containerId": "",
                "containerName": ""
            }
        ]
    },
    {
        "name": "unknown",
        "entryType": "longtask",
        "startTime": 1534.199999988079,
        "duration": 303,
        "attribution": [
            {
                "name": "unknown",
                "entryType": "taskattribution",
                "startTime": 0,
                "duration": 0,
                "containerType": "worker",
                "containerSrc": " https://localhost/explainers/long_tasks_ex/worker2.js ",
                "containerId": "",
                "containerName": ""
            }
        ]
    }
]
```

# Alternatives considered

## DevTools Tracing

DevTools tracing allows for manual inspection of long tasks; however, it is not well-suited for systematic metric collection.

## Override worker messages

Developers can implement a polyfill that intercepts every worker message, wraps callbacks with timers, and collect the necessary telemetry without native support. However, it is challenging to intercept all Web Worker messages in third-party libraries.

# Discussion

## SharedWorker Contexts

The `PerformanceLongTaskTiming.name` property might indicate multiple contexts for SharedWorkers. Further discussion is needed on how to handle shared execution environments and effectively track long tasks across these different contexts.

## Different Types of Workers

There are several types of worker threads, including Web Workers, Service Workers, and Worklets. To differentiate long tasks across these contexts, we can propose introducing a new property (e.g., workerType) to specify the type of worker from which the long task originates.

## Minimum Duration of Long Tasks in Web Workers

According to the specification, 50ms is the minimum duration for long tasks. We should consider whether the 50ms is appropriate for the minimum duration of long tasks in Web Workers as well, as their background operations may require a different standard. Furthermore, the minimum duration of long tasks should be configurable for both main thread and workers to accommodate various situations.

## Exposing the Source Function Name and Character Position

Since the LoAF API provides details about the invoker's source location, the Long Tasks API can extend similar support for Web Workers by exposing the function name and character position of long-running tasks.

## Who observes Web Workers?

This proposal allows the main thread to monitor long-running tasks on worker threads and collect performance entries directly from them. Alternatively, web developers could set up a `PerformanceObserver` for each worker and manually consolidate the entries.

# Chromium Issue

- [Support Long Tasks API in workers [41399667] - Chromium](https://issues.chromium.org/issues/41399667)

# Chrome Platform Status

- [Support the Long Tasks API in web workers - Chrome Platform Status (chromestatus.com)](https://chromestatus.com/feature/5072227155050496)

# Links and further Reading

- [Long Tasks API (w3c.github.io)](https://w3c.github.io/longtasks/)
- [PerformanceLongTaskTiming - Web APIs | MDN (mozilla.org)](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)
- [Long Animation Frames API  |  Web Platform  |  Chrome for Developers](https://developer.chrome.com/docs/web-platform/long-animation-frames)
