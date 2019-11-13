# Bidirectional WebDriver Protocol

## Overview

This document presents a possible design for a bidirectional WebDriver protocol, incorporating scenarios and resolutions discussed at the TPAC 2019 working group meeting. The protocol uses JSON-RPC messaging over WebSockets as the transport mechanism. WebDriver's current model of the browser is extended to include service workers and other non-page targets and make it possible for clients to target these additional contexts. We also discuss how the new protocol can interoperate with the existing protocol. Sample protocol messages illustrating how the protocol would work are included, and an JSON API specification is included alongside the document.

## Goals

The protocol is designed with the following goals in mind:

- **Support for the top customer scenarios identified at TPAC 2019:**
    - Listen for DOM events
    - Log what's going on in the browser including console and JS errors
    - Fail fast on any JS error
    - Mock backends and intercept network requests
    - Record traffic
    - Full-page screenshot
    - Access to native devtools protocol
    - Dynamic changes to iframe or documents
    - Performance timings
    - Notifying of new contexts
    - Bootstrap scripts
- **Interoperability with classical WebDriver commands**
    - Allow existing test/automation code to be upgraded gradually.
- **Feature parity with existing WebDriver commands**
    - Existing commands can be sent over the new protocol so that new test/automation code can be written entirely in the new protocol.
    - Update features to take advantage of bidi communication where appropriate. Useful for unhandled prompts and scenarios where polling is common.
- **A machine and human-readable API specification**
    - Makes it easier to generate up-to-date language bindings, documentation, and test cases.
- **Easily mappable to/from native devtools protocols**
    - Simple for browser vendors to implement and maintain.
    - Possible for clients to enhance their WebDriver automation with browser-specific devtools protocol features.

This document doesn't attempt to dive into the any of the new feature scenarios identified above, but rather tries to provide a solid foundation and the necessary primitives to build these features on. The document does walk through an example of an existing WebDriver feature (unhandled prompts) being updated for a bidirectional world.

## Protocol

A protocol and transport layer for bidirectional WebDriver should support the following usage patterns:

- Command/response pattern for simple actions like querying a target's URL.
- Command/response/notification pattern for starting a long-running operation and receiving progress updates (e.g. navigation).
- Registering for async notifications not associated with a particular command. Useful for listening to DOM events or new targets/contexts, etc.

The protocol should also be:

- Easy to write client-side libraries for.
- Easy to document.
- Interoperable with the existing WebDriver REST-style API.

### Transport Layer

[JSON-RPC 2.0](https://www.jsonrpc.org/specification) is recommended as the message protocol. JSON-RPC is an open specification which supports the command/response pattern as well as async notifications. The message packets are JSON, so existing WebDriver clients should have no trouble encoding and parsing them. It should also be straightforward for users to share JSON data between the new bidirectional WebDriver API and the existing REST-style API if needed. Off-the-shelf JSON-RPC libraries are available for multiple languages.

The spec describes communication between a JSON-RPC Client and a JSON-RPC Server. In WebDriver's case, the Server would be the WebDriver implementation, and the Client would be some test/automation code. The Client may send either "Request" messages, which are RPC calls for which the Client expects a response; or "Notification" messages, which are fire-and-forget messages that the Server does not need to reply to. For full details, see the spec.

The spec itself doesn't have any actual provisions for Server-to-Client messaging. However, an implementation can easily add bidirectional support by treating the Server as a Client and vice-versa so that messages may be sent in the opposite direction.

>[RESOLUTION](https://www.w3.org/2019/09/20-webdriver-minutes.html#resolution04): research having a more formalized schema for defining the transport layer

JSON-RPC is also accompanied by the [OpenRPC](https://open-rpc.org/) spec; an interface description format for JSON-RPC APIs that is both human and machine-readable. Using OpenRPC, we can document and describe the entire bidirectional WebDriver API, and also make it simple for clients to generate language bindings and keep them up to date. OpenRPC is recommended over OpenAPI because OpenRPC is designed specifically with JSON-RPC in mind. OpenAPI is designed to specify REST-style APIs, and so isn't as well suited to a JSON-RPC API. The OpenRPC maintainers provide tools to generate human-readable documenation and typings/bindings for various languages.

The JSON-RPC spec is transport-agnostic and covers only the message data format. WebSockets are the recommended transport mechanism. They support the full-duplex communication that we'll need for bidirectional WebDriver scenarios, and have broad library support in multiple languages. Adopting a technology other than HTTP and WebSockets is not recommended since this would likely require WebDriver implementers and users to take on new library dependencies on both the client and server sides.

### High-Level Interface

A simple approach for adding bidirectional communication is to keep using the existing endpoints for command/response calls, and use the WebSocket transport only for browser-to-client notications. This requires the fewest changes to existing WebDriver implementations, but it requires the client to speak both HTTP and WebSocket. Naturally, there will be lots of existing HTTP-based automation that may want to adopt some new bidi features, so WebDriver should at least allow mixing HTTP and WebSocket messages to support this scenario. However, we should offer clients the ability to do everything using the JSON-RPC dialect if they are able.

Exposing all of WebDriver's functionality via JSON-RPC has a few advantages. The API is more consistent, the client only needs to speak one dialect, and it is easier to reason about the order or messages when they are all going over the same transport. There may be potential performance advantages too. Multiple JSON-RPC commands may be sent as a batch, compared to HTTP which requires a new HTTP request for every command the client wants to send.

The interface for the new protocol would be a set of client-to-server commands, and a set of server-to-client notifications. Clients can send commands and subscribe to notifications. An OpenRPC JSON specification is included alongside this document. It describes a JSON-RPC interpretation of the current WebDriver feature set and adds some useful notifications.

#### Commands

 Below are some sample messages that illustrate what commands in the JSON-RPC-based WebDriver protocol might look like:

*Sample command*

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "getTitle",
    "params": { "browsingContextId": "<ID>" }
}
```

Commands include a "method" name and optional "params". Positional parameters in an array are supported, but named parameters in an object are more descriptive and map more closely to how WebDriver commands currently work.

*Sample success response*

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "result": { "title": "Example Domain" }
}
```

Responses from the server include the "id" of the command they are responding to.

*Sample error response*

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "error": { "code": 8, "message": "no such frame", "data": { "stacktrace": "..." } }
}
```

Note that in this example, "stacktrace" is embedded in the "data" property instead of alongside it (like in an WebDriver HTTP error response). This is to comply with the JSON-RPC spec for Error messages. All custom data needs to be in the "data" field.

#### Notifications

Since notifications may generate a large amount of traffic over the WebSocket, and may have a runtime cost in the browser, these should be opt-in. Commands should be provided so that a client can subscribe and unsubscribe. The first step to receive notifications on the client side would be to send a "subscribe" command:

*Subscribing for a notification*

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "subscribe",
    "params": { "event": "scriptContextCreated" }
}
```

Sending this command would tell the server to start firing an event (i.e. "scriptContextCreated") to the client. The client would send a matching "unsubscribe" command when they no longer want to receive that event.

Subscriptions for each event should be ref-counted on the server side. Calling subscribe would increment the ref count for an event and calling unsubscribe would decrement the ref count. The first time the client calls subscribe, the ref count goes from 0 to 1, and the WebDriver implementation would perform whatever browser-specific steps are needed to begin generating the event. When the ref count falls back to 0, the WebDriver implementation would stop generating the event.

Ref counting is useful here because it would allow multiple consumers on the client side to call "subscribe". For example, some test code might want to subscribe for an event, and the code might use some third-party helper library that also wants to subscribe for the event. Ref counting allows the test code and helper library to subscribe and unsubscribe independently. Otherwise, the first one to call "unsubscribe" would inadvertently shut down events for both consumers.

*Sample notification*

Notification messages don't have an "id" property since they are fire-and-forget.

```json
{
    "jsonrpc": "2.0",
    "method": "scriptContextCreated",
    "params": { "scriptContextId": "<ID>" }
}
```

To use the new bidirectional protocol, the client must first establish a WebSocket connection to the WebDriver server. This is discussed below.

## Establishing a Bidirectional Session

>[RESOLUTION](https://www.w3.org/2019/09/20-webdriver-minutes.html#resolution01): Bi-di is always enabled. An optional capability, defaulting to true, indicating that bi-di is desired. When a new session is established, the return value of the new session contains the new top-level property of the bi-directional URL

A bidirectional session starts as a traditional session created with a POST /session command. The client can upgrade their session to a bidirectional one by connecting to the WebSocket URL provided in the response. The client can also request the optional "protocolVersion" capability to explicitly enable or disable bidi:

```json
{
    "capabilities": {
        "alwaysMatch": {
            ...
            "protocolVersion": "2.0"
        }
    }
}
```

The "protocolVersion" capability may be either "1.0" or "2.0". WebDriver implementations that support the new bidirectional protocol would default to "2.0". "1.0" indicates that the client does not want bidi enabled and will stick to classical WebDriver commands. When the protocol is set to "2.0", bidi is enabled and the new session response includes the WebSocket URL to connect to:

```json
{
    "value": {
        "capabilities": {
            ...
            "webSocketUrl": "ws://localhost:9999/session/<session id>/upgrade"
    },
    "sessionId": "<session id>"
  }
```

Alternatively, we can omit the WebSocket URL from the new session response and just return the protocolVersion instead. The WebSocket endpoint can be documented so that clients know where to connect to. This way, the capability key returned in the reponse will match the one the client actually sent.

| Method | URI Template                                       | Command         |
| -------|----------------------------------------------------|-----------------|
| GET    | ws://localhost:{port}/session/{session id}/upgrade | Upgrade Session |

Once the session is created, the client would then attempt to connect to the WebSocket endpoint. After connecting, they can start sending commands and receiving notifications using the new protocol. Since the WebSocket is tied to a particular session, all commands would implicitly target this session and any notifications received would come from this session only. In other words, the client would need to open additional WebSockets to talk to other sessions.

## Message Routing

Since each WebSocket is tied to a single session, there's no need to identify which session to target when sending commands. However, there still needs to be a way to identify which browsing context, frame, element, etc... a command is targeting.

>[RESOLUTION](https://www.w3.org/2019/09/20-webdriver-minutes.html#resolution02): It should be possible for command request messages to target a particular target/browsing context.

WebDriver has a notion of a current top-level browsing context, and current browsing context. Commands that need to run in a particular browsing context implicitly target the current one. To run a command in a different window or frame, the client must first discover these other contexts using a command like "Get Window Handles" or "Find Element" and then switch into them using a "Switch To Window" or "Switch To Frame" command.

In a bidirectional world, where the remote end can generate events at potentially any time, it is possible for events to come from any context. With that in mind, it makes sense to be able to target any context and handle events from that context without the need to switch to it first. Hence, the above resolution.

Today, WebDriver models the browser as a hierarchy that looks something like this:

- WebDriver Session
    - Window
        - Frame
            - Element

A session has one or more windows (top-level browsing contexts). Each window has a tree of frames (nested browsing contexts), each with a tree of HTML elements. To send a command to one of these contexts, we'll need a way to identify that context. Additionally, to allow the new bidi protocol to interoperate with the existing protocol, we should try to reuse the existing identifiers where possible.

### Identifying browsing contexts

Today, WebDriver uses strings called "window handles" to uniquely identify top-level browsing contexts. These can easily be reused in the new protocol. Frames (nested browsing contexts) are a little tricker. There is no concept of a "frame ID" in WebDriver yet. The Switch To Frame command accepts either a number or a web element reference as a parameter. The number is context-sensitive and so it can't be used as a globally unique frame ID. Web element references are unique across all browsing contexts in a window so these are a better candidate. However, element references aren't valid across windows, so it seems we'll need to add a new type of globally unique ID for nested browsing contexts. These can be a simple string ID just like window handles. For interop purposes, we should also add commands for users to convert a browsing context ID to a web element reference that can be used with classical commands and vice-versa.

### Identifying windows and other top-level targets

While we didn't arrive at any resolutions on the subject at TPAC this year, there was general interest in adding support for new contexts such as service workers and different JS realms. A WebDriver "window" in the current model considers only browsing contexts. It also conflates the concept of a browsing context with the concept of a script context. What's this means in practice is that only document script contexts are visible to WebDriver. This is usually all the user needs/wants, but it precludes access to other script contexts such as web workers, service workers, and web extensions. Since some changes will already be necessary to allow the bidi protocol to target the contexts that already exists (i.e. frames), now seems as good a time as any to define these additional contexts and light up some new customer scenarios. Below is an updated browser model with some new (*) concepts:

- WebDriver Session
    - Target* (Formerly "Window". Can be a page or service worker)
        - Browsing Context (aka "Frame")
            - Element
        - Script Context* (document, web worker, service worker, etc.)

In this new model, a Target is simply a thing that can host some browsing contexts, and/or script contexts. A basic page target would host a single top-level browsing context, some nested browsing contexts, and a number of script contexts; one for each browsing context in the tree. There could be additional script contexts as well if, say, the page uses web workers. A service worker target would have no browsing contexts; it would host script contexts only. This is where splitting the notion of browsing and script contexts comes in handy; It is now possible to execute script in the context of a service worker.

To maintain backwards compatibility with classical WebDriver, Targets would act just like Windows and continue to use window handles (strings) as IDs. Service workers, and other types of targets that don't host any browsing contexts would be invisible to the old protocol. Calling the classic "Get Window Handles" command would return only the page Targets and attempting to switch to a non-page Target using a classic command would return an error.

*Open Issue: Do we want to add these concepts to the HTTP protocol as well?*

### Identifying elements

Web element references can continue to work as they do today, with one caveat; since element references are valid only within a particular browsing context, any commands that operate on elements and any notifications involving elements will need to specify which browsing context the element(s) belongs to. For example, a command like getElementText would need both a "browsingContextId" and an "elementId" parameter.

### Message routing examples

Below are some sample bidi commands that illustrate how message routing would work in this new model:

*Send command to browsing context*

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "navigateTo",
    "params": { "browsingContextId": "<ID>", "url": "http://example.com" }
}
```

*Send command to script context*

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "executeSync",
    "params": {
        "scriptContextId": "<ID>",
        "script": "return document.title;",
        "args": []
    }
}
```

#### Close a target

```json
{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "closeTarget",
    "params": { "targetId": "<ID>" }
}
```

#### Interop with classical WebDriver

```json
// Send bidi command
{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "getFrameOwnerElement",
    "params": { "browsingContextId": "<ID>" }
}

// Get response
{
    "result": {
        "element-6066-11e4-a52e-4f735466cecf": "<element id>"
    }
}

// Use it in a classical WebDriver command - HTTP POST /session/<session id>/frame
{
    "id": {
        "element-6066-11e4-a52e-4f735466cecf": "<element id>"
    }
}
```

This model should make it possible to target all of the contexts that WebDriver supports today without the need for an implicit "current" context. It should also enable many of the proposed future scenarios discussed at TPAC. The next section covers how a client would discover these contexts.

## Target Discovery

Now that we've outlined a way to target commands to the right place, there needs to be a way for the client to find out about these contexts. In the traditional command/response paradigm, the user can send a command such as "Get Window Handles" to find out about currently opened tabs, or "Find Element" to grab a reference to an iframe to switch into. In this world, discovering newly opened windows means polling the "Get Window Handles" command until a new handle appears in the list. In a bidirectional world, the server can proactively notify the client when a new target is opened, or a new frame or script context is attached. We should provide a way for the client to register for these notification events.

### Discovering top-level targets

The simplest way to discover targets would be to send a command that replies with the current list of available targets. A new WebDriver session should have a single page target by default. Below is a proposed "getTargets" command which would be the bidi version of the existing "Get Window Handles" command.

*Command*

```json
{ "jsonrpc": "2.0", "id": 0, "method": "getTargets" }
```

*Response*

```json
{ "jsonrpc": "2.0", "id": 0, "result": {
    "targets": [
        { "targetId": "<ID>", "type": "page", "url": "about:blank" }
        ...
    ]
} }
```

The API could provide "targetCreated" and "targetClosed" notifications to let the client know when the target list changes. The client could subscribe to these events and then send an initial getTargets command. After receiving the initial list of targets, the client would start receiving updates any time the list changes. This makes it possible to do things like wait for new windows without the need for polling.

*Notifications*

```json
{
    "jsonrpc": "2.0", "method": "targetCreated", "params": {
        "targetId": "<ID>", "type": "serviceWorker", "url": "sw.js" }
    }
}
```

```json
{
    "jsonrpc": "2.0", "method": "targetClosed", "params": {
        "targetId": "<ID>"
    }
}
```

### Discovering browsing contexts

We need a similar means to discover what browsing contexts exist for a target, but these are a little different since browsing contexts exist as a tree instead of a flat list. Nested browsing contexts should provide a reference to their parent so the client knows what the tree looks like.

*Get Browsing Contexts Command*

Returns the tree of browser contexts for a given target:
```json
{
    "jsonrpc": "2.0", "id": 0, "method": "getBrowsingContexts", "params": {
        "targetId": "<ID>"
    }
}
```

*Response*
```json
{
    "jsonrpc": "2.0", "id": 0, "result": {
        "browsingContexts": [
            { "browsingContextId": "<ID #0>" },
            { "browsingContextId": "<ID #1>", "parentBrowsingContextId": "<ID #0>" },
            { "browsingContextId": "<ID #2>", "parentBrowsingContextId": "<ID #1>" },
            { "browsingContextId": "<ID #3>", "parentBrowsingContextId": "<ID #0>" }
        ]
    }
}
```

*Notifications*

Updates are sent to the client whenever a browsing context is added or removed from the tree. Attach notifications include the parent browsing context's ID so the client has a complete picture of the tree. In this example, browsing context #4, is being added as a child of browsing context #1. Then later, browsing context #3 is being removed from the tree.

```json
{
    "jsonrpc": "2.0", "method": "browsingContextAttached", "result": {
        "parentBrowsingContextId": "<ID #1>",
        "browsingContextId": "<#ID #4>"
    }
}
```

```json
{
    "jsonrpc": "2.0", "method": "browsingContextDetached", "result": {
        "browsingContextId": "<#ID #3>"
    }
}
```

Once the client has a browsing context's ID, it can send additional commands to get further info about that browsing context such as its title or current URL. These commands can also offer a similar ability to register for updates (e.g. if the client wants to know when a frame's title changes or a navigation occurs).

### Discovering script contexts

Unlike browsing contexts which have parent-child relationships to each other, and form a tree; there is no inherent relationship between two given script contexts, so these are represented as a flat list. Script contexts that happen to be associated with a browsing context (document scripts) should have a reference back to their browsing context though.

*Get Script Contexts Command*

```json
{
    "jsonrpc": "2.0", "id": 0, "method": "getScriptContexts", "params": {
        "targetId": "<ID>"
    }
}
```

```json
{
    "jsonrpc": "2.0", "id": 0, "result": {
        "scriptContexts": [
            { "scriptContextId": "<ID #1>", "type": "page", "browsingContextId": "<ID>" },
            { "scriptContextId": "<ID #2>", "type": "page", "browsingContextId": "<ID>" },
            { "scriptContextId": "<ID #1>", "type": "worker", "browsingContextId": "<ID>" }
        ]
    }
}
```

As with browsing contexts, there should be similar "scriptContextCreated" and "scriptContextClosed" events to let the client know if the list of script contexts changes.

## Examples

Below is some sample code using a hypothetical library built on bidi WebDriver that provides async/await wrappers for the raw JSON-RPC messages.

### Example: User Prompts

User prompts are an interesting example since they are a pre-existing WebDriver features that could benefit from bidirectional messaging.

```javascript
// Enable the alertOpened event and add a listener.
driver.on("alertOpened", params => {
    // Get alert message from event params and handle the alert.
    assert(params.message === "Please enter your name");
    await driver.sendAlertText("Joe");
    await driver.acceptAlert();
});
```

With traditional WebDriver, the client finds out about user prompts through polling. There is a limited ability to handle prompts proactively by using the unhandled prompt behavior capability. With an "alertOpened" event in the new protocol, the client can find out about a prompt right away, and handle it. This is more powerful than the unhandled prompt behavior capability, because the client can run arbitrary logic to decide how the prompt should be handled, including sending alert text.

### Example: New Windows

Using the targetCreated event, the client can find out about a new window without the need for polling. This example shows our hypothetical library using a Promise to await a one-time event.

```javascript
const element = await driver.findElement({
    browsingContext: "<ID>", using: "css selector", value: "#openWindow"
});

// Starts listening for the targetCreated event and returns a Promise that resolves once the event is fired.
const promise = driver.onceTargetCreated();

// Click the button to open a new window.
await element.click();

// Await the promise which will return the newly created window target.
const target = await promise;

// Send a command to the new target.
const browsingContexts = await driver.getBrowsingContexts({ target: target.id });
```

## Bidirectional WebDriver API Reference

openrpc.json contains an OpenRPC specification with an initial set of proposed commands and notifications.

## Open Issues

### Using element references in script

The execute script command in the current proposal takes a script context ID and not a browsing context ID. But, if the client wants to pass in an element reference, they would need to pass in a browsing context ID as well so the server knows which context the element belongs to. As a fix, the execute script command could just get the browsing context that matches the script context and try to find the element there. 

Or, disallow web element references in script commands. Instead, add a new WebDriver concept of "remote JS objects", and use these to represent elements when calling execute script. We would need additional commands to convert between web element references and remote JS object references. Similar to how DOM nodes in the Chrome devtools protocol have both DOM node IDs and remote object IDs.

## References

1. [WebDriver](https://w3c.github.io/webdriver/)
2. [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
3. [OpenRPC Specification](https://spec.open-rpc.org/)
4. [Browser Tools- and Testing WG, Day 1, TPAC 2019, Fukuoka](https://www.w3.org/2019/09/19-webdriver-minutes.html)
5. [Browser Tools- and Testing WG, Day 2, TPAC 2019, Fukuoka](https://www.w3.org/2019/09/20-webdriver-minutes.html)