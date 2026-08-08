# System Architecture

Frontend
- React + Vite
- Existing PWA
- Capacitor Android App

Backend
- Firebase
- Firestore
- Firebase Authentication (anonymous)
- NO Cloud Functions (see Decision below)

AI
- Google Gemini API (Free Tier)

Architecture

React (PWA)
↓
Gemini API (called directly from the client)
↓
Firestore

Business logic and all money math remain in client code (integer cents),
never delegated to the AI.

---

## Decision: no Cloud Functions backend (2026-08-01)

The original plan (`React → Firebase Functions → Gemini → Firestore`) cannot be
built as written:

- There are no Cloud Functions in this repo (no `functions/`, no `firebase.json`).
- Cloud Functions require Firebase's paid **Blaze** plan, which contradicts the
  "Free Tier" constraint everywhere else in this roadmap.
- The whole app is deliberately backend-less: access is gated by a
  passphrase-derived Firestore workspace ID, and no server ever holds the data
  (see `src/lib/crypto.ts`, `firestore.rules`). Introducing an Admin-SDK server
  that can read every household's finances would break that privacy premise.

**Decision:** Gemini is called **directly from the client**, staying free and
backend-less to match the existing design. This is acceptable because this is a
private household app gated behind a secret passphrase — not a public product —
so the blast radius of key exposure is small.

### "Never expose API keys" — what it means here

A static PWA ships its JS to the browser, so any key in client code is readable
by anyone who opens the app. The **Firebase** config key (`src/lib/firebase.ts`)
is safe to ship — it only identifies the project; security is enforced by
Firestore rules + App Check. A **Gemini** key is different: the key itself is the
credential, so an exposed key can be used to spend against your quota.

### Required key hardening (do this before shipping AI)

Because the Gemini key is exposed by design, lock it down so a stolen key is
nearly useless:

- Keep it on the **free tier** — no billing account attached, so worst case is a
  rate-limit annoyance, never a bill.
- In Google Cloud Console → Credentials, restrict the key by:
  - **HTTP referrer** → only this app's domain.
  - **API restriction** → only the Generative Language (Gemini) API.
- Set an explicit **quota cap** so runaway use can't escalate.

If the app ever goes public or moves to paid Gemini limits, revisit this and
move the key behind a real backend (Blaze + Cloud Functions) — key theft on a
billed project is a real money problem.
