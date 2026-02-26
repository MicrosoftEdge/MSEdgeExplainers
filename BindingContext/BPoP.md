# Demonstrating Proof-of-Possession in the Browser Application (for authentication cookies) (BPoP)

## Authors:

- [Will Bartlett](mailto:wibartle@microsoft.com)
- [Sameera Gajjarapu](mailto:sameera.gajjarapu@microsoft.com)

## Participate (Coming soon)
- [Issue tracker]
- [Discussion forum]

## Table of Contents [if the explainer is longer than one printed page]

[You can generate a Table of Contents for markdown documents using a tool like [doctoc](https://github.com`/thlorenz/doctoc).]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

- [Demonstrating Proof-of-Possession in the Browser Application (for authentication cookies) (BPoP)](#demonstrating-proof-of-possession-in-the-browser-application-for-authentication-cookies-bpop)
  - [Authors:](#authors)
  - [Participate (Coming soon)](#participate-coming-soon)
  - [Table of Contents \[if the explainer is longer than one printed page\]](#table-of-contents-if-the-explainer-is-longer-than-one-printed-page)
  - [Introduction](#introduction)
  - [Goals \[or Motivating Use Cases, or Scenarios\]](#goals-or-motivating-use-cases-or-scenarios)
  - [Non-goals](#non-goals)
  - [BPoP functionality](#bpop-functionality)
    - [Usecases](#usecases)
    - [CNAMEs](#cnames)
    - [Design proposal](#design-proposal)
    - [Server activation](#server-activation)
      - [Header based model:](#header-based-model)
      - [JS API based model:](#js-api-based-model)
    - [Browser BPoP proofs](#browser-bpop-proofs)
  - [Detailed design](#detailed-design)
    - [Storage model](#storage-model)
    - [Retrieval model](#retrieval-model)
    - [Application model](#application-model)
      - [BPoP key verification](#bpop-key-verification)
      - [BPoP background refresh](#bpop-background-refresh)
    - [Server challenge](#server-challenge)
    - [Server update](#server-update)
  - [Considered alternatives](#considered-alternatives)
    - [TLS Token Binding](#tls-token-binding)
  - [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
  - [References \& acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

The primary use case for BPoP is binding an authentication cookie. Cookies remain among the most common mechanism web servers use to store authentication state about a user. Malicious actors steal such authentication cookies and compromise user data. 

The motivation for BPoP closely follows the motivations for [IETF DPoP](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-dpop), i.e. "to prevent unauthorized or illegitimate parties from using leaked or stolen access tokens, by binding a token to a public key upon issuance and requiring that the client proves possession of the corresponding private key when using the token [...]" except that, rather than binding an access token (issued by an identity provider), BPoP binds a browser artifact (such as a cookie) issued by a website.

This document makes direct analogs to DPoP, e.g. defining a "BPoP Proof" to match DPoP's "DPoP Proof".

## Goals [or Motivating Use Cases, or Scenarios]

- BPoP introduces a mechanism to bind authentication cookies to the user device and hence render the stolen artifacts useless.
- BPoP aims at securing sub-domains and enables the organization to control the binding boundaries among the sub-domains supported, 

## Non-goals

- BPoP cannot prevent temporary access to the app generated cookies before they are bound. 
- BPoP also tries to minimize the round trips needed to secure cookies, however can introduce latency/extra time to function.

## BPoP functionality

### Usecases

A website that is its own standalone identity provider (i.e. a website that accepts a username and password) could activate BPoP as part of rending the login form. Then, on the subsequent request, when the website verifies the username and password and issues an authentication cookie, the website could also verify the BPoP proof and record the public key associated with the BPoP proof in the authentication cookie. If this website had user submitted content and such content was subsequently used as part of a stored cross site scripting (XSS) attack, this attack would be unable to steal the BPoP private key and thus the attacker would be unable to use any stolen cookies.

BPoP also helps in mitigating the man-in-the-middle attacks where an attacker incercepting the traffic and stealing any artifacts will not be able to apply them without the extra proof we require with this protocol. Same with the on-device attacks which can result in the cookie-jar being stolen, will not be able to use those cookies for acquiring access to other resources.

A website that uses a federated identity provider could activate BPoP as part of redirecting to the federated identity provider. Then, on the response back from the federated identity provider, when the website verifies the federation response and issues an authentication cookie, the website could also verify the BPoP proof and record the public key associated with the BPoP proof in the authentication cookie. If this website were vulnerable to a reflected XSS which stole the authentication cookie, the attacker would be unable to use that stolen cookie, as the attacker would be unable to produce a BPoP proof.


BPoP is also not strictly limited to cookies - it can be used to bind any artifact which is issued and accepted by the same web server (e.g. an ASP.NET ViewState).

### CNAMEs

One prominent place where authentication cookies may be shared with multiple parties is authentication cookies set in a top-level domain (example.com) but shared among sub-domains operated as distinct services. For example, an organization named Example might have distinct sub-domains `support.example.com`, `store.example.com`, and `www.example.com`, each operated as a separate service, but capable of reading a shared authentication cookie in `example.com`. By binding cookies to a public private key pair, signing over the specific origin used in the request, and limiting the authentication cookies so they can only be used with such a signature, BPoP prevents a compromised subdomain like `support.example.com` from being leveraged to attack another subdomain like `store.example.com`.

While it is possible for `example.com` to properly audience constrain cookies today (e.g. by issuing one cookie for each subdomain, rather than one cookie in the top-level domain), doing so in practice has proven to be prohibitively cumbersome for many deployments.

### Design proposal

Here is how BPoP is expected to work end-to-end:

1. Webpage user goes to `example.com`, and initiates login. `example.com` redirects to `login.microsoftonline.com`, using javascript or http headers to activate binding for `example.com` cookies.
2. `login.microsoftonline.com`, shows password prompt, javascript or http header activates binding for the cookie.
3. After the user enters the password,  SHR in http request, response contains bound eSTS cookie, redirect to example.com with auth code
4. `example.com` SHR in http request, response from `example.com` contains bound `example.com` cookie

### Server activation

BPoP is designed to be linked to a classic OAuth session (can be any other authentication mechanism), and when a user makes a request to authenticate, the server also returns a response header `BPoP` to active binding. `BPoP` is a [structured header](https://www.rfc-editor.org/rfc/rfc8941.html) whose value is a dictionary. The following keys are recognized:

- `enabled` is a mandatory boolean
- `subdomains` is an optional boolean whose value is `false` if omitted.
- `SameSite` is an optional token whose value is either `None`, `Lax`, or `Strict` and whose default is `Lax` if omitted.
- `algs` is a optional string list indicating algorithms supported by the website for BPoP proofs, per [RFC7518](https://datatracker.ietf.org/doc/html/rfc7518). MUST NOT include none or any identifier for a symmetric algorithm (MAC). By default, it is the list `["RS256", "ES256"]`
- `refresh-in` is an optional number whose value indicates the number of seconds after which the browser should refresh the BPoP proof. The value MUST be an integer greater than 0.
- `expires-in` is an optional number whose value indicates the number of seconds after which the browser should stop using the BPoP proof. The default is 300 seconds (minimum nonce validity). The value MUST be an integer greater than 0.

A web server may also optionally return a `BPoP-Nonce` header, containing a nonce value to be included in BPoP proofs sent to them. The nonce syntax in ABNF used by [RFC6749](https://www.rfc-editor.org/rfc/rfc6749.html) is `nonce = 1*NQCHAR`. 

#### Header based model: 

Thus a typical server might activate BPoP like:

```
BPoP: enabled
BPoP-Nonce: eyJ7S_zG.eyJH0-Z.HX4w-7v
```

Such a response header indicates to a browser client that it SHOULD generate a proof of possession key and attach a BPoP proof to future requests. If a browser client does not support any of the algorithms in `algs`, or for any other reason, the browser may skip BPoP. If the browser skips BPoP, the web server SHOULD continue to issue cookies without binding, unless forbidden by the web server's security policy.


#### JS API based model: 

We can also support similar functionality with a JS API (probably having them support in authentication libraries like MSAL) as follows:

```js

// helper function to navigate to STS 
getToken(..., cookieBindingPolicy?: boolean): ServerTokenResponse {
    ...
    let bPoP: boolean = false;
    if(cookieBindingPolicy){
        bPoP = true;
    }
    const loginUrl = generateLoginUrl(.., bPop);
    navigateToLoginUrl(Url);
}

// internal API to process the server response
processTokenResponse(serverResponseParams): AuthenticationResult {

    // process regular token response
    accessToken = ..

    ...
    // process bPop params
    const bPoPParams : {
        bPop: serverResponseParams.bPop,
        nonce?: serverResponseParams.bPopNonce ? serverResponseParams.bPop-nonce : undefined,
        subdomains: serverResponseParams.subdomains? serverResponseParams.subdomains : false,
        algs: serverResponseParams.algs,
        refreshIn: serverResponseParams.refreshIn? serverResponseParams.refreshIn : 300,
        expiresIn: serverResponseParams.expiresIn? serverResponseParams.expiresIn: 300
    };

    return generateAuthenticationResult(tokenParams, bPopParams);
}

/**
 * API to fetch tokens to a SPA
 */
acquireToken(request) {
    ...
    // tokenResponse
    const serverResponse: ServerResponseParams = getToken(.., cookieBindingPolicy: boolean = true);
    return processTokenResponse(serverResponse);
}

```

### Browser BPoP proofs

A BPoP proof is a signed [CWT](https://www.rfc-editor.org/rfc/rfc8392.html). A BPoP proof demonstrates to the server that the client holds the private key that was used to sign the BPoP proof CWT. This enables websites to bind issued browser storage artifacts (e.g cookies) to the corresponding public key and to verify the key binding of all artifacts they receive, which prevents said artifacts from being used by any entity that does not have access to the private key.

The COSE header of a BPoP CWT MUST contain at least the following parameters:

- `typ` with value `bpop+jwt`
- `alg` a digital signature algorithm identifier chosen from the list indicated by the server.
- `jwk` representing the public key chosen by the client, in JSON Web Key (JWK) format [RFC7517](https://datatracker.ietf.org/doc/html/rfc7517).

The payload of a BPoP CWT MUST contain at least the following claims:

- `iat` creation timestamp of the CWT
- `hth` with value equal to the host value of the http request.

Following a `BPoP-Nonce` header, the BPoP proof must also contain a claim `nonce` with value equal to that header.

The client sends a BPoP proof on future HTTP requests.

```
BPoP: eyJ0eXAiOiJicG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkV
   DIiwieCI6Imw4dEZyaHgtMzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCR
   nMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFqSG10NnY5VERWclUwQ2R2R1J
   EQSIsImNydiI6IlAtMjU2In19.eyJodGgiOiJzZXJ2ZXIuZXhhbXBsZS5jb20iLCJp
   YXQiOjE1NjIyNjI2MTZ9.2-GxA6T8lP4vfrg8v-FdWP0A0zdrj8igiMLvqRMUvwnQg
   4PtFLbdLXiOSsX0x7NVY-FNyJK70nfbV37xRZT3Lg
```

Note: This example can be a CWT instead of a JWT.

The client is expected to cache BPoP proofs and re-use them, until rejected by the server or until expies-in has been reached.


## Detailed design
This section explains the life cycle of a BPoP request-response and the refresh/discard mechanisms available for a user. All the below examples are Http based, it should be similarly supported using a fetch JS API.

### Storage model

The client maintains a list of origins that have activated BPoP and their associated configs (`subdomains`, `algs`, and `SameSite`). When BPoP is deactivated, e.g.:

```
BPoP: enabled=?0
```

The origin is removed from the list and the config is discarded.

If an origin that has previously configured BPoP, e.g.:

```
BPoP: enabled, subdomains
```

Reconfigures BPoP with a different configuration:

```
BPoP: enabled, SameSite=None
```

The latest configuration replaces the previous configuration. Replacement occurs for the entire config, not just for configuration elements who appear in the `BPoP` header.

Please note that this behavior applies only when there is no enterprise policy override. In case if enterprise policy enabled by the browser config, the BPoP behaves as configured by the policy. More details on key management and storage for enterprise use cases are covered later in this document.

### Retrieval model

The browser only attaches BPoP proofs to "secure" protocols (as defined by the user agent).

The browser maintains one public private key pair per sub entity to the effective top-level domain (eTLD+1). That is, if `a.example.com`, `b.example.com`, and `c.example.com` each activate BPoP, they share a single public private key pair.

The browser attaches BPoP proofs to a request if there exists a config that either:

- Has an exact match between the BPoP origin and the canonicalized host of the retrieval's URI and the `subdomains` flag is false
- Has a domain match between the BPoP origin and the canonicalized host of the retrieval's URI and the `subdomains` flag is true

The semantics of `SameSite` match the cookie attributes. That is, if the browser would not attach a cookie with SameSite=Lax to a request, and the server has initialized BPoP with SameSite=Lax, the browser should not attach a BPoP proof to the request.

TBD: Add how `browser-policy` is defined and how it will impact the key management.

### Application model

#### BPoP key verification

The application generated cookie bound by BPoP should not need to verify the asymmetric key everytime. Instead, the application should cache the `key-verification` status and should be able to request the key verification only when the cache is expired or invalidated. Cache validity can be equivalent to `BPoP-Nonce` validity.

The browser initiates BPoP proof of possession only if:

- BPoP nonce is expired or invalidated; set cache expiration time to `BPoP-Nonce` expiration time.

```
BPoP: enabled, expires-in=300
```

#### BPoP background refresh

The server response should also include a `refresh-in` parameter, that enables the app to refresh the nonce in a certain interval. This should help the APIs dependent on BPoP to proactively refresh the nonce in the background avoiding the need to refresh the nonce on demand.

```
BPoP: enabled, refresh-in=60
```

### Server challenge

A server may reject a BPoP proof because its nonce is missing or out of date:

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: BPoP error="use_bpop_nonce", error_description="Web server requires nonce in BPoP proof"
BPoP-Nonce: eyJ7S_zG.eyJH0-Z.HX4w-7v
```

In such a case, the browser should update the BPoP proof and retry the request immediately. Servers SHALL not ask for more than one retry this way.

Such retries are intended to be seen by the client as part of a single HTTP fetch. That is, update [Fetch section 4.3 HTTP Fetch](https://fetch.spec.whatwg.org/#http-fetch) with additional steps. If _response_ is a 401 status code, and the response includes a `WWW-Authentication` header indicating the `BPoP` scheme with `error` equal to `use_bpop_nonce` and the response includes a `BPoP-Nonce` header, store the nonce, regenerate the BPoP Proof, and set the _actualResponse_ to the result of running HTTP-network-or-cache fetch for the updated _fetchParams_.

### Server update

A server may also return a new BPoP nonce on any 200 response.

```
HTTP/1.1 200 Ok
BPoP-Nonce: eyJ7S_zG.eyJH0-Z.HX4w-7v
refresh-in: 300
expires-in: 300
```

The client SHOULD start using the new nonce on the next request.

## Considered alternatives

### TLS Token Binding

[RFC 8472](https://www.rfc-editor.org/rfc/rfc8472) defines a pattern for binding authentication tokens (including cookies) to a TLS channel. While browsers initially sent positive signals, Chromium eventually opted to [remove TLS token binding](https://groups.google.com/a/chromium.org/g/blink-dev/c/OkdLUyYmY1E/m/YJrsadYKDQAJ) in part due to the "engineering costs, maintenance costs, \[...\]". TLS token binding presented a number of challenges which are not present in this proposal:

- TLS token binding is not compatible with certain network stacks (e.g. HTTP3 0-RTT)
- TLS token binding is not compatible with common corporate network proxies which terminate and proxy connections to inspect traffic
- TLS token binding requires connections be kept open or resumable - not always practical over typical cookie lifetimes.
- TLS token binding deeply coupled TLS keys to authentication security, requiring integration between MDM providers and TLS stacks to satisfy enterprise management scenarios and requirements (like all keys being kept in hardware).

Instead:

- BPoP is agnostic to network stack, being an application-layer HTTP header.
- BPoP is passed through by corporate network proxies which break and inspect incoming traffic
- BPoP requires no underlying connections, functioning at the same "site data" storage layer as cookies.
- BPoP leaves the TLS layer alone. Instead, MDM providers only need to implement a narrow interface (generating a BPoP proof from their registered keys)


## Stakeholder Feedback / Opposition

We have been collaborating with Google (who published a similar proposal) called DBSC [here](https://raw.githubusercontent.com/kmonsen/dbsc/main/README.md). Some of the aspects of this document (adding background refresh etc) are a result of the feedback we received from them.

We plan to continue the engagement to arrive at a browser standard that would enable cookie binding across the web.

## References & acknowledgements

This is a growing list and we acknowledge and thank everyone who helped us shape this proposal.
Many thanks for valuable feedback and advice from:

- Erik Anderson
- Olga Dalton
- Paul Garner
- Tarek Kamel
- Pieter Kasselman
- Alex Russell
- Sasha Tokarev
- Peter Zenzerovich
  