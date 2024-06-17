# Call stacks in crash reports from unresponsive web pages

## Authors: 

- [Seth Brenith](https://github.com/sethbrenith)
- [Issack John](https://github.com/issackjohn)
- [Andy Luhrs](https://github.com/aluhrs13)

## Participate
- [Issue tracker](https://issues.chromium.org/issues/40268201)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Performance WG](https://www.w3.org/webperf/)
* **Current version: this document**

## Motivation

It is common for installable applications to send crash reports when unrecoverable errors occur, using services such as [Windows Error Reporting](https://docs.microsoft.com/en-us/windows/win32/wer/about-wer) or [Crashpad](https://chromium.googlesource.com/crashpad/crashpad/+/refs/heads/main/README.md). These crash reports include the state of the application at the time of the crash. Similarly, crash reports are sent when an application is terminated due to becoming unresponsive. These reports contain sufficient data that the application's developers can investigate the issue. The sequence of steps for detecting and resolving such a problem often looks roughly like this:

1. Users encounter a problem that causes the application to become unresponsive.
1. Their machines upload data about the failure to a server.
1. Automated server-side logic detects that the new reports are similar based on their call stacks, and opens a bug.
1. A developer looks at the bug and takes appropriate action, such as reverting a problematic change or writing a fix.

Web sites can contain bugs or inefficiencies that cause the page or an iframe within it to become unresponsive, just like installable applications can. However, the current state of the art for detecting and fixing these failures is far behind. The [Crash Reporting API](https://wicg.github.io/crash-reporting/) allows site developers to receive reports that a page or iframe became unresponsive, but those reports contain no information about the JavaScript execution state at the time of the problem.

## Proposal

If a site opts in, crash reports uploaded by the Crash Reporting API may include the JavaScript call stack and script hashes, in new properties on `CrashReportBody`:

```
readonly attribute DOMString? stack;
readonly attribute DOMString? sourceModules;
```

## Source Modules

In addition to the JavaScript call stack, we propose adding a `sourceModules` field to the `CrashhReportBody`. This field will contain information about the source modules present in the call stack. Each source module will be a Source mapping URL or URL and a SHA-256 hash of the source. This will allow developers to indentify the exact version of the code that was running when the crash occured. The field may look something like this:

```
"https://example.com/script.js f3a2b4c5d6e7f8g9123456k3l4m5n6o7p8q9r0s1abcdefw5x6y7z8a9b0c1d2e3\n"
```

### How to opt in?

A site may opt in using the document policy. 
```
include-js-call-stacks-in-crash-reports
```
This configuration point allows the website owners to control whether JavaScript call stacks should be included in the crash reports or not. The default value is false, meaning that call stacks are not included unless you explicitly opt-in. Call stacks can be enabled by simply specifying the value.

Example.
```
Document-Policy: include-js-call-stacks-in-crash-reports
```


### How is the stack represented?

Exactly the same format as `Error.prototype.stack`, including limiting the number of reported frames to the value specified in `Error.stackTraceLimit`. This format allows sites to reuse any logic they may have built for reading stacks uploaded by `window.onerror` handlers.

### When should the stack be captured?

Any time after the browser has determined that the page or iframe is unresponsive. This leaves room for implementations to do whatever is most convenient, whether that be inspecting the stack of the process as it's terminated or interrupting the JS execution thread sometime earlier to collect the data.

### What if a stack can't be captured?

That's fine. The browser should make a reasonable effort to collect call stack data, but such data is not guaranteed. For example, an implementation that relies on interrupting the JS thread may never have a chance to do so if that thread is waiting on a lock or executing a very long loop in browser-internal code.

### What about workers?

An infinite loop in a worker doesn't cause the page or iframe to become unresponsive. This API reports only script on the main thread.

## When there are frames from multiple origins in a renderer, how do we ensure that stacks are attributed to the correct frame?
To ensure that stacks are attributed to the correct frame, we need to send back the serialized frame token from the renderer to the browser along with the call stack. This way, the browser can verify that the call stack belongs to the same frame which the crash report is being generated for before attaching it to the report.

## If there is an extension executing scripts in the main world, how will you prevent the endpoint from knowing about the agent’s execution environment such as what extensions they have installed?
Extension code injected into the main world may be visible.

## How do wasm call stacks work with this proposal?
Wasm stack frames will be supported. Typically the format is `${url}:wasm-function[${funcIndex}]:${pcOffset}` as found [here](https://webassembly.github.io/spec/web-api/index.html#conventions).

## Privacy and Security Considerations

### Privacy

#### Why require opt-in?

Some sites may be sending their reports to a third-party service and not wish to expose information about their site code to that third party. This feature would also increase the size of reports, add a property that existing servers might not handle correctly, and include data that users might not have consented to send.

#### Does this affect user privacy?

This adds a mechanism that could allow website owners to learn about an extension that a user is running if the page reports a crash while code from the extension's content script is on the stack.

### Security

Just like `Error.prototype.stack`, stack frames & script hashes from cross-domain scripts that were not loaded with CORS must be omitted.

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Ian Clelland](https://github.com/clelland)
- [Choongwoo Han](https://github.com/tunz)
- [Sulekha Kulkarni](https://github.com/sulekhark)
