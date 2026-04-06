# DiabEasy 2.0 — Changelog

## [2.0.0] — 2026-04-06

### Initial React Native rewrite

Complete rewrite from web JSX to React Native with Expo.

---

### Screens

- **Home** — Glucose input with mg/dL / mmol/L toggle, fasting type selector,
  notes field, submit button, Low/Normal/High result display, hypo/hyper
  popup modals, QuickStats (today's summary), Quick Tip card
- **History** — Full glucose history list, date range filters, min/max value
  filters, unit filter pills, PDF export (landscape A4, unified health log)
- **Food Guide** — Meal planner with Lower/Maintain/Raise goal selector,
  food database (105 items across 3 categories), search, nutritional summary,
  post-meal glycemia estimate, meal history
- **Medication** — Insulin dose calculator (meal + correction), insulin log,
  reminders tab with toggle and delete
- **SOS** — Emergency call button (112), hospital finder with GPS, emergency
  contacts with call/delete, hypoglycemia/hyperglycemia symptom accordions,
  do's and don'ts section
- **Profile & Settings** — Auth form (sign in / sign up), personal info,
  diabetes type, doctor/clinic fields, theme toggle (light/dark/system),
  glucose unit preference, insulin calculator defaults (ISF, carb ratio,
  target), notifications toggle, clear all data, about section

---

### Technical

- Stack: Expo (expo-router), React Native, TypeScript, Zustand
- Theme system: AppContext + colors.ts with full light/dark token set
- State: glucoseStore (history, insulin log, profile, settings, current reading)
- PDF export: expo-print + expo-sharing
- Location: expo-location (hospital finder)
- Date picker: @react-native-community/datetimepicker
- Navigation: @react-navigation/bottom-tabs via expo-router

---

### Deferred / Planned

- Firebase authentication and Firestore persistence
- i18n (English, Italian, Romanian)
- Play Store submission via EAS Build
- Meal history in glucoseStore (currently local state in foodguide.tsx)
- PDF food consumed column (blocked by above)
- Push notifications
- Premium / Pro tier gating for PDF export