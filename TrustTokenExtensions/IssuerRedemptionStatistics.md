# Issuer Redemption Statistics

Authors: [Brandon Maslen](https://github.com/Brandr0id), [Erik Anderson](https://github.com/erik-anderson)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/) / [trust-token-api](https://github.com/WICG/trust-token-api)
* Current version: this document

## Introduction

Trust Tokens are a mechanism that allows the issuance and redemption of tokens in a way which ensures they cannot be used to track users but which are cryptographically signed to prevent forgery. In the context of fraud detection scenarios, the removal of a direct association between a token's issuance and its redemption introduces more risk that fraudulent activity can occur undetected.

## Goals
- Strengthen the ability to detect fraud via data flows involving the Trust Token API.
- Mitigate fraudulent activity where bots and/or other automated mechanisms leverage flows involving Trust Tokens.

## Non-Goals
- Significantly weakening the privacy guarantees of Trust Tokens
- Providing new fingerprinting vectors

## Use Case
If a set of statistics around Trust Token issuance and redemption is known, it will help detect fraudulent activities on clients when redeeming tokens.

##### Example 1:

A bot or malicious extension controls a legitimate browser instance and requests tokens. It then programmatically redeems tokens and continues to request more when the user is not using their computer.

The presence of statistics on token issuance would have helped alert the issuer to non-human usage of tokens.

##### Example 2:

A malicious user or software uses one token redemption to generate a large amount of activity, but not so much that it exceeds the volume a heavy user would generate, on a single domain `a.example`. This process is then repeated for `b.example`, `c.example`, and so on. In aggregate, this may be a signal that this level of activity is unlikely to be human-generated.

The presence of statistics when requesting new tokens would have helped alert the issuer to this distributed behavior.

## Proposed Solution

In order to give more signal to the Trust Token issuer while still preserving the privacy of the user, the User Agent will record and aggregate per-issuer information on token issuance and redemption. These statistics will reveal fraudulent token usage. Statistics for a given issuer are reset after each new token issuance.

###### Additional SRR metadata:
In order to support stats about usage patterns, the issuer should be able to provide a limited amount of metadata about the classification or ranking it has about the site performing a redemption.

This should be small, say a range of 1 to 10, and only allow visibility into the redemption patterns of a user but not specific browsing history.

The **Redemption-Rank** key can be used to return an int from **1-10** indicating the issuers ranking of that site. This categorization is entirely up to the Trust Token issuer's discretion, but it may correlate to Alexa or a similar internal site ranking or other metrics the issuer may deem useful.

The expectation is that, when issuers see new issue requests, the proportionate redemption rate among these buckets should fall within expectations/normal patterns and, if not, may indicate a higher likelihood of fraud or risky behavior.

###### Client aggregated stats:
 - Interarrival variance in redemption times.
   - e.g. a user typically redeems a token at 9am, 9:10am, and then twice more the next day at approximately the same times. We would then have the following interarrival times: 10 minutes, ~24 hours, 10 minutes. The variance between them can then be calculated.
 - Distribution of the time of day the redemption occurs, partitioned into four hour buckets. (e.g. 00:00 -> 04:00, 04:00 -> 08:00, ...). Each redemption would increment a counter for the given time bucket.
 - The rate at which a given SRR is used. For one redemption, the number of times a cached entry is used/sent. e.g. 30 requests made for 1 redemption -> 30/1
 - The count of requests made for each given redemption (note: related to the above stat).

###### Token redemption distribution context:
 - Issuer-specified, bucketized counts of redemptions.
   - The number of buckets would be small; we initially propose 10 buckets.
   - Example usage: the issuer may wish to classify sites requesting redemptions based on an internal ranking mechanism where one bucket may map to very large sites expected to do many redemptions while other buckets may map to sites with different expected redemption patterns.

     This information would help the issuer understand if a disproportionate number of redemptions happened on lower ranking sites which may be a useful signal to help evaluate fraud risk.
   - To reduce the risk of using this as a high-fidelity fingerprinting surface, we propose:
     - The bucket classification for a given origin should be persistent for some extended period, perhaps 3 days.
     - The User Agent could also choose to check with a UA-specific service to validate that the bucket chosen is consistent across users, perhaps by using an oracle constructed from client provided reports about the issuer + redeeming origin + bucket number to a UA's service or by having the UA crawl sites to independently check the values that are returned. Issuers that are caught providing different responses for different clients could be assumed to be fingerprinting and have their ability to issue tokens and/or redemption stats revoked.

###### Usage of stats
When tokens are requested from an issuer the collected statistics may be sent with the request for tokens to help inform the issuer about the aggregated usage of tokens by this user.

This information may be used to inform if tokens may be denied, but is not intended to provide any new tracking or fingerprinting vectors the issuer would not already have on the user.

Each statistic will be attached as a `RequestHeader` to the `Request` object of the created Fetch.

###### Request header format
- `Sec-Trust-Token-Redemption-Variance: <double: variance of redemptions>`
  - e.g. Sec-Trust-Token-Redemption-Variance: 10.01
- `Sec-Trust-Token-Redemption-Distribution: <int: 0-4 count, int: 4-8 count, ...>`
  - e.g. Sec-Trust-Token-Redemption-Distribution: 0,10,0,0,34,2
- `Sec-Trust-Token-Redemption-Rate: <double: rate of srr-usage>`
  - e.g. Sec-Trust-Token-Redemption-Rate: 50.35
- `Sec-Trust-Token-Redemption-Count: <int: count, int: count, ...>`
  - e.g. Sec-Trust-Token-Redemption-Count: 10,50,100000,45,3,1, ...)
- `Sec-Trust-Token-Redemption-Redemptions: <int: bucket1 count, int: bucket2 count, ..., int: bucket10 count>`
  - e.g. Sec-Trust-Token-Redemption-Redemptions: 45,12,2,...

#### Example
A user visits first party `issuer.example` and new tokens are requested. An HTTPS token issuance request to the issuer is made with the following additional request headers:
```
Sec-Trust-Token-Redemption-Variance: 0.0
Sec-Trust-Token-Redemption-Distribution: 0,0,0,0,0,0
Sec-Trust-Token-Redemption-Rate: 0.0
Sec-Trust-Token-Redemption-Count: null
Sec-Trust-Token-Redemption-Redemptions: 0,0,0,0,0,0,0,0,0,0
```

###### Redemption 1
The user subsequently visits `media.example` at 9:00am on day 1 and a token is redeemed; a SRR is returned with the additional metadata:
```
Redemption-Rank: 7
```
 - Bucket 08:00 -> 12:00 is incremented.
 - Bucket "7" for redemptions is incremented.
 - No time delta is recorded as no previous redemptions have occurred.

Over the course of 24 hours, the stored SRR is sent to third parties over 50 different requests.
 - The redemption count of 50 is stored.

###### Redemption 2
The user visits `social.example` at 10:00am on day 1 and a token is redeemed; a SRR is returned with the additional metadata:
```
Redemption-Rank: 9
```
 - Bucket 08:00 -> 12:00 is incremented.
 - Bucket "9" for redemptions is incremented.
 - 1 hour is added to the redemption variance calculation.

Over the course of 24 hours, the stored SRR is sent to third parties via 5000 different requests.
 - A redemption count of 5000 is stored.

###### Redemption 3
The user visits `other.example` at 5:00pm on day 1 and a token is redeemed; a SRR is returned with the additional metadata:
```
Redemption-Rank: 7
```
 - Bucket 16:00 -> 20:00 is incremented.
 - Bucket "7" for redemptions is incremented.
 - 7hr is added to the redemption variance calculation.

Over the course of 24 hours, the stored SRR is sent to third parties over 2 different requests.
 - The redemption count of 2 is stored.


###### Redemption 4
The user visits `media.example` again at 11:00am on day 2 and a token is redeemed; a SRR is returned with the additional metadata:
```
Redemption-Rank: 7
```
 - Bucket 08:00 -> 12:00 is incremented.
 - Bucket "7" for redemptions is incremented.
 - 18hr is added to the redemption variance calculation.

Over the course of 24 hours, the stored SRR is sent to third parties over 22 different requests.
 - The redemption count of 22 is stored.


###### Reissuance
On day 3 the user visits `issuer.example` again and tokens are requested again. An HTTPS token issuance request to the issuer is made with the following additional request headers:
Variance =>
   - mean => (1 + 7 + 18) /3 => 8.66~
   - calculation =>  (58.77~ + 2.77~ + 87.11~) / 3 => 49.55~

Rate => (50 + 5000 + 2 + 22) / 4 => 1268.5

```
Sec-Trust-Token-Redemption-Variance: 49.55
Sec-Trust-Token-Redemption-Distribution: 0,0,3,0,1,0
Sec-Trust-Token-Redemption-Rate: 1268.5
Sec-Trust-Token-Redemption-Count: 50, 5000, 2, 22
Sec-Trust-Token-Redemption-Redemptions: 0,0,0,0,0,0,3,0,1,0
```

Stats are all reset at this point and any new issuance request would only have deltas from this point.

## Privacy and Security Considerations

### Privacy

The intent of the additional stats are to expose more signals in a uniform manner about otherwise unknown redemption patterns of users. This should be done in a privacy-preserving manner in order to expose aggregated stats but nothing that breaks the unlinkability or other privacy benefits of the Trust Tokens API.

The usage of domains or timestamps to relate redemption requests was evaluated as it provides the strongest anti-fraud signal; however, the potential for linkability is too great. Instead, similar information that has been bucketized and aggregated would be more privacy preserving and could achieve similar anti-fraud benefits.

Stats that are proposed are considered to be useful signals to disambiguate human and non-human activity and are either in a fully aggregated form (e.g. Variance, Rate) or bucketized form (Distribution, Redemptions) with the exception of the Count statistic. In order to further preserve privacy, the values within this could be presented in "no particular order" or potentially even altered slightly by a large enough amount to prevent reliably fingerprinting the user while still providing a useful signal to the issuer.

### Security

We believe the primary threats that this proposal introduces involve privacy, which is discussed above.

## Open Questions

1. Are there other missing, useful stats that wouldn't reveal significant information about the client's browsing history on other origins?
1. Should the stats be sent via headers or should they be part of the POST request body sent during the token issuance request?
1. Should values be fuzzed/made differentially private? If so, which ones?
1. Should the values be reset on each token issuance or should statistics be sent based on some lookback period that might vary from time to time (e.g. 3-7 days)? Should statistics generated within some recent time period be withheld to prevent using this as a reliable data transfer mechanism?
1. Are there other meaningful privacy improvements that can be made to this proposal?
