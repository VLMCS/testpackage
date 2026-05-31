# Security setup — Clerune Tracker

This app is a static site (GitHub Pages) talking directly to Firebase. The website
bundle and the Firebase web config are **public by design** on any host — that's
normal and safe. What protects your names and financial data is **server-side**:
Firestore Security Rules + authentication + App Check. Work through the steps below.

> **Mental model:** A public repo only exposes *source code*, which contains no
> secrets here. Nobody can edit your site (a public repo is read-only to the world;
> only your GitHub account can push). The real perimeter is everything below.

---

## 1. Confirm Firestore Security Rules are published (the actual data lock)

1. [Firebase Console](https://console.firebase.google.com/) → your project →
   **Firestore Database** → **Rules** tab.
2. Compare what's shown with [`firestore.rules`](firestore.rules) in this repo.
   They should match. If not, paste the repo version in and **Publish**.
3. Sanity check the intent: data under `/workspaces/{id}/…` is readable/writable
   **only** by anonymous UIDs already in that workspace's `allowedUids`, and the
   workspace ID is derived from your secret passphrase. No passphrase = no access.

## 2. Firebase App Check (highest-value hardening)

Makes Firebase **reject any request that isn't from your real app**, so a bot that
copies your public config out of the bundle still can't touch the database.

**Order matters — do not enforce before the key is deployed, or the live app breaks.**

1. Firebase Console → **App Check** → **Apps** → select your web app → register with
   the **reCAPTCHA v3** provider. Accept the reCAPTCHA terms; it gives you a
   **site key**.
2. Paste that site key into `RECAPTCHA_SITE_KEY` in
   [`src/lib/firebase.ts`](src/lib/firebase.ts) (replace the `PASTE_…` placeholder).
3. Commit & push. Wait for the GitHub Actions deploy to finish.
4. Open the **live** site and use it normally for a few minutes. In Console →
   App Check → **APIs**, you should see verified requests appearing for Firestore
   and Authentication.
5. **Local dev:** `npm run dev` prints an App Check **debug token** in the browser
   console (because of the dev flag in `firebase.ts`). Copy it into App Check →
   your app → **Manage debug tokens** so localhost keeps working.
6. Once you see verified traffic and no errors, go to App Check → **APIs** and set
   **Cloud Firestore** and **Authentication** to **Enforce**.

If anything breaks after enforcing, flip those APIs back to "Unenforced", fix, retry.

## 3. Restrict the browser API key to your domains

Limits where your public API key can be used from.

1. [Google Cloud Console](https://console.cloud.google.com/) → your Firebase project
   → **APIs & Services** → **Credentials**.
2. Open the **Browser key (auto created by Firebase)**.
3. Under **Application restrictions** → **Websites (HTTP referrers)**, add:
   - `https://vlmcs.github.io/*`
   - `http://localhost:5173/*` (for local dev)
4. Under **API restrictions**, restrict to the APIs you use (Cloud Firestore API,
   Identity Toolkit API, Token Service API, Firebase App Check API).
5. Save. (Changes can take a few minutes to take effect.)

> Note: referrer restrictions are a helpful speed-bump, not a hard wall (referrers
> can be spoofed off-browser) — App Check (step 2) is the real enforcement.

## 4. Usage / budget alerts

- **If your project is on the free Spark plan (no credit card):** you literally
  cannot be billed — abuse just hits the free daily quota and requests start
  failing until reset. Nothing to set up; optionally watch Firestore → **Usage**.
- **If you're on the Blaze (pay-as-you-go) plan:** set a budget alert so a spike
  pings you. Google Cloud Console → **Billing** → **Budgets & alerts** →
  **Create budget** → scope to this project → set a low monthly amount (e.g. $5)
  and alert thresholds (50/90/100%).

## 5. Keep the passphrase strong

The workspace is unreachable without the shared passphrase (the workspace document
ID is derived from it). Use a long, unique passphrase — a few random words. There
is no recovery if it's lost, and its strength is what stops brute-force guessing.

---

### What we intentionally did NOT do
- **Move hosts:** doesn't change data security (the bundle is public on any host).
- **Hide the Firebase config:** it's meant to be public; security is enforced
  server-side by the steps above.
