# Transparent Ads Introduction 
Transparent ads have been designed to raise the bar on transparency and control with new privacy standards for personalized ads on the web. With transparent ads, Microsoft Edge will be able to show people what personal data is collected as they browse, who has access to it, and which ads are personalized because of it. People can understand why they’re seeing specific ads and where they came from.

For ads personalized by a transparent ads-approved provider, a user will be able to: 
* See which ad provider is a part of the Transparent Ad Provider program.
* See which ad provider is responsible for an ad. 
* See what data an ad provider collected or inferred to personalize that ad. 
* See the sites that an ad provider tracked the user across. 
* Visit the ad provider’s page to delete or de-identify any previously collected data.
* Disable transparent ads and approved providers will not collect user data in Microsoft Edge for personalized advertising.

These transparent ads are enabled through ad providers joining the Transparent Ad Providers program. Ad providers that join the Transparent Ads Provider program are contractually required to meet privacy requirements and will be exempt from tracking prevention enforcements in Balanced mode to allow more personalized ads. Users can disable transparent ads in settings if they choose. Strict mode of tracking prevention will not change and will continue to block a majority of trackers from all sites.

Protecting privacy online has primarily been done by blocking trackers – like through Edge’s tracking prevention – blocking sites’ ability to collect the data needed to power relevant and personalized ads. While some people prefer to totally block trackers, others find personalized ads valuable. Transparent ads will help empower people to decide what is the right balance of personal privacy protections and ad personalization for them.  

Long-term, and consistent with where the industry is headed, Microsoft Edge will phase out third-party cookies once new private advertising APIs have been standardized and broadly adopted. Transparent ads are intended as a bridge to help the industry move towards more privacy-preserving techniques and increased transparency and control, rather than be a permanent solution.


## In this document
* Transparent Ad-Provider Requirements: Overview 
* Detailed Implementation Requirements 
* Accountability 

# Transparent Ad-Provider Requirements: Overview 
The following section outlines the strict set of privacy requirements to join the Transparent Ad Provider program. More detailed technical implementation notes follow this table.

## Transparency
| Requirements | Comments | 
|--------------|----------|
|The ability for users to contact the company serving personalized ads | Contact information can be published in the privacy policy or terms of service document for the company. | 
| Privacy Policy must be published on the web at a [`/.well-known/`](https://datatracker.ietf.org/doc/html/rfc5785) location| Published privacy policies must cover the following:<ul><li> What types of cookies/tracking technologies are used? </li><li>What information is collected, how it is used, how it is stored/for how long? </li><li>How is collected data shared with other companies? </li><li>What security measures are taken to protect information? </li><li> What choices can users make regarding cookies and tracking technologies, such as opt-out or similar controls?  </li> |
| For ad serving partners (i.e. demand-side platforms), provide users with a clear indication when they are seeing an ad while browsing | Example: An “Ad” or “Sponsored” tag that aligns with [Microsoft’s ad labelling policies](https://about.ads.microsoft.com/resources/policies/traffic-quality) (currently under “Publisher resources” section). AdChoices and similar inline icons and controls would also satisfy this requirement.|
|Provide browser-consumable metadata on each ad that offers the following:<ul><li>For partners facilitating ad auctions: an understanding of what data was used to request bids</li><li>For ad serving partners: an understanding of what data was used to personalize the ad being served</li><li>An overview of how this data was acquired (user provided, inferred based on interactions on the same site, inferred based on interactions with other sites, collected via device characteristics, obtained from data partnerships with other companies, etc.)</li></ul>||
| Ensure ad slots are marked with a unique identifier. | The identifier will be used to link ads transparency metadata to discrete creatives. 

## Control
| Requirements | Comments | 
|--------------|----------|
| Do not collect user data on receipt of an opt-out header sent by the browser |Participants must take the following actions when the signal is present on a request:<ul><li>Opt the user out of any data collection for the purposes of content personalization</li><li>Eliminate the usage of any opaque tracking techniques (i.e. fingerprinting, network-based tracking, redirect/bounce tracking, etc.) for the purposes of circumnavigating a user's intent to opt out of data collection</li></ul>|
|Provide a data dashboard where the user can manage personal data collected by the ad provider. This dashboard should be published on the web at a /.well-known/ location.|The following must be true of this dashboard: <ul><li>The user must be able to delete or de-identify previously-collected data from their identity with the ad provider.</li><li>This operation must be accessible directly from the /.well-known/ location. For example, the user must not need to navigate to a separate document to access the control.</li><li>This operation must be achievable in its entirety from the /.well-known/ location. For example, the user should not need to manually contact the ad provider to complete the delete/de-identify request.</li><li>It must be possible to delete/de-identify data collected from all tracking domains owned by the provider at a single well-known location.</li></ul>Ad providers must not rejoin de-identified data with a user identity at a later date. |

## Respect
| Requirements | Comments | 
|--------------|----------|
|Honor users' choices for data control and do not make use of any privacy infringing techniques to perform targeting or reidentification as a means of circumnavigating any tracking prevention functionality or user choices made as part of this program.|These include, but are not limited to the following:<ul><li>Device fingerprinting</li><li>IP-based tracking</li><li>Redirect/bounce tracking</li></ul>|

## Protection
| Requirements | Comments | 
|--------------|----------|
|Any data collection must meet the [Microsoft privacy and data protection policies](https://about.ads.microsoft.com/resources/policies/privacy-and-data-protection-policies) and comply with all applicable laws and regulations related to the collection and use of personal data.||


# Detailed Implementation Requirements: Transparency
No additional requirements apply to the following:
* The ability for users to contact the company serving personalized ads
* For ad serving partners (i.e. demand-side platforms), provide users with a clear indication when they are seeing an ad while browsing. Example: An “Ad” or “Sponsored” tag that aligns with [Microsoft’s ad labelling policies](https://about.ads.microsoft.com/resources/policies/traffic-quality) (currently under “Publisher resources” section). AdChoices and similar inline icons and controls would also satisfy this requirement.

## Privacy policy at a /.well-known/ location

### Supporting /.well-known/privacy-policy
Servers should respond to HTTP requests for an origin’s /.well-known/privacy-policy URL with an OK status of `200–299`, OR a redirect status of `302`, `303`, or `307` and a [Location](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.2) header. Whether hosted directly at the /well-known/ location or following a redirect, the destination should be an actual page which hosts the privacy policy.
Examples:
* `example.com` hosts their privacy policy directly at `example.com/.well-known/privacy-policy`.
* `example.com`  redirects `example.com/.well-known/privacy-policy` to `example.com/about/privacy-policy`.
* `example.com`  responds to requests for `example.com/.well-known/privacy-policy` with a document that containing the following `<meta>` tag: `<meta http-equiv="refresh" content="0; url=https://example.com/about/privacy-policy">`.

### Contents of the privacy policy 
No additional requirements apply, so long as the following questions are addressed accurately and completely in the privacy policy:
* What types of cookies/tracking technologies are used?
* What information is collected, how it is used, how it is stored/for how long?
* How is collected data shared with other companies?
* What security measures are taken to protect information?
* What choices can users make regarding cookies and tracking technologies, such as opt-out or similar controls?

## Ad serving partners: ad metadata
Ad-serving partners must provide metadata for each ad they serve. The transparency schema required as part of the Transparent Ad Provider program builds on top of Google’s [Data Disclosure Schema](https://github.com/Ads-Transparency-Spotlight/documentation/blob/main/implement.md). Our intent is to formalize the transparency schema into a web standard, so that these techniques are industry-standard and predictably extensible for future use cases.

### API Usage 
When serving ads, providers should insert into the DOM a meta tag whose content attribute points to the JSON schema specified here. This JSON message must be minified and escaped.
All fields in the atps, advertisingPlatform, and ads objects are required. Participants must include one or both of the saleCategory and targetingCategory objects with all fields properly set according to data available to the participant. It is expected that supply-side platforms would provide the saleCategory object, whereas demand-side platforms would provide the targetingCategory object.

A full, unminified example (an explanation of individual fields follows):

```javascript
{
  "atps": [ {
    "idType": "IAB_GVL_ID",
    "id": 2,
    "name": "Supply-Side Platform Name"
  }, {
    "idType": "IAB_GVL_ID",
    "id": 3,
    "name": "Another Supply-Side Platform Name, If Applicable"
  } ],
  "advertisingPlatform": {
    "idType": "IAB_GVL_ID",
    "id": 1,
    "name": "Demand-Side Platform Name"
  },
  "saleCategory": {
      geoLocation: "APPROXIMATE",
      remarketing: "NOT_USED",
      userCharacteristics: [
         "NOT_USED"
      ],
      userInterests: false,
      context: true,
      device: true,
      lookalike: "NOT_USED",
      other: false
  },
  "targetingCategory": {
      geoLocation: "APPROXIMATE",
      remarketing: "WEBSITE_VISIT",
      userCharacteristics: [
         "GENDER",
         "AGE_GROUP",
         "LIFE_STAGE"
      ],
      userInterests: true,
      context: true,
      device: true,
      lookalike: "SIMILAR_AUDIENCE",
      other: false
  },
  "ads": [{
    "id": "123456789",
    "advertiserDomain": "adomainvalue.com",
    "advertiserName": "Brand Name",
    "type": "BANNER"
  }, {
    "id": "54098375390",
    "advertiserDomain": "contoso.com",
    "advertiserName": "Contoso Body Care",
    "type": "VIDEO"
  }]
  
}

```

Final expected format: 
```html 
<meta name="AdsMetadata" content="{&quot;atps&quot;:[{&quot;idType&quot;:&quot;IAB_GVL_ID&quot;,&quot;id&quot;:2,&quot;name&quot;:&quot;Supply-Side Platform Name&quot;},{&quot;idType&quot;:&quot;IAB_GVL_ID&quot;,&quot;id&quot;:3,&quot;name&quot;:&quot;Another Supply-Side Platform Name&quot;}],&quot;advertisingPlatform&quot;:{&quot;idType&quot;:&quot;IAB_GVL_ID&quot;,&quot;id&quot;:1,&quot;name&quot;:&quot;Demand-Side Platform Name&quot;},&quot;saleCategory&quot;:{&quot;geoLocation&quot;: &quot;APPROXIMATE&quot;,&quot;remarketing&quot;: &quot;NOT_USED&quot;,&quot;userCharacteristics&quot;: [&quot;NOT_USED&quot;],&quot;userInterests&quot;: false,&quot;context&quot;: true,&quot;device&quot;: true,&quot;lookalike&quot;: &quot;NOT_USED&quot;,&quot;other&quot;: false},&quot;targetingCategory&quot;:{&quot;geoLocation&quot;: &quot;APPROXIMATE&quot;,&quot;remarketing&quot;: &quot;WEBSITE_VISIT&quot;,&quot;userCharacteristics&quot;: [&quot;GENDER&quot;, &quot;AGE_GROUP&quot;, &quot;LIFE_STAGE&quot;],&quot;userInterests&quot;: true,&quot;context&quot;: true,&quot;device&quot;: true,&quot;lookalike&quot;: &quot;SIMILAR_AUDIENCE&quot;,&quot;other&quot;: false},&quot;ads&quot;:[{&quot;id&quot;:&quot;123456789&quot;,&quot;advertiserDomain&quot;:&quot;adomainvalue.com&quot;,&quot;advertiserName&quot;:&quot;Brand Name&quot;,&quot;type&quot;:&quot;BANNER&quot;},&quot;id&quot;:&quot;54098375390&quot;,&quot;advertiserDomain&quot;:&quot;contoso.com&quot;,&quot;advertiserName&quot;:&quot;Contoso Body Care&quot;,&quot;type&quot;:&quot;VIDEO&quot;}]}"/>

```

Ad tech providers may insert this metadata directly into a frame which hosts the ad creative. They may alternatively insert it into the DOM of the parent publisher document which hosts the embedded creative.
A single document (including embedded documents) may contain more than one set of reported metadata per provider. Providers may insert a separate meta tag for each individual ad. Providers **should** insert separate meta tags if the metadata is not consistent across ads, for example if one ad uses different types of targeting data than another ad in the host document.

### atps Object 
For each supply-side platform involved in the sale/auction of this ad slot (of which there may be only one), provide:
* idType: expected to always be IAB_GVL_ID in short term; this field is maintained from Google’s transparency schema in order to future proof the schema.
*  id: the relevant IAB ID for the provider. For more details [read the IAB's website "TCF – Transparency & Consent Framework"](https://iabeurope.eu/transparency-consent-framework/).
* name: will be displayed to users and should match the company name.

### advertiserPlatform Object 
For the demand-side platform which provided the winning bid/final ad creative, provide the same fields as the atps object.

### saleCategory and targetingCategory Objects
These two objects share the same fields but are separate in purpose. `saleCategory` reflects the information that the supply-side shared with the demand-side in order to facilitate the sale of ad space. `targetingCategory` reflects the information that the demand-side used to target an ad to the current user. Participants must provide at least one of these objects according to their role in the current ads’ context and what information is accessible to them.

The following describes these fields and accepted values.

*Examples of when to report a specific value may not be exhaustive to each provider’s use cases; providers may report using particular data for reasons not stated here. If you are unsure of what would be a faithful representation of your particular use case, please reach out and we would be happy to help. Providers should typically match given values based on the intent of a customer list or segment, regardless of the origination.* 

**context**
* `false`: Context wasn’t used.
* `true`: ad targeting/sale is (partially) based on either declared or inferred context. Broadly, context refers to any identifiers of the website or specific site media where the ad will be displayed, regardless of user identity. The equivalent of the following [OpenRTB objects](https://www.iab.com/wp-content/uploads/2015/05/OpenRTB_API_Specification_Version_2_3_1.pdf) would be considered a match for use of “context”: Site (any identifiers for the site/app, category, publisher or page level, including but not limited to URLs), Publisher > id, Content (any attributes that can be used for precise or imprecise context).

**device**
* `false`: device characteristics weren’t used.
* `true`: user device characteristics were used. The [OpenRTB “Device” object](https://www.iab.com/wp-content/uploads/2015/05/OpenRTB_API_Specification_Version_2_3_1.pdf) provides examples of user device characteristics that should be considered a match for this value. 

**geoLocation**
* `NOT_USED`: Geolocation data wasn’t used.
* `APPROXIMATE`: Geolocation data is based on either fuzzified lat-long or IP-derived location. Supply-side platforms which share IP address should likewise match `APPROXIMATE` in the `saleCategory` object.
* `PRECISE`: Precise geolocation data, as defined by the [IAB TCF v2.0](https://iabeurope.eu/iab-europe-transparency-consent-framework-policies/).
* `UNKNOWN_TYPE`: Other geolocation types, including cases where both `APPROXIMATE` and `PRECISE` are used or where `APPROXIMATE` or `PRECISE` cannot be determined. Supply-side platforms which share IP address should report sharing `UNKNOWN_TYPE` in the saleCategory object.

**lookalike**
* `NOT_USED`: Lookalike targeting was not used.
* `SIMILAR_AUDIENCE`: Lookalike targeting using a behavioral seed was used. Examples include Microsoft Ads’ [Similar Audiences](https://about.ads.microsoft.com/solutions/audience-targeting/similar-audiences) or Google’s [Affinity Audiences](https://support.google.com/displayvideo/answer/6021489?hl=en#zippy=).
* `ID_MATCH`: A customer was matched based on an identifier (e.g. email address, phone number, address) shared by the advertiser. An example includes Microsoft Ads’ [Customer Match](https://about.ads.microsoft.com/solutions/audience-targeting/customer-match).

Providers should match “lookalike” values based on the intent of a customer list, regardless of the origination. For example, a list of customers provided by a partner platform would be a match for `SIMILAR_AUDIENCE` if a behavioral seed was used to create that segment. If the “why” behind a particular customer segment from a third-party partner cannot be determined (e.g. unclear whether this customer segment is based on lookalike or remarketing behaviors), match the other: `OTHER_USED` key-value pair.

**remarketing**
* `NOT_USED`: Remarketing not used.
* `THIRD_PARTY`: The ad targeting/sale is based on online or offline data about the user from someone who may not be the advertiser. Customer segments supplied by a provider’s partners, and which are generated based on remarketing criteria, should generally be a match for this value.
* `WEBSITE_VISIT`: The ad targeting/sale is based on a previous visit to an advertiser’s website.
* `UNKNOWN_TYPE`: Other remarketing types not listed or undetermined. For example, `THIRD_PARTY` or `WEBSITE_VISIT` cannot be determined.

**userCharacteristics**
* `<empty repeated field = NOT_USED>`
* `NOT_USED`: User characteristics weren’t used.
* `GENDER`: The ad targeting/sale is (partially) based on either declared or inferred gender.
* `AGE_GROUP`: The ad targeting/sale is (partially) based on either declared or inferred age group.
* `JOB`: Information about a user's job was used.
* `INDUSTRY`: Information about the industry a user works in was used.
* `INCOME`: Information about a user's inferred (or provided) income was used.
* `LIFE_STAGE`: Information about a users` inferred (or provided) life stage (i.e. new parent, recent college grad, etc.) was used.
* `UNKNOWN_TYPE`: Other user characteristics not listed.

**userInterests**
* `false`: User interests weren’t used.
* `true`: The ad targeting/sale is (partially) based on either declared or inferred user interests.

**other**
* `false`: Other information wasn’t used.
* `true`: The ad targeting/sale is (partially) based on other information, either declared or inferred.

### ads Object
For each ad described by a given set of metadata (all required unless otherwise stated):
* **id**: an identifier for the ad creative. The value should match the value of an id attribute set on the relevant ad slot. Refer to “Ensure ad slots are marked with a unique identifier” for more information.
* **advertiserDomain**: the domain of the advertiser associated with the ad creative, e.g. “example.com”.
* **advertiserName**: optional, recommended field. The name of the advertiser associated with the ad creative. If available, a brand name for the specific product advertised (“Contoso Body Care”) is preferred over a brand name for the parent company (“Contoso MegaCorp”), in order to contextualize the ad for users.
* **type**: the type of ad impression. Takes one of the following string values:
    * BANNER
    * VIDEO
    * AUDIO
    * NATIVE
    * OTHER


## Ensure AdsMetadata meta tag is in the DOM
Ad-serving partners must ensure that for all ads, the AdsMetadata meta tag is included in the DOM. While it is understood that adding meta tags to the DOM is easier for certain type of ads (banner) than others (native, video ads), it is the responsibility of the ad provider to ensure ads metadata transparency is accessible to the browser within the DOM.
  
### Including AdsMetadata meta tag for BANNER ads type 
For banner ads, ad providers send the ad directly to the publisher as HTML and must include the ads transparency meta tag with the ad creative HTML. 
  
### Including AdsMetadata meta tag for VIDEO & AUDIO ads type
For video & audio ads, ad providers typically use non-HTML data format like XML to communicate ad details to the publisher. Even though ad providers may not be responsible for generating the ad creative HTML, ad providers must ensure that AdsMetadata meta tag for all video & audio ads makes into the DOM. 
  
[Digital Video Ad Serving Template (VAST)](https://www.iab.com/guidelines/vast/) is a commonly used data schema for structuring video and audio ad tags for ads served to video players. ad providers may use parts of the VAST spec to pass AdsMetadata to the publisher's page. For instance:
  * **Send metadata with \<CompanionAd\>**: Ad providers can use a \<CompanionAd\> containing a \<HTMLResource\> or \<IFrameResource\> sub-element to pass AdsMetadata along with a CompanionAd creative. 
  * **Send metadata with \<Extension\>**: Alternatively, ad Providers may pass AdsMetadata as an Extension and work with publishers to ensure the VAST player used by the publisher is able to extract the AdsMetadata tag from the extension element and include it in the DOM

Here is an example VAST ad Response that passes the AdsMetadata as a CompanionAd
 
```xml 
<VAST version="2.0">
  <Ad id="preroll-1">
    <InLine>
      <AdSystem>2.0</AdSystem>
      <AdTitle>Ad Title</AdTitle>
      <Error><![CDATA[http://example.com/trackingurl/error]]></Error>
      <Impression><![CDATA[http://example.com/trackingurl/impression]]></Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:15</Duration>
            <MediaFiles>
              <MediaFile id="5241" delivery="progressive" type="video/mp4" bitrate="500" width="400" height="300" scalable="1" maintainAspectRatio="1" apiFramework="VPAID">
                <![CDATA[https://example.com/VideoAd.mp4]]>
              </MediaFile>
            </MediaFiles>
        </Linear>
        </Creative>       
 <Creative>
          <CompanionAds>
            <Companion height="250" width="300" id="573242">
              <HTMLResource>
                <![CDATA[
<img src="https://example.com/CompanionAd.jpg">
<meta name="AdsMetadata" content="{&quot;advertisingPlatform&quot;: {&quot;idType&quot;: &quot;IAB_GVL_ID&quot;,&quot;id&quot;: 1111,&quot;name&quot;: &quot;Contoso&quot;},&quot;targetingCategory&quot;: {&quot;geoLocation&quot;: &quot;PRECISE&quot;,&quot;remarketing&quot;: &quot;NOT_USED&quot;,&quot;userCharacteristics&quot;: [&quot;NOT_USED&quot;],&quot;userInterests&quot;: true,&quot;context&quot;: false,&quot;device&quot;: false,&quot;lookalike&quot;: &quot;NOT_USED&quot;,&quot;other&quot;: false},&quot;ads&quot;: [{&quot;id&quot;: &quot;ad-1&quot;,&quot;advertiserDomain&quot;: &quot;shoplovegive.com&quot;,&quot;advertiserName&quot;: &quot;Teton Sleeping Bag&quot;,&quot;type&quot;: &quot;VIDEO&quot;}]}">						 
						]]>
              </HTMLResource>
            </Companion>
          </CompanionAds>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>
  
```
Here is an example VAST ad Response that passes the AdsMetadata as an Extension.

```xml
<VAST version="2.0">
  <Ad id="preroll-1">
    <InLine>
      <AdSystem>2.0</AdSystem>
      <AdTitle>Ad Title</AdTitle>
      <Error><![CDATA[http://example.com/trackingurl/error]]></Error>
      <Impression><![CDATA[http://example.com/trackingurl/impression]]></Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:15</Duration>
            <MediaFiles>
              <MediaFile id="5241" delivery="progressive" type="video/mp4" bitrate="500" width="400" height="300" scalable="1" maintainAspectRatio="1" apiFramework="VPAID">
                <![CDATA[https://example.com/VideoAd.mp4]]>
              </MediaFile>
            </MediaFiles>
        </Linear>
        </Creative>        
      </Creatives>
         <Extensions>
            <Extension type="AdsTransparency">
                 <![CDATA[
<meta name="AdsMetadata" content="{&quot;advertisingPlatform&quot;: {&quot;idType&quot;: &quot;IAB_GVL_ID&quot;,&quot;id&quot;: 1111,&quot;name&quot;: &quot;Contoso&quot;},&quot;targetingCategory&quot;: {&quot;geoLocation&quot;: &quot;PRECISE&quot;,&quot;remarketing&quot;: &quot;NOT_USED&quot;,&quot;userCharacteristics&quot;: [&quot;NOT_USED&quot;],&quot;userInterests&quot;: true,&quot;context&quot;: false,&quot;device&quot;: false,&quot;lookalike&quot;: &quot;NOT_USED&quot;,&quot;other&quot;: false},&quot;ads&quot;: [{&quot;id&quot;: &quot;ad-1&quot;,&quot;advertiserDomain&quot;: &quot;shoplovegive.com&quot;,&quot;advertiserName&quot;: &quot;Teton Sleeping Bag&quot;,&quot;type&quot;: &quot;VIDEO&quot;}]}">					 
						]]>
            </Extension>
  </Extensions>
  </Ad>
</VAST>

```
  
### Include AdsMetadata meta tag for NATIVE ads type
For native ads, ad providers typically use non-HTML data formats like JSON to communicate the details of the ad to the publisher. Even though the actual ad is communicated in data format, Ad partners must ensure that AdsMetadata meta tag for all native ads makes into the DOM. Updates to native ads rendering stack may be required.
  
[OpenRTB](https://iabtechlab.com/standards/openrtb/) is a commonly used standard with JSON data format for structuring native ads served to publishers. Ad servers may use the  `<ext>` object in the OpenRTB spec to pass AdsMetadata to the publisher and can update the ad rendering stack to include the AdsMetadata meta tag in the DOM. For instance:
  * Ad providers can update provider owned client-side widgets used for rendering native ads to include the AdsMetadata meta tag in the DOM
  * Ad providers can work with publishers to update their code used for rendering native ads to include the AdsMetadata meta tag in the DOM

Here is an example of an OpenRTB Native ad Response that passes the contents of the AdsMetadata meta tag in the `ext` object.

```json
{
  "native": {
    "link": {
      "url": "http://i.am.a/URL"
    },
    "assets": [
      {
        "id": 123,
        "required": 1,
        "title": {
          "text": "Learn about this product"
        }
      },
      {
        "id": 124,
        "required": 1,
        "img": {
          "url": "http://example.com/thumbnail1.png"
        }
      }
    ],
    "ext": {
      "AdsTransparency": {
        "adsMetadata": [
          {
            "content": {

              "text": "{&quot;advertisingPlatform&quot;: {&quot;idType&quot;: &quot;IAB_GVL_ID&quot;,&quot;id&quot;: 1111,&quot;name&quot;: &quot;Contoso&quot;},&quot;targetingCategory&quot;: {&quot;geoLocation&quot;: &quot;PRECISE&quot;,&quot;remarketing&quot;: &quot;NOT_USED&quot;,&quot;userCharacteristics&quot;: [&quot;NOT_USED&quot;],&quot;userInterests&quot;: true,&quot;context&quot;: false,&quot;device&quot;: false,&quot;lookalike&quot;: &quot;NOT_USED&quot;,&quot;other&quot;: false},&quot;ads&quot;: [{&quot;id&quot;: &quot;ad-1&quot;,&quot;advertiserDomain&quot;: &quot;shoplovegive.com&quot;,&quot;advertiserName&quot;: &quot;Teton Sleeping Bag&quot;,&quot;type&quot;: &quot;NATIVE&quot;}]}"
            }
          }
        ]
      }
    }
  }
}

```
  
## Ensure ad slots are marked with a unique identifier
Ad slots must be marked with an `id attribute`. This identifier will be used to tie ads transparency data back to a relevant ad slot on the publisher page, providing the user with proper context without requiring TAP participants to store unique ad thumbnails.

### Value 
The intent behind the id attribute value is that multiple ad tech providers involved in the same ad placement can provide the same id without requiring coordination between parties.
Use the following logic to supply the appropriate value of the id attribute:
1.	Match the value of the adid field returned in a relevant OpenRTB bid response.
2.	If `adid` is unavailable, match the value of the `crid` field returned in a relevant OpenRTB bid response.
3.	If neither `adid` or cr`id are available, use the equivalent unique ad creative identifier that would be expected by demand/supply-side platforms involved in the exchange.
4.	As a last resort (i.e. none of the prior options are available), choose another string value for the id, at a max length of 64 characters.
The resulting value must match whichever id is given for the ad in the ads transparency metadata.
Example: ad creative with an OpenRTB `adid` field of `“123456789”` would be marked as `<div id="123456789" …>`

### Placement
1.	Use `getElementById` in the context of the parent publisher document to check for an existing element with the given id value. If it exists, no further action is needed.
2.	Otherwise, set the id attr directly on the ad creative or the nearest modifiable ancestor. In some cases, this may require the addition of a wrapper element.

Ad “slot” should be considered an inclusive term. For audio/video ads, this may be the publisher’s media player widget. For native ads shown in “card” UI, the slot may be the outer wrapper of the relevant “card”. While there is some flexibility, the user should be able recognize the marked portion of the document as containing a discrete ad zone. It would not be appropriate, for example, to add the id to an `<article>` element that hosts a news article and the ad slot.

### Multiple ads for one slot 
In some cases, multiple ads may appear in one slot. Assuming that the `id` attribute was added to the slot instead of directly to the ad creative, use the value associated with the ad creative that was most recently shown to the user.
Example: an ad slot rotates in display ads “foo”, then “bar”, then “baz”. The ad slot’s `id` attr value would be “baz”.


# Detailed Implementation Requirements: Control
## Do not collect user data on receipt of an opt-out header
The browser will send a new `Sec-Data-Opt-Out` header, with a single value of 1 which indicates that a user has opted out of data collection for the specific domain the header is sent on. This header will be sent only on URLs owned by entities that a user has opted out of data collection from in Settings.

When a participant in the Transparent Ad Provider program receives a `Sec-Data-Opt-Out`: 1 header, they must not collect any user data in Microsoft Edge for the purposes of advertising/content personalization.

Future extensions to this API may leverage values other than `1`.

Note: the purpose of this header is to avoid the use of tracking practices such as fingerprinting and bounce redirects to get around the absence of third-party cookies, when the user has indicated they would like to block partners in the program. Any sources of user data outside of the user’s current browsing session are outside the purview of this header.
Data dashboard at a /.well-known/ location

## Data dashboard at a /.well-known/ location

### Supporting /.well-known/manage-data

Servers should respond to HTTP requests for an origin’s `/.well-known/manage-data` URL with an OK status of `200–299`, OR a redirect status of `302`, `303`, or `307` and a [Location](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.2) header. Whether hosted directly at the `/well-known/ `location or following a redirect, the destination should be an actual page where the user can control their data.
Examples:
* `example.com` hosts their privacy dashboard directly at `example.com/.well-known/manage-data`.
* `example.com ` redirects `example.com/.well-known/manage-data to example.com/account/`privacy-dashboard.
* `example.com`  responds to requests for `example.com/.well-known/manage-data` with a document that containing the following `<meta>` tag: `<meta http-equiv="refresh" content="0;url=https://example.com/account/privacy-dashboard">`.

### Expectations for delete/de-identify
The dashboard at `/.well-known/manage-data` expects a delete or de-identify operation, with the following characteristics:
* Partners must provide delete/de-identify operation for all data they have collected in connection to the user’s current identity when the user navigates to the data dashboard in Microsoft Edge. Exceptions are cases where the user has expressly provided data for user services (for example, an email address used to create an account). Management of this data can be handled separately.
* A deletion or de-identification of data can be achieved in one of several ways. This program does not aim to be prescriptive about which method is used. The core principle is that data previously stored about the user by the partner must be de-coupled or removed from their current identifier/identity. Examples include rotating IDs from data entries, completely removing IDs from records, or even completely removing data records wholesale.
* If the partner retains user data (e.g. with a rotated ID), the partner must not relink these entries with the user’s new identity in Microsoft Edge. For example, partners must not rejoin rotated/delinked/forgotten data entries based on IP address.
* This program makes no assertions as to how data is handled by partners of transparent ad provider partners.

# Detailed Implementation Requirements: Respect, Protection
No additional requirements apply to these categories.

# Accountability
The Transparent Ad Provider is open to any partner willing and able to meet program requirements. To ensure all requirements are met, Microsoft will audit partner compliance on a quarterly basis. A public complaint against the provider may invoke additional review. Microsoft may transition some auditing practices, e.g. manual review, to a neutral third party in the future.

When a violation is discovered, Microsoft will reach out to the company in question with a summary of the issue. If the issue is valid, the partner will be removed from the program for 6 months. Partners may rejoin after this period if:
1.	The partner provides proof that the original issue has been resolved and
2.	Agrees to any new requirements that may have been put in place during the time they were not in the program.

We plan to audit the program requirements using the process below: 

## Transparency
| Requirements | Auditing | 
|--------------|----------|
|The ability for users to contact the company serving personalized ads | Provide Microsoft a URL at which you expect contact information to be accessible to the user (e.g. on a privacy policy or TOS page). Notify Microsoft if the location of this contact information moves to a new page. The presence of contact information will undergo quarterly manual review. | 
| Privacy Policy must be published on the web at a [`/.well-known/`](https://datatracker.ietf.org/doc/html/rfc5785) location| Availability automatically audited. >= 90% of requests to this well-known location in a 30-day period should successfully result in an OK/redirect status. <br> Partners must provide notice of substantive changes to their privacy policy within 30 days of making the change <br>The change will undergo manual review. As a failsafe, text changes will also undergo quarterly manual review. |
| For ad serving partners (i.e. demand-side platforms), provide users with a clear indication when they are seeing an ad while browsing | No new auditing under this program. If a partner appears on the [Acceptable Ads](https://acceptableads.com/standard/) blocklist (which standard includes clear and user-visible demarcation of ads), this may cause review of inclusion in the program.|
|Provide browser-consumable metadata on each ad that offers the following:<ul><li>For partners facilitating ad auctions: an understanding of what data was used to request bids</li><li>For ad serving partners: an understanding of what data was used to personalize the ad being served</li><li>An overview of how this data was acquired (user provided, inferred based on interactions on the same site, inferred based on interactions with other sites, collected via device characteristics, obtained from data partnerships with other companies, etc.)</li></ul>|Availability automatically audited. >= 75% of unblocked requests to image or iframe resources in a 30-day period should be represented in a corresponding metadata JSON blob. <br> Upon onboarding to the TAP program, provide Microsoft with representative samples of transparency metadata. Participants may provide multiple samples in order to accurately reflect various real-world scenarios, which may differ in patterns of data use. Not to exceed 5 samples. If a significant change in metadata reporting is detected (e.g. a partner consistently reporting on far fewer fields than expected based upon samples), Microsoft will contact the partner to discuss the trend. Providing near-zero metadata transparency may cause review of inclusion in the program.|
| Ensure ad slots are marked with a unique identifier. | Functionality automatically audited. >= 75% of unblocked requests to image or iframe resources in a 30-day period should be represented with a corresponding `id` attribute.

## Control
| Requirements | Auditing | 
|--------------|----------|
| Do not collect user data on receipt of an opt-out header sent by the browser | Provide Microsoft with NDA documentation as to how the partner will respond to the signal. Which operations will be disabled and how? Which will not? Are there any tracking practices which are never used, regardless of whether the opt-out signal is sent or not? Please be as specific as possible in identifying data-sharing programs, tracking resources, header values, etc. In case of any substantive changes, provide Microsoft with updated documentation. <br>Substantive changes that were not reported—or detected use of obfuscated tracking practices to circumnavigate tracking prevention when in receipt of this signal—may cause review of inclusion in the program.<br>For example, Microsoft may reach out to the partner upon detection, reports, or complaints of… <ul> <li>Use of a fingerprinting library, or behaviors consistent with fingerprinting </li><li>Advertising domains appearing in redirect chains</li><li>	Receipt of headers that were not specified in the documentation </li></ul> …in Microsoft Edge browser instances where an opt-out header was sent. This list is not all-inclusive. Microsoft may reach out to the partner to request unminified code or documentation in cases where the purposes of a given loaded resource are not inherently clear. |
| Provide a data dashboard where the user can manage personal data collected by the ad provider. This dashboard should be published on the web at a  [`/.well-known/`](https://datatracker.ietf.org/doc/html/rfc5785) location| Availability automatically audited. >= 90% of requests to this well-known location in a 30-day period should successfully result in an OK/redirect status. Quarterly manually review of available controls. |

## Respect
| Requirements | Auditing | 
|--------------|----------|
|Honor users' choices for data control and do not make use of any privacy infringing techniques to perform targeting or reidentification as a means of circumnavigating any tracking prevention functionality or user choices made as part of this program.|Refer to "opt-out" header auditing>|

## Protection
| Requirements | Auditing | 
|--------------|----------|
|Any data collection must meet the [Microsoft privacy and data protection policies](https://about.ads.microsoft.com/resources/policies/privacy-and-data-protection-policies) and comply with all applicable laws and regulations related to the collection and use of personal data.|No new auditing under this program. Complaints raised against a participant (including but not limited to: informal user complaints, regulatory inquiries, and formal complaints filed in local jurisdictions) may cause review of inclusion in the program.|

