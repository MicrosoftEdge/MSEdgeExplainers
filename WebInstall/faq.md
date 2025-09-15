# Web Install API FAQs

This document addresses the feedback and frequently asked questions around the Web Install API.

## Current state of install

**What does web app installation look like today?**

As of today, the concept of what "installation" means can vary per browser and platform. These are the current behaviours on some browsers that can represent acquiring an app or "installing" it:
- Apple's Safari allows a user to [add (web content) to dock](https://support.apple.com/en-us/104996#create).
- Chromium browsers can [prompt a user to "install" a web app](https://web.dev/learn/pwa/installation/) to the system and this can be controlled by a developer to tailor when this prompt appears with the `beforeInstallPrompt` event.
- Google Chrome and Microsoft Edge have ways to create web applications from any web content, through the `...` menu.
- Mozilla Firefox on mobile allows to [add web content to the home screen](https://support.mozilla.org/en-US/kb/add-web-page-shortcuts-your-home-screen).
- Samsung Internet displays a badge in the URL bar that allows a user to install a web application.

**Which stakeholders are supportive of Web Install?**

- Chromium browsers are supportive of the feature. Both the web apps teams at Google and Microsoft have collaborated in shaping the API.
- It was expressed in the [TAG review](https://github.com/w3ctag/design-reviews/issues/1051#issuecomment-2943539903) that they would like to see current-document capability "deployed" and want to see the background-document part of the API incubated. Based on this feedback we have separated the Web Install explainer to two different documents to address one in the WebApps WG and the other one in WICG.
    - _"We would like to see same-origin installability deployed and tested in the ecosystem, as we believe it will help to validate the user experience and inform any future work toward cross-origin installability."_
- Developers are supportive of the feature, as seen in multiple comments [here](https://github.com/w3ctag/ethical-web-principles/issues/120#issuecomment-2285348765), [here](https://www.reddit.com/r/PWA/comments/1m0lf1o/web_install_is_in_dev_trial/) and [here](https://elk.zone/social.vivaldi.net/@brucelawson/115105502259864988).

## API shape

**Is the web app `id` override mechanism necessary for Web Install to work?**

We think that to provide an upgrade path for web applications it is beneficial for web apps to include the web app `id`. [This document](https://docs.google.com/document/d/19dad0LnqdvEhK-3GmSaffSGHYLeM0kHQ_v4ZRNBFgWM/edit#heading=h.koe6r7c5fhdg) outlines potential edge cases where the `id` field can avoid certain pitfalls. This is set to be discussed in the WebApps WG.

## Feature UX

**Are the dialogs used for Web Install new?**

No. Throughout the Web Install UX flow there are several dialogs, and all of them already exist. For the permission prompt, this is no different from the prompt from other permissions like geolocation or camera access. The installation prompts also already exist for the `beforeinstallprompt` event as well. All UX surfaces have gone through a [Chromium UX review](https://docs.google.com/document/d/167APSoaq-qbcrw6jNn0t01vaB_ZdehIy2JYHnhb-8fk/edit?pli=1&tab=t.0#heading=h.ls434trmbvog) as well. _We acknowledge that the prompt text needs tweaking and will continue to iterate on making sure that the purpose of the prompts presented to the user are understood. You can see a list of UX changes related to this feature in [this link](https://issues.chromium.org/issues/383843830).

## Feature design

**[TAG concern] Are there potential centralization and gatekeeping effects of _background_ document installations?**

Previously the API design included a new manifest field named `install_sources` that we initially thought would help minimize abusive from the API by defining some sort of two-way 'handshake' between the site that was installing the web app and the web app being installed. We thought that this was a way for the developer to finetune _where_ the app could be distributed _from_. Upon feedback from TAG, and further consideration, we agreed that this manifest field promoted centralization and gatekeeping as it was impossible for web apps to accurately list all the possible websites that might link to it, creating a scenario where most likely only the big web app repositories would be referenced by web apps. _We have since removed this manifest field_. With this change we believe this is now the contrary to centralization and gatekeeping, as it allows _any_ website to call and use the Web Install API. As an example, this encourages any user to create a list of their "favourite cooking apps" in their blog, to share and distribute with their readers. 

When the manifest field was still in the design of the API, [@martinthomson](https://github.com/martinthomson) rightfully mentioned in his [comment](https://github.com/w3ctag/ethical-web-principles/issues/120#issuecomment-2272278572) about the principle that [the web should not be owned by anyone](https://github.com/w3ctag/ethical-web-principles/issues/120) that "Creating dependencies on others can create a systemic pressure toward centralization." After acting on the feedback and removing the `install_sources` field I believe that what martinthomson also wrote in that comment is now true: "_don't have someone else do what you can do yourself. Or rather, providing entities the power to achieve their own goals, rather than force them to rely on others_". That is why we believe that Web Install allows the democratization of app distribution on the platform, as it provides the capability to distribute apps without relying on others.

**[TAG concern] Is there potential for diminished user agency and control over installation?**

We firmly believe that the Install API empowers users to impact their experience, rather than diminish it. End users will have more control over having better access to content they experience on a regular basis. They also have more options on where to get their apps, which can enhance the overall experience for them. Users can choose to install a web app from the origin they visit everyday, instead of being redirected to an app store. Web Apps are also generally smaller and lighter, ideal for running on lower end or storage constrained devices. 

There is also opportunities to continue evolving the UX around the application acquisition (and removal). Having the ability to "undo" an acquisition if it is not what the user expected at first run is a good way to ensure that the user is always in control. As an example, if a user installs a bakery app from their favourite bakery blog and when it launches it shows a casino, then the UA could provide an easy way to allow them to remove the app.

## Privacy

**[TAG concern] What are the privacy implications of background-document installation signals?**

Both success and failure of the "installation" do not provide an exact snapshot of what has happened. If the promise has resolved from the origin, the origin will know that it was successful, nonetheless there isn't a way to know if this is because the user acquired the app or because the app already existed and it was launched. The origin cannot 100% attribute the installation of the app to itself. It is a similar case with the promise rejecting: it's either the installation was cancelled or the (already installed) app was not opened. Also, even if a web site logged the "installations --resolved promises", it was no way of knowing or tracking if the app is installed. Even right after installing an app, and still on the same origin that prompted to install said app, a user can uninstall the app, and there is no way the origin that prompted the installation to track this.

## Spam concerns

**Does the capability to install web apps incur in potential spamming?**

Every new feature added to the platform can expand the attack surface from malicious actors. The ability to install web apps is not new. The `beforeInstallPrompt` event allows for a developer to create custom UX to trigger _the same UX prompt_ that Web Install uses, and we have no/negligible spam. The install API does expand this capability to possibly include other content outside of the current loaded navigable, nonetheless only (under discussion) web apps that have an `id` and a manifest may be installed.

**What can be achieved with spamming though the Install API?**

We don't think there is anything particular useful or worse than the current same-origin install scenario that exists nowadays. There might be an increase in websites asking to install other origins which might increase the spamming of prompts, but there hasn't been any significant issue with current current-document installations and there are measures we can take to ship/update a high friction version of the capability if we see abuse.

**What additional safety measures can be put in place to mitigate abuse?**

We believe that we can ship a _high friction_ version of the feature to learn the behaviour of the API in the wild. This might include _gating the functionality of the API behind installation itself_. If a UA wanted, the ability for a web property to install other web applications can be performed only after the user installs an application. This provides a strong signal from the user about the understanding of the feature, and can also mitigate potential abuse from bad actors.

Limiting the time between API calls is also an option, and different browsers can also implement additional custom protections, like integrating into safe browsing screening type technologies that can flag or disable the permission in an origin or altogether block the user from navigating into a site.

