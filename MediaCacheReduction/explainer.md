# Improving Battery Life by Avoiding Unnecessary Media Caching
**Author:** Shawn Pickett
## Summary Description
Today, streaming media content is cached to disk during acquisition and playback. Keeping the disk active during this process increases power consumption in general, and can also prevent certain lower-power modes from being engaged in the operating system. Since media consumption is a high-usage scenario, this extra power usage has a negative impact on battery life. This proposal will prevent the caching of certain media content to disk for the purpose of improving device battery life for users.
## Initial Results
We did local testing of a preliminary implementation playing back unencrypted 1080p streaming media content on a laptop while disconnected from power. The test configuration sampled power metrics every 10 seconds. Results for both the baseline build and a build with the implementation added were determined by the average of five runs each, with each run lasting five minutes.

The tests showed a 62mW improvement for the main battery rail with the change enabled. During this test, the system disk write activity decreased by 309KB/sec. There were no significant changes in virtual working set observed.
## Goals
* To improve battery life for devices by reducing power consumption during media playback.
* To minimize adverse impact on common scenarios that may rely on disk caching, specifically the optimization of seek time when the user forwards or rewinds by a few seconds.
## Future Opportunities
This change does not prevent caching in media scenarios that use methods other than 'Range' request headers for adaptive streaming. This means that sites which target segmented content through their URLs will still have caching enabled for their scenarios. For example, sites such as Yahoo and SlingTV use smaller discrete media files for each segment of their content, with a different URL for each file. Another example is YouTube, which specifies the range of the request through the URL query string, rather than through ‘Range’ request headers. The detection method for these type of streams would include parsing the URL to look for specific resource naming, such as '.ts' or '.m4s' file extensions, or ‘&Range=’ in the URL query string. This approach was not pursued since it was a heuristic-based solution and was not based on an existing web standard.
## Use-cases
For adaptive streaming content that uses the 'Range' HTTP request header to obtain partial media resources, this change will prevent the content from being cached to disk during playback.

This proposal is targeted for typical media playback scenarios where the user is primarily letting the content play and occasionally seeking backwards in order to view some content again. For these scenarios, there is no drawback in disabling the disk caching: Since the existing Media Source implementation already maintains the most recent content in memory, the user will still be able to engage in common scenarios such as scrubbing backwards a couple of seconds during playback without needing to re-acquire the content from the network. The existing seek responsiveness will be maintained in these cases.

For scenarios where the user seeks far enough back in time to go beyond the existing content stored in memory by the Media Source, there would be a network call to reacquire the requested resource, rather than a retrieval from the disk cache. This would be the same impact as in cases today where the content has already been evicted from the disk cache: The seek responsiveness will be network-bound, rather than disk-bound.

Given the power savings coming from disabling the constant disk writes during media playback, this change will still be a net positive result in terms of power consumption for mainline scenarios. The functional trade-off is in potentially slower seeks when jumping a significant distance from the current position.

Note that sites have the ability to directly set the cache mode on their Fetch or XHR media requests to prevent caching, but only a relatively small subset currently do this. Site outreach can potentially reduce the number of cases where this change is needed if the sites are willing to make this change. On the other hand, there is a long tail of sites hosting media that would require outreach, and sites do not have the same context that the browser does in terms of whether the device is running on battery, memory or disk pressure, and so on.
## Proposal
### Range HTTP Request Headers
Many streaming services utilize the Range HTTP request header in order to obtain a specific portion of a media resource.  The presence of this header in a request can be used as an indicator to disable caching for that request. Caching for a specific request can be disabled by setting its cache mode to 'no-store'.
### XHR Requests
For XHR requests, the `blink::ResourceRequest` object is created in `XMLHttpRequest::CreateRequest()`.  Once the request object has been populated, we will check whether the Range header has been set, and if so, set the cache mode on the request to ‘no-store’:
```C++
if (!request.HttpHeaderField(http_names::kRange).IsNull())
  request.SetCacheMode(mojom::FetchCacheMode::kNoStore);
```
### Fetch Requests
For Fetch requests, the `blink::FetchRequestData` object is passed into `FetchManager::Fetch()` after it has been mostly populated.  At that point, we will check whether the Range header has been set, and if so, set the cache mode on the request to ‘no-store’:
```C++
if (request->HeaderList() && request->HeaderList()->Has(http_names::kRange))
  request->SetCacheMode(mojom::FetchCacheMode::kNoStore);
```
### Media Element Requests
For Media Element requests, the `blink::WebURLRequest` object is created in `ResourceMultiBufferDataProvider::Start()`.  In this case, we already know we’re requesting media content, so it is unnecessary to check for the Range header.  We set the cache mode on the request to ‘no-store’ as part of the request population:
```C++
request.SetCacheMode(blink::mojom::FetchCacheMode::kNoStore);
```
### Power State Detection
Since the intent of this change is to preserve battery life, it is unnecessary to prevent caching when the device is connected to AC power.  The method `base::PowerMonitor::IsOnBatteryPower()` will be checked when considering each specific request, and we will only disable the cache when the device is on DC power.  The mainline benefit is therefore when the user is primarily on battery during the bulk of media playback.  In cases where the user repeatedly switches back and forth from AC to DC power during media playback, some of the content will be cached while some will not, depending on the power state when each request is created.
### Metrics
In order to evaluate the impact of this change, specific metrics will be added for consideration. These metrics can be evaluated on their own, or within a formal trial configuration. First, we will include an enumeration for usage counts based on the source of the request:
```C++
enum MediaRequestCacheType {
  MEDIA_REQUEST_FETCH_CACHE_ENABLED = 0,
  MEDIA_REQUEST_FETCH_CACHE_DISABLED = 1,
  MEDIA_REQUEST_XHR_CACHE_ENABLED = 2,
  MEDIA_REQUEST_XHR_CACHE_DISABLED = 3,
  MEDIA_REQUEST_ELEMENT_CACHE_DISABLED = 4,
  MEDIA_REQUEST_RANGE_CACHE_ENABLED = 5,
  MEDIA_REQUEST_RANGE_CACHE_DISABLED = 6,
  MEDIA_REQUEST_CACHE_TYPE_COUNT
};
```
At each of the three locations (XHR, Fetch, and Media Element) where the 'no-store' mode is added to the request, we will count usage via UMA_HISTOGRAM_ENUMERATION, for when the cache remains enabled and for when it is disabled. Additionally, in the `network::URLLoader` constructor we will measure the instances where the 'Range' header is present and whether the cache is enabled or disabled. This super-set measure will allow us to compare the other measures with 'Range' requests from other sources.

Next, when garbage collection is invoked for the Media Source, we will collect information on the current memory limit from `SourceBufferStream::GarbageCollectIfNeeded()`:
```C++
UMA_HISTOGRAM_MEMORY_MB("SourceBufferStream.MemoryLimit", memory_limit_ / (1024 * 1024));
```
We can also consider incorporating some additional UKM metrics to gain insight into the behaviors of specific sites.
### Feature Flag
Finally, this change will be behind a Blink feature flag, disabled by default.
```C++
BLINK_COMMON_EXPORT extern const base::Feature kTurnOffStreamingMediaCaching;

// Turns off streaming media caching to disk.
const base::Feature kTurnOffStreamingMediaCaching{
    "TurnOffStreamingMediaCaching", base::FEATURE_DISABLED_BY_DEFAULT};
```
The change can be enabled via chrome://flags, with the following name and description:
```C++
const char kTurnOffStreamingMediaCachingName[] = "Turn off caching of streaming media to disk.";
const char kTurnOffStreamingMediaCachingDescription[] =
    "Reduces disk activity during media playback, which can result in power savings.";
```
## Alternative Designs
One alternative design that was investigated was introducing a second in-memory backend to HttpCache for media content, instead of disabling the caching altogether. The intent was to mimic the current behavior of Incognito mode (where the HttpCache backend is changed from disk to in-memory), and hopefully prevent network calls for re-acquisition of content outside of the Media Source holdings.
There were a couple of issues with this approach:
- First, this required quite a bit of plumbing through the network stack, which (as a media-related feature) seemed somewhat orthogonal to the purpose of the network stack.
- Second, it duplicated media content in memory (once in the Media Source, and once in the in-memory cache).
- Finally, by maintaining the separate in-memory cache, total working set increased by 36MB, which was undesirable.

Another explored alternative was to check for the Range request header in a centralized location, specifically URLLoader. The disadvantage for that approach is that could include ranged requests for non-media scenarios, such as streaming game resources or virtualized PDF rendering. The Blink layers have more context about the request, so these non-media scenarios can be better avoided.

One other idea that was raised was the possibility of adding another state for the cache mode in the Fetch and XHR specifications. This state (`no-store-if-expensive`), would allow the user agent to opt-out of caching when specified (and when needed). This is appealing in terms of giving the sites the ability to specify their preference and intent more clearly. However, writing to the disk is always a relatively expensive operation in terms of power when considered in terms of long-term media playback, and relying on site preferences will not likely move the needle in terms of decreasing power consumption.
## Open Issues
- It would be good to get guidance on the relative importance of scenarios related to underpowered hardware configuration. For example: Suppose the user has a slow network connection, and they initiate streaming playback and leave their device for a period of time to allow the content to download. Since the Media Source will garbage collect media segments when under memory-pressure (per `SourceBufferStream::GarbageCollectIfNeeded()`) and the available memory storage is often smaller than the potential disk caching storage (compare `kDemuxerStreamVideoMemoryLimitDefault` which defaults to 150MB to `PreferredCacheSize()` which starts at 80MB but scales up to 20% of unused disk space), this change could potentially reduce the amount of media available for immediate playback in this scenario.

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Media%20Cache%20Reduction) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BMedia%20Cache%20Reduction%5D)
