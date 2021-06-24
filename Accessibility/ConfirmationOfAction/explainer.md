# Confirmation of Action

Authors: [Travis Leithead](https://github.com/travisleithead), [Daniel Libby](https://github.com/dlibby-)

## Abstract

For limited-vision or non-sighted users, identifying dynamic changes in the content
of a web app is very challenging. ARIA live regions are the only mechanism available
today that communicate content changes down to the accessibility layer so that users
can hear about them. ARIA live regions are stretched far beyond their original use
cases as authors struggle to use them in scenarios that they weren't designed for.
We propose a notification API purpose-built to communicate to the accessibility layer 
for scenarios in which ARIA live regions are a poor choice. One of these scenarios is
a "confirmation of action" where the action in question is not necessarily tied to UI 
(elements) in the app.

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **ARCHIVED**
* Current venue: [AOM](https://wicg.github.io/aom/) within the [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: https://wicg.github.io/aom/notification-api.html**
    
## Introduction

Screen readers provide an audible presentation of web content for various kinds
of users with disabilities (e.g., those with limited or no vision). The screen
reader knows what to say based on the semantic structure of a document. Screen
readers move through the content much the same way a sighted user might scan
through the document with their eyes. When something about the document changes
(above the fold), sighted users are quick to notice and process the change. When
something below the fold (offscreen) changes, sighted users have no way of knowing
that there was a change nor how important a change it might be. This is the 
conundrum for non-sighted users in general: how and when should changes in the
content be brought to their attention?

Screen readers and content authors work together to try and solve this problem. 
One way screen readers are informed about what might be an important change is
by the content author's use of ARIA live regions. A live region is an element (and
its children) that is expected to change dynamically, and for which the changes
should be announced to the user. The live region can be configured with two 
different assertiveness settings: `polite` and `assertive`.

Unfortunately, live regions are essentially _the only way_ for content authors
to express changes in the document to assistive technology. Given the lack of
other solutions, content authors use live regions in some unusual ways that far
exceed the use-cases for which they were envisioned. Today's usage patterns and 
pre-existing issues with the feature make it a challenge to use effectively:

* Screen reader output varies greatly depending on the complexity of the live
  region's content. Content authors that want a consistent experience in different
  screen readers often strip-out all the richness (and semantics) of the HTML 
  content in the live region, leaving only simple text content in hopes of
  getting a more uniform experience.

* Multiple live regions in use at a time introduce timing and precedence concerns
  for which content authors have limited control (e.g., `polite` and `assertive`
  set basic expectations around precedence of announcements, but offer little
  in the way of expressing timing (apart from the moment the change is made), or 
  other controlling factors like interruptability.

* Live regions are built around the assumption that a _visual_ change needs to be
  announced, hence they are tightly coupled with DOM nodes. Many changes important
  to announce are not necessarily tied to a visual action. In these cases, "live 
  region hacks" are employed using offscreen DOM nodes to host the live region. In
  these cases there is no surrounding context (an important consideration for many
  screen readers), nor any presentation to show. Worse yet, since these "live region
  hacks" do not play a role in the normal presentation flow of the content, they 
  are usually ommitted for performance reasons until it is determined that a 
  particular user needs an "accessible version" of the site (or by heuristically 
  trying to detect this--which is not a recommended practice). Accessibility should
  be designed into the experience from the start, and not bolted-on as an extra or
  add-on feature.

* Live-region only offer two verbosity extremes that may not strike the right 
  balance desired by content authors. `polite` may not be assertive enough (e.g., 
  in some screen readers is canceled/overridden by other basic operations like focus
  changes) and `assertive` may be too aggressive (e.g., interrupts or delays other
  relevant context changes).

## Goals

* Find a solution that can expand the capabilities presently offered by live-regions
  to offer additional desired behavior
* Look into the scenarios where "live region hacks" are being used and understand the
  use cases and tailor an experience for those use cases. Replace the usage of "live 
  region hacks" on the web with a more appropriate solution.

## Non-Goals

* We do not want to replace live-regions with an alternate technology. Live regions work
  for a set of typical use cases and fulfill those cases when content authors use them 
  appropriately.
  
## Use Cases

The following use cases represent current "live region hacks" where live regions are
stretched beyond their intended usage. These usage patterns are better served by a new
solution that compliments live regions.

### Keyboard action confirmation

Keyboard commands not associated with UI often do not have an affordance for confirming
their state. The following cases are variations on this theme:

1. **Glow text command:** User is editing text, highlights a word and presses 
    `Shift`+`Alt`+`Y` which makes it glow blue. No UI elements were triggered or changed
    state, but the user should hear some confirmation that the action was successful, 
    such as "selected text is now glowing blue."

2. **Set Presence**. In a chat application, the user presses `Shift`+`Alt`+`4` to toggle
    their *presence* state to `do not disturb`. The application responds with "presence set
    to do not disturb." 

   2.1. **Most recent notification priority:** the user presses `Shift`+`Alt`+`3` by mistake,
         and then quickly presses `Shift`+`Alt`+`4`. The application began to respond with
         "presence..." [set to busy] but interrupts itself with the latest response "presence
         set to do not disturb."

   2.2. **Overall priority.** The user presses `Shift`+`Alt`+`4`, then immediately issues an
         AT command to jump to the next header. The response "presence set to do not disturb"
         is not announced because the focus change to the next header and subsequent contextual
         read-out preempted it.

### Failed or delayed actions

According to common screen reader etiquette, user actions are assumed to be successful by
virtue of issuing the command to do the action itself (no specific confirmation of the action
needed); however, if the action fails or is delayed, the user should then be notified. In these
unexpected cases users should be notified, otherwise their understanding about the state of the
app will be off.

3. **Longer than usual.** User completes typing a mail message, presses _send_. In the normal
    flow, no confirmation of "sent" is needed because this is assumed by the action, and focus
    is redirected to the message list or next message. However, due to some networking conditions,
    the _send_ action is taking longer than usual. The user should hear "message is taking longer
    than usual to send".

    3.1. **High overall priority.** After pressing _send_, the user resumes navigating through
          the message list. At the conclusion of reading an existing email subject line, the AT
          breaks in with "message is taking longer than usual to send". (Note, there should be
          some means of separating this announcement from the prior email text, lest it be
          considered a part of the email subject line).

4. **Fail to paste.** User thought they had copied some text onto the clipboard, but in the
    context of editing when they issue the paste keyboard shortcut, nothing is in the clipboard
    and nothing pastes into the app. In this case, it is appropriate for the app to note the
    failed action: "failed to paste, clipboard empty". 

### Secondary actions

In addition to a primary (implicit) action, some actions have secondary or follow-up effects 
that should be announced beyond the immediate effect of the primary action.

5. **Auto fill.** In a spreadsheet, an action that sets a cell's value may be assumed to happen
    (no announcement) or could be announced as a side-effect of changing the cell's value (e.g., 
    using a live region). In either case this would be the normal expectation for the user. However,
    as a result of setting the value, the spreadsheet triggered a secondary action of autofilling a
    range of corresponding values in the cell's column. This is an opportunity for the app to 
    additionally announce "autofilled values in cells A2 through A20".

## Proposed Solution

(This version inspired by [UIA Notification API](https://docs.microsoft.com/en-us/windows/win32/api/uiautomationcoreapi/nf-uiautomationcoreapi-uiaraisenotificationevent))

For use cases that don't have an express UI tie-in, it makes sense to provide a solution
not expressly tied to HTML element, but for which other document-centric information can
be inferred (such as language).

```js
// As the assistive technology to notify the user, given a specific string
document.ariaNotify( "Selected text is now glowing blue." );
```
A screen reader or other assistive technology tool would speak or show "selected text is now
glowing blue". For users without assistive technology tools running, nothing would happen.
The call to the API has no web-observable side effects and its use should not infer that the 
user is using assistive technology. 

Here the content author provides a label to group a set of related notification about the 
clipboard.

```js
// Use a label to categorize this notification
document.ariaNotify( "Paste failed.", { label: "clipboard" } );
document.ariaNotify( "Text copied to clipboard.", { label: "clipboard" } );
```

The label is used to group or categorize similar notifications. Assistive technology may
chose to use these labels to provide a filtering mechanism for users.

Other means of expressing priority and coalescing behavior for similarly-labelled 
notifications may be defined.

```js
// Experiment with priority and message combining
let ariaNotifyOptions = {
  required: true,
  priority: "important",
  label: "formatting commands"
};
// (Each of these triggered by rapid keyboard shortcut usage, of course)
document.ariaNotify( "Text bolded", ariaNotifyOptions );
document.ariaNotify( "Text unbolded", ariaNotifyOptions );
document.ariaNotify( "Text bolded", ariaNotifyOptions );
document.ariaNotify( "Text unbolded", ariaNotifyOptions );
```

The above `priority` and `required` options are only suggestions. We invite the community
to provide feedback on what priority or coalescing behavior is appropriate given the range 
of platforms and assistive technologies on the web.

## Considerations & Open Issues

#### Only plain text as input?

Should the API allow for richer formatted text? Formatted text could provide hints 
for expressiveness and pronounciation (TTML and WebVTT are potential candidates).

What about supporting non-textual cues? We think other platform capabilities (like 
`<audio>.play()`) can be used to handle non-textual output, and that non-textual
based messages don't need to be handled by this API.

#### Document vs Element exposure

With a single API offered on the `document` object, the notion of priority and 
language (see below) must be made explicit in the API. As an alternative, an 
element-based API could use facets of its context to make some of the priority
and language, etc. more implicit. For example, an element's visibility state,
layout position, level in the DOM hierarchy, and computed language value (via 
`lang` attributes) could be used to infer context and priority for a notification
queued from that element.

#### Language input

Should language preference or hints be added to the API? Presumably the author's 
language can be implied by context outside of this proposal (i.e., explicitly by 
required language tags or implicitly via textual analysis at the AT layer). In 
some scenarios it might be helpful to offer notifications in a language not 
inferred from other context (such as how automated helpdesk phone systems might
offer assistance in alternate languages--prompts spoken in those alternate 
languages).

#### Catering to verbosity preferences?

It may useful to enable authors to offer multiple levels of verbosity for a
notification depending on how a user has configured their AT. For example, if ATs
are configured for minimal output, perhaps a single word could additionally be
provided that generalizes the full text of the notification.

Alternatively, ATs may process the text content and apply heuristics to shorten 
the text automatically (without complicating the API or relying on authors to furnish
additional terse phrases).

#### Too easy to abuse?

Will this API be a "footgun" that will lead to inappropriate usage patterns? The
general nature of a notification API means that authors could use it for scenarios 
that are already handled by the AT (such as for focus-change actions) resulting in
confusing double-announcements (in the worst case) or extra unwanted verbosity (in
the best case). 

Note: ATs tune their behavior for the best customer experiences. AT provided 
verbosity settings matching user preferences could conflict with author expectations
leading to poor experiences.

Authors may also apply the use of this API too liberally, confirming many trivial
user actions where typical expectations do not require any notification.

We can consider making use of 
[User Activation](https://html.spec.whatwg.org/multipage/interaction.html#tracking-user-activation)
primitives to limit usage of this API to only actions taken by the author, and to
avoid the risk of denial-of-service type attacks on ATs through this API.

## Privacy and Security Considerations

1. **Readback.** Any readback of configuration settings for an AT via an API have the
    potential of exposing a connected (vs. not connected) AT, and as such is an easy
    target for fingerprinting AT users, an undesireable outcome. Similarly, confirmation
    of notifications (such as via a fulfilled promise) have similar traits and are
    avoided in this proposal.
2. **Authoritative-sounding notifications.** Announcements could be crafted to deceive
    the user into thinking they are navigating trusted UI in the browser by arbitrarily 
    reading out control areas/names that match a particular target browser’s trusted UI.
    *  Mitigations should be applied to suppress notifications when focus moves outside 
        of the web content.
    *  Additional mitigations to block certain trusted phrases related to the browser's
        trusted UI could be considered.
3. **Secure Context**. Does it make sense to offer this feature only to Secure Contexts?
    Should usage of this API be automatically granted to 3rd party browsing contexts?
4. **Data Limits** (See [Security and Privacy Questionnaire #2.7](https://www.w3.org/TR/security-privacy-questionnaire/#send-to-platform))
    Should there be a practical limit on the amount of text that can be sent in one call 
    to the API? Just like multiple-call DoS attacks, one call with an enormous amount of
    text could tie up an AT or cause a hang as data is marshalled across boundaries.
    
## Alternative Solutions

Previous discussions for a Notifications API in the AOM and ARIA groups:
* [Issue 3 - Use Case: Accessibility Notifications](https://github.com/wicg/aom/issues/3)
* [Issue 84 - Live region properties vs announcement notification](https://github.com/WICG/aom/issues/84)
* [Issue 832 - Do we need a notifications API in ARIA](https://github.com/w3c/aria/issues/832)


