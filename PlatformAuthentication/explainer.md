# Allow JS App to directly interact with platform broker 
 
Authors: [Linping Zhang](https://github.com/coder-linping), Petar Dimov
 
## Introduction 
In today's world, web application identity is largely decoupled from the operating system's concept of identity. This provides benefits such as enabling the browser to provide multiple profiles within a single operating system and using a different identity than the one associated with the OS. However, in enterprise settings this separation poses significant challenges for achieving security promises that non-web-based applications often enjoy. One of the most important security capability gaps is the ability to bind tokens associated with a specific device within web applications. Unlike native applications, web applications lack access to crucial cryptographic APIs and enterprise device state information, which are both essential for secure token binding.

Authentication tokens requested with existing web primitives are subject to theft and exfiltration as they can't be bound to the device hardware such as a TPM, or other secure enclave. However, a broker (see Glossary section below for definition of "broker") can produce a device-bound token to ensure it is only usable on the device it was issued to.

There are already some browser extensions which rely on such a broker to provide a device bound token and leverage its central role to provide a single sign-on (SSO) experience. For example, the [Microsoft Single Sign On extension](https://chromewebstore.google.com/detail/microsoft-single-sign-on/ppnbnpeolgkicgegkbkbjmhlideopiji) leverages the broker to allow a seamless SSO for Microsoft Entra accounts. It uses a [Primary Refresh Token (PRT)](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token) as a device-bound SSO artifact. However, this extension is currently limited to specific message senders and is not generally available for all token requests.

While the extension-aided approach can help obtain a secure device-bound token, it requires a browser extension and a dedicated executable to be installed on the system and is not available on mobile platforms which is an important use case as it represents a significant portion of enterprise device users.

To bridge this gap, we propose allowing browser-based applications running within an enterprise-managed browser to call a set of built-into-the-browser APIs. These APIs will enable these apps to invoke a native broker. The broker is a well-established concept for native applications which know how to invoke it for authentication requests. By leveraging the broker, we can provide web applications with the necessary cryptographic tools and enterprise device information, ensuring a secure and unified experience across both web and native applications. The initial set of APIs that we propose are named "GetCookies", "GetToken" and "SignOut".

Because of the significant privacy implication of binding (and thus associating) tokens with a specific device, we propose scoping the APIs to enterprise-managed devices only. Administrators would need to enable the APIs through a policy that will be enforced by the browser that implements the APIs.
 
We envision future work will extend the APIs to serve as a bridge between web apps and the OS authentication platform to enable additional scenarios.  For example, signing in to a web application could register that user on the device allowing other applications on the device to sign in as that same user.  This scenario could be used to facilitate web provisioning of a new device for a user.

This explainer details the addition of new APIs in the browser that will serve as a bridge to a native broker which will allow a web app to almost directly interact with the broker for authentication to web services. This integration will initially help align the web sign-in and application sign-in to provide a unified SSO experience.

The broker typically has access to the device's secure enclave (e.g. a TPM). It relies on device registration and binding keys tied to device registration and can thus provide better security than any alternative solution we have considered (please see Alternatives Considered section below). Additionally, the platform broker can maintain a token cache mechanism; allowing JS to interact with platform broker can reduce the number of network round trips required to authenticate. This in turn reduces the amount of time users need to wait for authentication flows to complete.
 
## Glossary
|Glossary | Explanation|
|---      |   -- |
|Platform authentication broker (we will refer to this as broker in this document) | The app running on a user's machine that manages the authentication handshakes and token maintenance for all connected accounts. For example, the broker implementation on Windows is Web Account Manager (WAM) which currently has a Microsoft account integration. On non-Windows platforms, Microsoft Accounts support brokering via mechanisms such as Company Portal, Authenticator and Link to Windows app. Windows Account Manager has an extensibility mechanism that could allow another identity provider to plug in; alternatively, they could pursue having a browser implement this API with a different broker underneath of it. |
|SSO (Single Sign On) |Single Sign-On (SSO) is an authentication technology that allows users to log in once with a single set of credentials and gain access to multiple applications or services without needing to log in again for each one.|
|TPM(Trusted Platform Module) | A TPM (Trusted Platform Module) is a hardware security module commonly integrated with the computer's motherboard and/or CPU. It is used to improve the security of your PC.  On Windows, it's used by services like [BitLocker drive encryption](https://docs.microsoft.com/windows/security/information-protection/bitlocker/bitlocker-device-encryption-overview-windows-10), [Windows Hello](https://support.microsoft.com/en-us/windows/configure-windows-hello-dae28983-8242-bb2a-d3d1-87c9d265a5f0), and others, to securely create and store cryptographic keys, and to confirm that the operating system and firmware on your device haven't been tampered with. Similar capabilities are provided on other platforms via similar systems such as Apple's Secure Enclave and Google's Titan security processors. |

## Goals 
Our primary goal is to provide enhanced security to enterprise web app authentication flows by allowing websites to interact with a broker. 
 
We plan to start with providing APIs for "get token" and "sign out", and "apply cookies" scenarios but also envision expanding the set of supported scenarios via new API functionality. 

By allowing web apps to request tokens from brokers we allow resource providers and enterprises to enforce conditional access policies that secure the sign-in sessions and the sign-in artifacts. 

## Non-goals 
* Solving non-enterprise identity use cases.
* Define the mechanism(s) used to registering brokers with the User Agent.

## Proposed Solution 
New APIs will be added under navigator namespace when running in a non-anonymous profile. These APIs potentially expose the user's identity to OS in situations they may not want to happen. As a result, these APIs should not be available in anonymous browsing modes (which have various names, e.g. "private window", "Incognito", and "InPrivate").

These APIs are provided by the browser but, because they are associated with an OS/broker session- and/or device- level identity concept, are independent of browser profile. In other words, even when a user has two different browser profiles configured with different browser-level identities, these APIs would operate in the same way and bind tokens to the same broker-level state.

These APIs are only available to enterprise-managed devices and are disabled by default. Administrator need to enable the APIs through a browser-defined policy mechanism.

### Contract Query API
This API allows JS to discover what methods are allowed to directly interact with the broker. Callers should call this method first to check the capabilities of the API to determine which "execution APIs" are functional in the user's environment. Since the supported contracts won't change at runtime, the caller can call this function once per page load and cache it for later use.

Its signature is:
```
navigator.platformAuthentication.getSupportedContracts( 
    DOMString brokerId 
) -> Promise<sequence<NativeAuthContracts>> 
```
`brokerId`: Required parameter that identifies which platform broker to use. For Microsoft Entra brokers, this should be set to "MicrosoftEntra". Browsers can define additional per-platform requirements for how new brokers can be registered and verified by the browser.

The response for this API will be a sequence of contracts – initially those will be `get-token-and-sign-out` (which contains both `GetToken` and `SignOut` APIs) and apply-cookies. 
```
enum NativeAuthContracts { 
    apply-cookies, 
    get-token-and-sign-out 
} 
```

### Execution API
These functions are the bridge which will pass the JS request directly to the broker and return the response directly back to JS. The browser (or library used by the browser) will convert the request and the response parameters to formats that are consumed/returned by the broker. 

When the response of `getSupportedContracts` contains `apply-cookies`, the following function can be used. It helps get authentication cookies from broker and apply it to the current origin. Before this function is added, similar functionality was only available through [Microsoft Single Sign On extension](https://chromewebstore.google.com/detail/microsoft-single-sign-on/ppnbnpeolgkicgegkbkbjmhlideopiji). 

```
navigator.platformAuthentication.executeApplyCookies (ApplyCookiesParameters) -> Promise<ApplyCookiesResult>
``` 

When the response of `getSupportedContracts` contains `get-token-and-sign-out`, the following functions can be used. They help retrieve the device bound token from the broker and perform the sign-out action.

```
navigator.platformAuthentication.executeGetToken(GetTokenParameters) -> Promise<GetTokenResult> 
navigator.platformAuthentication.executeSignOut(SignOutParameters) -> Promise<SignOutResult>
```

The types `GetTokenResult`, `GetTokenParameters`, `ApplyCookiesResult`, `ApplyCookiesParameters`, `SignOutResult` and `SignOutParameters` are strongly-typed dictionaries defined in WebIDL.

#### GetToken Request
The `GetTokenParameters` request parameter is a dictionary containing all parameters needed to obtain an authentication token from the broker. The request payload closely follows the OAuth2 specification.
```
dictionary GetTokenParameters {
  DOMString brokerId, 
  DOMString? accountId, 
  DOMString clientId, 
  DOMString authority, 
  DOMString scope, 
  DOMString redirectUri, 
  DOMString correlationId, 
  boolean isSecurityTokenService,
  DOMString? state, 
  record<DOMString, DOMString>? extraParameters  
}    
``` 
`brokerId`: Required parameter that identifies which platform broker to use. For Microsoft Entra brokers, this should be set to "MicrosoftEntra". Browsers can define additional per-platform requirements for how new brokers can be registered and verified by the browser.

`accountId`: The platform-specific account ID that was previously assigned to the account by the platform broker. The app can pass this accountId to allow broker to look up the account without prompting the end user via additional account selection UX. Passing the accountId is the only way to obtain a token for an existing account without a prompt. It is obtained by the app from the Account property of a previous successful response. 

`clientId`: Identifier provided by the identity provider for an application (the web site) requesting a token. Semantics of clientId match the [OAuth2 specification](https://datatracker.ietf.org/doc/html/rfc6749#section-2.1). Limitations that apply to public clients described in the OAuth2 specification apply to this parameter as well. 

`authority`: The authority that will be used for the OAuth2 request. Some brokers accept empty authority and will use a default one (https://login.microsoftonline.com). 

`scope`: Defines a list of requested "scopes" which generally map to a set of permissions/capabilities the calling application (web site) is requesting access for. This matches [OAuth2 scope definition](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3).

`redirectURI`: The redirect URI for the application, matches [OAuth2 definition](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2). 

`correlationID`: A correlation ID for the application to track the specific request. The broker may choose to use this ID to associate telemetry and/or show users this ID in error scenarios to enable troubleshooting and error analysis.  

`isSecurityTokenService`:` When this flag is true, the broker is expected to validate that the request is coming from the Identity provider URL it expects. To do that, as part of the API contract between the browser and the broker, the browser will send an additional "sender" parameter (which is the URL of the website that is initiating the request). If it is valid, this call comes from a security token service (STS). The "sender" is not part of the API described in this document as it is not sent by the JS application, but by the browser itself.

`state`: OAuth protocol "state" param. It will be returned without changes in the response.  

`extraParameters`: A string map of additional parameters to send to token and authorize endpoints. 

There are additionally known optional parameters that can be passed in via the `extraParameters` map. This is to make the API easier to call from JS as most of the optional parameters will not be present. These optional parameters are:

`prompt`: Indicates the type of user interaction. The value should be `login`, `none`, `consent`, or `select_account`.

`nonce`: A nonce to prevent replay attacks.

`claims`: Additional optional claims.

`loginHint`: The UPN of the user which can enable lower-friction login UX.

`instanceAware`: Set to `true` if the application supports multiple national clouds.

`ProofOfPossessionParams`: The parameters used for Access Token (AT) proof-of-possession as described in [draft-ietf-oauth-signed-http-request-03](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-signed-http-request-03). For example, `bindingKeyInfo`, `keyId`, `tokenType`, `bindingClaims`, `bindingNonce`, `resourceRequestMethod`, `resourceRequestUri`, and `signPopToken`.

#### GetToken Response
The GetTokenResult is a dictionary that contain either an error or the response data (e.g. `access_token`, `id_token`, `account`, etc.). 

```
dictionary ErrorResult { 
    DOMString code, 
    DOMString? description, 
    DOMString errorCode, 
    DOMString? protocolError, 
    DOMString status, 
    record<DOMString, DOMString>? properties 
}   
```

`code`: Broker-defined error code. Potential values include `NoSupport`, `BadState`, `OSError`, and `BrokerError`.

`description`: A human-readable error description.

`errorCode`: Typically a numeric or enum-style string representation of the error to enable app-level telemetry and/or actionable error UX.  

`protocolError`: A string representing the protocol error, if any.

`status`: This value enables the site to show the user a more actionable error message. Values can include: 
```
USER_CANCEL: The user cancelled the authentication request without completing it. 

USER_INTERACTION_REQUIRED: The broker is unable to issue a token silently and requires the user to complete an interactive operation instead. 

UI_NOT_ALLOWED: The request failed due to UI restrictions in the current context.  

NO_NETWORK: The token request cannot be completed because the device does not have an active internet connection.  

TRANSIENT_ERROR: An error indicating that the request has failed and that retrying the request may succeed.  

PERSISTENT_ERROR: An errors indicating the request has failed and should not be retried as it will likely result in the same error.

ACCOUNT_UNAVAILABLE: The account requested by the web application was not found in the broker cache. For example, this can happen if accounts are deleted from the OS and/or brokers user settings UX.

DISABLED: The platform broker invocation is disabled and cannot be performed.  

THROTTLED: There were too many requests in a short period of time and the current request is throttled.  
```

If the site doesn't understand the status code, we recommend it show the user a generic message along with the error string provided by the broker to enable troubleshooting. 

`properties`: Additional error data that can be platform specific (e.g., additional diagnostic data that broker passes to the web app) .
 

```
dictionary Account { 
    DOMString id, 
    DOMString userName, 
    record<DOMString, DOMString>? properties 
}   
```

`id`: The account ID in the broker.

`userName`: The user's primary identifier with the identity provider (for example, for Entra ID, this will be the User Principal Name (UPN) of the user).

`properties`: Additional account details that the website can use to display more information about the account. For example, the user's first name, last name, and displayable name.

```
dictionary GetTokenResult  { 
    boolean isSuccess, 
    DOMString? state, 
    DOMString? accessToken, 
    unsigned long long expiresIn, 
    Account account, 
    DOMString? clientInfo, 
    DOMString? idToken, 
    DOMString? scopes, 
    DOMString? proofOfPossessionPayload, 
    boolean extendedLifetimeToken, 
    ErrorResult error, 
    record<DOMString, DOMString>? properties 
} 
```

`state`: State provided in the request.

`accessToken`: The access token.

`expiresIn`: Expiration of the access token from now (in seconds).

`account`: The user account data.

`clientInfo`. A base64-encoded string containing the UID and UTID identifiers for the user.

`idToken`: The ID token returned by the Secure Token Service.

`scopes`: The list of satisfied scopes.

`proofOfPossessionPayload`: If the request was for a bound access token (following one of the proof-of-possession RFCs), the resulting signed payload.

`extendedLifetimeToken`: `true` if the response was an extended lifetime token.

`properties`: Additional response data that also may include platform-specific telemetry data.

#### GetCookies Request
The `ApplyCookiesParameters` request parameter is a dictionary containing all parameters needed to obtain PRT-based cookies from the broker:  

```
dictionary ApplyCookiesParameters { 
    DOMString brokerId,
    DOMString uri 
}   
```
`brokerId`: Required parameter that identifies which platform broker to use. For Microsoft Entra brokers, this should be set to `MicrosoftEntra`. Browsers should define their own mechanisms for registering/exposing brokers.

`uri`: The URI for which the cookies request is done.

#### ApplyCookies Response 
The `ApplyCookiesResult` is also a dictionary that will contain a success flag and an error if needed. 
 
```
dictionary GetCookiesResult  { 
    boolean is_success, 
    ErrorResult error 
} 
```
`isSuccess`: `true` when the cookies have successfully applied to current origin and false otherwise.

#### SignOut Request
The `SignOutParameters` request parameter is a dictionary containing all parameters needed to sign out a user from the from the broker:  

```
dictionary SignOutParameters { 
    DOMString brokerId,
    DOMString accountId, 
    record<DOMString, DOMString>? extraParameters 
}   
```
`brokerId`: The same definition as for `ApplyCookiesParameters`.

`accountId`: The account ID for which the signout request is being made.

`extraParameters`: Optional broker-defined parameters.

#### SignOut Response 

The `SignOutResult` is also a dictionary that will contain an error in case there was an issue during signout. 

```
dictionary SignOutResult  { 
    ErrorResult error 
} 
```
 
## Policies  
We recommend user agents provide enterprise device administrators with a policy mechanism to control whether or not these APIs are visible to pages and/or functional. The browser should honor the state of its policy before allowing site access to the APIs.  

We further recommend that the policy **not** control the availability of the APIs on a per-site basis (e.g., one that takes a list of domains/origins that should be allowed to call the API). While a browser may choose to explore such a policy, past experience has shown policies of this nature are difficult for administrators to effectively manage.

We expect the broker and/or user to coordinate to determine what origins can successfully complete the binding flow. For example, the broker can choose to simply cancel out the request if the user has declined to allow the origin in the past, provide the user with a permissions UX to confirm they want to enable the operation, and/or automatically populate an allow list via a mechanism of its choosing.

In summary, this API will be accessible to all web sites. However, identity providers (IDPs) and brokers must ensure that applications carry out user-visible operations before a web application can silently collect user tokens. For instance, a web application should need to execute an interactive OAuth2 authorization API call once, during which the user would need to provide the standard OAuth2 consent.

## Privacy & Security 
These APIs only provide the ability to web app to interact with platform broker. The browser delegates to the broker and IDP the responsibility to ensure a level of privacy matching the enterprise's expectations by not returning info to sites that should not have access. To enable the broker to achieve this, the browser should automatically provide context about the source of the request when calling the platform broker.

## Alternative Solutions
These are the alternative solutions we considered and why we chose to pursue a new API instead:

* The [FedCM](https://github.com/w3c-fedid/FedCM) API.

  The FedCM API is generally focused on providing a low-friction sign-in experience to 3rd party websites in a privacy-preserving way.  

  The FedCM does not currently provide support for bound tokens, which is one of the main goals of our proposed APIs.

  It's possible that FedCM could evolve to support the high-level scenarios this API intends to address. It's also possible that a future FedCM flow could instead be used in conjunction with this API. We are open to ideas and conversations about a converged approach using FedCM.

* Direct access to the device's secure enclave/TPM.

  If sites could directly access the TPM (or a virtual TPM), some degree of site-driven device binding would be possible.

  However, such an approach does not provide the desired level of security. For example, it doesn't protect against malware running on the device (temporary malware on the device can inject its own binding keys). It doesn't provide binding associated with device registration (which is a one-time operation and thus minimizing the risk of malware compromising a user session).

  Additionally, some TPMs have had historical issues around denial-of-service attacks; there are concrete benefits to offloading the responsibility around reasonable calling patterns to the broker.

* A [DBSC(e)](https://github.com/WICG/dbsc/pull/67/files) device-level binding mechanisim.

  Various identity artifacts are produced as a result of user authentication, including tokens and cookies. DBSC(E) offers a mechanism to secure cookies but does not offer a mechanism to secure tokens used by JavaScript web applications. This proposal aims to address the security of tokens specifically. 

* Extend the WebAuthN APIs to enable this functionality.

  The Web Authentication API (WebAuthn) enables authentication using public key cryptography. After the user authenticates, identity systems issue more scoped cookies or tokens. This proposal focuses only on securing those tokens, which are not covered by the WebAuthN APIs.  

  Additionally, while accessing sensitive enterprise resources, users often need to perform a new authentication interaction. If new binding keys are established with each new authentication, device malware could manipulate the user to establish a new set of binding keys it controls. This proposal addresses this issue by allowing the broker to bind to long-term device keys that are established once, regardless of new user authentication attempts.
