# Self-Review Questionnaire: Security and Privacy

## Security and Privacy questionnaire for [`Web Install API`](aka.ms/webinstall)

1. **What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?**

    The feature confirms to the invoking origin (only) if the application was installed by returning the processed app `id`.

2. **Do features in your specification expose the minimum amount of information necessary to enable their intended uses?**

    Yes.

3. **How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?**

    There is no information of this type being handled by the feature.

4. **How do the features in your specification deal with sensitive information?**

    There is no sensitive information handled by the feature. 

5. **Do the features in your specification introduce new state for an origin that persists across browsing sessions?**
    No, this feature does not introduce new states tied to an origin.

6. **Do the features in your specification expose information about the underlying platform to origins?**

    No.

7. **Does this specification allow an origin to send data to the underlying platform?**

    No.

8. **Do features in this specification enable access to device sensors?**

    No.

9. **Do features in this specification enable new script execution/loading mechanisms?**

    No.

10. **Do features in this specification allow an origin to access other devices?**

    No.

11. **Do features in this specification allow an origin some measure of control over a user agent’s native UI?**

    No. The installation process uses the same native UI prompts of adding current web content and that of other permissions. 

12. **What temporary identifiers do the features in this specification create or expose to the web?**

    None.

13. **How does this specification distinguish between behavior in first-party and third-party contexts?**

    It does not make such distinction.

14. **How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?**

    It will not be available in Private Browsing/Incognito mode. The call to the promise will reject with an `AbortError`.

15. **Does this specification have both "Security Considerations" and "Privacy Considerations" sections?**

    There is no specification written yet. (The [explainer](https://aka.ms/webinstall) does go into security and privacy considerations to mitigate installation spam and protect user's privacy.)

16. **Do features in your specification enable origins to downgrade default security protections?**

    No.

17. **How does your feature handle non-"fully active" documents?**

    This feature does not interact with non-"fully active" documents.

18. **What should this questionnaire have asked?**

    N/A.
