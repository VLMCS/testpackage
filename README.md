# Jan & Aki — Budget Tracker

Household budget tracker. React PWA, Firestore-backed, deployed to GitHub Pages. Installable on Android & iOS from the browser ("Add to Home Screen").

## One-time setup

### 1. Firebase project (~3 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), create a new project (free tier, no billing needed).
2. **Firestore Database** → Create database → **Production mode** → pick a region close to you.
3. **Authentication** → Get started → **Anonymous** → enable.
4. **Project Settings** (gear icon) → scroll to "Your apps" → click the `</>` Web icon → register the app → copy the `firebaseConfig` object.
5. Paste it into [`src/lib/firebase.ts`](src/lib/firebase.ts), replacing the `PASTE_YOUR_…` placeholders.
6. **Firestore → Rules tab** → paste the contents of [`firestore.rules`](firestore.rules) → Publish.

### 2. Local dev

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). You should see the welcome screen with a green check next to "Firebase config pasted" once step 1 is done.

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub as `testpackage` (or rename — see "If you rename the repo" below).
2. Repo **Settings → Pages → Source** → "GitHub Actions".
3. Push to `main` — the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys. After the first run, your app is live at `https://<your-username>.github.io/testpackage/`.

### 4. Install on phone

Open the GitHub Pages URL in Chrome (Android) or Safari (iOS) → menu → **Add to Home Screen**. Now it launches like a native app, full-screen, with offline support.

## If you rename the repo

Change `BASE_PATH` in [`vite.config.ts`](vite.config.ts) to match the new repo name (e.g. `/new-name/`). For a custom domain, set it to `/`.

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui primitives
- Firebase JS SDK (Firestore + Anonymous Auth)
- vite-plugin-pwa (service worker + manifest)
- Recharts (analytics, added in Phase 6)

## Project phases

- [x] **Phase 1** — Scaffold (this commit)
- [ ] Phase 2 — Workspace setup, device pairing, per-account PIN, starting balance
- [ ] Phase 3 — Income/expense entry, categories, transactions list
- [ ] Phase 4 — RECURRING category with monthly auto-rollover
- [ ] Phase 5 — Calendar view in Transactions
- [ ] Phase 6 — Analytics dashboard (this month + month-over-month)
- [ ] Phase 7 — Settings UI, polish, dark mode, offline indicator
