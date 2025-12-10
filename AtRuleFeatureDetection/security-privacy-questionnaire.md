# Security and Privacy Questionnaire for `@supports at-rule`

- _What information does this feature expose, and for what purposes?_

    The feature exposes support of CSS "at-rules". This is important as it can allow authors to rely on graceful degradation of their pages. The `@supports` rule already allows to detect CSS properties, and the `at-rule()` feature aims to allow to detection for at-rules.

    No identifying information is exposed. 

- _Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?_

    Yes, only the minimum amount of information is exposed.

- _Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?_
    
    No PII or derived information is exposed.

-  _How do the features in your specification deal with sensitive information?_

    The feature does not deal with any sensitive information.

- _Does data exposed by your specification carry related but distinct information that may not be obvious to users?_

    No.

- _Do the features in your specification introduce state that persists across browsing sessions?_

    No.

- _Do the features in your specification expose information about the underlying platform to origins_

    Yes. The feature allows a developer to tailor site UX depending on at-rule feature support. This is useful mostly for newer features that are launching, but once the feature is available as a standard  and implemented in the web platform it is something that is unlikely ti change.

- _Does this specification allow an origin to send data to the underlying platform?_

    No.

- _Do features in this specification enable access to device sensors?_

    No.

- _Do features in this specification enable new script execution/loading mechanisms?_

    No.

- _Do features in this specification allow an origin to access other devices?_

    No.

- _Do features in this specification allow an origin some measure of control over a user agent’s native UI?_

    No.

- _What temporary identifiers do the features in this specification create or expose to the web?_

    None.

- _How does this specification distinguish between behavior in first-party and third-party contexts?_

    The functionality isn't affected between first and third party contexts.

- _How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?_

    They work the same.

- _Does this specification have both "Security Considerations" and "Privacy Considerations" sections?_

    Yes.

- _Do features in your specification enable origins to downgrade default security protections?_

    No.

- _What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?_
    
    Browser support for a given at-rule does not change across navigations. Depending on the implementation, the browser might re-evaluate `@supports at-rule(...)` conditions, or it might use a previously cached evaluation result.

- _What happens when a document that uses your feature gets disconnected?_

    N/A.

- _Does your spec define when and how new kinds of errors should be raised?_

    N/A.

- _Does your feature allow sites to learn about the user’s use of assistive technology?_

    No, CSS does not currently have any dedicated at-rule specifically designed for assistive technology.

- _What should this questionnaire have asked?_

    N/A.




