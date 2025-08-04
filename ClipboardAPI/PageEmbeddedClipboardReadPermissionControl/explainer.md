# Page Embedded Clipboard Read Permission Control

## Improving permission control for clipboard reads through permission element

**Author:**  [Utkarsh Pathak](https://github.com/utpathak)

**Co-authors:**  [Abhishek Singh](https://github.com/abhishek06020), [Tanu Jain](https://github.com/tanujain_microsoft), [Rakesh Goulikar](https://github.com/ragoulik)

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/pepcforclipboardread)
- [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=ragoulik&labels=pepcforclipboardread&template=pepc-for-clipboard-read.md&title=%5BPEPC+for+clipboard+read%5D+%3CTITLE+HERE%3E)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Introduction](#introduction)
- [User Problem](#user-problem)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposal](#proposal)
- [Considered Alternatives](#considered-alternatives)
  - [Extending the Permissions API to Provide an Anchor Point](#extending-the-permissions-api-to-provide-an-anchor-point)
    - [Pros of First Alternate Approach](#pros-of-first-alternate-approach)
    - [Cons of First Alternate Approach](#cons-of-first-alternate-approach)
  - [Allowing Recovery via the Regular Permission Flow](#allowing-recovery-via-the-regular-permission-flow)
    - [Pros of Second Alternate Approach](#pros-of-second-alternate-approach)
    - [Cons of Second Alternate Approach](#cons-of-second-alternate-approach)  
- [References and Acknowledgements](#references-and-acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

This proposal introduces an extension of the [permission element](https://www.w3.org/TR/permissions) to support clipboard read permissions (clipboard-read). The goal is to make clipboard access predictable, recoverable, and user-friendly by allowing developers to declaratively request permissions in context, using clearly labelled, browser-controlled UI affordances. 

```html
// Example html code
<permission type="clipboard-read"></permission>
```

This explainer outlines how the dedicated permission element model can bring clarity and consistency to clipboard interactions, building upon the same foundation as camera and microphone permissions. 


## User Problem

Users encounter clipboard permission prompts while performing actions like copy or paste on the web based on the state of the permissions. However, these prompts are frequently misunderstood, dismissed, or denied—sometimes accidentally, sometimes intentionally, and often due to unclear messaging. Once denied, clipboard operations silently fail with no further guidance, leaving users confused about what went wrong. 

The lack of intuitive messaging and the complexity involved in re-enabling permissions results in a frustrating and broken user experience. Users are often unaware that their copy/paste action failed due to permission denial, and even when they realize it, they struggle to locate the settings needed to restore clipboard access. 

This creates a recurring failure loop—where the application’s functionality appears broken, and the user is left without any actionable recovery path. 

**User anecdote:**

“I had a window pop up on a website where I was copying text and pictures to my clipboard. The popup window said something about the clipboard, and I mistakenly clicked block. Now I can no longer copy pictures to my clipboard on this website. How do I un-block the clipboard function on this website?”  Source: [How do I unblock the clipboard for a website - Microsoft Q&A](https://learn.microsoft.com/en-in/answers/questions/766718/how-do-i-unblock-the-clipboard-for-a-website) 

The table below outlines user problems and scenarios, mapped to their intent to use the clipboard and the corresponding permission state at that moment. 

<table border="1">
  <tr>
    <th></th>
    <th>Clipboard working on site</th>
    <th>Clipboard not working on site (site or OS permission missing)</th>
  </tr>
  <tr>
    <td><strong>Intent to use clipboard on site</strong></td>
    <td>✅ True positive: Intent correctly captured.</td>
    <td>❌ False negative: User intended to use clipboard but permission is blocked (Site/OS) or they changed their mind. <strong>Solution:</strong> Clear intent by clicking the <code>&lt;permission&gt;</code> element to show the prompt again.</td>
  </tr>
  <tr>
    <td><strong>No intent to use clipboard on site</strong></td>
    <td>❌ False positive: Permission granted without user intent. <strong>Solution:</strong> <code>&lt;permission&gt;</code> element requires explicit user click on clearly labeled button to show prompt.</td>
    <td>✅ True negative: Intent correctly captured.</td>
  </tr>
</table>

## Goals

- Improve User Clarity Around Clipboard Permission Prompts: 
 Help users better understand why clipboard read access is being requested, so that they can make informed choices when prompted by the browser 

- Enable User Recovery Paths for Denied Clipboard Permissions: 
 Offer UI affordances or mechanisms that let users easily reverse an accidental "Block" decision, either directly in the browser or through app-driven nudges. 

- Align Clipboard Permission UX with Broader Web Permissions Model 
 Ensure that improvements to clipboard permission flows are consistent with the evolving privacy and permissions architecture of the web platform. 

## Non-Goals

- The proposal will not introduce a way to bypass explicit user permission for clipboard reads, nor will it reduce privacy protections around clipboard access. 

- The scope of this proposal is limited to read access via the Clipboard API; it does not include any modifications to the flow of clipboard write permissions. 

## Proposal

We propose supporting a new permission type for the <permission> HTML element: 

clipboard-read: Allows reading from the user's clipboard. 

This element will behave similarly to microphone/camera permission buttons but are tailored to the paste UX. 

```html
// Example html code
<style> 

  permission { 

    background-color: lightgray; 

    color: black; 

    border-radius: 10px; 

  } 

</style> 

<permission type="clipboard-read"></permission> 
```

![](img/Use%20clipboard-read.png)


## The permission UI extended to clipboard permissions: 

- Standard UI:   
![](img/First%20Prompt.png)

- UI When permission is already granted:    
![](img/permission%20granted.png)

- UI When permission is denied:     
![](img/permission%20denied.png)

## Considered Alternatives:

### 1. Extending the Permissions API to Provide an Anchor Point

This approach extends the permissions API with a request () function that accepts and HTML element as an anchor for positioning the permission prompt.

```html
<p id="pepc_anchor">This is where the permission prompt will be anchored</p> 
<script> 
navigator.permissions.request( 
{ name: 'geolocation' }, 
document.getElementById('pepc_anchor'), 
); 
</script> 
```

#### Pros of First Alternate Approach

- Adress prompt positioning for better user experience and getting out of failure loop. 

#### Cons of First Alternate Approach

- It doesn’t provide robust user intent as a user click can’t be assured, leaving the doors open to abuse by malicious sites. 

### 2. Allowing Recovery via the Regular Permission Flow

We considered modifying the regular, usage-triggered permission flow to allow users to recover from blocked states. 

#### Pros of Second Alternate Approach
- Streamlines the user journey by enabling reconsideration within the current flow; reduces need for complex browser/OS settings navigation. 

#### Cons of Second Alternate Approach
- This needs to be carefully balanced against preventing spam. Solutions like reputation-based mechanisms or heuristics were deemed ethically and technically difficult, prone to manipulation, and unlikely to achieve the same high precision of user intent as a direct interaction with a dedicated element. An unpredictable heuristic would also lead to a poor developer and user experience. 

## Accessibility, Privacy, and Security Considerations

This proposal does not introduce new risks or changes to accessibility, privacy, or security for clipboard operations. It maintains the fundamental permission and security requirements of the async Clipboard API (navigator.clipboard), including the need for a secure context and a user gesture to access clipboard contents. 

## References and Acknowledgements 
Reference : [Github discussion](https://github.com/WICG/PEPC/blob/main/explainer.md)

Many thanks for valuable feedback and advice from:
- [Rohan Raja](https://github.com/roraja)
