# Content-Encoding in Resource Timing

## Authors
<guohuideng@microsoft.com> or [guohuideng2024](https://github.com/guohuideng2024)

## Participate

Please join the discussion at: https://github.com/w3c/resource-timing/issues/381

## Introduction
Proposal to add a new field `contentEncoding` to `PerformanceResourceTiming`. `contentEncoding` holds a string corresponding to [Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding) header of the fetched resource.

Background information about `PerformanceResourceTiming` can be found [here](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming).

## Goal
-	Provide access to Content-Encoding values to enable developers to effectively experiment with new content encodings, monitor performance, and debug issues using Real User Monitoring (RUM).

## User Research

Increasing the speed of content delivery significantly enhances user experience by minimizing delays and frustrations associated with slow-loading
websites; and data compression plays a vital role in increasing content delivery speed. For the purpose of implementing data compression,
 [Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding) has been a very popular tool. It's widely
 supported and it's a foundation of some advanced compression mechanisms like [Compression Dictionary Transport](https://www.ietf.org/archive/id/draft-ietf-httpbis-compression-dictionary-19.html).

When web sites use `Content-Encoding` to optimize content delivery, often they rely on `PerformanceResourceTiming` to collect and analyze the performance data of different compression strategies
to find out the optimal solution. Often, it's very helpful or necessary to determine what `Content-Encoding` is used for a `PerformanceEntry` reported by `PerformanceResourceTiming`. In the past,
web sites have been inferring the `Content-Encoding` based on other information like encoded/decoded body size.

Inferring the `Content-Encoding` value has became harder and even impractical, as a larger set of new `Content-Encoding`, such as `zstd` and `Compression Dictionary Transport` are being experimented with and deployed.
Therefore, we need an explicit exposure of `Content-Encoding` in `PerformanceResourceTiming`.

This incremental proposal is brought up by [this discussion](https://github.com/w3c/resource-timing/issues/381). Example use cases may be found there as well.

## API Changes and Example Code

A new field `contentEncoding` will be added to the `PerformanceEntry` returned by `PerformanceResourceTiming`. A web developer can use this entry to retrieve the value of the `Content-Encoding` header for a specific resource in the following way:

```javascript
const entry_list = performance.getEntriesByType("resource");
console.log(entry_list[0].contentEncoding);
/*
Possible values are:  "br", "dcb", "dcz", "deflate", "gzip", "identity", "zstd" etc.
*/
```

## Pending Spec changes

###	Resource timing spec
https://github.com/w3c/resource-timing/pull/411

### Fetch spec

https://github.com/whatwg/fetch/pull/1796

## Design details

- At `fetch` stage, an arbitrary `contentEncoding` value in the response header is allowed. This is needed for the case where a service worker is getting resources in a proprietary encoding.

- The `contentEncoding` value to be exposed to `resourceTiming`(in the [response body info](https://fetch.spec.whatwg.org/#response-body-info)) is subject to filtering. The value
  is exposed only if it is a registered value at the [HTTP Content Coding Registry](https://www.iana.org/assignments/http-parameters/http-parameters.xhtml) and it is an encoding
  supported by the browser. Otherwise, `@unknown` is exposed instead.

  As in 2024/12, allowed values are the following: `br`, `dcb`, `dcz`, `deflate`, `gzip`, `identity`, `zstd`.

## Considered alternatives
None.

## Stakeholder Feedback/Opposition

According to https://github.com/whatwg/fetch/pull/1742, at least two implementers are interested and none opposed, citing  W3C WebPerf call on Feb 29, 2024. But according to the [WebPerf WG minutes](https://docs.google.com/document/d/1qPPCtpg1MyVw3GGmd6VKZCdCyqoDub6Xgc8ANnq8SRI/edit#heading=h.wkdzwqaypyq6), only Chromium is known to have approved this feature at that time.

As on 08/11/2025, Webkit is [supportive](https://github.com/WebKit/standards-positions/issues/467).  There is [no signal](https://github.com/mozilla/standards-positions/issues/1189) from Mozilla.


## References & acknowledgements
`jxck@chromium.org` did a significant amount of work toward this change, below is the link where a number of prototype CL/PR/bug filings can be found at the first comment:

https://github.com/whatwg/fetch/pull/1742

## Security/Privacy Considerations
-	The information is already discoverable indirectly through the sizing information. Therefore, there is no effective privacy loss.
-	The content-encoding is behind CORS check and hence the server has to opt in to make the information available.


### [Self-Review Questionnaire: Security and Privacy](https://w3ctag.github.io/security-questionnaire/)

>1.	What information does this feature expose, and for what purposes?

It exposes the Content-Encoding header value set by the server when the resource was fetched. It is only available when the CORS check passes. It clarifies the content encoding methods used by the resources and help developers understand the performance implications of them.
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

Yes. Due to the filtering, this feature can expose the encoding capability of the browser.
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

None.
>14.	How does this specification distinguish between behavior in first-party and third-party contexts?

No distinction.
>15.	How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?

No difference.
>16.	Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

Yes.
>17.	Do features in your specification enable origins to downgrade default security protections?

No.
>18.	What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?

No difference.
>19.	What happens when a document that uses your feature gets disconnected?

No difference.
>20.	Does your spec define when and how new kinds of errors should be raised?

No new errors should be raised.
>21.	Does your feature allow sites to learn about the users use of assistive technology?

No.
>22.	What should this questionnaire have asked?

Nothing else.

