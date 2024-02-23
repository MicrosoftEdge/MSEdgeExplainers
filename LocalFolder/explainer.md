# ApplicationData.LocalFolder Access From Microsoft Store PWA 

Author: [Lu Huang](https://github.com/luhuangMSFT)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [Microsoft Edge Explainers](https://github.com/MicrosoftEdge/MSEdgeExplainers)
* **Current version: this document**

## Introduction
[UWP apps](https://learn.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide) often make use of the [`ApplicationData.LocalFolder`](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.localfolder) API for access to local storage. This API manages storage in a system file directory unique to the [Package Family Name (PFN)](https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/package-identity-overview#package-family-name) of the installed app package. A UWP app distributed by the [Microsoft Store](https://apps.microsoft.com/home) may be replaced with a PWA app under the same PFN. When this happens, existing files in the `LocalFolder` directory become inaccessible to the PWA. 

In this explainer, we propose a solution that allows Microsoft Store PWAs to read and delete files from the `LocalFolder` directory belonging to their PFN. This allows apps to provide a more seamless user experience after an update and to reclaim storage space.

The proposed solution works by making use of the [Origin Private File System (OPFS)](https://web.dev/articles/origin-private-file-system) and the [File System Access](https://wicg.github.io/file-system-access/) APIs. It exposes an app's `LocalFolder` file system directory as an entry in the app origin's OPFS root directory.

## Goals

* Enable a Microsoft Store PWA to:
   * read files from the `LocalFolder` directory specific to its PFN.
   * delete any file and sub-directory in its `LocalFolder` directory. 
* Avoid prompting end users to provide input or confirmation.
* Avoid naming collisions with other OPFS root entries. 

## Non-goals

* Enable a Microsoft Store PWA to create new files or modify existing files in its `LocalFolder` directory.
* Support web apps not installed or managed by the Microsoft Store.
* Support web apps on non-Windows platforms.
* Standardization as a web specification.
* Introduce a non-standard JavaScript API.

## Proposed Solution 

### Existing behavior

[`navigator.storage.getDirectory()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/getDirectory) is an existing API that returns a promise to a [FileSystemDirectoryHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) which represents the root of directory the origin's OPFS storage space. By default, an origin's OPFS root directory will have no entries.

### New behavior

Within a Microsoft Store PWA context, the directory handle for OPFS root will contain an additional entry that represents the app's `LocalFolder` directory. This entry can be retrieved as a [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) by calling [`.entries()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries) or [`.getDirectoryHandle(...)`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle) on the OPFS root directory handle.

Unlike all other OPFS handles, the `LocalFolder` directory handle and its contents will have [`read`](https://wicg.github.io/file-system-access/#dom-filesystempermissionmode-read) permission instead of [`readwrite`](https://wicg.github.io/file-system-access/#dom-filesystempermissionmode-readwrite) permission by default and will not be able to gain `readwrite` permission.

#### Entry name

The LocalFolder entry within the OPFS root directory can be found under the name `microsoft_store_app_local_folder_{PFN}` where `{PFN}` is the Package Family Name of the app.

#### Deletion

Despite having only `read` permission, a `FileSystemHandle` to `LocalFolder` or its contents will allow their [`remove()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove) and [`removeEntry(...)`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry) methods to successfully delete files and directories. 

<!-- All contents in `LocalFolder` can be deleted while the `LocalFolder` folder cannot itself be deleted - this is to mimic the effects of the UWP [`ClearAsync(...)`](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.clearasync?view=winrt-22621#windows-storage-applicationdata-clearasync(windows-storage-applicationdatalocality)) API. -->

#### Storage quota and eviction

As the `LocalFolder` directory is in a system file directory separate from Chromium's underlying storage location for OPFS, whether an entry for `LocalFolder` is presented in OPFS root's entries does not affect the available storage estimate returned by [`navigator.storage.estimate()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate). As `LocalFolder` takes up space on disk, clearing `LocalFolder` can increase the estimate of available storage.

In Chromium, the underlying storage for OPFS does participate in [eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#when_is_data_evicted) if an origin is not marked as [persistent](https://storage.spec.whatwg.org/#persistence). As the `LocalFolder` directory is in a system file directory separate from OPFS's underlying storage, it will not be affected by origin based storage eviction.

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

*Note: the `create` option must be `false` to determine if the system `LocalFolder` was found. We will not disallow the app code from creating a directory handle of the same name in actual OPFS storage.*

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
*Example: Looking for the `LocalFolder` entry through iterating entries under the OPFS root directory.*

### Deleting LocalFolder and its contents 

`LocalFolder` and its contents can be cleared by calling `.remove()` or `.removeEntry(...)` on the OPFS root directory handle. 

```JS
    let opfsRoot = await navigator.storage.getDirectory();
    if (opfsRoot) {
        await opfsRoot.removeEntry("microsoft_store_app_local_folder_APPID.37853FC22B2CE_6rarf9sa4v8jt", { recursive: true }); 
    }
```

Calling `.remove()` on the OPFS root directory handle clears all of its contents, after which a new empty OPFS is created.

```JS
    let opfsRoot = await navigator.storage.getDirectory();
    if (opfsRoot) {
        await opfsRoot.remove(); 
    }
```

Alternatively, LocalFolder and its contents can be deleted by calling `.remove()` on either file or directory handles.

```JS
    let localStorage = await opfsRoot.getDirectoryHandle("microsoft_store_app_local_folder_APPID.37853FC22B2CE_6rarf9sa4v8jt", {create: false}); 

    for await (const [key, value] of localStorage.entries()) {
        value.remove();
    }
```

### Microsoft Store PWA context

An entry for `LocalFolder` will only be visible in the Microsoft Store PWA context.

To be in a Microsoft Store app context, `navigator.storage.getDirectory()` must be called from:
* Within a top level document
* Within a web app window of a Microsoft Store installed PWA
* From the main thread and not a Web Worker

### Avoiding name collisions
To avoid name collisions, the LocalFolder entry under the OPFS root directory is assigned a specific name that contains the Package Family Name. If an entry with the same name already exists under the OPFS root directory, an entry representing the LocalFolder directory will not be made visible until the existing entry is renamed or otherwise removed. 

## Similar storage folders

There are other UWP storage APIs similar to LocalFolder that can be exposed the same way through OPFS directory handles, but are not currently planned to be supported at this time.

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

## Privacy And Security Considerations

1. As a security precaution, the LocalFolder directory handle and its contents should not allow modifying or creating new files. This prevents the creation of executable files and the creation of files outside of the LocalFolder directory.

1. Any existing data in the LocalFolder directory can be accessed by the same app PFN that created it without prompting the user for additional permissions or input. We considered this as a privacy concern but decided that it is acceptable as the user consented to the app's use of local storage through app installation from the Microsoft Store. It is also acceptable for a newer version of the app to read and delete this data.
