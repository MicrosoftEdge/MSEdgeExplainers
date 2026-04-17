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
* Related spec PR: [w3c/webauthn#2375](https://github.com/w3c/webauthn/pull/2375)
* Related issue: [w3c/webauthn#1577](https://github.com/w3c/webauthn/issues/1577)

## Introduction

The [Web Authentication API](https://www.w3.org/TR/webauthn-3/) (WebAuthn) enables strong, phishing-resistant authentication on the web using public-key cryptography. During a WebAuthn ceremony, the browser constructs a JSON object called `clientDataJSON` from values such as the origin, challenge, and ceremony type. This object is signed by the authenticator and later verified by the relying party.

Remote desktop web clients present a challenge for this model. When a user initiates a WebAuthn ceremony within a remote desktop session, the request originates from the remote host (e.g., `https://accounts.example.com`) but is executed in the context of the local web client (e.g., `https://myrdc.example`). The browser constructs `clientDataJSON` using the *local* client's origin rather than the *remote* host's origin. Meanwhile, the remote desktop host passes its own `clientDataJSON` (with the remote origin) to the platform authenticator API (e.g., the Windows WebAuthn API). This mismatch between the browser-constructed and host-provided `clientDataJSON` causes signature validation to fail.

The existing [`remoteDesktopClientOverride`](https://w3c.github.io/webauthn/#sctn-remoteDesktopClientOverride-extension) extension partially addresses this by allowing remote desktop clients to override the `origin` and `crossOrigin` fields. However, it still relies on the browser to *construct* `clientDataJSON` from component values, which may differ from the `clientDataJSON` that the remote host passed to the platform API. Any structural differences -- field ordering, additional fields, whitespace -- will produce a different hash and break signature verification.

The `remoteClientDataJSON` extension solves this by allowing an authorized remote desktop web client to provide the *complete* `clientDataJSON` string, which the browser passes through verbatim without modification.

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

### Existing `remoteDesktopClientOverride` Extension

Chromium already supports a [`remoteDesktopClientOverride`](https://w3c.github.io/webauthn/#sctn-remoteDesktopClientOverride-extension) extension that allows overriding the `origin` and `sameOriginWithAncestors` values used when constructing `clientDataJSON`:

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

- Deprecating or removing the existing `remoteDesktopClientOverride` extension. Both extensions will coexist.
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

Per [w3c/webauthn PR #2375](https://github.com/w3c/webauthn/pull/2375):

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

> Note: The input uses `remoteClientDataJSON` (uppercase `JSON`) while the output uses `remoteClientDataJson` (camelCase `Json`), per the naming in the W3C spec PR.

### Processing Steps

When `remoteClientDataJSON` is present in the extension inputs:

1. **Permission check**: Verify that the calling origin is authorized to use this extension (via enterprise policy, browser flag allowlist, or permissions policy).
2. **Parse the JSON**: Parse the provided `remoteClientDataJSON` string. If parsing fails, throw `NotSupportedError`.
3. **Extract the remote origin**: Read the `"origin"` field from the parsed JSON.
4. **Validate RP ID**: Verify that the requested `rpId` is a valid registrable domain suffix of the extracted remote origin. If validation fails, throw `SecurityError`.
5. **Skip `clientDataJSON` construction**: The browser MUST NOT construct its own `clientDataJSON`. The provided string is used as-is.
6. **Compute the hash**: Compute `SHA-256` of the provided `clientDataJSON` string for the authenticator.
7. **Return verbatim**: The `clientDataJSON` in the response is the exact string provided by the caller, with no additions, removals, or modifications.

### Precedence

If both `remoteClientDataJSON` and `remoteDesktopClientOverride` are present in the same request, `remoteClientDataJSON` takes priority. The `remoteDesktopClientOverride` fields are ignored without raising an error.

### Permissions Policy

The W3C spec PR defines a permissions policy feature:

- **Feature identifier:** `publickey-credentials-remote-client-data-json`
- **Default allowlist:** `'none'`

This is designated as a [powerful feature](https://w3c.github.io/permissions/#powerful-feature) with a default permission state of `"denied"`.

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

### 3. Permissions Policy (Future)

The W3C spec PR defines integration with the [Permissions API](https://w3c.github.io/permissions/) and [Permissions Policy](https://w3c.github.io/permissions-policy/). When standardized, this will provide a web-standard mechanism for sites to declare permission via HTTP headers:

```
Permissions-Policy: publickey-credentials-remote-client-data-json=(self "https://myrdc.example")
```

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

#### RP ID Validation

The browser parses the provided `clientDataJSON` and validates the requested `rpId` against the `origin` extracted from the JSON, using the standard registrable domain suffix check. This ensures that even with a complete JSON override, the caller cannot make requests for arbitrary relying parties unrelated to the specified origin.

#### Per-Origin Authorization

User agents MUST NOT grant this permission globally. The extension is only available to origins explicitly authorized via:
- Enterprise device management policy, or
- Explicit user opt-in through browser flags with a per-origin allowlist.

This ensures that arbitrary web pages cannot use this extension to forge `clientDataJSON`.

#### Interaction with `remoteDesktopClientOverride`

When both extensions are present, `remoteClientDataJSON` takes precedence. This is safe because `remoteClientDataJSON` provides a strict superset of the functionality of `remoteDesktopClientOverride`, and the same authorization model applies to both.

### Privacy

This extension does not introduce new privacy concerns beyond those already present in the `remoteDesktopClientOverride` extension. The `clientDataJSON` string provided by the caller contains only the standard fields (`type`, `challenge`, `origin`, `crossOrigin`) that the browser would normally construct itself. No additional user data is exposed.

The extension is not available by default and cannot be used for fingerprinting, as it requires explicit per-origin authorization that is not detectable by unauthorized origins.

## Open Questions

1. **Permissions API integration**: The W3C spec PR (#2375) defines `remoteClientDataJSON` as a [powerful feature](https://w3c.github.io/permissions/#powerful-feature) with a custom permission descriptor. Ongoing review ([kreichgauer, April 2026](https://github.com/w3c/webauthn/pull/2375)) suggests the custom descriptor may be unnecessary. The scope of Permissions API integration depends on the resolution of this review.

2. **Feature identifier naming**: Should the permissions policy feature use `remote-client-data-json` or `publickey-credentials-remote-client-data-json` to align with existing WebAuthn permission feature naming conventions?

3. **Related origin requests**: When `remoteClientDataJSON` is present and RP ID validation is performed against the extracted origin, should [related origin requests](https://w3c.github.io/webauthn/#sctn-related-origins) also be evaluated, or should they be skipped?

4. **User communication**: The spec recommends that user agents clearly communicate to users when a remote-desktop-proxied WebAuthn operation is in progress. The form and requirements of this communication are not yet defined.

## References

- [W3C Web Authentication Level 3 Specification](https://www.w3.org/TR/webauthn-3/)
- [W3C WebAuthn PR #2375: `remoteClientDataJSON` Extension](https://github.com/w3c/webauthn/pull/2375)
- [W3C WebAuthn Issue #1577: Remote Desktop Support](https://github.com/w3c/webauthn/issues/1577)
- [W3C WebAuthn Wiki: Explainer -- Remote Desktop Support](https://github.com/w3c/webauthn/wiki/Explainer:-Remote-Desktop-Support)
- [Existing `remoteDesktopClientOverride` Extension Spec](https://w3c.github.io/webauthn/#sctn-remoteDesktopClientOverride-extension)
- Chromium CLs for existing extension:
  - [Add `remoteDesktopClientOverride` extension IDL (CL 3499163)](https://chromium-review.googlesource.com/c/chromium/src/+/3499163)
  - [Wire up `RemoteDesktopClientOverride` client extension (CL 3577285)](https://chromium-review.googlesource.com/c/chromium/src/+/3577285)
  - [Add `remoteDesktopClientOverride` support on Android (CL 6281085)](https://chromium-review.googlesource.com/c/chromium/src/+/6281085)
  - [Add `remoteDesktopClientOverride` when proxying requests (CL 3588862)](https://chromium-review.googlesource.com/c/chromium/src/+/3588862)
