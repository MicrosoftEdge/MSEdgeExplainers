# Expose resource dependency in Resource Timing

## Contacts

<guohuideng@microsoft.com> or [guohuideng2024](https://github.com/guohuideng2024)

## Participate

Please join the discussion at: https://github.com/w3c/resource-timing/issues/263

## References & acknowledgements

yashjoshimail@gmail.com put up [4 CLs](https://chromium-review.googlesource.com/q/owner:yashjoshimail@gmail.com) (wpt tests, and implementation for the cases where the initiators are html and javascript) and a [design doc](https://docs.google.com/document/d/1ODMUQP9ua-0plxe0XhDds6aPCe_paZS6Cz1h1wdYiKU/edit?tab=t.0) . More discussion can be found [here](https://github.com/w3c/resource-timing/issues/263) and [here](https://github.com/w3c/resource-timing/issues/380).

## Goal
To expose the dependency of the resources from RUM (real user monitoring) data.
As `nicjansma@` points out [here](https://github.com/w3c/resource-timing/issues/263), the data exposed by this proposal is a RUM version of [RequestMap tool](http://requestmap.webperf.tools/). The RequestMap tool can be a good demonstration of the data to be exposed.
Chrome devtool exposes an attribute [`initiator`](https://developer.chrome.com/docs/devtools/network) for a similar purpose.

## User Research

The idea was brought up in year [2021](https://github.com/w3c/resource-timing/issues/263). To sum up the discussion, quoting from `nicjansma@`, a more accurate dependency tree from RUM can help:
-	A web site to optimize load speed
-	The CDN to optimize delivering content
-	Security products to backtrace rogue requests

## API Changes and Example Code
A new field `initiatorUrl` will be added to the `PerformanceEntry` returned by `PerformanceResourceTiming`. `initiatorUrl` is the url of the resource that triggered the fetch of the current resource.

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log("name: ", entry.name, "initiatorUrl: ", entry.initiatorUrl);
  });
});
observer.observe({ type: "resource", buffered: true });

/*
sample output:
name: url_to_apple, initiatorUrl: ....
name: url_to_orange, initiatorUlr: url_to_apple

Then we conclude that resource "apple" triggered the fetch of the resource "orange".
*/
```

## Missing `initiator info` values
An empty `initiatorUrl` indicates the `initiator info` is missing. There are a number of possibilities discussed below.

### 1. `initiator` may not exist.
A main page can be loaded according to the user navigation. For the main page, `initiator` doesn't exist.

### 2. Resources may not be downloaded from network.
Resources can be cached, or handled by service workers, instead of being downloaded from network. They still appear in `PerformanceResourceTiming`. Such resources are not part of the resource dependency tree, and they are not relevant to the content delivery optimization.

**`initiatorUrl` is empty unless the resource is actually downloaded from network.**

There are a number of advantages to this approach.

- It's easier to consume the output to construct the resource dependency tree: Only the `PerformanceResourceTiming` entries with valid `initiator info` are considered. No extra filter is needed.

- It avoids overhead when the resources are loaded fast.

- It simplifies implementation.

### 3. UA only partially implements the `initiator Info`.
When the `initiator info` is missing for some resources, the partial resource dependency information is still useful. Therefore, a UA can release a partial `initiator info` implementation and make improvements later.


## Alternatives considered

### 1. Using a numeric Id to identify a resource, rather than using URL (Yosh's approach)

Using an Id obscures the target resource. We must provide the Id for all the resources so that the Ids can be interpreted.
This approach makes it more complicated to consume the information.

### 2. Using a pointer to the initiator `PerformanceResourceTiming` Entry

It would be effortless to find the initator resource. However, the initiator `PerformanceResourceTiming` entry may be garbage collected already when it's reported as an initiator resource. So it alone is not a reliable presentation.

## Other considerations
The "initiator" concept has been implemented in a number of places. Most noticeably, it's reported in Chrome Devtool "network" tab. However, there is a lack of a clear specification on how the initiator should be determined.

For interoperability, it's very desirable to specify how the initiator resource is determined.

## Stakeholder Feedback/Opposition
TBD.

## Security/Privacy Considerations
All the attributes proposed to be exposed are behind `CORS` check. `Timing-Allow-Origin` doesn’t expose these values.

### [Self-Review Questionnaire: Security and Privacy](https://w3ctag.github.io/security-questionnaire/)

>1.	What information does this feature expose, and for what purposes?

The new fields from `PerformanceResourceTiming` expose what resource triggered the fetch of what resource. Collected from RUM (real user monitoring), they can help the web sites and CDN optimize content delivery, and help security products track down rogue content.

>2.	Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?

Yes
>3.	Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?

No.
>4.	How do the features in your specification deal with sensitive information?

It does not deal with sensitive information.
>5.	Does data exposed by your specification carry related but distinct information that may not be obvious to users??

No.
>6.	Do the features in your specification introduce state that persists across browsing sessions?

No.
>7.	Do the features in your specification expose information about the underlying platform to origins?

No.
>8.	Does this specification allow an origin to send data to the underlying platform?

No.
>9.	Do features in this specification enable access to device sensors?

No.
>10.	Do features in this specification enable new script execution/loading mechanisms?

No.
>11.	Do features in this specification allow an origin to access other devices?

No.
>12.	Do features in this specification allow an origin some measure of control over a user agent’s native UI?

No.
>13.	What temporary identifiers do the features in this specification create or expose to the web?

No.
>14.	How does this specification distinguish between behavior in first-party and third-party contexts?

No distinction.
>15.	How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?

No difference.
>16.	Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

Yes.
>17.	Do features in your specification enable origins to downgrade default security protections?

No.
>18.	What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?

When navigating back to a document that has been alive in BFCache, some resources would be loaded from cache instead of network. The `initiatorUrl` field would be empty in the corresponding `PerformanceResourceTiming` entries. However, whether a resource is loaded from cache or network is already implicated by a collection of `content sizes` in `PerformanceResourceTiming`. Therefore, no new information is exposed because of this behavior.

>19.	What happens when a document that uses your feature gets disconnected?

No difference.
>20.	Does your spec define when and how new kinds of errors should be raised?

No new errors should be raised.
>21.	Does your feature allow sites to learn about the users use of assistive technology?

Not directly.
>22.	What should this questionnaire have asked?

Nothing else.

