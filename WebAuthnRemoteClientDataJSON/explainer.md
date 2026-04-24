# WebAuthn `remoteClientDataJSON` Extension

Authors: [Akshay Kumar](mailto:Akshay.Kumar@microsoft.com), [Zach Dixon](mailto:Zachary.Dixon@microsoft.com), [Mo Jamal](mailto:jamalmo@microsoft.com)

## Status of this Document

This document is a starting point for engaging the community and standards
bodies in developing collaborative solutions fit for standardization. As the
solutions to problems described in this document progress along the
standards-track, we will retain this document as an archive and use this
section to keep the community up-to-date with the most current standards
venue and content location of future work and discussions.

* This document status: **`ACTIVE`**
* Expected venue: [W3C Web Authentication Working Group](https://www.w3.org/groups/wg/webauthn/)
* **Current version: this document**
* Related spec PR: [w3c/webauthn#2375](https://github.com/w3c/webauthn/pull/2375) — **approved by the Working Group; pending merge**. Editorial polish is expected to land as follow-up PRs.
* Related issue: [w3c/webauthn#1577](https://github.com/w3c/webauthn/issues/1577)
* Approving reviewers: @pascoej, @emlun, @ve7jtb, @timcappalli, @MasterKale

## Introduction

The [Web Authentication API](https://www.w3.org/TR/webauthn-3/) (WebAuthn) enables strong, phishing-resistant authentication on the web using public-key cryptography. During a WebAuthn ceremony, the browser constructs a JSON object called `clientDataJSON` from values such as the origin, challenge, and ceremony type. This object is signed by the authenticator and later verified by the relying party.

Remote desktop web clients present a challenge for this model. When a user initiates a WebAuthn ceremony within a remote desktop session, the request originates from the remote host (e.g., `https://accounts.example.com`) but is executed in the context of the local web client (e.g., `https://myrdc.example`). The browser constructs `clientDataJSON` using the *local* client's origin rather than the *remote* host's origin. Meanwhile, the remote desktop host passes its own `clientDataJSON` (with the remote origin) to the platform authenticator API (e.g., the Windows WebAuthn API). This mismatch between the browser-constructed and host-provided `clientDataJSON` causes signature validation to fail.

A preexisting Chromium-only extension, `remoteDesktopClientOverride`, partially addresses this by allowing remote desktop clients to override the `origin` and `crossOrigin` fields. It has never been standardized in the W3C WebAuthn specification. Even where supported, it relies on the browser to *construct* `clientDataJSON` from component values, which may differ from the `clientDataJSON` that the remote host passed to the platform API. Any structural differences -- field ordering, additional fields, whitespace -- will produce a different hash and break signature verification.

The `remoteClientDataJSON` extension solves this by allowing an authorized remote desktop web client to provide the *complete* `clientDataJSON` string, which the browser passes through verbatim without modification. It is the first remote-desktop WebAuthn extension to be standardized in the W3C spec (via [PR #2375](https://github.com/w3c/webauthn/pull/2375)).

## Background

### Current WebAuthn Flow in Remote Desktop when using a Web based client

1. A user visits `https://accounts.example.com` within a remote desktop session hosted on a remote machine.
2. The relying party at `https://accounts.example.com` initiates a WebAuthn ceremony.
3. The remote desktop host intercepts the request and forwards it to the local client via the Remote Desktop Protocol (RDP) WebAuthn virtual channel.
4. The local remote desktop web client (e.g., `https://myrdc.example`) calls the WebAuthn API in the local browser.
5. The browser constructs its own `clientDataJSON` using the local client's context.
6. The authenticator signs a hash of this browser-constructed `clientDataJSON`.
7. The response is sent back to the remote host, which attempts to verify the signature against the `clientDataJSON` it originally provided to the platform API.
8. **Verification fails** because the two `clientDataJSON` objects differ.

### Existing `remoteDesktopClientOverride` Extension (Chromium-only, non-standard)

Chromium already supports a `remoteDesktopClientOverride` extension that allows overriding the `origin` and `sameOriginWithAncestors` values used when constructing `clientDataJSON`. Note that this extension is a Chromium-specific implementation; it is **not** defined in the published W3C WebAuthn specification:

```js
navigator.credentials.get({
  publicKey: {
    challenge: ...,
    rpId: "example.com",
    allowCredentials: [...],
    extensions: {
      remoteDesktopClientOverride: {
        origin: "https://accounts.example.com",
        sameOriginWithAncestors: false,
      },
    },
  },
});
```

This extension corrects the origin and cross-origin flag, but the browser still constructs `clientDataJSON` itself. The resulting JSON may differ from what the remote host passed to the Windows WebAuthn API in field ordering, optional fields, or formatting -- any of which causes a hash mismatch and signature verification failure.

## Goals

- Enable remote desktop web clients to provide a complete `clientDataJSON` string that the browser passes through to the authenticator without modification, ensuring hash consistency with the remote host.
- Maintain the existing security model: per-origin authorization via enterprise policy or explicit user opt-in.
- Support both `navigator.credentials.create()` (registration) and `navigator.credentials.get()` (authentication) ceremonies.
- Support non-managed device scenarios where enterprise policy is impractical, via browser flag configuration.

## Non-Goals

- Deprecating or removing Chromium's existing (non-standard) `remoteDesktopClientOverride` extension. Both extensions will coexist in Chromium, with `remoteClientDataJSON` taking priority when both are present.
- Modifying the behavior of WebAuthn for non-remote-desktop use cases.
- Implementing a general-purpose mechanism for arbitrary `clientDataJSON` injection outside of remote desktop scenarios.
- Defining platform-specific authenticator behavior. The extension operates entirely at the client (browser) level.

## Use Cases

### Scenario 1: RDP Web Client with Windows WebAuthn API

A user connects to a remote Windows desktop via a web-based RDP client (`https://myrdc.example`). The remote desktop application on the host calls the Windows WebAuthn API, which accepts a complete `clientDataJSON` object. The RDP virtual channel forwards the WebAuthn request -- including the host's `clientDataJSON` -- to the web client. The web client uses `remoteClientDataJSON` to pass this exact JSON to the browser, ensuring the authenticator signs the same data that the remote host will use for verification.

### Scenario 2: Non-Managed Personal Device

A user accesses a corporate remote desktop from their personal laptop. Since the device is not enterprise-managed, configuring enterprise policy for WebAuthn remote desktop support is impractical. The user enables a browser flag (`chrome://flags`) and adds the remote desktop client's origin to the allowlist, enabling WebAuthn passkey authentication within the remote session.

### Scenario 3: Third-Party Remote Desktop Provider

A third-party remote desktop service (`https://remoteapp.example`) needs WebAuthn support for its web client. Using `remoteClientDataJSON`, the provider can forward the exact `clientDataJSON` from the remote host without worrying about browser-specific JSON construction differences across different Chromium-based browsers.

## Proposed Solution

### API Surface

A new WebAuthn client extension, `remoteClientDataJSON`, accepts a complete `clientDataJSON` as a `DOMString`:

```js
// The remote desktop web client at https://myrdc.example provides
// the exact clientDataJSON from the remote host.
const remoteJSON = JSON.stringify({
  type: "webauthn.get",
  challenge: "base64url-encoded-challenge",
  origin: "https://accounts.example.com",
  crossOrigin: false,
});

navigator.credentials.get({
  publicKey: {
    challenge: ...,
    rpId: "example.com",
    allowCredentials: [...],
    extensions: {
      remoteClientDataJSON: remoteJSON,
    },
  },
});
```

The value is a JSON-serialized string containing the standard `clientDataJSON` fields (`type`, `challenge`, `origin`, `crossOrigin`). The browser passes this string through to the authenticator without modification.

### WebIDL

Per [w3c/webauthn PR #2375](https://github.com/w3c/webauthn/pull/2375) (approved):

**Client Extension Input:**

```webidl
partial dictionary AuthenticationExtensionsClientInputs {
    DOMString remoteClientDataJSON;
};

partial dictionary AuthenticationExtensionsClientInputsJSON {
    DOMString remoteClientDataJSON;
};
```

**Client Extension Output:**

```webidl
partial dictionary AuthenticationExtensionsClientOutputs {
    boolean remoteClientDataJson;
};

partial dictionary AuthenticationExtensionsClientOutputsJSON {
    boolean remoteClientDataJson;
};
```

> Note: The input uses `remoteClientDataJSON` (uppercase `JSON`) while the output uses `remoteClientDataJson` (camelCase `Json`), per the current spec PR naming. The output is simply a boolean `true` indicating the extension was acted upon. Earlier drafts also returned a `remoteDesktopClientOrigin` string in the output; that field was removed during review because the origin is already conveyed inside `clientDataJSON`.

### Processing Steps

When `remoteClientDataJSON` is present in the extension inputs, the algorithm replaces the standard "establish the RP ID" and "construct `collectedClientData`" steps of the registration / authentication ceremonies with the following (per the approved spec PR):

1. **Permission check**: If the current permission state for `"publickey-credentials-remote-client-data-json"` and the current settings object is not `"granted"`, throw `NotAllowedError`.
2. **RP ID presence**: If `publicKey.rp.id` (registration) / `publicKey.rpId` (authentication) is not present, throw `NotAllowedError`. The caller MUST supply an explicit RP ID — the browser does not default it to the calling origin.
3. **Parse the JSON**: Parse the provided `remoteClientDataJSON` string as a JSON value (using the Infra "parse a JSON string to an Infra value" algorithm). If parsing fails:
    * For `navigator.credentials.create()`, throw `EncodingError`.
    * For `navigator.credentials.get()`, throw `NotSupportedError`.
    > Note: the two ceremonies use different exception types in the current spec text; this may be aligned in a follow-up editorial PR.
4. **Extract the remote origin**: Read the `"origin"` key from the parsed JSON; call this `remoteOrigin`.
5. **Skip the registrable-domain-suffix check**: The browser does **not** verify that `rpId` is a registrable domain suffix of `remoteOrigin`. RP ID validation is delegated to the remote client, which has the full context needed to evaluate related origins and platform-specific app-deployment models.
6. **Skip `clientDataJSON` construction**: The browser MUST NOT build its own `collectedClientData`; the parsed JSON from step 3 is used directly.
7. **Pass the JSON through verbatim**: In the "serialize client data" step, set `clientDataJSON` to the exact `remoteClientDataJSON` string supplied by the caller. The user agent MUST NOT add, remove, or modify any of its contents (doing so would invalidate the remote machine's hash and cause signature verification to fail at the RP).
8. **Compute the hash**: Compute `SHA-256` of the verbatim string for the authenticator.

### Client Extension Output

The client extension output is simply `true`, signaling to the RP that the extension was acted upon. The earlier draft also returned a `remoteDesktopClientOrigin` field; that was removed in response to review feedback from [@MasterKale](https://github.com/w3c/webauthn/pull/2375#pullrequestreview-7fOMrd) so that origin information travels only inside `clientDataJSON`.

### Interaction with the Chromium-only `remoteDesktopClientOverride`

`remoteDesktopClientOverride` is not part of the W3C spec and interaction between the two extensions is therefore a Chromium implementation detail. In Chromium, if both extensions are present in the same request, `remoteClientDataJSON` takes priority and `remoteDesktopClientOverride` is ignored without raising an error.

### Permissions and Permissions Policy

The approved spec PR defines the extension as both a [powerful feature](https://w3c.github.io/permissions/#powerful-feature) and a [policy-controlled feature](https://w3c.github.io/webappsec-permissions-policy/), identified by the same token:

* **Feature identifier:** `publickey-credentials-remote-client-data-json`
* **Default allowlist (Permissions Policy):** `'none'` — disabled for all origins by default.
* **Default permission state (Permissions API):** `"denied"` — the extension is unavailable until explicitly granted per-origin.
* **Permission descriptor type:** defaults to `PermissionDescriptor` (no additional aspects).

A remote desktop web client can feature-detect whether the user agent has been configured to allow the extension for its origin using the standard Permissions API:

```js
const status = await navigator.permissions.query({
  name: "publickey-credentials-remote-client-data-json",
});

if (status.state === "granted") {
  // Proceed with the remoteClientDataJSON flow.
}
```

The step numbered 1 in the [Processing Steps](#processing-steps) section calls `getting the current permission state` for this feature; a state other than `"granted"` causes the WebAuthn call to reject with `NotAllowedError`.

User agents MUST only expose per-origin configuration mechanisms (enterprise policy, managed-profile policy, or per-origin user opt-in in client settings); a "permit all origins" switch is explicitly forbidden by the spec.

### Example: Registration (Create)

```js
// Remote desktop web client at https://myrdc.example
const clientDataJSON = JSON.stringify({
  type: "webauthn.create",
  challenge: "SGVsbG8gV29ybGQ",  // base64url-encoded challenge from the remote host
  origin: "https://accounts.example.com",
  crossOrigin: false,
});

const credential = await navigator.credentials.create({
  publicKey: {
    rp: { name: "Example Corp", id: "example.com" },
    user: {
      id: new Uint8Array([1, 2, 3, 4]),
      name: "user@example.com",
      displayName: "User",
    },
    challenge: new Uint8Array([/* challenge bytes */]),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    extensions: {
      remoteClientDataJSON: clientDataJSON,
    },
  },
});

// credential.response.clientDataJSON contains the exact string
// provided above, enabling signature verification on the remote host.
```

### Example: Authentication (Get)

```js
// Remote desktop web client at https://myrdc.example
const clientDataJSON = JSON.stringify({
  type: "webauthn.get",
  challenge: "dGVzdENoYWxsZW5nZQ",
  origin: "https://accounts.example.com",
  crossOrigin: false,
});

const assertion = await navigator.credentials.get({
  publicKey: {
    rpId: "example.com",
    challenge: new Uint8Array([/* challenge bytes */]),
    allowCredentials: [...],
    extensions: {
      remoteClientDataJSON: clientDataJSON,
    },
  },
});
```

## Authorization Model

This extension requires explicit per-origin authorization. Three mechanisms are supported:

### 1. Enterprise Policy (Managed Devices)

On managed devices, administrators configure the `WebAuthnRemoteDesktopAllowedOrigins` enterprise policy with a list of authorized origins. This is the recommended approach for enterprise deployments.

### 2. Browser Flags (Non-Managed Devices)

For personal or non-managed devices, users can enable WebAuthn remote desktop support via browser flags:

1. Navigate to `chrome://flags#webauthn-remote-client-data-json`.
2. Enter the authorized origin(s) (e.g., `https://myrdc.example`).
3. Restart the browser.

The flags page includes a standard warning about enabling experimental features and their potential security implications.

### 3. Permissions Policy and the Permissions API

The approved spec PR integrates the extension with both the [Permissions API](https://w3c.github.io/permissions/) and [Permissions Policy](https://w3c.github.io/permissions-policy/). Once the spec is merged and published, sites can declare the extension via an HTTP header:

```
Permissions-Policy: publickey-credentials-remote-client-data-json=(self "https://myrdc.example")
```

Web-exposed feature detection is available via `navigator.permissions.query({ name: "publickey-credentials-remote-client-data-json" })`, which returns `"granted"` only when the calling origin has been authorized by one of the mechanisms above.

Per the spec, this configuration MUST remain per-origin: user agents are forbidden from offering a single toggle that permits the extension for all origins.

## Considered Alternatives

### Alternative 1: Extend `remoteDesktopClientOverride` with Additional Fields

Adding more fields (e.g., `challenge`, `type`) to the existing `remoteDesktopClientOverride` extension to cover all `clientDataJSON` components.

**Rejected because:**
- Requires redundant parsing: the remote host already has the complete JSON, and decomposing it into individual fields only to have the browser reassemble them introduces unnecessary complexity and potential for divergence.
- Future additions to `clientDataJSON` would require corresponding changes to the extension interface.
- Does not guarantee byte-for-byte equivalence with the remote host's JSON, since the browser may serialize fields differently.

### Alternative 2: Accept a Pre-Computed Hash Instead of the Full JSON

Allow the caller to provide only the `SHA-256` hash of `clientDataJSON`, rather than the full string.

**Rejected because:**
- The relying party expects the full `clientDataJSON` in the authentication response for verification. Providing only a hash would require a separate channel to transmit the full JSON.
- The browser would lose the ability to validate the RP ID against the origin in the JSON, weakening the security model.


## Privacy and Security Considerations

### Security

#### Origin Substitution

The `remoteClientDataJSON` extension allows the calling origin to supply a `clientDataJSON` containing a different `origin` value than the local browser context. This is inherent to the remote desktop use case, but it means the browser must trust the caller to provide an accurate remote origin. This trust is mitigated by the per-origin authorization requirement.

#### RP ID Validation is Delegated to the Remote Client

The approved spec PR **skips** the usual "is the `rpId` a registrable domain suffix of the origin?" check on the local client. The registrable-domain-suffix test is instead the responsibility of the remote client, because only the remote side has the full context required: related origins, platform-specific app-deployment models (e.g., Android asset links, iOS associated domains), and the remote RP's allowed-origin configuration. Any user agent that grants this permission to an origin MUST therefore trust that origin to have performed RP ID validation honestly and correctly. This makes the per-origin authorization step (below) the primary defense.

#### Per-Origin Authorization

User agents MUST NOT grant this permission globally. The spec requires that configuration mechanisms be per-origin, via either:

* Enterprise / managed-device / managed-profile policy, or
* Explicit per-origin user opt-in in user-agent settings (e.g., a browser flag with a per-origin allowlist).

A "permit all origins" option is explicitly forbidden. This is the load-bearing security boundary, since the local client no longer performs the registrable-domain-suffix check itself.

#### Security of the `remoteDesktopClientOverride` Coexistence

`remoteDesktopClientOverride` is not a standardized extension, so their interaction is a Chromium implementation detail. When both are present in a Chromium request, `remoteClientDataJSON` takes precedence. This is safe because `remoteClientDataJSON` is a strict superset of the functionality of `remoteDesktopClientOverride`, and the same authorization model applies.

### Privacy

This extension does not introduce new privacy concerns beyond those already present in a normal WebAuthn ceremony. The `clientDataJSON` string provided by the caller contains only the standard fields (`type`, `challenge`, `origin`, `crossOrigin`) that the browser would otherwise construct itself. No additional user data is exposed.

The extension is not available by default and cannot be used for fingerprinting, as it requires explicit per-origin authorization that is not detectable by unauthorized origins.

## Resolved During W3C Review

Several points from earlier drafts of this explainer were resolved in the approved version of [PR #2375](https://github.com/w3c/webauthn/pull/2375):

1. **Permission descriptor shape (RESOLVED)**: Earlier drafts proposed a custom `PermissionDescriptor` subtype. Per review feedback from [@kreichgauer](https://github.com/w3c/webauthn/pull/2375), the custom descriptor was dropped; the feature now uses the default `PermissionDescriptor` type, queried with `{ name: "publickey-credentials-remote-client-data-json" }`.

2. **Feature identifier naming (RESOLVED)**: The feature identifier `publickey-credentials-remote-client-data-json` was chosen, consistent with the existing `publickey-credentials-create` / `publickey-credentials-get` Permissions Policy features.

3. **RP ID validation location (RESOLVED)**: The WG accepted the proposal that the local client delegates the registrable-domain-suffix check (and related-origin evaluation) to the remote client, because only the remote side has the full context (related origins, app-deployment-specific origin linking). This is reflected in the Processing Steps above.

4. **`remoteDesktopClientOrigin` output field (RESOLVED)**: The earlier draft returned a `remoteDesktopClientOrigin` DOMString in `AuthenticationExtensionsClientOutputs`. Per review by [@MasterKale](https://github.com/w3c/webauthn/pull/2375), it was removed — the output is now just a `boolean remoteClientDataJson` flag. The origin is already inside `clientDataJSON`, so echoing it in the output was redundant.

## Open Questions

1. **User communication**: The spec recommends that user agents clearly communicate to users when a remote-desktop-proxied WebAuthn operation is in progress, so users understand their authenticator is being used on behalf of a remotely hosted RP. The exact form of this UI (indicator, prompt, chrome decoration) is left to user agents and is not yet defined.

2. **Exception parity between `create()` and `get()`**: The current spec text throws `EncodingError` on JSON parse failure in `create()` but `NotSupportedError` in `get()`. [@emlun](https://github.com/w3c/webauthn/pull/2375) noted this may be tidied up in a follow-up editorial PR.

3. **End-to-end sequence diagram**: [@MasterKale](https://github.com/w3c/webauthn/pull/2375) contributed a sequence diagram illustrating a full passkey flow using the extension (remote browser → remote platform → RDP channel → local RDP web client → local browser → local authenticator). The diagram is likely to land either in the spec itself or in the associated explainer as a follow-up.

## References

- [W3C Web Authentication Level 3 Specification](https://www.w3.org/TR/webauthn-3/)
- [W3C WebAuthn PR #2375: `remoteClientDataJSON` Extension](https://github.com/w3c/webauthn/pull/2375)
- [W3C WebAuthn Issue #1577: Remote Desktop Support](https://github.com/w3c/webauthn/issues/1577)
- [W3C WebAuthn Wiki: Explainer -- Remote Desktop Support](https://github.com/w3c/webauthn/wiki/Explainer:-Remote-Desktop-Support)
- Chromium-only `remoteDesktopClientOverride` extension (not part of the W3C spec). Chromium CLs for that extension:
  - [Add `remoteDesktopClientOverride` extension IDL (CL 3499163)](https://chromium-review.googlesource.com/c/chromium/src/+/3499163)
  - [Wire up `RemoteDesktopClientOverride` client extension (CL 3577285)](https://chromium-review.googlesource.com/c/chromium/src/+/3577285)
  - [Add `remoteDesktopClientOverride` support on Android (CL 6281085)](https://chromium-review.googlesource.com/c/chromium/src/+/6281085)
  - [Add `remoteDesktopClientOverride` when proxying requests (CL 3588862)](https://chromium-review.googlesource.com/c/chromium/src/+/3588862)
