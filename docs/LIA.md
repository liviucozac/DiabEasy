# Legitimate Interests Assessment (LIA)
**Article 6(1)(f) GDPR — Internal document, not for public distribution**

> DiabEasy no longer uses Firebase Analytics or Crashlytics. As a result, the only processing activity previously relying on legitimate interest (analytics and crash reporting) has been removed. This LIA is retained for completeness and future reference if any telemetry is reintroduced.

---

## Context

A Legitimate Interests Assessment is required whenever personal data is processed on the basis of Art. 6(1)(f) GDPR — "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject."

As of version 2.0.0 (May 2026), **DiabEasy does not rely on Art. 6(1)(f) for any active processing activity.** All processing is based on:

- Art. 6(1)(b) — contract performance (account, sync, subscription, support)
- Art. 9(2)(a) — explicit consent (health data storage, caregiver access)
- Art. 9(2)(h) — health management (health data storage)

---

## Hypothetical Assessment — If Crash Reporting Were Reintroduced

Should Firebase Crashlytics or equivalent crash reporting be added in a future version, the following three-part test would apply:

### Step 1 — Purpose test
**Legitimate interest identified:** Maintaining the stability and reliability of a medical support application used by people with diabetes. Crashes in an insulin calculator or glucose logging feature could result in incorrect dosing decisions.

**Is the interest legitimate?** Yes. Ensuring that a health-management app functions correctly is a genuine interest of both the controller and users.

### Step 2 — Necessity test
**Is processing necessary?** Crash reports (stack traces, device model, OS version) are the minimum data needed to reproduce and fix crashes. Anonymised crash logs cannot be replaced with a less privacy-intrusive method that achieves the same outcome.

**Could the same goal be achieved another way?** Partially — users can submit bug reports by email. However, crashes are often silent and users do not always report them, meaning systematic crash collection is more effective.

### Step 3 — Balancing test

| Factor | Assessment |
|---|---|
| Nature of data | Device model and OS version — low sensitivity. Stack traces may include file paths but no health data. |
| Reasonable expectation | Users of a mobile app generally expect crash reporting to be in place for stability. |
| Impact on data subjects | Minimal — no health data in crash reports; data is aggregated and used only for debugging. |
| Safeguards | Data minimisation (no user identifiers in stack traces); short retention (90 days); no third-party sharing. |
| Override? | The fundamental rights and freedoms of data subjects are not overridden given the low sensitivity, clear benefit, and minimal impact. |

**Conclusion:** Legitimate interest would likely prevail, but explicit consent or opt-in would be preferred given that this is a health app processing special category data in related contexts.

---

## Decision

**Current status (v2.0.0):** No processing on legitimate interest basis. No LIA required for active processing.

**If reintroducing telemetry:** Prefer explicit opt-in consent (Art. 6(1)(a)) over legitimate interest, given the health context and user expectation of privacy in a diabetes management app. Update the Privacy Policy and RoPA accordingly before release.

---

*Prepared by: Liviu Cozac — May 2026*
