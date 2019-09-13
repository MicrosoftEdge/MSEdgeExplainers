# Autofill Reauthentication
Author: [Brandon Maslen](https://github.com/Brandr0id), [Eric Lawrence](https://github.com/ericlaw1979), [Scott Low](https://github.com/scottlow)

## Motivation
Users who want to quickly share their devices with family and friends have expressed concern over their accounts being accessed without their permission due to the behavior of autofill in the browser. For example, consider a user, UserA, who has their credential for `social.example` saved in the browser for ease of login. Even if UserA signs out of their `social.example` account before handing their device to UserB (a friend or family member) to borrow, autofill will still automatically inject UserA's saved credential into the login form if UserB navigates to the `social.example` home page. This allows UserB to sign into UserA’s account with a single click. Additionally, UserB can [trivially reveal](https://bugs.chromium.org/p/chromium/issues/detail?id=126398) the plaintext of the injected password.

Requiring entry of a master password prior to autofill has been [proposed](https://bugs.chromium.org/p/chromium/issues/detail?id=1397) as a [solution](https://bugs.chromium.org/p/chromium/issues/detail?id=53) for this in the past. There is ongoing debate around whether a master password feature that’s not backed by either per-credential or complete credential store encryption lures users into a false sense of security because local attackers are generally outside of the [browser threat model](https://chromium.googlesource.com/chromium/src/+/master/docs/security/faq.md#Why-arent-physically_local-attacks-in-Chromes-threat-model).

Based on user research/feedback, we believe that the shared device scenario is common enough to warrant the addition of an off by default, OS reauthentication hook in the Chromium autofill code path. Such reauthentication could involve re-entering an OS-level password, but may also encompass lower friction, biometric solutions on devices and operating systems that support them. Whether, and if so how, user agents choose to build UI around this reauthentication hook to ensure that their users can clearly understand the threat model and its limitations is beyond of the scope of this explainer.

## Goals
* To provide user agents with an autofill OS reauthentication hook that they can use to provide master password functionality for users who share their devices with friends and family
* To purposefully leave UX up to individual user agents so that they can decide how to best message this functionality should they decide to enable the reauthentication hook

## Non-goals
* To protect users from motivated attackers with physical access to their devices
* To change Chromium’s default autofill behavior

## Existing/Related Implementations
* [Firefox’s Master Password](https://support.mozilla.org/en-US/kb/use-master-password-protect-stored-logins)
* [Chromium’s OS reauthentication](https://support.google.com/chrome/answer/95606?co=GENIE.Platform%3DDesktop&hl=en) when viewing stored passwords in the password manager
* Many third-party password managers

## Proposal
As outlined above, this explainer proposes the addition of an off by default, OS reauthentication hook in the Chromium autofill code path. This will reuse the existing OS reauthentication logic used in Chromium’s password manager when previewing or exporting saved passwords and will add a content setting to configure how long a successful reauthentication should remain valid. By default, this content setting will be set to never require authentication, meaning that even if the build flag that controls this functionality is enabled, the reauthentication hook will not be functional until the user agent adjusts the default value (most likely by exposing UX for this to users).

Enabling this reauthentication hook and changing its off by default content setting will also enable the same behavior controlled by the [Chromium fill-on-account-select feature flag](https://codereview.chromium.org/773573004/). This decision was made to ensure that users are not prompted for authentication until they indicate they want to access their saved credentials. 

## Future Considerations

We believe that per-credential/complete credential store encryption to further harden the security model of browser autofill is a worthwhile investment. While this explainer only targets the shared device use case to begin with, it lays the foundation for future improvements. We are open to exploring further investments in this space with other implementors to bring additional value to users.