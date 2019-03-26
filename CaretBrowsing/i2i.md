# Intent to Implement: Native Caret Browsing


## Contact emails
Bruce.Long@microsoft.com, Amit.Jain@microsoft.com, Grisha.Lyukshin@microsoft.com
 
## Explainer
    
[Native Caret Browsing Explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/master/CaretBrowsing/explainer.md)


## Design Doc

[Native Caret Browsing Design Document](designDoc.md)
 

A TAG review is not requested, because the feature is not intended to be introduced as web standards. 
It is not expected that web developers will need to make changes to their content as a result of this work

## Summary
We are proposing the implementation of native caret browsing in Chromium. In caret browsing a moveable cursor is placed on a web page, allowing a user to select and navigate text with just a keyboard. Caret browsing mode will be toggled by an activation key (F7), with a confirmation dialog displayed. The native implementation of this feature will obviate the need to install a browser extension.
 
## Motivation
Caret browsing enables users to navigate web content using the keyboard keys and common shortcuts for character, word and line level navigation. Caret browsing allows a full range of text navigation and selection functionality within web content without relying on additional pointing devices like mice, trackpads and touchpads, so is an important accessibility feature.

Today Chromium users can download a Caret Browsing extension from the Chrome Web Store. There are several problems with this approach:

* Extensions might be blocked in a work environment due to enterprise policies (see [Issue 611798: Enterprise users can't install accessibility extensions](https://crbug.com/611798)).
* Extensions might not be available in "Incognito" tabs, or when a Guest profile is used.
* There are additional barriers for users of all abilities, since they need to find and install an extension and the functionality is not readily available when it might be needed.
* Applications that use Chromium don't have the platform capability to enable native caret browsing.
 
## Risk
### Interoperability and Compatibility
Mozilla Firefox, Microsoft Edge and Internet Explorer already natively support caret browsing. Native caret browsing doesn't aim to replace extensions; they would continue to work as they do today having the first opportunity to handle the default activation shortcut.
 
* IE: Shipped
* Edge: Shipped
* Chromium: In progress
* Firefox: Shipped
* Safari: N/A (there is [system-wide assistive support](https://discussions.apple.com/thread/250114777))
* Web/Framework developers: N/A

### Ergonomics
Performance should not be significantly impacted. Native caret browsing will rely on the same implementation for rendering a caret and moving it around as already used within editable content in Chromium.
### Activation
The feature is not exposed to the web API layer. The feature will initially be behind a runtime flag and disabled by default.

 
## Debuggability
No special DevTools support is required to debug this feature.
 
## Will this feature be supported on all six Blink platforms (Windows, Mac, Linux, Chrome OS, Android, and Android WebView)?
Yes, with the caveat that function keys such as F7 may not be available and so alternative shortcuts might be needed.

## Link to entry on the [feature dashboard](https://www.chromestatus.com/features)
TBD--but not a web-facing change in Blink.
 
## Requesting approval to ship?
No. The feature will initially be implemented behind a runtime flag.
