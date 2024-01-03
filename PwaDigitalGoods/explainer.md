# Digital Goods API For Microsoft Store PWA Explainer

Author: [Runyuan Ye](https://github.com/runyuany)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [Microsoft Edge Explainers](https://github.com/MicrosoftEdge/MSEdgeExplainers)
* **Current version: this document**

## Introduction
The [Digital Goods API](https://wicg.github.io/digital-goods/) allows web applications to get information about their digital products and their user’s purchases managed by a digital store. The user agent abstracts connections to the store and the [Payment Request API](https://www.w3.org/TR/payment-request/) is used to make purchases.

### Relation to [Digital Goods API](https://wicg.github.io/digital-goods/) proposal
This explainer contains the implementation of standard Digital Goods API to support in app purchase for PWAs in the Microsoft Store.

## Goals

* Set up the Digital Goods API to work with Edge Payment Request and enable in-app purchase for PWAs in the Microsoft Store.

## Non-goals

* Edge Digital Goods API support for Google Play and broader Web platform payment methods.
* Edge Digital Goods API support for normal PWAs installed from browser but not Microsoft Store.
* W3C standardization.

## Definitions

<dl>
<dt id="dfn-service-provider">Service Provider</dt><dd>

A service provider is an argument that passed to Digital Goods factory, and it is a URL which tells Digital Goods where to query digital products information.

</dd>
<dt id="dfn-pmi">PMI</dt><dd>

A PMI (Payment Method Identifier) is an argument that passed to Payment Request factory, and it is an identifier for a specific payment method.

</dd>
<dt id="dfn-add-ons">Add-on</dt><dd>

Add-ons (also sometimes referred to as in-app products) are supplementary items for your app that can be purchased by customers. An add-on can be a fun new feature, a new game level, or anything else you think will keep users engaged. Not only are add-ons a great way to make money, but they help to drive customer interaction and engagement.

Add-ons are published through [Microsoft Partner Center](https://partner.microsoft.com/en-us/dashboard/home), and require you to have an active developer account. You'll also need to enable the add-ons in your app's code.

</dd>
</dl>

## The problem

One of the most sought-after web standards for browsers is the ability to offer and purchase digital goods through an integrated in-app purchase experience. Currently, developers of PWA apps do not have any efficient and authenticated solution to provide in-app purchases from Microsoft Store.The Digital Goods API allows web applications to get information about their digital products and user purchase details managed by a digital store, but is only available on Android and ChromeOS for now.
So it is meaningful to bring the Chromium's Digital Goods API and make the billing APIs available on Microsoft Store for PWA apps.
We are enabling for developers to query their digital product details, view existing purchases, check past purchase history, consume a purchase, and use the Payment Request API to facilitate the payment flow between the Microsoft Store and users.

The Digital Goods API for Microsoft Store PWA supports:

*   Querying the details (e.g., name, description, regional price) of digital items from the Microsoft Store backend.
*   Consuming or acknowledging purchases.
*   Checking the digital items currently owned by the user.
*   Checking the purchase history of the user.

Combined with the Payment Request API, users can purchase digital products from Microsoft Store.

## Usage Examples

The Digital Goods API allows the user agent to provide the above operations, alongside digital store integration via the Payment Request API.

Sites using the proposed API would still need to be configured to work with each individual store they are listed in, but having a standard API means they can potentially have that integration work across multiple browsers. This is similar to how the existing Payment Request API works (sites still need to integrate with each payment provider, e.g., Microsoft Store, but their implementation is browser agnostic).

### Getting a service instance

Usage of the API would begin with a call to `window.getDigitalGoodsService()`, which might only be available in certain contexts (eg. HTTPS, browser, OS). If available, the method can be called with a service provider URL (The Microsoft Store is identified by the string `https://store.microsoft.com/billing`). The method returns a promise that is rejected if the given service provider is not available:

```js
if (window.getDigitalGoodsService === undefined) {
  // Digital Goods API is not supported in this context.
  return;
}
try {
  const digitalGoodsService = await window.getDigitalGoodsService("https://store.microsoft.com/billing");
  // Use the service here.
  ...
} catch (error) {
  // Our preferred service provider is not available.
  // Use a normal web-based payment flow.
  return;
}
```

For backwards compatibility with [Digital Goods API v1.0](https://github.com/WICG/digital-goods/blob/main/explainer.md#api-v10-deprecated) while both are available, developers should also check whether the returned `digitalGoodsService` object is `null`:

```js
if (digitalGoodsService === null) {
  // Our preferred service provider is not available.
  // Use a normal web-based payment flow.
  return;
}
```

### Querying item details

The `getDetails` method returns server-side details about a given set of items, intended to be displayed to the user in a menu, so that they can see the available purchase options and prices without having to go through a purchase flow.


```js
details = await digitalGoodsService.getDetails(['shiny_sword', 'gem', 'monthly_subscription']);
for (item of details) {
  const priceStr = new Intl.NumberFormat(
      locale,
      {style: 'currency', currency: item.price.currency}
    ).format(item.price.value);
  AddShopMenuItem(item.itemId, item.title, priceStr, item.description);
}
```

The returned `itemDetails` sequence may be in any order and may not include an item if it doesn't exist on the server (i.e. there is not a 1:1 correspondence between the input list and output).

The item ID is a string representing the primary key of the items, as in Microsoft Store it is [InAppOfferToken](https://learn.microsoft.com/en-us/uwp/api/windows.services.store.storeproduct.inappoffertoken?view=winrt-22621#windows-services-store-storeproduct-inappoffertoken). There is no function to get a list of item IDs; those should be hard-coded in the client code or fetched from the developer’s own server.

The item’s `price` is a <code>[PaymentCurrencyAmount](https://www.w3.org/TR/payment-request/#dom-paymentcurrencyamount)</code> containing the current price of the item in the user’s current region and currency. It is designed to be formatted for the user’s current locale using <code>[Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)</code>, as shown above.

### Making a purchase

The purchase flow itself uses the [Payment Request API](https://w3c.github.io/payment-request/). We don’t show the full payment request code here, but note that the item ID for any items the user chooses to purchase should be sent in the `data` field of a `modifiers` entry for the given payment method, in a manner specific to the store. For example:

```js
const details = await digitalGoodsService.getDetails(['monthly_subscription']);
const item = details[0];
new PaymentRequest(
  [{supportedMethods: 'https://store.microsoft.com/billing',
    data: {item_id: item.itemId}}]);
```
>**IMPORTANT**: Payments targeting to Microsoft Store **MUST** include `item_id` field in the PaymentRequest `data` property, and the value of `item_id` **MUST** be one specific [InAppOfferToken](https://learn.microsoft.com/en-us/uwp/api/windows.services.store.storeproduct.inappoffertoken?view=winrt-22621) of an add-on. This is a short-term requirement, and we will likely remove this requirement in the future.

>Note: The PaymentRequest will invoke Microsoft Store payment popup window and disable the normal PWA window until payment popup window is closed.
Currently only support single item to be purchased at the same time.

### Acknowledging a purchase

The payment response will return a "purchase token" string, which can be used for direct communication between the developer's server and the service provider beyond the Digital Goods API. Such communication can allow the developer to independently verify information about the purchase before granting entitlements. Some stores might require that the developer acknowledges a purchase once it has succeeded, to confirm that it has been recorded.

### Consuming a purchase

Purchases that are designed to be purchased multiple times usually need to be marked as "consumed" before they can be purchased again by the user. An example of a consumable purchase is an in-game powerup that makes the player stronger for a short period of time. This can be done with the `consume` method:

```js
digitalGoodsService.consume(purchaseToken);
```

### Checking existing purchases

The `listPurchases` method allows a client to get a list of items that are currently owned or purchased by the user. This may be necessary to check for entitlements (e.g. whether a subscription, promotional code, or permanent upgrade is active) or to recover from network interruptions during a purchase (e.g. item is purchased but not yet acknowledged). The method returns item IDs and purchase tokens, which should be verified using a direct developer-to-provider API before granting entitlements.

```js
purchases = await digitalGoodsService.listPurchases();
for (p of purchases) {
  VerifyAndGrantEntitlement(p.itemId, p.purchaseToken);
}
```
>Note: `listPurchases` method will not return any consumed product or expired subscription.

### Checking past purchases
The `listPurchaseHistory` method allows a client to get a list of previous purchases by the user, regardless of current ownership state. For PWAs in Microsoft Store, this returns a single purchase record per item.

```js
purchases = await digitalGoodsService.listPurchaseHistory();
for (p of purchases) {
  VerifyAndCheckExpiredEntitlement(p.itemId, p.purchaseToken);
}
```

## Full API interface

### API for Microsoft Store PWA
Started Origin Trial in Microsoft Edge, learn more about how to register: [Use Origin Trials in Microsoft Edge](https://learn.microsoft.com/en-us/microsoft-edge/origin-trials/). This is a non-breaking change, adding new [Service Provider](#dfn-service-provider) support to `windows.getDigitalGoodsService` and new [PMI](#dfn-pmi) support to `window.PaymentRequest`. Use of the new methods/fields will require developers to update supporting code in their apps and follow [Prerequisites](#dfn-pre-requests).


```webidl
[SecureContext]
partial interface Window {

  Promise<DigitalGoodsService> getDigitalGoodsService(DOMString serviceProvider);
};

[SecureContext]
interface DigitalGoodsService {

  Promise<sequence<ItemDetails>> getDetails(sequence<DOMString> itemIds);

  Promise<sequence<PurchaseDetails>> listPurchases();

  Promise<sequence<PurchaseDetails>> listPurchaseHistory();

  Promise<void> consume(DOMString purchaseToken);
};

dictionary ItemDetails {
  required DOMString itemId;
  required DOMString title;
  required PaymentCurrencyAmount price;
  ItemType type;
  DOMString description;
  sequence<DOMString> iconURLs;
  DOMString subscriptionPeriod;
  DOMString freeTrialPeriod;
  PaymentCurrencyAmount introductoryPrice;
  DOMString introductoryPricePeriod;
  [EnforceRange] unsigned long long introductoryPriceCycles;
};

enum ItemType {
  "product",
  "subscription",
};

dictionary PurchaseDetails {
  required DOMString itemId;
  required DOMString purchaseToken;
};
```

## <dt id="dfn-pre-requests">Prerequisites to use Digital Goods API on Windows</dt>
1. To use Digital Goods API on Windows, you will have to publish your PWA to the Microsoft Store: [Publish a Progressive Web App to the Microsoft Store](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/overview?pivots=store-installer-pwa)
2. Login to [Partner Center](https://partner.microsoft.com/en-us/dashboard/home) and create Add-ons you want to provide in your PWA, see guidance to [create the add-on in Partner Center](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/create-app-submission?pivots=store-installer-add-on).
3. Register Digital Goods Origin Trial from: [Microsoft Edge Origin Trials](https://developer.microsoft.com/en-us/microsoft-edge/origin-trials/).
4. To make PWAs using Digital Goods API available to your customers, make sure they have installed Microsoft Edge 115 or higher.
