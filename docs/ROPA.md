# Record of Processing Activities (RoPA)
**Article 30 GDPR — Internal document, not for public distribution**

| Field | Details |
|---|---|
| Controller | Liviu Cozac (independent developer), Romania, EU |
| Contact | liviu.dev.cozac@proton.me |
| DPO | Not required (fewer than 250 employees; no large-scale systematic processing as primary activity) |
| Last updated | 7 May 2026 |

---

## Processing Activity 1 — Account Creation & Authentication

| Field | Details |
|---|---|
| Purpose | Allow users to create an account and log in to sync their health data across devices |
| Legal basis | Art. 6(1)(b) — performance of a contract |
| Data subjects | App users (patients, caregivers) |
| Data categories | Email address, hashed password (managed entirely by Firebase Auth) |
| Recipients | Google LLC (Firebase Auth) — processor under Google's DPA |
| Retention | Until account deletion |
| Transfers outside EEA | Google LLC — covered by EU–US Data Privacy Framework |
| Security measures | Firebase Auth handles password hashing; HTTPS in transit; Firestore security rules restrict access per UID |

---

## Processing Activity 2 — Health Data Storage & Sync

| Field | Details |
|---|---|
| Purpose | Store and synchronise blood glucose readings, insulin logs, and meal history across the user's devices |
| Legal basis | Art. 9(2)(a) — explicit consent (collected via in-app consent modal at first launch); Art. 9(2)(h) — health management for the data subject's own benefit |
| Data subjects | App users (patients) |
| Data categories | **Special category (Art. 9):** blood glucose values, timestamps, measurement types, insulin doses, meal carbohydrate/nutritional data, notes, medication reminders. **Regular:** device UID (Firebase-generated) |
| Recipients | Google LLC (Firebase Firestore) — processor under Google's DPA |
| Retention | Until the user deletes individual entries or their account |
| Transfers outside EEA | Google LLC — covered by EU–US Data Privacy Framework |
| Security measures | Encrypted at rest (Google-managed encryption); Firestore security rules restrict read/write to the authenticated user only; HTTPS in transit |

---

## Processing Activity 3 — Caregiver Access Codes

| Field | Details |
|---|---|
| Purpose | Allow a patient to grant a trusted caregiver read-only access to a snapshot of their health data |
| Legal basis | Art. 9(2)(a) — explicit consent of the data subject (patient generates and shares the code voluntarily) |
| Data subjects | Patients (data shared); caregivers (recipient of the code) |
| Data categories | Patient name, caregiver access code, glucose history snapshot, insulin log snapshot, meal history snapshot, `isPremium` flag |
| Recipients | Google LLC (Firebase Firestore — `caregiverData` collection) |
| Retention | Until the patient revokes the code or deletes their account |
| Transfers outside EEA | Google LLC — covered by EU–US Data Privacy Framework |
| Security measures | Code is a 6-digit random token; read-only access scoped to `caregiverData/{code}` collection; patient can revoke at any time |

---

## Processing Activity 4 — Subscription Management

| Field | Details |
|---|---|
| Purpose | Process and verify in-app subscription purchases |
| Legal basis | Art. 6(1)(b) — performance of a contract |
| Data subjects | App users (paying subscribers) |
| Data categories | Anonymous user ID, subscription tier, purchase timestamp, store transaction ID |
| Recipients | RevenueCat Inc. (USA) — processor under Standard Contractual Clauses; Google LLC (Google Play Billing) |
| Retention | 7 years (Romanian financial law, Law no. 82/1991) |
| Transfers outside EEA | RevenueCat (USA) — Standard Contractual Clauses in place |
| Security measures | No payment card data handled by DiabEasy; all billing handled by app store |

---

## Processing Activity 5 — Support & Feedback Emails

| Field | Details |
|---|---|
| Purpose | Respond to user support requests and bug reports |
| Legal basis | Art. 6(1)(b) — performance of a contract |
| Data subjects | Users who contact support |
| Data categories | Email address, message content, any data the user chooses to include |
| Recipients | Proton Mail (end-to-end encrypted email provider) — processor |
| Retention | Until resolved, deleted within 12 months |
| Transfers outside EEA | Proton Mail is headquartered in Switzerland (adequacy decision) |
| Security measures | End-to-end encrypted email; no third-party CRM used |

---

## Processing Activity 6 — PDF Report Generation

| Field | Details |
|---|---|
| Purpose | Generate a printable PDF health report for the user to share with their doctor |
| Legal basis | Art. 9(2)(a) — consent; Art. 9(2)(h) — health management |
| Data subjects | App users (patients) |
| Data categories | Glucose history, insulin log, meal summaries, profile name |
| Recipients | None — PDF generated entirely on-device using `expo-print`; not uploaded to any server |
| Retention | Not retained server-side; stored only in device cache until user shares or deletes it |
| Transfers outside EEA | None |
| Security measures | Generated locally; shared via OS share sheet under user control |

---

## Processors Summary

| Processor | Location | Role | Transfer mechanism |
|---|---|---|---|
| Google LLC (Firebase Auth, Firestore) | USA | Authentication, database | EU–US Data Privacy Framework |
| RevenueCat Inc. | USA | Subscription management | Standard Contractual Clauses |
| Proton Mail AG | Switzerland | Support email | Adequacy decision |
| Google LLC (Google Play) | USA | App distribution, billing | EU–US Data Privacy Framework |

---

## Data Subject Rights — Response Procedures

| Right | How fulfilled |
|---|---|
| Access | User can view all their data in the app; full JSON export available in Profile → Legal & Privacy → Export My Data |
| Rectification | User can edit profile data directly in the app |
| Erasure | In-app account deletion (immediate) or email request (within 30 days) |
| Portability | JSON export in-app; PDF export from History tab |
| Restriction | Email request to liviu.dev.cozac@proton.me |
| Object | Email request; analytics/telemetry: none collected |
| Withdraw consent | Account deletion removes consent and all associated health data |
| Lodge complaint | ANSPDCP (Romania) — www.dataprotection.ro |
