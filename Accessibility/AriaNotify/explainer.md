# ARIA Notify

Authors: [Doug Geoffray](), [Alison Maher](), [Sara Tang](https://github.com/sartang), [Travis Leithead](https://github.com/travisleithead), [Daniel Libby](https://github.com/dlibby-)

## Introduction

### Abstract
For people who are blind or have low vision, identifying dynamic changes (non-user-initiated) in the content of a web
app is very challenging. ARIA live regions are the only mechanism available today that communicate content changes down
to the accessibility layer so that users can hear about them. ARIA live regions are inconsistently implemented, have
poor developer ergonomics, and are being used in ways that they weren't designed for (e.g., as a confirmation of action
or notification-like API for changes unrelated to "live regions"). We propose an imperative notification API designed to
replace the usage of ARIA live regions in scenarios where a visual "live region" isn't necessary. 

### Background
Screen readers provide an audible presentation of web content for various kinds of users with disabilities (e.g., those
with limited or no vision). The screen reader knows what to say based on the semantic structure of a document. Screen
readers move through the content much the same way a sighted user might scan through the document with their eyes. When
something about the document changes (above the fold), sighted users are quick to notice the change.  When something
below the fold (offscreen) changes, sighted users have no way of knowing that there was a change nor how important a
change it might be. This latter case is the conundrum for non-sighted users in general: how and when should changes in
the content be brought to their attention? 

Screen readers and content authors work together to try and solve this problem.  One way screen readers are informed
about content changes is through ARIA live regions. A live region is an element (and its children) that is expected to
change dynamically (such as a message chat), and for which the changes should be announced to the user. 

The design of live regions is intended to give maximum flexibility to screen readers to implement an experience that is
best for their users. Web authors provide hints via attributes on the live region element in order to influence the
spoken output, such as: 
 - `aria-atomic`: should the whole text content of the element be notified or just the changes since the last update? 
 - `aria-relevant`: which content changes are relevant for the notification?  Additions or removals (or both)? 
 - `aria-busy`: signals that a batch of changes are coming and to wait until the batch is complete before notifying. 
 - `aria-live`: a general signal of the priority of the region's changes: "assertive" or "polite". 

### Problems with Consistency and Predictability 
Content authors have a difficult time creating consistent and predictable notification experiences for their users with
accessibility needs even with the above-mentioned controls. One of the reasons is due to the variation in screen reader
implementation approaches. In other cases, the inner workings of a browser's accessibility tree are the source of the
problem. Some examples: 
 1. Screen reader output varies greatly depending on the complexity of the live region's content (e.g., elements and
 nested elements). To get consistency, content authors will strip-out all the richness (and semantics) of the HTML
 content in the live region, leaving only text in hopes of getting a more uniform experience. 
 2. When content authors update the DOM in a live region, those changes may or may not get sent by the browser to a
 screen reader. [In one
 case](https://docs.google.com/document/d/1NaQS90h_LPD1YduCk2Gj4i5GMycjnksbQIpVJ67ooCA/edit?resourcekey=0-_z0yTNYZkPteppA1UGGNPw#heading=h.opld0djiwaju),
 it was discovered that the browser's implementation was not properly detecting changes to the live region. 
 3. The available priority controls (`assertive` vs. `polite`) are not well specified and are up to the interpretation
 of screen readers. In one instance, an author wanted to make a live region announcement immediately following a user
 action to supplement it with related context. However, the `polite` setting was too polite; a subsequent focus change
 would always mute the announcement. The `assertive` setting was too assertive and caused subsequent (important) focus
 change context to be lost while the assertive announcement was made. 

Content authors still rely on live regions because that is the only tool available for the job. They do the best that
they can, resorting to ugly "hacks", fragile coding patterns, and blatant misuse of ARIA live regions. There is a better
way. 

### Additional Concerns 
 - Live regions are built around the assumption that a visual change needs to be announced, hence they are tightly
 coupled with DOM nodes. Many important changes are not necessarily tied to a visual action. In these cases, "live
 region hacks" are employed using offscreen DOM nodes to host the live region -- there is no surrounding context (an
 important consideration for many screen readers), nor any area to focus (for low-vision users). 
 - Offscreen live regions (see above) do not play a visual role in the content's presentation and as a result are
 subject to second-class treatment. They can be forgotten about during content updates, accidentally broken due to
 missing testing, or simply relegated to an "accessible version" of the site, usually because of performance overhead
 concerns. Accessibility should be designed into the content experience from the start, not bolted-on as an extra or
 add-on feature. 

## Use Cases 
### Keyboard action confirmation 
Keyboard commands (especially those without a corresponding UI affordance) when activated may need to confirm the
associated state change with the user. The following cases are variations on this theme: 
 - **Glow text command**: User is editing text, highlights a word and presses Shift+Alt+Y which makes it glow blue. No
 UI elements were triggered or changed state, but the user should hear some confirmation that the action was successful,
 such as "selected text glowing blue". 
 - **Set Presence**: In a chat application, the user presses Shift+Alt+4 to toggle their presence state to "do not
 disturb". The application responds with "presence set to do not disturb". 
   - Most recent notification priority: The user presses Shift+Alt+3 by mistake, and then quickly presses Shift+Alt+4.
   The application began to respond with "presence..." [set to busy] but interrupts itself with the latest response
   "presence set to do not disturb". 
   - Overall priority: The user presses Shift+Alt+4, then immediately issues a command to the screen reader to jump to
   the next header. The response "presence set to do not disturb" may be skipped, deferred, interrupted, or pre-empted
   by the announcement of the focus change event depending on the content author's design.
 - **Filter editing confirmations**: User is editing text using bold, italic, underline, etc.. By default, the
 application responds with confirmations such as "bold on" / "bold off" as they toggle each state. As the application
 sends the confirmation for the user's actions, it also attached a unique identifier indicating the string is a
 confirmation for a basic editing command. Based on this identifier, the screen reader gives their users the following
 choices: 
   - Speak and Braille the confirmation notice, as normal 
   - Speak but do not flash the confirmation in Braille 
   - Filter/suppress the entire confirmation from speech and Braille 
   - Replace speech with a quick confirmation tone 
   - Any other option the screen reader believes would be beneficial to their users 

### Failed or delayed actions 
According to common screen reader etiquette, user actions where the context is clear are assumed to be successful by
virtue of issuing the command to do the action itself (no specific confirmation of the action is needed); however, if
the action fails, is delayed, or no focus or state changes are generated, the user should then be notified. Otherwise,
the user's understanding about the state of the app could be wrong. 
 1. **Longer than usual**: User composes an email and presses send. In normal circumstances, the message is sent, and a
 focus change occurs (no confirmation of "sent" is needed). However, due to networking conditions, the send action is
 taking longer than usual. The user hears "message is taking longer than usual to send". 
 2. **Fail to paste**: User thought they had copied some text onto the clipboard, but in the context of editing, when
 they issue the "paste" keyboard shortcut, nothing is in the clipboard. As a result, nothing pastes into the app. The
 app triggers the screen reader to announce the failed action: "nothing to paste". 
 
### Secondary actions 
In addition to a primary (implicit) action, some actions have secondary or follow-up effects that should be announced
beyond the immediate effect of the primary action. 
 1. **Auto fill**: In a spreadsheet, an action that sets a cell's value may be assumed to happen (no announcement) or
 could be announced as a side-effect of changing the cell's value (e.g., using a live region). In either case, this
 would be the normal expectation for the user. However, as a result of setting the value, the spreadsheet takes a
 secondary action of auto-filling a range of corresponding values in the cell's column. The screen reader links the
 announcement "autofilled values in cells A2 through A20" to the user's last action and ensures they are correlated. 

### Goals 
 - Offer an alternative to "offscreen live region" scenarios that: 
   - serves content authors' needs first; has easy-to-use developer ergonomics 
   - solves the consistency and predictability problems of live regions 
 - Provide a design framework for improvements to live regions as a "declarative version" of the notification API. 
   - removes guesswork on what to speak from a DOM node by providing an exact string 
   - provides context of what the string represents 

## Proposed Solution 
A new API, `ariaNotify`, enables content authors to directly tell a screen reader what to read. The behavior would be
similar to an ARIA live region, but without the guesswork and previously described inconsistencies in processing. In the
simplest scenario, the content author calls `ariaNotify` with a string to read.  The language of the string is assumed
to match the document's language. The function can be called from the document or from an element. When called from an
element, the element's nearest ancestor's lang attribute is used to infer the language. 

`ariaNotify` is an asynchronous API. There is no guarantee that a screen reader will read the text at that moment, nor
is there a way to know that a screen reader is available at all! Well-designed web applications will use `ariaNotify` to
provide appropriate notifications for accessibility whether or not their users require a screen reader or not. 

#### Example 1
```
// Dispatch a message associated with the document: 
document.ariaNotify( "John Doe is connected" ); 

// Dispatch a message associated with an element: 
document.querySelector("#richEditRegion1")
        .ariaNotify( "Selected text glowing blue" ); 
```

`ariaNotify` does not return a value. The call to the API has no web-observable side effects, and its use should not
infer that the user is using assistive technology. 

The above code immediately dispatches the first notification to the platform API with designation to the document node.
The second notification then follows with designation to the `#richEditRegion1` node element. It can be assumed that the
platform API will dispatch the notifications in the order received to any listening assistive technology, i.e. screen
reader.  

A screen reader must not only manage notifications from `ariaNotify`, but it also must manage all of the messages from
other sources, such as the OS, other applications, input keystrokes from the user, focus changes, ARIA live region
updates, etc. This explainer does not specify nor constrain the screen reader regarding the ordering of `ariaNotify`
notifications with respect to these other messages that exist in some total order of the screen reader's message queue. 

### Screen reader customizations for user preference 
Screen readers offer the flexibility to customize the notification experience for their users.  Customization options
for user preferences include disabling, prioritizing, filtering, and providing alternate output for notifications (such
as the concept of [earcons](https://en.wikipedia.org/wiki/Earcon)). Without additional context, only two customization
options can be offered: options that apply to all `ariaNotify` notifications universally or customization on a
per-notification-string basis. 

To aid in customization, `ariaNotify` provides a method to give context of the notification (`notificationId`). This
explainer provides a set of potential suggestions but allows for arbitrary non-localized strings to be used by the
content author. All strings will be processed by the user agent according to a fixed algorithm ([ASCII
encode](https://infra.spec.whatwg.org/#ascii-encode), then [ASCII
lowercase](https://infra.spec.whatwg.org/#ascii-lowercase), and finally, [strip leading and trailing ASCII
whitespace](https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace)) before the notification is sent
to the platform API (invalid strings will throw an exception). 

When no `notificationId` is explicitly provided by the content author, the `notificationId` is set to `notify` by
default.

To specify a `notificationId`, pass the string as the second parameter.  Alternatively, the `notificationId` may be
expressed in an object form with property `notificationId`. For example: 

#### Example 2
```
// Notify of a long-running async task starting and ending 
document.ariaNotify(
    "Uploading file untitled-1 to the cloud.",
    "task-progress-started" ); 
// ... 
myfile.asyncFileUpload().then( () => { 
    document.ariaNotify( "File untitled-1 uploaded.", { 
         notificationId: "task-progress-finished" } ); 
}); 
```

Screen readers may allow their users to filter out these task-progress `notificationId`, may make these notifications
only available at particular verbosity levels, or may replace the output strings with audio cues. 

### Managing pending notifications 
Given that each call to `ariaNotify` will immediately dispatch the message to the platform notification API, and the
platform notification API will immediately dispatch to all registered listeners (i.e.  screen readers), the screen
reader will effectively prioritize and queue up the notifications, as it may not be able to fully dispatch (i.e.
speak/Braille) the current notification before a new notification arrives. Each screen reader is responsible for
managing the prioritization and queuing of the notifications, along with all other system notifications, etc.

`ariaNotify` will also support priority information (i.e. place the notification ahead or behind pending notifications)
along with interruptibility implications (i.e. silence the currently speaking notification and/or flush pending
notifications). This is determined using the `priority` and `interrupt` properties. 

More specifically, the `priority` property can be used to ensure the notification is placed ahead of lesser priority
notifications. 

`priority` indicates where the screen reader should add the notification in relationship to any existing pending
notifications: 
 - `important` 
   - Screen reader should add this string to the end of any other pending important notifications but before all
   non-important pending notifications  
 - `none` - (default) 
   - Screen reader should add this string to the end of all pending notifications. 

#### Example 3
```
// Dispatch a notification updating background task status -- low priority
document.ariaNotify( "Background task completed",
    { "priority":"none",
      "notificationId":"StatusUpdate" }); 

// Dispatch a high priority notification that data may be lost
document.ariaNotify("Unable to save changes, lost connection to server",
    { "priority":"important",
      "notificationId":"ServerError" }); 
```

Assuming the initial low priority string hasn't already started to be acted upon (spoken/brailled), the high priority
item is guaranteed to be placed ahead of the lower priority and will be processed first, followed by the lower priority
notification. This ensures that important messages that the user should be aware of are processed and are supplied to
the user first. 

#### Example 4
```
// User has initiated an action which starts a generation process of data.
// During the status of the generation, a more critical status needs to be
// sent to the user 
document.querySelector("#dataStatus")
        .ariaNotify( "generating content",
            { "notificationId":"statusUpdate" }); 

document.querySelector("#dataStatus")
        .ariaNotify( "processing data ", 
            { "notificationId":"statusUpdate" }); 

document.querySelector("#dataStatus")
        .ariaNotify( "counting items ",
            { "notificationId":"statusUpdate" } ); 

document.ariaNotify( " server connection lost ",
            { "priority":"important",  
              "notificationId":"serverStatus" } ); 
```

As content is being generated, the user is informed of that status. When something more serious occurs, such as losing
server access, the server error is prioritized above any pending status updates. 

Along with the `priority`, the web author also has control over whether or not the screen reader should silence an
existing notification that is being spoken and/or flush pending notifications waiting to be processed. This is handled
through the `interrupt` property. 

`Interrupt` indicates whether or not the screen reader should interrupt an existing notification from speaking and
whether or not it should remove any other pending notifications. Note that the functionality of `interrupt` is dependent
on the source, priority, and interrupt settings of the current and pending notifications. 
 - `none` - (default) 
   - Do not interrupt anything and do not flush any pending notifications.  Simply add the notification to pending
   notifications as per its priority. 
 - `all`
   - Step 1: If a notification with the same source, priority, and interrupt (`all`) is speaking, immediately silence
   that string.  
   - Step 2: If any pending notifications with the same source, priority, and interrupt (`all`) are being held,
   remove/flush all of them. 
   - Step 3: Add the notification to pending notifications as per its priority.  
 - `pending`
   - Step 1: If a notification with the same source, priority, and interrupt (`pending`) is speaking, allow the current
   notification being spoken to fully complete. 
   - Step 2: If any pending notification with the same source, priority, and interrupt (`pending`) is being held,
   remove/flush all of them. 
   - Step 3: Add the notification to pending notifications as per its priority. 

`ariaNotify` can allow more scenarios than Live Regions. Here is a simple example showing three outcomes for the same
scenario (a progress bar which reports its status at every percent increment): 

#### Example 5.1
`interrupt:none` - Every progress bar percentage from 1% to 100% will be spoken. 

```
let percent = 0; 
function simulateProgress() { 
  percent += 1; 
  updateProgressBarVisual(percent); 
  // Report progress to ariaNotify. interrupt:none will cause each percent
  // update to be fully spoken 
  document.querySelector("#progressBar")
          .ariaNotify( "Progress is ${currentValue}", 
            { "notificationId": "progressBar", 
              "priority":"none",
              "interrupt":"none" });
}

if (percent < 100) { 
  setTimeout(simulateProgress, 100);
}
```

#### Example 5.2
`interrupt:all` - Each new progress bar percentage will interrupt/silence the currently speaking percentage, flush any
pending percentages, and add the latest.

Because the percentage is likely updating before each percentage fully speaks, the user will either hear nothing or the
first part of each/some percentage until the last is processed where the user will hear the full string "Progress is
100". 

```
let percent = 0; 
function simulateProgress() { 
  percent += 1; 
  updateProgressBarVisual(percent);
  // Report progress to ariaNotify. interrupt all will cause each percentage
  // update to interrupt any existing percentage that may be speaking, flush any
  // pending percentages, and add the latest 
  document.querySelector("#progressBar")
          .ariaNotify( "Progress is ${currentValue}",
            { "notificationId":"progressBar",
              "priority":"none",
              "interrupt":"all" });
 }

if (percent < 100) { 
  setTimeout(simulateProgress, 100); 
} 
```

#### Example 5.3
`interrupt:pending` -- Assuming the first percentage "Progress is 1" is processed and sent to the synthesizer before the
next percentage is sent, it will be completely spoken. Regardless, while any percentage is being spoken, that percentage
will be allowed to finish speaking, other pending percentages sent to `ariaNotify` will be thrown out, and the latest
percentage will be added.  

How long it takes to speak the current percentage will determine the number of subsequent percentages that will be
skipped. A slower speech rate will cause more percentages to be ignored. A faster speech rate will allow more
percentages to be spoken. When the current percentage fully speaks, the next percentage that was allowed to be held will
speak, and the process will repeat. Finally, the last percentage "Progress is 100" will be spoken.  

```
let percent = 0; 
function simulateProgress() { 
  percent += 1; 
  updateProgressBarVisual(percent); 
  // Report progress to ariaNotify. interrupt pending will allow the current
  // percentage to finish speaking, flush any pending percentages, and add the
  // latest 
  document.querySelector("#progressBar")
          .ariaNotify( "Progress is ${currentValue}",
              { "notificationId":"progressBar", 
                "priority":"none",
                "interrupt":"pending" }); 
}

if (percent < 100) { 
  setTimeout(simulateProgress, 100); 
} 
```
The only difference between the three snippets is the `interrupt` setting. Each of the three settings produces a big
experience difference for the user. 

## iframes and use in subresources 
As iframes and other embedded content comes from external sources, web authors of the top-level context will not be
permitted to add notifications within the embedded content. 

On the other hand, the web authors of the iframe will be able to add notifications to their content. In order for these
notifications to propagate to the top-level browsing context, we will require a new value to the `sandbox` attribute for
`<iframe>`, such as `allow-notifications`.

## Relationship to ARIA Live Regions
There are some similarities between `ariaNotify` and the existing ARIA live regions. This section maps the existing ARIA
live region configuration attributes to the options available with `ariaNotify`: 
 - `aria-live="assertive"` is the equivalent of `"priority: important"` and `"interrupt: none"`
 - `aria-live="polite"` is the equivalent of `"priority: none"` and `"interrupt: none"`

Beyond the above, the additional functionality provided by `ariaNotify` is not supported and cannot be mapped back
directly to ARIA live regions. 

## Fallback 
In the case of browsers that do not yet support `ariaNotify`, we propose the following fallback mechanism using the same
backend as the existing ARIA live regions: 
 - The message payload for `ariaNotify` is equivalent to the contents of an ARIA live region. 
 - The `notificationId` is dropped entirely. 
 - `"priority: important"` and `"priority: none"` correspond to `aria-live="assertive"` and `aria-live="polite"` ARIA
 live attributes, respectively. 
 - ARIA live regions do not support interruptibility, so all behavior of `interrupt` defaults to `none`.  

Note that there is no exact mapping of `ariaNotify` back to ARIA live regions, and our proposal reflects a best effort
to achieve similar behavior. There are cases where we will not be able to get the intended behavior using ARIA live
regions:

#### Example 6 
```
element.ariaNotify("This message is normal.",
    { "priority": "none",
      "interrupt": "none"}); 

element.ariaNotify("This message should interrupt",
    { "priority": "none", "interrupt": "all" }); 
```

In the above case, when `ariaNotify` is supported, the expected behavior would be for the second notification to silence
the current one and flush all other queued notifications from element with priority: `"none"`. However, the fallback is
not able to silence or flush existing notifications, as that behavior is not supported in ARIA live regions.  In the
case that the web browser does not yet support `ariaNotify`, it is the responsibility of the web author to detect and
fallback to ARIA live regions.  The above conversion may serve as a guide on how to do so. One can detect whether or not
`ariaNotify` is supported by checking if the method exists on the document or element in question: 

```
if ("ariaNotify" in element) { 
  element.ariaNotify(...); 
} 
```

## Open Issues 
### Predefined notificationIds 
The use of `notificationId` give the screen reader contextual information regarding the notification which allows for
creative approaches to dispatching the information to their users. The question then arises of whether the API should
create a predetermined set of `notificationId` names for common/expected scenarios or whether having predefined names is
pointless given no matter the list, it will always fall short. 

Possible examples of predefined `notificationId` could be something like: 
 - Recent action completion status: `action-completion-success`, `action-completion-warning`,
 `action-completion-failure` 
 - Async/indeterminate task progress: `task-progress-started`, `task-progress-ongoing`, `task-progress-blocked`,
 `task-progress-canceled`, `task-progress-finished`
 - Navigational boundary endpoints: `boundary-beginning`, `boundary-middle`, `boundary-end`
 - Value-relative state changes: `value-increase`, `value-decrease`
 - User interface state: 
  - `ui-clickable / ui-clicked`
  - `ui-enabled / ui-disabled`
  - `ui-editable / ui-readonly`
  - `ui-selected / ui-unselected`

### Spamming mitigations 
The general nature of a notification API means that authors could use it for scenarios that are already handled by
screen readers (such as for focus-change actions) resulting in confusing double-announcements (in the worst case) or
extra unwanted verbosity (in the best case). 

Note: screen readers will tune their behavior for the best customer experiences. Screen readers already add custom logic
for handling app-and-site-specific scenarios and are keen to extend that value to websites that make use of
`ariaNotify`. For this reason, known & popular sites that abuse `ariaNotify` can be mitigated at the screen reader level
without requiring particular mitigations in browsers. This does not preclude mitigation strategies that UAs may to
include. 

Finally, malicious attackers can use the API as a Denial-of-Service against AT users. 

Opportunities exist to mitigate against these possibilities: 
 - Make use of [User Activation](https://html.spec.whatwg.org/multipage/interaction.html#tracking-user-activation)
 primitives to limit usage of this API to only actions taken by the user. 

## Future considerations 
1. `ariaNotify` can be extended in the future to handle more functionality as needs arise. Two possible examples are
provided below.There may be a need for a web author to supply a Braille specific string separate from the speech string.

    For example, an author could supply "3 stars" as the speech string to indicate a retail item's rating. However, to better map within a Braille display, the author could supply `***` as a Braille alternative string. 

    The API could easily be extended by adding another optional property for Braille strings. For example: 

```
document.ariaNotify( "3 stars", {"braille":"***"} );
```

2. There may also be a use case where an author would want to allow the speech string to be marked up to guarantee a
specific pronunciation. This can be useful in cases where the speech engine may not produce the best experience for the
user.

    For example, maybe you would like "911" pronounce as "9 1 1" in some cases. Or in a spreadsheet, you may want to hear "a
1" spoken with a long "a" sound instead of a short "a" sound (i.e. "ay 1" as opposed to  "uh 1").  

    The API could easily be extended by adding another property for strings marked up with, say, SSML: 

```
document.ariaNotify( "911", {"SSML":"<say-as
interpret-as=\x22\"""digits\x22""">911" });
``` 

## FAQ 
**Is this API going to lead to privacy concerns for AT users?**

No. This API has been designed to be "write-only," meaning that its use should have no other apparent observable
side-effects that could be used for fingerprinting. 

See Security and Privacy section for additional details. 

**Are Element-level notifications really necessary?**

Adding `ariaNotify` to Elements was driven by several goals: 
 - Resolve the question of how language input should be provided. To keep the API simple, we are able to leverage the
 lang attribute that is used to override the document language for specific subtrees. `ariaNotify` can use the nearest
 ancestor element's lang attribute as a language hint (or the document's default language). 
 - Screen readers can filter/prioritize notifications based on the element associated with the notification queue. E.g.,
 the element's current visibility in the User Agent, the element's proximity to the focused element.  (Same potential
 options available with ARIA live regions today.) 

**Can this API allow for output verbosity preferences?**

Screen reader users can customize the verbosity of the information (and context) that is read to them via settings.
Screen reader vendors can also adapt the screen reader on a per site or per app basis for the best experience of their
users. `ariaNotify` offers `notificationId` as a mechanism to allow screen reader vendors or users to customize not only the
general use of `ariaNotify` on websites, but also individual notifications by `notificationId` (or specific notification
string instances in the limit). 

**Tooling help**

It's very difficult today to test that ARIA live regions are working and how they are working. Tooling, [such as the
work proposed here](https://docs.google.com/document/d/1ZRBC4VJwsb-dlLmcZJgYlz1qn7MmDwNKkyfbd8nbLEA/edit), should be
available for content authors to validate the behavior of both ARIA live regions and `ariaNotify`.

## Alternate Solutions 
 The design of this API is loosely inspired by the [UIA Notification API](https://docs.microsoft.com/en-us/windows/win32/api/uiautomationcoreapi/nf-uiautomationcoreapi-uiaraisenotificationevent). 
 Previous discussions for a Notifications API in the AOM and ARIA groups: 
 - [Issue 3 - Use Case: Accessibility Notifications](https://github.com/wicg/aom/issues/3)
 - [Issue 84 - Live region properties vs announcement notification](https://github.com/WICG/aom/issues/84)
 - [Issue 832 - Do we need a notifications API in ARIA](https://github.com/w3c/aria/issues/832)

## Privacy & Security Considerations 
 1. **Timing.** The use of the API provides no return value, but parameters must still be processed. Implementations
 should take care to avoid optimizing-out the synchronous aspects of processing this API, as predictable timing
 differences from when the API is "working" (a screen reader is connected) vs. "not working" (no screen reader
 connected) could still be used to infer the presence of a user with an active screen reader. 
 2. **Readback.** Any readback of configuration settings for a screen reader via an API have the potential of exposing a
 connected (vs. not connected) screen reader, and as such is an easy target for fingerprinting screen reader users, an
 undesirable outcome. Similarly, confirmation of notifications (such as via a fulfilled promise) have similar traits and
 are avoided in this proposal.
 3. **Authoritative-sounding notifications.** Announcements could be crafted to deceive the user into thinking they are
 navigating trusted UI in the browser by arbitrarily reading out control areas/names that match a particular target
 browser's trusted UI. 
    - Mitigations should be applied to suppress notifications when focus moves outside of the web content. 
    - Additional mitigations to block certain trusted phrases related to the browser's trusted UI could be considered.
    - Implementations may choose to audibly differentiate notification phrases coming from `ariaNotify` in order to make it
    clear that they are content author controlled. 
 4. **Secure Context.** Does it make sense to offer this feature only to Secure Contexts? Should usage of this API be
 automatically granted to 3rd party browsing contexts? Currently thinking "no" in order to have maximum possibility of
 reach within the accessible community on all websites that should be made accessible, whether secure context-enabled or
 not. 
 5. **Data Limits** (See [Security and Privacy Questionnaire
 #2.7](https://www.w3.org/TR/security-privacy-questionnaire/#send-to-platform)) Should there be a practical limit on the
 amount of text that can be sent in one parameter to the API? Just like multiple-call DoS attacks, one call with an
 enormous amount of text could tie up an AT or cause a hang as data is marshalled across boundaries.
 