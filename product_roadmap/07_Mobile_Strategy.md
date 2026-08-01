# Mobile Strategy

Current

- PWA only.

## Status: Capacitor is NOT installed yet — greenfield (verified 2026-08-01)

Despite earlier wording, Capacitor does **not** exist in this repo: no
`@capacitor/*` packages in `package.json`, no `capacitor.config.*`, and no
`android/` or `ios/` folders. Any Android-native work starts from zero.

Adding it later means: install `@capacitor/core` + `@capacitor/cli` +
`@capacitor/android`, run `npx cap init`, add the `android/` project, and wrap
the existing Vite build. The web codebase stays shared; Capacitor just packages
it. This is a real chunk of work, not a config tweak — scope it as its own task
when the mobile phase begins.

New (planned)

- Android APK using Capacitor — single shared codebase.

Native Features (require Capacitor + native plugins)

- Microphone (voice capture)
- Notification listener — heaviest lift and privacy-sensitive: reading a user's
  notifications to parse spending needs a native Android plugin and special
  permissions. Treat as its own scoped task, not a quick win.
- Local storage
- Native permissions

Keep PWA fully functional at all times.
