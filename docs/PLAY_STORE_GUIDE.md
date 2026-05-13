# Google Play Store — Compliance Actions Guide
**Internal reference — DiabEasy v2.0.0**

This document pre-fills the answers for the four mandatory Play Console compliance steps before submission.

---

## Action 1 — Data Safety Form

Navigate to: **Play Console → App content → Data safety**

### Does your app collect or share any of the required user data types?
**Yes.**

### Data types collected and shared

| Data type | Collected? | Shared? | Optional? | Encrypted in transit? | User can request deletion? |
|---|---|---|---|---|---|
| **Email address** | ✅ Yes | No | No (required for account) | ✅ Yes | ✅ Yes |
| **Name** | ✅ Yes | No | Yes | ✅ Yes | ✅ Yes |
| **Health and fitness — Health info** | ✅ Yes | No | No (core feature) | ✅ Yes | ✅ Yes |
| **Financial info — Purchase history** | ✅ Yes (via RevenueCat) | No | No (for paid users) | ✅ Yes | ⚠️ Retained 7 yr (legal) |
| **Device or other IDs — Device or other IDs** | ✅ Yes (Firebase UID) | No | No | ✅ Yes | ✅ Yes |

### Is all of the user data collected by your app encrypted in transit?
**Yes** — all Firebase and RevenueCat traffic uses HTTPS/TLS.

### Do you provide a way for users to request that their data is deleted?
**Yes** — in-app account deletion (Profile → Settings → Delete My Account) and email request (liviu.dev.cozac@proton.me). Data deletion URL: `https://liviucozac.github.io/diabeasy/data_deletion.html` (or wherever you host `data_deletion.html`).

### Data collection purpose answers

| Data type | Primary purpose |
|---|---|
| Email address | Account management |
| Name | App functionality |
| Health info | App functionality |
| Financial info | Analytics, Account management |
| Device ID | Analytics, App functionality |

### Does your app share user data with third parties?
**No** personal data is sold or shared for advertising. RevenueCat receives anonymous user ID and subscription metadata only (no health data). Google Firebase receives email, hashed password, and health data as a processor under a DPA.

---

## Action 2 — Health App Policy Declaration

Navigate to: **Play Console → App content → Health apps (if shown)**

DiabEasy qualifies as a personal health record / wellness app (not a clinical-grade medical device). Complete the declaration as follows:

- **Does your app provide medical advice or diagnoses?** No. DiabEasy provides a bolus calculator for informational purposes only. A disclaimer is shown in the Meds tab and in the Terms of Use stating that results are not medical advice.
- **Is your app a certified medical device?** No.
- **Does your app collect or use health data for advertising?** No.
- **Target audience:** Adults (16+) managing diabetes. Not directed at children under 16.

If Google requests a **HIPAA attestation**: DiabEasy is operated by an EU-based individual developer and is subject to GDPR, not HIPAA. The Privacy Policy (Section 1) states this clearly. Select "Not applicable — not a US-covered entity" or equivalent.

---

## Action 3 — Content Rating Questionnaire (IARC)

Navigate to: **Play Console → App content → Content rating**

Answer as follows:

| Question | Answer |
|---|---|
| Category | **Utility / Productivity** (or Health & Fitness if listed) |
| Violence | No |
| Sexual content | No |
| Profanity or crude humour | No |
| Controlled substances | No (insulin/medication references are health management, not promotion of substance use) |
| Simulated gambling | No |
| User-generated content shared publicly | No |
| Location sharing | No (location is used on-device only for SOS hospital search; never transmitted) |

**Expected rating:** Everyone (E) or Parental Guidance (PG) depending on IARC guidelines. The IARC tool will assign the rating automatically based on your answers.

---

## Action 4 — WRITE_CONTACTS Permission

Navigate to: **Play Console → App content → Permissions (or review during review)**

### Current state
`app.json` declares `android.permission.WRITE_CONTACTS`. The app never writes contacts — `emergency.tsx` only calls `Contacts.getContactsAsync()` (read-only, used to pre-fill the SOS contact picker).

### Fix applied
`android.permission.WRITE_CONTACTS` has been removed from `app.json`. Only `READ_CONTACTS` is retained.

### If Play Store flags WRITE_CONTACTS during review
Explain in the review notes: *"WRITE_CONTACTS was declared by mistake. The app only reads contacts to allow the user to select emergency contacts for the local SOS screen. No contacts are ever written, created, or modified. The permission has been removed in this build."*

---

## Summary checklist

- [ ] Data Safety Form completed and published in Play Console
- [ ] Health app declaration submitted (if required)
- [ ] Content rating questionnaire answered — IARC rating assigned
- [ ] `WRITE_CONTACTS` removed from `app.json` and new build submitted
- [ ] `data_deletion.html` hosted at a public URL and entered in Data Safety Form
- [ ] Privacy Policy URL entered in Play Console store listing

---

*Prepared by: Liviu Cozac — May 2026*
