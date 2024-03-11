# ApplicationData.LocalFolder Access From Microsoft Store PWA 

Author: [Lu Huang](https://github.com/luhuangMSFT)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [Microsoft Edge Explainers](https://github.com/MicrosoftEdge/MSEdgeExplainers)
* **Current version: this document**

## Introduction
[UWP apps](https://learn.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide) often make use of the [`ApplicationData.LocalFolder`](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.localfolder) WinRT API for access to local storage. This API manages storage in a system file directory unique to the [Package Family Name (PFN)](https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/package-identity-overview#package-family-name) of the installed app package. A UWP app distributed by the [Microsoft Store](https://apps.microsoft.com/home) may be replaced with a PWA app with the same PFN. When this update takes place on client machines, existing files in the `LocalFolder` directory become inaccessible to the PWA as WinRT APIs are not directly exposed to the web.

In this explainer, we propose a solution that allows Microsoft Store PWAs to read and delete files from the `LocalFolder` directory belonging to their PFN. This allows apps to provide a more seamless user experience after an update and to reclaim storage space.

The proposed solution works by making use of the [Origin Private File System (OPFS)](https://web.dev/articles/origin-private-file-system) and the [File System Access](https://wicg.github.io/file-system-access/) APIs. It exposes an app's `LocalFolder` file system directory as an entry in the app origin's OPFS root directory.

## Goals

* Enable a Microsoft Store PWA to:
   * read files from the `LocalFolder` directory specific to its PFN.
   * delete any file or sub-directory in its `LocalFolder` directory. 
* Avoid prompting end users to provide input or confirmation.
* Avoid naming collisions with other OPFS root entries. 
* Ensure that new behavior described here is only exposed to apps that opt in. 
* Avoid introducing a new Web API that is only available on the Edge browser.

## Non-goals

* Enable a Microsoft Store PWA to create new files or modify existing files in its `LocalFolder` directory.
* Support web apps not installed or managed by the Microsoft Store.
* Support web apps on non-Windows platforms.
* Standardization as a web specification.

## Proposed Solution 

### Existing behavior

[`navigator.storage.getDirectory()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/getDirectory) is an existing API that returns a promise to a [FileSystemDirectoryHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) which represents the root of directory the origin's OPFS storage space. By default, an origin's OPFS root directory has no entries.

### New behavior

When configured correctly, the directory handle for OPFS root will contain an additional entry that represents the app's `LocalFolder` directory. This entry can be retrieved as a `FileSystemDirectoryHandle` by calling [`.entries()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries) or [`.getDirectoryHandle(...)`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle) on the OPFS root directory handle.

Like other OPFS handles, the `LocalFolder` directory handle and its contents will have [`readwrite`](https://wicg.github.io/file-system-access/#dom-filesystempermissionmode-readwrite) permission by default. Unlike other handles with `readwrite` permission, a [FileSystemFileHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle) from `LocalFolder` will always throw a [`NoModificationAllowedError`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable#nomodificationallowederror) exception if [`createWritable()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable#exceptions) is used, or if [`getFileHandle()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle) or [`getDirectoryHandle()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle) is used with the `create` option being true. This allows data in `LocalFolder` to be read and cleared but not created or edited.

#### Configuration 

An entry for `LocalFolder` will only be visible in the Microsoft Store PWA context and when the [`related_applications`](https://developer.mozilla.org/en-US/docs/Web/Manifest/related_applications) field in the app's web app manifest is configured correctly. 

To be in a Microsoft Store PWA context:
* The PWA must be installed locally from the Microsoft Store
* `navigator.storage.getDirectory()` must be called from:
    * A top level document
    * From the main thread and not a Web Worker
    * A document with a URL within the [scope](https://w3c.github.io/manifest/#understanding-scope) of the PWA

In order to opt in to enabling `LocalFolder` access, the app needs to configure `related_applications` in its web app manifest to [identify the PFN of its Windows app package](https://web.dev/articles/get-installed-related-apps#tell_your_website_about_your_windows_app). Only the web app manifest part of the configuration needed to support `getInstalledRelatedApps` is needed here to enable `LocalFolder` access.

```JSON
    "related_applications": [{
      "platform": "windows",
      "id": "PACKAGE_FAMILY_NAME!APPLICATION_ID"
    }]
```

*Note: `LocalFolder` can be accessed from a document in any [`display-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode). The loaded document does not have to be in an app window but does have to be in scope of the installed app.*

#### Entry name

The LocalFolder entry within the OPFS root directory can be found under the name `microsoft_store_app_local_folder_{PFN}` where `{PFN}` is the Package Family Name of the app.

#### Deletion

A `FileSystemHandle` to `LocalFolder` or its contents will allow their [`remove()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove) and [`removeEntry(...)`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry) methods to successfully delete files and directories. Contents in `LocalFolder` can be deleted while the `LocalFolder` entry cannot itself be deleted - this is to mimic the effects of the WinRT [`ClearAsync(...)`](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.clearasync?view=winrt-22621#windows-storage-applicationdata-clearasync(windows-storage-applicationdatalocality)) API.

#### Storage quota and eviction

As the `LocalFolder` directory is in a system file directory separate from Chromium's storage location for OPFS, whether an entry for `LocalFolder` is presented in OPFS root's entries does not affect the available storage estimate returned by [`navigator.storage.estimate()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate). As `LocalFolder` takes up space on disk, clearing `LocalFolder` can increase the estimate of available storage.

In Chromium, the underlying storage for OPFS does participate in [eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#when_is_data_evicted) if an origin is not marked as [persistent](https://storage.spec.whatwg.org/#persistence). As the `LocalFolder` directory is in a system file directory separate from OPFS's underlying storage, it will not be affected by origin based storage eviction.

#### Avoiding name collisions

To avoid name collisions, the LocalFolder entry under the OPFS root directory is assigned a specific name that contains the Package Family Name. If an entry with the same name already exists under the OPFS root directory, an entry representing the LocalFolder directory will not be made visible until the existing entry is renamed or otherwise removed. 

### Examples

#### Searching for LocalFolder

```JS
    // .getDirectoryHandle()
    let opfsRoot = await navigator.storage.getDirectory();
    if (opfsRoot) {
        let localFolder = await opfsRoot.getDirectoryHandle("microsoft_store_app_local_folder_APPID.37853FC22B2CE_6rarf9sa4v8jt", {create: false}); 
    }
```
*Example: looking for the `LocalFolder` entry under the OPFS root directory.*

*Note: the `create` option should be `false` to determine if the system `LocalFolder` is present. If it is true, `getDirectoryHandle` will always return a valid handle as it could create a directory handle of the same name in actual OPFS storage.*

```JS
    // .entries()
    let opfsRoot = await navigator.storage.getDirectory();
    if (opfsRoot) {
        for await (const [key, value] of opfsRoot.entries()) {
            if (key === 'microsoft_store_app_local_folder_APPID.37853FC22B2CE_6rarf9sa4v8jt') {
                // ...
            }
        }
    }
```
*Example: Looking for the `LocalFolder` entry by iterating entries under the OPFS root directory.*

#### Deleting LocalFolder and its contents 

`LocalFolder`'s contents can be cleared by calling `.remove()` or `.removeEntry(...)` on [FileSystemHandles](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle). 

| Action | Result |
|--------|--------|
| `.remove()` on OPFS root handle | Will not enumerate or clear LocalFolder even if the [`recursive`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry#recursive) option is used. |
| `.removeEntry(...)` on OPFS root handle, selecting `LocalFolder`'s name| Will clear `LocalFolder` contents but leave the `LocalFolder` directory unchanged. |
| `.remove()` on `LocalFolder`'s handle | Will clear `LocalFolder` contents but leave the `LocalFolder` directory unchanged. |
| `.remove()` or `.removeEntry(...)` on any handle within `LocalFolder` | Selected handle will be removed as usual according to the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API). |

```JS
    let opfsRoot = await navigator.storage.getDirectory();
    if (opfsRoot) {
        await opfsRoot.removeEntry("microsoft_store_app_local_folder_APPID.37853FC22B2CE_6rarf9sa4v8jt", { recursive: true }); 
    }
```

*Note: The [`recursive`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry#recursive) option should be `true` to clear handles within `LocalFolder`'s sub-directories (if any) recursively. By default, it is `false`.* 

```JS
    let localStorage = await opfsRoot.getDirectoryHandle("microsoft_store_app_local_folder_APPID.37853FC22B2CE_6rarf9sa4v8jt", {create: false}); 

    for await (const [key, value] of localStorage.entries()) {
        value.remove({ recursive: true });
    }
```

## Similar storage folders

There are other WinRT storage APIs similar to LocalFolder that can be exposed the same way through OPFS directory handles, but are not currently planned to be supported.

* [LocalCacheFolder](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.localfolder?view=winrt-22621)
* [RoamingFolder](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.roamingfolder?view=winrt-22621)
* [SharedLocalFolder](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.sharedlocalfolder?view=winrt-22621)
* [TemporaryFolder](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.temporaryfolder?view=winrt-22621)

## Alternatives considered

### New Web API

We considered creating a new API on `navigator` to return a `FileSystemDirectoryHandle` of the app's LocalFolder directory. This was rejected primarily because of the long term cost of maintaining a non-standard API. 

### File migration

We considered a solution that migrates the contents of the LocalFolder directory into OPFS storage. The drawbacks to this solution includes:

* It could take a long time to migrate large files. There is no way for the calling code to register a callback to wait for migration to be completed without introducing a new API, negating the advantage of not creating a new API on `navigator`.
* Migration of files could fail due the lack of storage space and other I/O errors. There is no good way to communicate such errors to the calling code without introducing a new API.

## Security risks 

1. A malicious party could attempt to gain access to files outside of the boundary of the `LocalFolder` directory.

1. A malicious party could create executable files on the file system.

1. Third party scripts could read data in `LocalFolder` even though the app developer is not aware of this feature. 

1. Scripts in embedded iframes could try to access data in `LocalFolder`. 

### Mitigations

1. The `FileSystemHandle` design does not support walking up the directory structure.

1. The `LocalFolder` directory handle and its contents will not allow the modification of existing files or creation of new files. This prevents the creation of executable files and the creation of files outside of the LocalFolder directory. Additionally, the implementation of the File System Access API in Chromium prevents creation of some executable file types.

1. The app has to opt in explictly using the `related_applications` field in the web app manifest. The app developer must understand the risks involved and be responsible for the actions of third party scripts used. Most apps that do not intend to access `LocalFolder` will not expose it unknowingly to third parties.

1. The `LocalFolder` handle entry will not be visible to cross-origin iframes as OPFS storage is partitioned by origin.


## Privacy risks

1. `LocalFolder` data in the file system can be accessed by a PWA through a Web API without prompting the user for permission. There could be personally identifiable information (PII) contained within this data.  

1. Any script (including those from third-party origins that may not be owned by the application developer) that is loaded into a document from the same origin as the top-level frame can use the presence of a `LocalFolder` entry to determine if a Windows Store app associated with the origin is installed on the client machine. This information could potentially be used for fingerprinting. 
    * Inspecting `display-mode` is an existing method to check if a site is installed locally as an app but this method does not work when the user navigates the site in a normal browser tab or fullscreen.  
    * The fingerprinting surface increases but not significantly as there is an existing method to determine if apps are installed. 
    * As the installed app information would be different for each site, it cannot be easily used in a comparable fingerprint from different sites. 
    * App installation status changes due to user actions and cannot be reliably used to form a stable fingerprint identifying the client. 

### Mitigations

1. The user consented to the app's use of local storage through app installation from the Microsoft Store. We think it is acceptable for a newer version of this app to access the data previously created using the same PFN. The app (both the UWP and PWA implementation) has permission from the user to store and access the data even if it contains PII. The app needs to take care to protect user data.

1. Requiring the app to include the `related_applications` in its web app manifest limits the risk to apps that publicly declares a relation to a Windows app package. 


