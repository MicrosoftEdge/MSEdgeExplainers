# Native Styling Support for WebVTT Captions on Windows 10
**Author:** Rahul Singh
## Summary
As of Chromium 77, WebVTT closed caption styling is controlled by the website author. As such, if the user sets styling preferences on the Closed captions page in the Windows 10 Settings App, a Chromium based browser – like the new Microsoft Edge – won’t apply these preferences when styling WebVTT captions. This can lead to captions not being accessible to the user as the styling set by the author may not make allowances for an individual user’s needs.<br><br>This implementation overrides site styling for captions with any user preferences. This is supported on macOS as well.
## Closed Caption Styling Properties in Windows 10
The Windows 10 Settings app allows a user to set styling preferences for the following properties, all of which are supported in this implementation.
1.	Caption color
2.	Caption transparency
3.	Caption style
4.	Caption size
5.	Caption effects
6.	Caption background color
7.	Caption background transparency
8.	Window color
9.	Window transparency

## Goals
- Allow users to style WebVTT captions to their individual needs and aesthetic preferences.
- Allow website author settings to continue to apply under the following circumstances:
  - when the user leaves a property set to Default on Windows 10
  - when the user sets the "Allow video to override" toggle on macOS
  - on Windows 7 or other platforms that don't allow users to set styling preferences for Closed captions

## Design Overview
1.	We create a CaptionStyle struct that contains a set of std::string to hold caption style property values.
2.	We add a FromSystemSettings() method in CaptionStyle with a default implementation that returns std::nullopt.
```C++
struct NATIVE_THEME_EXPORT CaptionStyle {
  CaptionStyle();
  CaptionStyle(const CaptionStyle& other);
  ~CaptionStyle();

  // Returns a CaptionStyle parsed from a specification string, which is a
  // serialized JSON object whose keys are strings and whose values are of
  // variable types. See the body of this method for details. This is used to
  // parse the value of the "--force-caption-style" command-line argument and
  // for testing.
  static base::Optional<CaptionStyle> FromSpec(const std::string& spec);

  // Returns a CaptionStyle populated from the System's Settings.
  static base::Optional<CaptionStyle> FromSystemSettings();

  std::string text_color;
  std::string background_color;
  // Holds text size percentage as a css string.
  std::string text_size;
  std::string text_shadow;
  std::string font_family;
  std::string font_variant;
  std::string window_color;
  std::string window_padding; // macOS only
  std::string window_radius;  // macOS only
};
```
3.	We add a OS specific implementations for CaptionStyle::FromSystemSettings(). For Windows 10, we added this in caption_style_win.cc.
4.	We use system APIs to get caption styling property values that the user set. For Windows 10 we do this using the ClosedCaptionProperties class. This class became available starting with the intial release of Windows 10. For Windows versions previous to that, we return std::nullopt.
5.	We map the returned non-Default property values to their equivalent CSS Strings and set these in the CaptionStyle struct. We then return the now populated CaptionStyle.
```C++
if (background_color != ClosedCaptionColor_Default) {
  caption_style.background_color = 
      AddCSSImportant(GetCssColor(background_color));
}
```
6.	We use the returned CaptionStyle in ChromeContentBrowserClient::OverrideWebkitPrefs to populate the text_track fields defined in web_preferences.h.
7.	We call into this code from NativeTheme::GetSystemCaptionStyle() on browser start up.
```C++
ui::CaptionStyle style = ui::NativeTheme::GetInstanceForWeb()->
                                            GetSystemCaptionStyle();

// NativeTheme implementation.
base::Optional<CaptionStyle> NativeTheme::GetSystemCaptionStyle() const {
  return CaptionStyle::FromSystemSettings();
}                                            
```
For web video content that uses the WebVTT standard to include a caption payload for HTML5 content, this change will apply the caption styling preferences the user explicitly sets in the OS Settings app on Windows 10 or macOS.<br><br>
For videos that don’t use the WebVTT standard for closed captioning, no change in behavior should be observed with this change.
### Feature Flag
This change is behind a ui::base feature flag.
```C++
COMPONENT_EXPORT(UI_BASE_FEATURES) 
extern const base::Feature kSystemCaptionStyle;

// Allows system caption style for WebVTT Captions.
const base::Feature kSystemCaptionStyle{
    "SystemCaptionStyle", base::FEATURE_ENABLED_BY_DEFAULT};
```
