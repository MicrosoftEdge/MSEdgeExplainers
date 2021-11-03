# Source Hashes in Stack Traces

Authors: [Rob Paveza](https://github.com/robpaveza)

## Status of this Document
This document is a proposed enhancement to V8 in the area of JavaScript stack traces, which is today specifically not a Web Standard.

* This document status: **Active** (One-pager)
* Expected venue: [V8-dev](https://groups.google.com/g/v8-dev)
* **Current version: this document**
* Prototype [implementation](https://chromium-review.googlesource.com/c/v8/v8/+/3229957) in V8

## Introduction

* Source URLs are often insufficient for uniquely identifying a file in post-hoc debugging scenarios, even when they contain a `# sourceMappingURL=` comment.
* This presents a problem for debugging in production, especially when CI systems might automatically deploy new versions of a source file into a production environment. DevTools might incorrectly load a source map, and there is no way to verify that a source map corresponds to a particular version of a file
* Web developers have come up with many clever ways to handle this - explicitly correlating versions of applications to source maps, or including a CRC as part of a file name - indicating that this is a difficult problem for them.

## Goals

 - Improve ability to resolve a source map from only the source file

## Non-Goals

 - Change the [Source Maps specification](https://sourcemaps.info/spec.html)

## Use Cases

 - Diagnostics in production

## Proposed Solution

The hash of source scripts should be accessible when preparing a stack trace or in other locations in which a source file is referenced. This will include, but is not limited to:

 - `CallSite`, exposed in the callback `Error.prepareStackTrace`
 - Some CDP properties:
   - `Runtime.CallFrame`
   - `Debugger.CallFrame`
 - Performance trace embedders for function calls

By leveraging the hash of the source file, a "fingerprint" can be generated which will allow developers to index their source maps according to the hash of the content actually running in the browser.

One drawback of this solution is that non-code changes in source files (such as comments or whitespace) are likely to generate files with identical "result sources." For the most part, however, this should be a solvable problem.

### Appearance within `CallSite`

The hash will be a [SHA-256](https://en.wikipedia.org/wiki/SHA-2) and encoded in base-16. The following code snippet would append a source hash to the end of each error stack frame:

```ts
(() => {
  let canGetScriptHash = false;
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (er, frames) => {
    if ('getScriptHash' in frames[0].constructor.prototype) {
      canGetScriptHash = true;
    }
    return er.stack;
  };
  const error = new Error();
  // This should invoke prepareStackTrace above.
  const stack = error.stack;
  console.log(`Was able to retrieve hash: ${canGetScriptHash}`);
  if (!canGetScriptHash) {
    Error.prepareStackTrace = oldPrepareStackTrace;
  }
  else {
    Error.prepareStackTrace = (er, frames) => {
      const originalStack = er.stack;
      const lines = originalStack.split('\n');
      let msg = er.name;
      if (er.message) {
        msg = `${er.name}: ${er.message}`;
      }
      const stackLines = lines.slice(1);
      const formattedLines = stackLines.map((f, i) => {
        const frame = frames[i];
        const hash = frame.getScriptHash();
        if (hash) {
          return `${f} [source hash ${hash}]`;
        }
        return f;
      });
      formattedLines.unshift(msg);
      return formattedLines.join('\n');
    };
  }
})();
```

This will produce a stack trace along the following lines:

```
Error: This is an example error.
    at http://localhost:8080/test.js:6:11 [source hash ca119760926fbc8502b445d33dc94c4c34d4ef0f20103909e92f91b17c97f33d]
    at doWork (http://localhost:8080/additional-script.js:2:3) [source hash d91c151b875409add9cd0e19b20230e09610142727b11aa3873c54f0ae8de414]
    at scenario (http://localhost:8080/test.js:4:3) [source hash ca119760926fbc8502b445d33dc94c4c34d4ef0f20103909e92f91b17c97f33d]
    at HTMLButtonElement.btn.onclick (http://localhost:8080/main.js:44:5) [source hash 0a5df129f563bdd835347968a0eca78dbd8bb4b2fc7bc95a1ee243e0f5a3d7ac]
```

This is computed entirely in userland, except for the source hash.

## Privacy and Security Considerations

### Privacy

There are not likely to be any privacy considerations. It is conceivable that a malicious script might be able to brute-force, e.g., a script that contains personally identifiable information, by using the hash. However, SHA-256 balances the computational need required to take advantage of such an attack, the infrequent occurrence of such programming patterns as this, and the unlikely case in which a malicious script would be able to inject itself to monitor for errors to parse stacks in this way.

### Security

It is conceivable that a malicious web site might be able to uniquely identify a source file by its fingerprint present in an error stack in a way that it might not be ordinarily able to do. This would not expose any new security vulnerabilities, however; it would simply allow a malicious web application to more readily identify a vulnerable script. That having been said, this seems like a big stretch.

## Alternative Solutions

The original alternative explored here was to enable a property on the `Error` object, `stackTraceSourceHash`, to embed the hash directly in the line. This proposal was rejected because the `Error#stack` property is already not standardized, and adding another flag here would create an additional burden to standardize.

Another alternative solution explored here was to enable a callback on the `Error` object, such as:

```ts
Error.stackTraceComputeFingerprint = (sourceContents: Uint8Array) => Promise<string>;
```

Then, if at runtime the `stackTraceComputeFingerprint` function is not present, it can return to the present behavior.

While this seems like a reasonable approach, it seems to be an excessive level of complexity that it's unlikely most customers would override; and, I am concerned that it might introduce cross-origin security issues.
