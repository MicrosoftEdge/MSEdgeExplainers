# Notifications Action Buttons and Audio Customization

Authors: [Gabriel Brito](https://github.com/gabrielsanbrito), [Steve Becker](https://github.com/SteveBeckerMSFT), [Jungkee Song](https://github.com/jungkees)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [Web Hypertext Application Technology Working Group (WHATWG)](https://whatwg.org/)
* Current version: **This document**
    
## Introduction
Native applications that also have a Web counterpart might want the behavior of latter to be as similar to the former as much as possible to provide a consistent user experience across various devices and platforms. VoIP (Voice over Internet Protocol) applications - e.g., Microsoft Teams, Google Meet, Zoom, etc - are no exception and have become increasingly popular and demanded for remote collaboration over the last couple of years.

![call_teams_notification](https://user-images.githubusercontent.com/80070607/180506585-73f05e29-5676-4686-88dc-bd2fa05b8e6d.png)  
*Figure 1: Calling notification scenario.*

We would like to propose an extension to the [Notifications API](https://notifications.spec.whatwg.org/) standard for incoming call scenarios to allow the notification action buttons to be customized and also allow the application to play a ringtone. This capability would make the incoming call notifications, which may require a faster immediate response, clearly distinguishable from the others to the user and would also contribute to increasing accessibility on the Web.

## Goals

Propose an extension to the Notifications API to allow more customization for VoIP web apps. 

## Non-Goals

Allow general web contents to arbitrarily change action button colors and sound sources without restrictions from the underly platforms.

## Use Cases 

- A video conferencing PWA can produce its call notification pop-up with a green "accept" button and red "decline" button.
- Web apps will be capable to change the notification action button colors if they feel like this will improve its UX.

## Proposed Solution

We propose the creation of a new property `scenario` in the `NotificationOptions` dictionary of type `NotificationScenario`, that is an enum with 2 values: `"default"` and `"calling"`. The color treatment and ringtone capabilities will only be available in the `"calling"` scenario.

```javascript
enum NotificationScenario {
  "default",
  "calling"
}

dictionary NotificationOptions {
  NotificationScenario scenario = "default";
  ...
}
```

When the scenario is `"calling"`, the notification will always have a default dismiss button, which must occupy the rightmost action button position. This way, when a `"calling"` notification is displayed to the user, we can guarantee that he or she will always be capable to dismiss it. 

### Color Treatment

For notifications with `"scenario"` of type `"calling"`, the User Agent (UA) should change the notification's action buttons' color in a way that the style for the dismiss button is different from the other buttons, which are specified each as an element of the `Notfication.actions` array. If the platform does not allow color treatment for notification buttons, the UA should fallback to the `"default"` scenario colors.

We propodr that the deafult dismiss action button should have a red theme - e.g., red background color with some predefined icon over the default background - while all the other buttons are green-themed, but it is up to the platform to define the style.

### Ringtone

Similarly, to support the `"calling"` scenario we also propose the creation of a new NotificationSoundType enum and the inclusion of a `sound` attribute to the Notification interface and a correspondent property to the NotificationOptions dictionary. If the scenario is not `"calling"` this property value must be ignored.

```javascript
enum NotificationSoundType {
  "default",
  "ringtone"
}

partial interface Notification {
  readonly attribute NotificationSoundType sound;
}

dictionary NotificationOptions {
  ...
  NotificationSoundType sound = "default";
}
```

The `"default"` value would play the standard notification audio provided by the platform just once; whereas the `"ringtone"` one would execute a platform-provided audio, suitable for executing in a loop, and keep playing it for the duration of the notification. If the platform is not able to provide a suitable `"ringtone"` audio the User Agent (UA) must fallback to the `"default"` case.

### Use Examples

An incoming call notification from a VoIP PWA without any specified action buttons could be instantiated through a service worker by using:

```javascript
const title = "Andrew Bares";
const options = {
  scenario: "calling",
  body: "Incoming Call - Mobile",
  sound: "ringtone"
}

serviceWorkerRegistration.showNotification(title, options);
```

In this case, the notification would be displayed with a ringtone and also have the default dismiss button as depicted in the figure below.

If the web app specify any action buttons they should show up alongside with the default dismiss buttons and, if the platform allows, they should have colors different from the dismiss button. A PWA would be able to sent a `"calling"` notification with colored buttons by means of a service worker using:

```javascript
const title = "Incoming call";
const options = {
  scenario: "calling",
  title: "Andrew Bares",
  body: "Incoming Call - Mobile",
  sound: "ringtone",
  actions: [
    {
        action: "accept-audio-call",
        title: "audio",
        icon: "https://web.app.com/assets/accept_audio_call.png"
    },
    {
        action: "accept-video-call",
        title: "video"
        icon: "https://web.app.com/assets/accept_video_call.png"
    }
  ]
}

serviceWorkerRegistration.showNotification(title, options);
```

The notification should look like this:

### Extension Scope

The Notifications API is a [powerful feature](https://w3c.github.io/permissions/#dfn-powerful-feature) and, given that the extensions proposed in this explainer could be potentially abused, they should only be made available for Progressive Web Apps (PWAs). Therefore, the `Notification.scenario` and `Notification.sound` properties should be ignored unless a PWA is setting them.

## Privacy and Security Considerations

### Privacy
No privacy-related concerns were identified up to the moment.

### Security

#### Preventing Ringtone Abuse

Bad-behaved web apps might abuse this functionality to trigger many notifications together with a ringtone and disturb the user. The simplest mitigation in this case would be for the user to disable the notifications for that specific application. Besides that, the user can uninstall the PWA and use only its website version, which will not be able to play ringtones or change the button colors.

## Alternative Solutions
### Fully Customizable Colors
Another option considered was to allow developers to select any color they wanted. Therefore, instead of having a `NotificationActionStyle` value, the `NotificationAction` dictionary would have a [DOMString](https://webidl.spec.whatwg.org/#idl-DOMString) `color` variable storing a [simple HTML color](https://webidl.spec.whatwg.org/#idl-DOMString).

```javascript
dictionary NotificationAction {
  required DOMString action;
  required DOMString title;
  USVString icon;
  DOMString color;
};
```

However, this approach was not proposed as the main one because the only platform that seems to allow such degree of customization is [Android](https://developer.android.com/training/notify-user/custom-notification)

### Play Ringtone from Inside the Tab

Previouly, the `sound` property was part of the Notifications API spec, but was removed mainly due to the lack of support across many platforms (refer to the discussion [here](https://github.com/whatwg/notifications/pull/127)). [Windows](https://docs.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/custom-audio-on-toasts#add-the-custom-audio), [Mac OS and iOS](https://developer.apple.com/documentation/usernotifications/unnotificationsound) allow the notifications to play custom sound, but the audio files should be stored beforehand in the local system. Besides that, it seems not possible to provide an audio file from the Web in any platform.

An option to circumvent this issue would be to trigger a silent notification, the moment the user receives an incoming call in the web app, and then play the custom audio inside the tab. However synchronicity problems might arise with the audio starting to play before or after the notification showing up in the screen.

### CallNotification Child Interface

Another viable option would be to subclass the Notification interface into a CallNotification interface to better outline the incoming call notification scenario:

```javascript
enum CallNotificationActionStyle {
  "default",
  "accept",
  "decline"
};

dictionary CallNotificationAction : NotificationAction {
  NotificationActionStyle style = "default";
};

dictionary CallNotificationOptions : NotificationOptions {
  sequence<CallNotificationAction> actions = [];
};

interface CallNotification : Notification {
    [SameObject] readonly attribute FrozenArray<CallNotificationAction> actions;
};
```

In this case, we would not need to have a NotificationSoundType attribute, given that it is implied that it is a ringtone audio played in a loop and we would be able to define a standard duration time for incoming call notifications. 

Nevertheless, this option was not selected as the first choice, because it confines the action buttons color customization to incoming call scenarios and there might have unmapped valid use cases that fall out of this scenario.

### Create a new permission type for websites

Websites that were already given permission to send notifications in a `"default"` scenario shouldn't automatically be allowed to customize notifications or play a ringtone. Therefore one option would be to create a new type of permission for that scenario called "Ringing notifications". In this case, if the website "xyz.com" asks for permission to send calling notifications, a prompt with the following text should popup

**xyz.com wants to**  
[icon] Send you ringing notifications

VoIP web applications will probably want to prompt permissions for both `"default"` and `"calling"` notifications. Therefore, similarly to what happens with Camera and Microphone permissions, we could also create of a new compound permission prompt for both `"default"` and `"calling"` notifications. The prompt text would be:

**xyz.com wants to**  
[icon_1] Send notifications  
[icon_2] Send ringing notifications

Another idea would be to create just this compound type of permission prompt and provide toggles for each notification scenario - i.e., `"default"` and `"calling"` -, which the user could interact with and select only the types of notification he or she wants to receive.

However, we think that creating more permission types introduces new elements that the users need to read and understand, which contributes to fatigue. Moreover, conveying the exact meaning of a permission type through a permission prompt can be challenging.
