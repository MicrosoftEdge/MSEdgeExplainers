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

- A video conferencing website can produce its call notification pop-up with a green "accept" button and red "decline" button.
- Web apps will be capable to change the notification action button colors if they feel like this will improve it UX.

## Proposed Solution

We propose an extension to the current Notifications API where the `NotificationAction` dictionary would have a new `style` property of type `NotificationActionStyle`, which is an enum with 4 values: 
- `"default"`,
- `"acknowledge"`,
- `"acknowledge_with_video"`, and
- `"dismiss"`.

These styles are platform-dependent but should be distinct from each other to allow the user to easily identify its options. Moreover, to disencourage use of these buttons outside the intended use-case scenarios - e.g., video/audio calls -, we also suggest disallowing the usage of a custom title and icon on these notifications by web applications. 

For example, the `"acknowledge"` action button could have a green theme - e.g., have green background color with a solid white phone icon over the default background - while the `"dismiss"` could be red-themed, but it is up to the platform to define the style. If the selected style is not supported by the platform, it should fallback to `"default"`.

```javascript
enum NotificationActionStyle {
  "default",
  "acknowledge",
  "acknowledge_with_video"`,
  "dismiss"
}

dictionary NotificationAction {
  required DOMString action;
  required DOMString title;
  USVString icon;
  NotificationActionStyle style = "default";
};
```

Similarly, to support this scenario we also propose the creation of a new NotificationSoundType enum and the inclusion of a `sound` attribute to the Notification interface and a correspondent property to the NotificationOptions dictionary:

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

We propose the creation of a new property `type` in the `NotificationOptions` dictionary of type `NotificationType`, that is an enum with 2 values: `"default"` and `"calling"`. The action button customization and ringtone capabilities should be made available only if `Notification.type` is equal to `"calling" `. If a website attempts to customize a `"default"` notification, the UA should ignore the customization parameters: 
- `Notification.sound` and
-  `NotificationAction.style` in each `NotificationAction` object of `Notification.actions`.

Likewise, if a notification is of type `"calling"`, the UA should ignore all the `NotificationAction.title` and `NotificationAction.icon` parameters in each `NotificationAction` object of `Notification.actions`.

```javascript
enum NotificationType {
  "default",
  "calling"
}

dictionary NotificationOptions {
  NotificationType type = "default";
  ...
}
```

An incoming call notification from a VoIP Web app could be instantiated through a service worker by using:

```javascript
const title = "Incoming call";
const options = {
  type: "calling",
  body: "John D.",
  sound: "ringtone",
  actions: [
    {
        action: "accept-audio-call",
        style: "acknowledge"
    },
    {
        action: "accept-video-call",
        style: "acknowledge_with_video"
    },
    {
        action: "decline-call",
        style: "dismiss"
    }    
  ]
}

serviceWorkerRegistration.showNotification(title, options);
```

### Permission Prompting

Websites that were already given permission to send notifications of type `"default"` shouldn't automatically be allowed to customize notifications or play a ringtone. Therefore we propose creating a new type of permission for that scenario called "Ringing notifications". In this case, if the website "xyz.com" asks for permission to send ringing notifications, a prompt with the following text should popup:

**xyz.com wants to**  
[icon] Send you ringing notifications

VoIP web applications will probably want to prompt permissions for both `"default"` and `"calling"` notifications, and adding one more prompt that users need to understand and accept might contribute to fatigue. Therefore, similarly to what happens with Camera and Microphone permissions, we also propose the creation of a new compound permission prompt for both `"default"` and `"calling"` notifications. The prompt text would be:

**xyz.com wants to**  
[icon_1] Send notifications  
[icon_2] Send ringing notifications

## Privacy and Security Considerations

### Privacy
No privacy-related concerns were identified up to the moment.

### Security

#### Preventing Ringtone Abuse

Bad-behaved web sites might abuse this functionality to trigger many notifications together with a ringtone and disturb the user. The simplest mitigation in this case would be for the user to disable the notifications for that specific site. 

Besides that, to enable button color treatment and customizing ringtones for calling web apps, we should be able to classify the web apps as calling apps. For that, we propose adding a permission type for "calling notifications". We might want to generalize this ability to classify notifications that need powerful features as "high priority notifications". However, we intend to start with a smaller scope for calling apps specific requirements.

A user agent that implements and provides the extended customization behavior needs to differentiate the notification permission request experience of it from that of the generic notifications. The user agent needs to clearly indicate users of what accepting the calling notifications will provide them.

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

### Permission Prompt with Toggles

Another idea would be to create just the compound type of permission prompt and provide toggles for each type of notification - i.e., `"default"` and `"calling"`, which the user could interact with and select only the types of notification he or she wants to receive. The prompt that already exists with only the `"default"` notifications would still exist.

At first we didn't choose this as part of our proposal, because we aren't sure if it is feasible for the user agents to implement it.