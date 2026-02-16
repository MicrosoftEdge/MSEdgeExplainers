# Standardized Clipboard Source URL

## Enabling Consistent Clipboard Provenance Metadata Across Browsers

**Authors:** [Rakesh Goulikar](https://github.com/ragoulik)

**Co-authors:** [Tanu Jain](https://github.com/tanu18)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/ClipboardSourceUrl)
- [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=ragoulik&labels=ClipboardSourceUrl&title=%5BClipboard+Source+Url%5D+%3CTITLE+HERE%3E)
- [W3C Clipboard APIs Issue #244 — Standardize Clipboard Source URL](https://github.com/w3c/clipboard-apis/issues/244)

## Table of Contents

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposed Approach](#proposed-approach)
  - [How It Works](#how-it-works)
  - [Proposed IDL](#proposed-idl)
- [Practical Use Cases](#practical-use-cases)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
- [Testing](#testing)
- [Appendix](#appendix)
  - [Appendix 1: ClickFix and Clipboard-Based Attacks](#appendix-2-clickfix-and-clipboard-based-attacks)

## Introduction

This proposal introduces a **standardized clipboard provenance metadata field** — a source URL that identifies the origin (web page URL) from which content was copied to the system clipboard. Today, browsers already write this provenance information to the clipboard, but each implementation uses a different agent-specific MIME type:

| Browser | Current MIME Type |
|---|---|
| Chrome / Edge | `Chromium Internal Source URL` |
| Firefox | `text/x-moz-url-priv` |
| Safari | No known equivalent |

This fragmentation forces platform-level security applications (antivirus, endpoint protection, data loss prevention tools) to implement browser-specific detection logic — or miss clipboard-borne threats entirely. **This proposal standardizes the field name and format** so that clipboard provenance can be reliably consumed across all browsers and platforms, without exposing any new information to web developers via the Clipboard API.

No major operating system — Windows, macOS, or Linux — defines a standard clipboard format for provenance metadata. Each platform provides mechanisms for applications to register custom formats, but none prescribe a specific type for recording where content was copied from. Since the vast majority of clipboard content with web provenance originates from browser applications, the **web platform specification is the appropriate place** to standardize this field.

## User-Facing Problem

Modern clipboard-based attacks — such as [ClickFix](https://textslashplain.com/2025/04/15/vibe-coding-for-security/) — trick users into copying and pasting malicious commands from untrusted websites into terminals, address bars, or PowerShell prompts. Security tools that monitor the system clipboard can detect and warn users about such threats, **but only if they can reliably determine where the clipboard content came from**.

**Today's situation:**

- A user visits a malicious website that instructs them to press Ctrl+C, copying a hidden payload to the clipboard.
- The user pastes the payload into a terminal. The content executes a harmful command.
- An endpoint protection tool monitoring the clipboard *could* have flagged this — but it checks only `Chromium Internal Source URL` and the user was browsing with Firefox (which writes `text/x-moz-url-priv` instead) or another browser that does not capture this information. The attack goes undetected.

**With this proposal:**

- Standards guidance: All browsers write the source URL to a **single, standardized clipboard metadata field**.
- Security tools check one consistent field, regardless of which browser the user is using.
- The malicious origin is detected, and the user is warned before pasting.

Without standardization, security coverage is inherently incomplete and brittle — each new browser version or vendor-specific change can silently break detection logic.

## Goals

- **Standardize the clipboard provenance metadata field** (source URL) across browsers with a consistent MIME type name and value format.
- **Improve interoperability** for platform-level applications that consume clipboard metadata, including antivirus, endpoint protection, and data loss prevention (DLP) tools.
- **Reduce fragmentation** by replacing vendor-specific MIME types (`Chromium Internal Source URL`, `text/x-moz-url-priv`) with a single specification-defined field.
- **Formalize existing behavior** — this does not introduce a new capability; it standardizes what browsers already do.

## Non-Goals

- **Exposing the source URL to web developers via the Clipboard API.** The standardized field is intended for platform-level consumption only and MUST NOT be readable through `navigator.clipboard.read()` or related web APIs.
- **Modifying clipboard write APIs.** This proposal does not change `navigator.clipboard.write()` or `navigator.clipboard.writeText()`.
- **Defining how security tools should use the source URL.** This proposal standardizes the metadata; the policy decisions (block, warn, allow) are left to the consuming applications.

## Proposed Approach

We propose adding a new **specification-defined clipboard metadata format** that browsers write to the system clipboard whenever a copy operation occurs. The format stores the URL of the document from which the content was copied.

### How It Works

1. **On copy (Ctrl+C, Cmd+C, `document.execCommand('copy')`, or `navigator.clipboard.write()`):**
   The browser writes the source document's URL to the system clipboard using a standardized MIME type, in addition to the content formats already written (e.g., `text/plain`, `text/html`).

2. **The standardized MIME type:**
   We propose `text/source-url` as the MIME type. The value is the full URL of the document where the copy originated. For `about:blank`, `data:` URIs, or contexts where the URL should not be disclosed, the field is omitted.

3. **Platform-level consumers (security tools, DLP agents):**
   These tools read the `text/source-url` field from the system clipboard using OS-level clipboard APIs (e.g., `GetClipboardData` on Windows, `NSPasteboard` on macOS). They do **not** use web APIs to access this.

4. **Web developers:**
   The `text/source-url` format is **not** exposed through `navigator.clipboard.read()`. Web applications cannot read this field. This is consistent with the current behavior — `Chromium Internal Source URL` is already excluded from the async Clipboard API response.

```
┌──────────────────────────┐
│   User copies content    │
│   from a web page        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Browser writes to      │
│   system clipboard:      │
│                          │
│   text/plain: "..."      │
│   text/html: "<p>..."    │
│   text/source-url:       │  ◀── NEW: Standardized provenance
│     "https://example.com"│
└────────────┬─────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌──────────┐   ┌──────────────┐
│ Web Apps │   │ Platform     │
│ (read()  │   │ Security     │
│ API)     │   │ Tools        │
│          │   │              │
│ ❌ Cannot│   │ ✅ Can read  │
│ see      │   │ text/        │
│ source-  │   │ source-url   │
│ url      │   │ via OS APIs  │
└──────────┘   └──────────────┘
```

### Proposed IDL

No IDL changes to the Clipboard API are required, since this metadata is not exposed to web content. The specification change is to the **clipboard writing algorithm** — specifically, the step where the browser populates the system clipboard with data formats.

**Proposed specification text (sketch):**

> When the user agent writes data to the system clipboard as part of a copy or cut operation, and the source document has a URL that is not a local scheme (e.g., not `about:`, `data:`, `blob:`), the user agent SHOULD also write the document's URL to the system clipboard using the `text/source-url` MIME type. This format MUST NOT be included in the list of types returned by `ClipboardItem.types` or be readable via `Clipboard.read()`.

## Practical Use Cases

### Use Case 1: Endpoint Protection Detecting ClickFix Attacks

**Before standardization:**

```
// Security tool on Windows
HANDLE hSourceUrl = GetClipboardData(RegisterClipboardFormat("Chromium Internal Source URL"));
if (hSourceUrl == NULL) {
    // Try Firefox format
    hSourceUrl = GetClipboardData(RegisterClipboardFormat("text/x-moz-url-priv"));
}
if (hSourceUrl == NULL) {
    // Unknown browser — no provenance available
    // Attack may go undetected
}
```

**After standardization:**

```
// Security tool on Windows — single, reliable check
HANDLE hSourceUrl = GetClipboardData(RegisterClipboardFormat("text/source-url"));
if (hSourceUrl != NULL) {
    char* url = (char*)GlobalLock(hSourceUrl);
    if (is_known_malicious(url)) {
        warn_user("Clipboard content was copied from a known malicious site.");
    }
    GlobalUnlock(hSourceUrl);
}
```

### Use Case 2: Data Loss Prevention (DLP)

An enterprise DLP system monitors the clipboard to prevent sensitive data from being copied out of approved applications. With a standardized source URL, the DLP agent can:

- **Allow** pastes originating from `https://internal-docs.corp.example.com`
- **Warn** on pastes from unknown origins
- **Block** pastes from URLs matching known exfiltration patterns

### Use Case 3: Copy Attribution in Web-Based Editors

While web developers cannot read `text/source-url` directly, native companion applications (e.g., a desktop note-taking app) could use it to automatically attribute pasted content to its source page — improving content provenance and citation workflows.

## Alternative Considered

### Do Nothing (Status Quo)

Leave each browser to use its own vendor-specific format.

**Why not chosen:**
- Security tools must maintain browser-specific detection logic that is fragile and incomplete.
- New browsers or browser updates can silently break detection.
- Firefox is independently proposing standardization ([Bug 1965323](https://bugzilla.mozilla.org/show_bug.cgi?id=1965323)), indicating cross-vendor interest in solving this problem.

## Accessibility, Internationalization, Privacy, and Security Considerations

### Privacy

This proposal has been carefully designed to **not increase the amount of information exposed** to web applications. The `text/source-url` field:

- Is **NOT** readable by web content via the Clipboard API.
- Is only accessible to platform-level applications using OS clipboard APIs, which *already* have full access to all clipboard content.
- Does not expose any information that the platform-level consumer could not already obtain by parsing the `text/html` clipboard content (which often contains `SourceURL` comments in Chromium).

The privacy properties are **equivalent to today's behavior** — the source URL is already written to the clipboard by Chrome/Edge and Firefox; this proposal simply standardizes the field name.


### Security

This proposal **improves security** by enabling more reliable detection of clipboard-based attacks such as:

- **ClickFix attacks** — where malicious websites trick users into copying and pasting commands.
- **Clipboard poisoning** — where web content overwrites the clipboard with malicious payloads.
- **Phishing via paste** — where copied URLs or content redirect to attacker-controlled destinations.

Standardized provenance metadata allows security tools to consistently identify the origin of clipboard content and take appropriate protective action.

### Accessibility

This proposal has no impact on accessibility. It does not change any user-facing UI or interaction patterns.

### Internationalization

The source URL value is always a URL string (ASCII/percent-encoded), so internationalization considerations do not apply.

## Testing

Testing for this feature should cover:

1. **Copy from a regular web page** — verify `text/source-url` is written with the correct document URL.
2. **Copy from `about:blank` / `data:` URI** — verify `text/source-url` is omitted.
3. **Copy via `navigator.clipboard.write()`** — verify `text/source-url` reflects the calling document's URL.
4. **Copy via `document.execCommand('copy')`** — verify `text/source-url` is written.
5. **`navigator.clipboard.read()` does NOT include `text/source-url`** in the returned `ClipboardItem.types`.
6. **Cross-origin iframe copy** — verify the source URL reflects the iframe's origin, not the parent.

## Appendix

### Appendix 1: ClickFix and Clipboard-Based Attacks

ClickFix is a social engineering attack pattern where a malicious webpage:

1. Displays a dialog instructing the user to "fix" a problem by pressing a key combination.
2. The key combination triggers a copy, placing a malicious command on the clipboard.
3. The user is instructed to paste the content into the Windows Run dialog or a terminal.
4. The pasted command executes malware or grants remote access.

Security tools monitoring the system clipboard can intercept step 3, but **only if they can determine the clipboard content originated from an untrusted source**. Standardized clipboard provenance makes this detection reliable across all browsers.

For more details, see: [Attack Techniques: Trojaned Clipboard](https://textslashplain.com/2024/06/04/attack-techniques-trojaned-clipboard/)

## References

- [W3C Clipboard APIs Specification](https://www.w3.org/TR/clipboard-apis/)
- [W3C Clipboard APIs Issue #244 — Standardize Clipboard Source URL](https://github.com/w3c/clipboard-apis/issues/244)
- [Firefox Bug 1965323 — Standardize source URL MIME type](https://bugzilla.mozilla.org/show_bug.cgi?id=1965323)
- [TPAC 2025 Editing WG Discussion](https://github.com/w3c/editing/issues/487)
- [Attack Techniques: Trojaned Clipboard](https://textslashplain.com/2024/06/04/attack-techniques-trojaned-clipboard/)
- [ClickFix Attacks Blog Post](https://textslashplain.com/2025/04/15/vibe-coding-for-security/)
