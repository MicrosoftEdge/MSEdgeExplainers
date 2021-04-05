# Native Caret Browsing Design Document

## Contact emails

Bruce.Long@microsoft.com, pcupp@microsoft.com, Grisha.Lyukshin@microsoft.com

## Introduction

This document provides an overview of the proposed changes in Chromium to support native caret browsing. For a high-level description of native caret browsing and the motivation for introducing the feature, see the associated [explainer doc](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Accessibility/CaretBrowsing/explainer.md).


## Changes in the Renderer Process

### Making the caret visible in non-editable content

Currently in Chromium, you can already place a caret in non-editable content by clicking in it, but the caret won't be rendered since it is at a non-editable position. Allowing the caret to be rendered at non-editable positions just requires a couple of changes to the [FrameCaret](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/frame_caret.h) class, where there is logic to determine if the caret should be rendered (in [UpdateStyleAndLayoutIfNeeded](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/frame_caret.cc?dr=CSs&q=FrameCaret::UpdateStyleAndLayoutIfNeeded&g=0&l=145)) or should blink (in [ShouldBlinkCaret](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/frame_caret.cc?q=FrameCaret::ShouldBlinkCaret&dr=CSs&l=202)). In both cases the change is to convert an "if editable" condition to an "if editable *or* caret browsing is enabled" condition. The [FrameSelection](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/frame_selection.h) class also needs a similar update in [ShouldPaintCaret](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/frame_selection.cc?q=+FrameSelection::ShouldPaintCaret&dr=CSs&g=0&l=519) to prevent an assertion failure.

### Allowing the user to move the caret in non-editable content

Chromium has a set of move commands that are used to move the caret in editable content when the user presses a key (e.g., an arrow key). All of the editing commands, including the move commands, have an "is_enabled" function associated with them that determines when the command is enabled. (See the [kEditorCommands](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/commands/editor_command.cc?q=kEditorCommands&dr=C&l=1291) array in editing_commands.cc for the associations.) For the move commands, the "is_enabled" function is currently [EnabledInEditableText](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/commands/editor_command.cc?type=cs&q=EnabledInEditableText&sq=package:chromium&g=0&l=1081), which only allows the command to execute when the active caret/selection is in editable content. To allow the user to move the caret through non-editable content, a new "is_enabled" function is added and associated with the commands that move the caret: EnabledInEditableTextOrCaretBrowsing.

In addition, two "is_enabled" functions that return true when there is an active visible caret in editable content need to be updated to "if editable *or* caret browsing is enabled" since a caret can now be visible in non-editable content. These "is_enabled" functions are [EnabledVisibleSelection](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/commands/editor_command.cc?type=cs&q=EnabledVisibleSelection&sq=package:chromium&g=0&l=1035) and [EnabledVisibleSelectionAndMark](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/commands/editor_command.cc?type=cs&q=EnabledVisibleSelection&sq=package:chromium&g=0&l=1052), and they are used for commands related to modifying a selection (e.g., pressing Shift+ArrowRight to turn a caret into a selection).

### Moving focus when the caret enters/exits focusable elements

While caret browsing, if you move the caret into an interactive element such as an anchor element, that element needs to become focused so that the user can activate it with the keyboard (e.g., by pressing Enter). This is done by updating the "move" commands that handle moving the caret in response to user input. These commands are implemented by static methods in the [MoveCommands](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/commands/move_commands.h?q=MoveCommands&sq=package:chromium&dr=CSs&l=48) class. A new UpdateFocusForCaretBrowsing method is added to MoveCommands, and each move command that moves the caret is updated so that that method it called after the caret is moved. If the caret is at a non-editable position and caret browsing is enabled, new method UpdateFocusForCaretBrowsing moves focus to the nearest focusable ancestor of caret. If there is no focusable ancestor then the FocusedElement is set to null, which means that the body will be the active element by default.

Note: A CORE_EXPORT macro is added to the MoveCommands class declaration so that MoveCommands functions can be called in unit tests. (The webkit_unit_tests binary does not statically link to the product code, so classes/functions that you want to directly reference in a unit test need to exported from whatever DLL they are in, from blink_core in this case.)

### Moving the caret to the focused element (if not already there)

If there is no caret in focus (e.g., because you haven't placed a caret, or because you moved focus away from the caret by tabbing) then pressing keys that would move the caret need to cause the caret to move to the active element so that you can start caret browsing from there. This is done by adding an UpdateSelectionForCaretBrowsing function to the MoveCommands class and having the commands that move the caret call that function before moving the caret. If there is no selection in focus then that method moves the caret to the first position in that element. (Note: If the element is one that cannot contain the caret, like an IMG element, then the caret is moved in front of the element.)

### The "is caret browsing enabled" setting in the renderer

The primary "is caret browsing enabled" preference/setting is owned by the browser process, but the renderer process has a copy of it that gets updated by the browser process whenever it changes. The renderer's copy is in the blink::Settings. The setting is defined in a JSON file ([settings.json5](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/frame/settings.json5?q=settings.json5&sq=package:chromium&dr)) and gets added to the Settings class through code generation. The setting is exposed outside of Blink through a [WebSettings](https://cs.chromium.org/chromium/src/third_party/blink/public/web/web_settings.h?q=WebSettings&sq=package:chromium&dr=CSs) interface that is implemented by a [WebSettingsImpl](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/exported/web_settings_impl.h?q=WebSettingsImpl&sq=package:chromium&dr=CSs) class. When the browser sends updated preference values to the renderer, the update happens in [RenderViewImpl::OnSetRendererPrefs](https://cs.chromium.org/chromium/src/content/renderer/render_view_impl.cc?type=cs&q=RenderViewImpl::OnSetRendererPrefs&sq=package:chromium&g=0&l=1935). All new browser tabs respect the current caret browsing setting.


## Changes in the Browser Process

### Caret browsing preferences/settings in the browser

There are two user preferences/settings for caret browsing: an "is caret browsing enabled" setting and a "show caret browsing dialog" setting. These are accessed in code through strings that are defined in the [prefs namespace](https://cs.chromium.org/chromium/src/chrome/common/pref_names.cc?q=pref_names.cc): kCaretBrowsingEnabled and kShowCaretBrowsingDialog. The initial values for these preferences are set in [RegisterBrowserUserPrefs](https://cs.chromium.org/chromium/src/chrome/browser/ui/browser_ui_prefs.cc?q=RegisterBrowserUserPrefs&dr=CSs&l=52). Both values are persisted in a Preferences file on the local file system. However, we do not want caret browsing to be enabled at the start of a new browser session, since if a user opts for "don't show the dialog again," they may not realize that they are in caret browsing mode and may not remember how to turn it off. As discussed in the previous section, when caret browsing mode is toggled, the state change needs to be broadcast to all renderer processes, as well as have the setting honored when a new renderer process is launched. It is easiest to do this using the existing preferences implementation, but on browser process launch ignore the setting that is persisted to permanent storage and start with caret browsing turned off. This is done by resetting the preference in [ProfileManager::DoFinalInit](https://cs.chromium.org/chromium/src/chrome/browser/profiles/profile_manager.cc?type=cs&q=ProfileManager::DoFinalInit&sq=package:chromium&g=0&l=1283).

The kCaretBrowsingEnabled preference is registered with a [PrefChangeRegistrar](https://cs.chromium.org/chromium/src/components/prefs/pref_change_registrar.h?q=PrefChangeRegistrar&dr=CSs) in [PrefWatcher](https://cs.chromium.org/chromium/src/chrome/browser/ui/prefs/pref_watcher.h?dr=CSs&q=PrefWatch&g=0&l=20) so that whenever its value changes a callback is called ([PrefWatcher::UpdateRendererPreferences](https://cs.chromium.org/chromium/src/chrome/browser/ui/prefs/pref_watcher.cc?dr=CSs&g=0&l=105)) that will send the updated preference values to the renderer processes. The preferences are sent through a [RendererPreferences](https://cs.chromium.org/chromium/src/out/win-Debug/gen/third_party/blink/public/mojom/renderer_preferences.mojom.h?q=RendererPreferences&dr=CSs) object. There is a corresponding entry for caret_browsing_enabled under RendererPreferences in [common_param_traits_macros.h](https://cs.chromium.org/chromium/src/chrome/common/common_param_traits_macros.h?q=common_param_traits_macros.h&dr=CSs) that is needed for mojo. Before it is sent to the renderer, the RendererPreferences object gets populated with the user preference values in [UpdateFromSystemSettings](https://cs.chromium.org/chromium/src/chrome/browser/renderer_preferences_util.cc?dr=CSs&g=0&l=80).

### The caret browsing dialog

The confirmation dialog that is shown when you press F7 is implemented by a new CaretBrowsingDialogDelegate class. The class inherits from a [DialogDelegateView](https://cs.chromium.org/chromium/src/ui/views/window/dialog_delegate.h?sq=package:chromium&g=0&l=178) class and overrides the methods it needs in order to provide the correct strings and functionality. The strings for the dialog are defined in [generated_resources.grd](https://cs.chromium.org/chromium/src/chrome/app/generated_resources.grd?q=generated_resources.grd&dr). A ShowCaretBrowsingDialog method is added to the [BrowserWindow](https://cs.chromium.org/chromium/src/chrome/browser/ui/browser_window.h?type=cs&q=+BrowserWindow&g=0&l=100) interface, which is implemented by [BrowserView](https://cs.chromium.org/chromium/src/chrome/browser/ui/views/frame/browser_view.h?type=cs&q=BrowserView&g=0&l=99). This method calls a static method of CaretBrowsingDialogDelegate to show the dialog. (A stub implementation of ShowCaretBrowsingDialog is also added to [TestBrowserWindow](https://cs.chromium.org/chromium/src/chrome/test/base/test_browser_window.h?type=cs&q=TestBrowserWindow&g=0&l=36).)

### The caret browsing experimental feature flag chrome://flags)

There is a "caret-browsing" experimental feature flag that determines if pressing F7 is ignored by the browser or if F7 starts the "toggle caret browsing mode" flow.

### Mapping F7 to the "Toggle Caret Browsing" browser command

A browser command is defined for toggling caret browsing mode in [chrome_command_ids.h](https://cs.chromium.org/chromium/src/chrome/app/chrome_command_ids.h?q=chrome_command_ids.h&dr=CSs), and the F7 key is mapped to this command in [chrome_dll.rc](https://cs.chromium.org/chromium/src/chrome/app/chrome_dll.rc?q=chrome_dll.rc&dr) and [accelerator_table.cc](https://cs.chromium.org/chromium/src/ash/accelerators/accelerator_table.cc?q=accelerator_table.cc&dr). When F7 is pressed, if the caret browsing feature flag is enabled, the [BrowserCommandController::ExecuteCommandWithDisposition method](https://cs.chromium.org/chromium/src/chrome/browser/ui/browser_command_controller.cc?type=cs&q=ExecuteCommandWithDisposition&g=0&l=296) will be called. The command controller calls the ToggleCaretBrowsingMode method (in [browser_commands.cc](https://cs.chromium.org/chromium/src/chrome/browser/ui/browser_commands.cc?q=browser_commands.cc&dr)), which will either launch the confirmation dialog or toggle the caret browsing mode directly, depending on the value of the "show caret browsing dialog" setting.

## Caret movement behavior

### Relation to existing caret and selection navigation
Caret movement for native caret browsing using the arrow keys follows the same model as caret movement in editable regions or the selection focus in editable or read-only regions of the document.  It is a non-goal to derive any separate model for moving the caret that would lead to a disjoint experience when, for example, the user extends the caret into a selection by holding shift while pressing an arrow key.

This movement model constrains caret movement within the same regions that establish natural boundaries for selection, i.e. the caret can move from position X to position Y if a selection can start at X and end at Y. This precludes moving into or out of controls, across regions with different content-editabilities, or across iframes.

### Relation to tab navigation
Movement between selection boundaries established by controls and other elements that are intrinsically focusable is generally possible with tab navigation unless the author has explicitly declared these elements to not be tab stops.  Moving focus also moves the caret into the focusable element, so in this way, tab navigation facilitates moving the caret into regions that are not otherwise accessible using caret browsing alone and is complementary to the caret browsing feature.  

### Relation to spatial navigation
The [spatial navigation](https://drafts.csswg.org/css-nav-1/) feature enables movement between focusable items and scrolling based on the directional input received and the spatial arrangement of focusable items on the page.

Caret browsing would typically be used to place the caret, extend it into a selection, and copy content to the clipboard.  Spatial navigation moves focus between focusable elements; it is to caret browsing as tab navigation is to caret browsing.  It should be complementary, but because (for the moment) they consume the same input (arrow keys) you really need to use just one or the other and not both at the same time. 

The situation is similar to how caret browsing interacts with scrolling: caret browsing handles the arrow key and as a result the caret moves instead of the page scrolling (unless the caret would navigate out of the viewport in which case it is scrolled back into view). 

If both spatial navigation and caret browsing are enabled, caret browsing will take priority over spatial navigation.  You can toggle caret browsing on and off with F7 so it is easy to get back into a mode that moves between focusable elements with the arrow keys instead of moving the caret. 

It is not even clear that on devices where spatial navigation shines (like navigating with a TV remote) that you would ever want to enable caret browsing--it may be that the flags controlling the features will never be enabled by default on the same device. 

## Performance
Implementation of caret browsing is not expected to impact the performance of any existing features.


## Testing plan
Unit test coverage to verify that toggling the caret browsing preference works will be added to [BrowserCommandsTest](https://cs.chromium.org/chromium/src/chrome/browser/browser_commands_unittest.cc?q=BrowserCommandsTest&sq=package:chromium&dr=CSs) (run under unit_test.exe). Further unit test coverage for the feature will be added to blink_unittests.exe:
- the existing [EditingCommandTest](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/commands/editing_command_test.cc?type=cs&q=EditingCommandTest&g=0&l=36) will have new test cases added
- a new suite of move command tests called MoveCommandsTest will be implemented
- a test to verify the caret blinks when caret browsing is enabled will be added to the existing [FrameCaretTest](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/frame_caret_test.cc?type=cs&q=FrameCaretTest&g=0&l=19).


## Implementation and Shipping Plan
The feature will initially be behind a runtime flag and disabled by default. We will follow the standard Chromium guidelines to determine when to enable the feature by default.
