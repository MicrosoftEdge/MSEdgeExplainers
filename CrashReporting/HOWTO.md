# How to use the Include JavaScript Call Stacks In Crash Reports API

Enabling JavaScript call stacks in crash reports from unresponsive pages can provide valuable insights into the state of your application at the time of a renderer crash, helping with debugging and improving stability. This feature is currently available in Chrome 125 and later behind a flag.

## Enabling the Feature in Browsers

1) Open your browser and navigate to the experimental features page:
   - For Edge, Chrome, enter `edge://flags` or `chrome://flags` in the address bar.

2) Search for and enable the following flag:
   - `Experimental Web Platform features`

3) Restart the browser for the changes to take effect.

### From the command line

Alternatively, You may enable the feature using one of the following the command line flags: 
- `--enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports`
- `--enable-features=experimental-web-platform-features`.

## Using the API

To include JavaScript call stacks in crash reports, you must opt-in by setting the appropriate document policy header.

```
include-js-call-stacks-in-crash-reports
```

### Opting-In via HTTP Header

Add the following HTTP header to your server responses:

```
Document-Policy: include-js-call-stacks-in-crash-reports
```


If you've never use the Reporting API before, [here](https://developer.chrome.com/docs/capabilities/web-apis/reporting-api) is a guide that can help you get set up with a server that can receive reports.

