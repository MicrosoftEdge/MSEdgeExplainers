
# WebSocket Custom Request Headers

This document proposes adding a WebSocket constructor that can take custom headers for the opening WebSocket connection and additionally a WebSocket specific CORS preflight when cross-origin.

## Authors:

- [David Risney](https://github.com/david-risney) (Microsoft)

## Participate

- [Open an issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?template=websocket-custom-request-headers.md)

## Table of contents

<!-- START doctoc -->

- [Introduction](#introduction)
- [User-facing problem](#user-facing-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [User research](#user-research)
- [Proposed approach](#proposed-approach)
- [Alternatives considered](#alternatives-considered)
- [Accessibility, internationalization, privacy, and security](#accessibility-internationalization-privacy-and-security)
- [Open questions](#open-questions)
- [References and acknowledgements](#references-and-acknowledgements)
- [Appendix](#appendix)

<!-- END doctoc -->

## Introduction

A WebSocket connection begins with an HTTP opening handshake. Although that handshake can include ordinary HTTP request headers, the browser WebSocket API lets script provide only a URL and optional subprotocol names.

This proposal lets applications add non-forbidden request headers to the opening handshake. Additionally, for cross-origin connections, the browser performs a CORS preflight with an explicit WebSocket opt-in before sending non-allowlisted headers.

The motivating use case is for authenticating WebSocket connections using application supplied OAuth bearer tokens, such as the ones used by some AI chat web interfaces.

## User-facing problem

WebSocket authentication workarounds can expose credentials, slow connections, and delay useful failures. Putting credentials in a URL makes them more likely to be saved in server logs or monitoring systems. Requesting a separate short-lived token adds latency to initial connections and reconnections. Authenticating only after the WebSocket opens makes users wait longer to learn that their credentials were rejected. It also requires using authentication libraries in ways that are different from typical HTTP requests.

Today a caller might try to embed an OAuth token in the URL:

```javascript
const socket = new WebSocket(
  `wss://chat.example/connect?access_token=\${encodeURIComponent(token)}`);
```

URLs are commonly recorded by servers, proxies, and monitoring systems, so this workaround can expose the credential outside the authentication system.

With the proposal a caller could do the following:

```javascript
const socket = new WebSocket("wss://chat.example/connect", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

And instead use the authorization header in their opening HTTP request.

### Custom handshake request headers

A WebSocket connection begins with an HTTP opening handshake, before it can exchange WebSocket messages. The server can accept that HTTP request and create the two-way WebSocket connection, or reject it. This is a useful point to authenticate because the server can use the same identity and security systems that protect its usual HTTP endpoints rather than creating additional authentication mechanisms specifically for WebSocket connections.

In [RFC 6455 The WebSocket Protocol (page 19, bullet 12)](https://www.rfc-editor.org/rfc/rfc6455.html#section-4:~:text=The%20request%20MAY%20include%20any%20other%20header%20fields%2C%20for%20example%2C) it permits additional header fields, including authentication-related fields, in the opening handshake and allows a server to use authentication mechanisms available to an HTTP server.

Several widely used non-browser WebSocket clients let applications configure request headers. For example, .NET provides [ClientWebSocketOptions.SetRequestHeader](https://learn.microsoft.com/en-us/dotnet/api/system.net.websockets.clientwebsocketoptions.setrequestheader), and Python's websockets library accepts [additional_headers](https://websockets.readthedocs.io/en/stable/reference/asyncio/client.html#websockets.asyncio.client.connect).

The browser WebSocket API does not expose that capability to script. The [current WebSocket interface](https://websockets.spec.whatwg.org/#interface-definition) exposes only a URL and optional subprotocol names on the WebSocket constructor, for example:

```javascript
const socket = new WebSocket(url, ["chat.v1"]);
```

HTTP uses the [Authorization request header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization) to carry credentials for an authentication scheme. For example, in the motivating use case an OAuth bearer token:

```http
Authorization: Bearer eyJ...
```

With the current WebSocket constructor there is no way to configure the Authorization header or any other custom request headers for the opening handshake.

### Cross-origin custom headers

Allowing browser script to add Authorization or other application-selected headers without a permission check (CORS preflight) would provide websites with new capabilities to send cross origin requests.

Today, a cross-origin WebSocket server can rely on an important browser constraint: page script cannot attach an Authorization header or arbitrary application headers to its opening handshake. Although this is allowed by the WebSocket standard, services deployed and tested only for use with WebSocket via the browser may by relying on this browser constraint. Additionally, the HTTP/1.1 WebSocket opening handshake looks like a normal GET request to a server that is unaware of WebSocket, so the ability to add custom headers to the WebSocket opening handshake would become a send-only CORS bypass.

If browsers removed the constraint unconditionally, a malicious page could send requests to those services. The browser therefore needs to ask the destination first, without sending the credential. Only a destination that recognizes the new capability and explicitly permits the requesting origin, the WebSocket operation, and the requested header names should be sent the credential-bearing handshake.

Accordingly, this proposal requires a preflight for cross-origin headers outside CORS's small safelist of simple request fields. The extra request is not intended to authenticate the user. It protects existing servers from receiving a class of browser-generated request that they could not previously receive.

### Current workarounds

Browser applications use several workarounds today:

- Putting a token in the URL, which logs and monitoring systems commonly record.
- Sending authentication data after the WebSocket opens, which delays the authorization decision.
- Requesting a separate short-lived token before connecting, which adds a network request and more server-side state or cryptography.
- Encoding credentials as a subprotocol, which mixes authentication with protocol negotiation.
- Relying on cookies, which does not fit every cross-site or token-based deployment.

Some of these workarounds can be appropriate in a particular service, while current OAuth guidance rules out bearer tokens in URL query parameters. None provides a general way to send an application-selected request header during the opening handshake. The alternatives section describes their tradeoffs in detail.

## Goals

The proposal should:

- Let servers reuse ordinary HTTP authentication infrastructure.
- Let a browser application send an Authorization header during the WebSocket opening handshake.
- Support other safe application headers when doing so does not expand script's authority over browser-owned protocol fields.
- Work consistently with WebSockets over HTTP/1.1, HTTP/2, and HTTP/3.
- Keep existing WebSocket constructor calls working.
- Require explicit destination consent before sending a cross-origin handshake with application-controlled headers outside CORS's safelist.
- Define useful preflight caching and avoid unnecessary additional connections where possible.
- Fail before sending the credential when the destination has not opted in.

## Non-goals

This proposal does NOT aim to:

- Give script control of browser-owned fields such as Host, Origin, Connection, Upgrade, and so on.
- Make arbitrary cross-origin requests without destination consent.
- Replace WebSocket subprotocol negotiation.
- Expose all successful or failed opening-handshake response details.
- Redesign other aspects of WebSocket.
- Require existing applications or servers to adopt the new capability.

## User research

No formal user study has been completed for this draft.

### Long-running developer demand

[WHATWG WebSockets issue \#16](https://github.com/whatwg/websockets/issues/16) has tracked requests for custom opening-handshake headers since 2017. The discussion includes authentication, API gateways, standardized subprotocols, Kubernetes, reverse proxies, and large real-time services.

A maintainer of a large Microsoft 365 WebSocket service described the operational tradeoffs publicly in [a June 2026 comment](https://github.com/whatwg/websockets/issues/16#issuecomment-4846373821). The service authenticates after opening the WebSocket today, but considers that path more complex, more expensive when denying users, and inconsistent with native clients. The same comment identifies pre-connection ticket allocation and query-string credentials as unsatisfactory alternatives.

This evidence comes from deployed systems and public implementation discussions rather than formal user research.

### Non-browser runtime precedent

Server-side and native environments commonly expose opening-handshake headers. Recent JavaScript runtime examples include:

- [Deno WebSocket headers](https://deno.com/blog/v2.5#websocket-headers);
- [Bun WebSocket options](https://bun.com/blog/bun-v1.3#websocket-improvements); and
- Node-compatible WebSocket libraries that accept an options object.

These APIs demonstrate demand and a familiar authoring shape. They are not a sufficient browser security model because trusted server-side code does not face the same cross-origin request-forgery constraints as untrusted web content.

## Proposed approach

### WebSocket constructor

Extend the existing constructor's second argument to accept an options dictionary, for example:

```javascript
const socket = new WebSocket("wss://realtime.example/connect", {
  protocols: ["chat.v1"],
  headers: {
    Authorization: makeAuthorizationValue(accessToken),
  },
});
```

Existing calls remain valid:

```javascript
new WebSocket(url);
new WebSocket(url, "chat.v1");
new WebSocket(url, ["chat.v1", "chat.v2"]);
```

The browser converts headers using rules compatible with the existing HeadersInit that we are reusing (see [Fetch Standard 5.1 Headers class](https://fetch.spec.whatwg.org/#typedefdef-headersinit)). It silently removes headers with names or values that are disallowed according to the ["request" headers guard](https://fetch.spec.whatwg.org/#headers-guard) in the same way as the Request constructor does. This means that forbidden headers are disallowed.

Note that this API shape is provisional. It depends on resolving the compatibility issue tracked in [pull request \#76 - Add WebSocketInit dictionary as option for second param in constructor](https://github.com/whatwg/websockets/pull/76). If this proposal is not accepted, then we can amend this document to propose a constructor with a third optional headers parameter. For example:

```javascript
const socket = new WebSocket(
  "wss://realtime.example/connect",
  ["chat.v1"],
  { Authorization: makeAuthorizationValue(accessToken) }
});
```

### Header restrictions

The Fetch Standard's [forbidden request-header](https://fetch.spec.whatwg.org/#forbidden-request-header) rules apply as described above regarding the request headers guard. If a forbidden request header or value is supplied in the headers parameter, it is silently removed by the browser during WebSocket object construction.

Additionally the [CORS Safelisted request headers rules](https://fetch.spec.whatwg.org/#cors-safelisted-request-header) apply. If the request is cross-origin and the caller has provided request headers outside of the CORS-safelisted request-headers then we must use a CORS preflight check.

### Cross-origin permission check

Before sending the credential-bearing opening handshake, the browser performs a WebSocket-specific CORS preflight.

The preflight request identifies:

- The requesting origin.
- That the requested operation is a WebSocket opening handshake.
- The application-controlled header names.
- Whether browser-managed credentials such as cookies can accompany the request.

The destination must explicitly allow:

- The requesting origin.
- The requested header names.
- The WebSocket handshake.

In order to ensure servers are explicitly allowing WebSocket and giving them the ability to apply different rules for WebSocket requests, the proposal introduces dedicated preflight headers as follows.

Request:

```http
Access-Control-Request-Protocol: websocket
```

and response:

```http
Access-Control-Allow-Protocols: websocket
```

The `Access-Control-Request-Method` header will be set to GET regardless of the underlying HTTP version used for the WebSocket handshake.

Otherwise, the normal CORS rules are applied.

Note, for `Authorization`, the response must name the field explicitly rather than rely on `Access-Control-Allow-Headers: *`. Fetch already specifies that the wildcard does not cover `Authorization`, but [issue \#1919](https://github.com/whatwg/fetch/issues/1919) records that major browsers do not enforce that rule interoperably today. This proposal should not inherit the accidental wildcard behavior.

For CORS preflight caching we need to ensure that WebSocket CORS requests and responses are properly separated from ordinary HTTP CORS requests and responses.

### Server behavior

A server that wants to receive an application-controlled Authorization header:

1.  Recognizes the WebSocket-specific preflight.
2.  Validates the requesting origin.
3.  Explicitly lists Authorization and any other application header names it allows, rather than relying on a wildcard.
4.  Returns explicit permission.
5.  Authenticates the subsequent opening handshake through its ordinary HTTP path.

An unchanged server does not return the new opt-in. The browser therefore does not send the credential-bearing handshake.

### Preflight caching and connection reuse

The Fetch changes should reuse the existing CORS-preflight cache rather than define a parallel WebSocket cache. The CORS preflight cache key must additionally include the WebSocket-specific permission to ensure that permissions for WebSocket connections and non-WebSocket connections are not mixed.

Implementations should reuse the preflight's network connection for the opening handshake when the HTTP version, proxy, connection coalescing rules, and security policy allow it. Reuse cannot be guaranteed in every deployment, but the design should not unnecessarily require a second connection.

For example, if the following script creates a cross-origin WebSocket like in the following then the browser would send a WebSocket specific CORS preflight request:

```javascript
const socket = new WebSocket("wss://realtime.example/connect", {
  protocols: ["chat.v1"],
  headers: {
    Authorization: makeAuthorizationValue(accessToken),
  },
});
```

WebSocket specific CORS preflight request. Note that it has the Access-Control-Request-Protocol: websocket header to note that this is a WebSocket specific CORS preflight and no Access-Control-Request-Method header, but otherwise is a normal CORS preflight request.


```http
OPTIONS /connect HTTP/1.1
Host: chat.example
Origin: https://app.example
Access-Control-Request-Protocol: websocket
Access-Control-Request-Headers: authorization
```

The server may allow the CORS preflight request with the following. Note that it is a normal CORS preflight except for the Access-Control-Allow-Protocols: websocket header to indicate this is WebSocket specific.

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example
Access-Control-Allow-Protocols: websocket
Access-Control-Allow-Headers: authorization
```

And then finally send the normal WebSocket opening handshake request but with the authorization header:

```http
GET /connect HTTP/1.1
Host: chat.example
Origin: https://app.example
Authorization: Bearer \<token\>
Upgrade: websocket
Connection: Upgrade
...
```

Note that the WebSocket subprotocol is not involved in the CORS preflight. The subprotocol is negotiated during the opening handshake and is not relevant to the CORS preflight.

### HTTP versions

The permission grants a WebSocket opening operation, not a literal GET or CONNECT chosen before connection establishment.

This lets the browser perform a preflight over one HTTP version and later establish the WebSocket over another without ambiguous method permission. The eventual Fetch and WebSockets specification text must define this precisely.

### Failure behavior

If validation fails, or the destination does not grant permission, the constructor or connection fails using the WebSocket API's existing error model. The application-controlled credential is not sent without the required consent.

This proposal does not expose the HTTP status or response headers from a failed opening handshake. [WHATWG WebSockets issue \#77](https://github.com/whatwg/websockets/issues/77) now tracks that related capability, including proxy throttling, authentication challenges, and explicit server exposure. It should proceed as a parallel proposal with its own cross-origin information-exposure analysis rather than being implied by permission to send request headers.

The page-facing failure remains intentionally limited, but implementations should provide developer-only diagnostics that distinguish at least:

- Local header validation failure.
- WebSocket preflight denial or missing opt-in.
- Network failure.
- Rejection of the subsequent opening handshake.

Those diagnostics must not expose credentials or cross-origin response details that the page is not permitted to observe. Server operators should likewise be able to identify and safely log the preflight decision without logging the credential value.

Servers may disallow the CORS preflight in the usual ways. It can return a 4xx status, for example:

```http
HTTP/1.1 403 Forbidden
Content-Length: 0
```

Or reply with a response that excludes the authorization header, for example:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example
Access-Control-Allow-Protocols: websocket
```

A server unaware of WebSocket specific CORS preflight may reply with a normal CORS preflight response but without the new and unrecognized `Access-Control-Request-Protocol` header. The browser would consider this a rejection.

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example
Access-Control-Allow-Headers: authorization
```

All of the above CORS preflight failures are exposed to the caller via the existing WebSocket error event with no new way to distinguish a CORS preflight failure from other opening handshake network failure.

### Feature detection

For callers that must write script that supports both browsers without this feature and with this feature we need a mechanism to detect the feature support.

If we provide no explicit mechanism, the caller could detect feature support with an accessor property on the options object (or for the third parameter) to see if the browser attempts to read the headers property. For example:

```javascript
function supportsWebSocketRequestHeaders() {
   let supported = false;
   const probeException = {};
  
   try {
      new WebSocket("data:,", {
         get headers() {
            supported = true;
            throw probeException;
         },
      });
   } catch { }
  
   return supported;
}
```

However, this is not intuitive and requires the browser implementation to not fail early before reading the headers.

We can add an explicit mechanism to determine support with a static supports method. For example:

```javascript
   if (WebSocket.supports?.("request-headers")) {
      // Use new custom headers
   } else {
      // Use legacy flow
   }
```

### Dependencies on non-stable features

The proposal depends on two pieces that do not yet have standards consensus:

- The WebSocketInit constructor extension point.
- A WebSocket-specific Fetch/CORS preflight.

Implementations should not ship without the header capability.

## Alternatives considered

### Send authentication data in the first WebSocket message

The server can open the WebSocket before checking the application's authentication data, then require the client to authenticate in its first message. A simplified client might do this:

```javascript
const socket = new WebSocket("wss://realtime.example/connect");
socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "authenticate", token }));
});
```

#### Advantages

- Works in browsers today.
- Keeps bearer tokens out of URLs.
- Requires no browser or standards change.

#### Disadvantages

- The server must accept the connection and use memory and connection capacity before it knows whether the client is allowed to connect.
- The opening request does not contain the application-supplied token, so a reverse proxy, API gateway, or standard HTTP authentication component cannot validate it or reject the request using the service's normal HTTP authentication rules.
- If native clients send an Authorization header during the handshake, the service must support one authentication flow for those clients and another for browser clients.
- The service must define additional WebSocket messages and rules: how quickly the client must authenticate, what it may do before authentication, how an invalid or expired token is reported, and whether the client may try again.
- A proxy, load balancer, or gateway can reject the opening handshake before the WebSocket opens. In that case, the client never gets an opportunity to send its authentication message.

#### Current assessment

This remains a viable workaround, but it does not meet the goal of authenticating the HTTP opening handshake or unifying browser and native clients.

### Request a short-lived token before connecting

The application can make an authenticated HTTPS request that returns a short-lived, single-use token for the WebSocket connection:

1.  Request the token over HTTPS.
2.  Store it on the server or protect it with a cryptographic signature.
3.  Put it in the WebSocket URL.
4.  Validate and consume it during the opening handshake.

#### Advantages

- Works in browsers today.
- Can keep the primary access token in an HTTP Authorization header.
- Can limit the new token to one connection and a short lifetime.

#### Disadvantages

- Adds a round trip to connection and reconnection.
- Requires shared server state or a carefully reviewed cryptographic format.
- Requires rules for expiration, reuse, cleanup, and failures.
- Usually still carries the short-lived token in the WebSocket URL.
- Can add significant cost when many clients reconnect at once.

#### Current assessment

This can be appropriate for individual services, but the platform should not require every service to build an allocation protocol to use standard HTTP authentication.

### Put the bearer token in the URL

```javascript
const socket = new WebSocket(
    `wss://realtime.example/connect?access_token=${encodeURIComponent(token)}`
);
```

#### Advantages

- Simple.
- Widely deployed.
- Requires no browser change.

#### Disadvantages

- Reverse proxies, gateways, server access logs, diagnostics, traces, and monitoring systems commonly record URLs.
- TLS protects the URL while it travels over the network, but does not stop endpoints and approved intermediaries from observing or logging it.
- Conflicts with current OAuth security guidance.
- Requires every system that records a URL to redact the credential correctly.

OAuth 2 security guidance specifically addresses this risk. [RFC 6750 section 2.3](https://www.rfc-editor.org/rfc/rfc6750.html#section-2.3) warns against URI query parameters because URLs containing access tokens are likely to be logged. [RFC 9700 section 4.3.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.3.2) strengthens this guidance: clients must not pass access tokens in a URI query parameter in the manner described by RFC 6750.

#### Reason for rejection

Bearer credentials should have a standard, recognizable transport with established handling and redaction practices. URL query parameters are not an acceptable long-term default.

### Encode credentials in Sec-WebSocket-Protocol

The optional second constructor argument controls Sec-WebSocket-Protocol. Some applications encode credentials in a subprotocol value because it is one of the few opening-handshake values that the constructor exposes to script.

#### Advantages

- Influences the opening handshake without a new browser API.
- Works in some existing deployments.

#### Disadvantages

- Confuses authentication with protocol negotiation.
- Can conflict with real subprotocol identifiers and server selection.
- May expose credentials to systems that log negotiated protocols.
- Is likely to surprise infrastructure that treats the value as a protocol name.
- Does not provide a general header permission model.

#### Reason for rejection

The subprotocol parameter should continue to name application protocols. It should not become a credential transport.

### Create a new Fetch- or Streams-based WebSocket API

#### Advantages

- Could represent request options, cancellation, backpressure, a successful connection, and failed HTTP responses in one modern API.
- Could provide a cleaner long-term model than adding capabilities to the event-based WebSocket interface.

#### Disadvantages

- Requires a much larger API and lifecycle design.
- Many RequestInit combinations do not have defined WebSocket meaning.
- Requires applications and libraries to migrate to a new connection abstraction.
- Delays the narrower authentication use case.

#### Current assessment

This remains a possible longer-term direction, especially for failed-response visibility and stream integration. It should not block a compatible extension to the existing API.

### Use WebTransport instead

#### Advantages

- Provides newer transport capabilities and controlled connection headers.
- May be a better fit for applications that need multiplexing, datagrams, or independent streams.

#### Disadvantages

- Is not a drop-in replacement for WebSocket.
- Requires different server, protocol, deployment, and application support.
- Forces applications that need only WebSocket semantics to adopt unrelated complexity.

#### Reason for rejection

WebTransport should be chosen for its transport properties, not as a workaround for a missing WebSocket authentication capability.

## Accessibility, internationalization, privacy, and security

### Accessibility

The proposal changes network connection setup and has no direct user-interface semantics.

### Internationalization

The proposal adds no user-facing text or locale-sensitive processing. Header names remain ASCII as defined by HTTP. Applications remain responsible for localizing any authentication or connection error shown to users.

### Privacy

Moving bearer tokens out of URLs reduces accidental disclosure through URL logging, tracing, diagnostics, and telemetry. See Alternatives Considered section for more information.

### Security

The primary security invariant is a browser must not send an application-controlled header outside CORS's safelist in a cross-origin WebSocket opening handshake unless the destination explicitly permits the requesting origin, the WebSocket operation, and the header name.

Additional requirements include:

- Apply Fetch's forbidden request-header rules.
- Do not let script replace browser-generated WebSocket security fields.

The proposal intentionally requires server changes. A server that has not evaluated this capability should continue to deny it by default.

## Open questions

1.  What are the exact preflight request and response fields and structured values?

    1.  Should we have a dedicated WebSocket CORS preflight header (eg Access-Control-Request-WebSocket) or a more generic WebSocket CORS preflight header (eg Access-Control-Request-Protocol)?
    2.  Should the Access-Control-Request-Method be excluded from WebSocket CORS preflight header? The method varies between HTTP/1.1 and HTTP2/3 and is irrelevant to the WebSocket CORS preflight.

2.  How should the CORS preflight cache be modified to account for WebSocket-specific headers?
3.  Should we have an explicit feature detection mechanism (eg a static WebSocket.supports method) or rely on getter-style probing?
4.  Should we add a third headers parameter to the WebSocket ctor, or require also changing the WebSocket ctor to take an options object? This proposal is currently mostly agnostic and describes how to modify either form of constructor.

## References and acknowledgements

### Design discussions and prior art

- [WHATWG WebSockets issue \#16: Support for custom headers for handshake](https://github.com/whatwg/websockets/issues/16)
- [WHATWG WebSockets issue \#42: Constructor options dictionary](https://github.com/whatwg/websockets/issues/42)

### Specifications

- [Fetch CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
- [Fetch forbidden request headers](https://fetch.spec.whatwg.org/#forbidden-request-header)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html)
- [WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/)

## Appendix

The browser WebSocket API does not expose the ability to set headers from script. The [current WebSocket interface](https://websockets.spec.whatwg.org/#interface-definition) exposes only a URL and optional subprotocol names on the WebSocket constructor:

```webidl
constructor(USVString url,
   optional (DOMString or sequence<DOMString>) protocols = []);
```

The proposed WebSocket constructor would be extend the existing constructor's second argument to accept an options dictionary:

```webidl
dictionary WebSocketInit {
   sequence<DOMString> protocols = [];
   HeadersInit headers;
};

[Exposed=(Window,Worker)]
interface WebSocket : EventTarget {
   constructor(
      USVString url,
      optional (DOMString or sequence<DOMString> or WebSocketInit)
      protocolsOrOptions = []
   );

   static boolean supports(DOMString feature);
};
```

Or if we don’t have an options parameter then a third parameter for custom headers like in the following

Note that this API shape is provisional. It depends on resolving the compatibility issue tracked in [pull request \#76 - Add WebSocketInit dictionary as option for second param in constructor](https://github.com/whatwg/websockets/pull/76). If this proposal is not accepted, then we can amend this document to propose a constructor with a third optional headers parameter. For example:

```webidl
[Exposed=(Window,Worker)]
interface WebSocket : EventTarget {
   constructor(
      USVString url,
      optional (DOMString or sequence<DOMString>) protocols,
      optional HeadersInit headers
   );

   static boolean supports(DOMString feature);
};
```