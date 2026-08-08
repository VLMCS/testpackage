# Phase 2 Implementation Plan — AI Layer

Status: PLAN (no code yet). Branch: `feature/ai-phase-2` (off `main`).

Turns the finance planner into an AI coach: ask questions, log transactions by
chat/voice, everything AI-generated reviewed before it's saved.

## Guiding constraints (unchanged from Phase 1)

- **Client-only, no backend.** Gemini is called directly from the browser with a
  hardened, referrer-restricted, free-tier key (see `02_System_Architecture.md`).
- **Additive & backward-compatible.** New files + new Firestore collections only;
  no changes to existing data. The app must work fully with AI **disabled**.
- **Privacy first.** Send Gemini **structured summaries**, never raw transaction
  lists, the passphrase, or PINs. AI is **opt-in**.
- **Math stays in code.** AI explains/forecasts/parses; integer-cent math and
  balances come from `src/lib/selectors.ts`, never from the model.
- **No personalized investment/financial advice.** The assistant coaches and
  explains with a not-a-licensed-advisor disclaimer; it must not tell the user
  what securities to buy/sell.

## Prerequisite the USER must do (before AI works)

1. Create a Gemini API key in Google AI Studio (free tier).
2. Restrict it in Google Cloud Console: HTTP referrer = the Pages domain, API =
   Generative Language only, set a quota cap. Keep it on the free tier (no
   billing account) so a leaked key is a rate-limit annoyance, never a bill.
3. Paste it into `src/lib/ai/config.ts` (like the Firebase config today).

Claude builds the wiring and the "AI not configured" states; the user supplies
the key. Until a key is set, all AI UI stays hidden and the app is unchanged.

## Architecture

```
React (PWA)
  ├─ selectors.ts  ──► structured summary (code, integer cents)
  │                         │
  │                         ▼
  └─ lib/ai/gemini.ts ──► Gemini API (client-side, hardened key)
                            │
             ┌──────────────┴───────────────┐
             ▼                               ▼
      Assistant answer            Parsed transaction (JSON)
      (read-only)                        │
                                         ▼
                              Review Queue (pending_transactions)
                                         │  user Accepts/Edits
                                         ▼
                              addTransaction() → Firestore
```

## New modules / data

- `src/lib/ai/config.ts` — `GEMINI_API_KEY` placeholder + `isAiConfigured()`.
- `src/lib/ai/gemini.ts` — thin `generateContent` client: plain text and
  JSON-schema (structured) modes; maps 429/network/safety errors to friendly
  messages; hard token/again caps.
- `src/lib/ai/summarize.ts` — builds the compact JSON snapshot for the active
  account (month totals, top categories, wallet balances by name, budgets with
  remaining, plans with ETA, recent net-savings trend). Pure code, reuses
  selectors. This is the ONLY financial data sent to Gemini.
- `src/lib/ai/parseTransaction.ts` — free text → `{amountCents, type,
  categoryHint, walletHint, merchant, date, note, confidence}` via JSON schema;
  hints resolved to real category/wallet ids by in-code fuzzy match.
- New Firestore subcollection `pending_transactions` (the AI Review Queue):
  `{source, rawText, parsed fields, confidence, status:'pending', createdAt}`.
  Covered by the existing generic security rule; add to `deleteAccount` cleanup.
- Optional later: `ai_chats` (persisted assistant conversation).
- AI opt-in flag stored on the workspace or per-account settings.

## Milestones (each is a shippable slice)

### M0 — Foundation (no user-visible AI yet)
Gemini client + config + summarizer + `isAiConfigured()` gate + graceful
disabled states. Verifiable without a key (everything stays hidden/off).

### M1 — AI Assistant (2a), read-only  ◄ recommended first real feature
- Chat screen (new tab or from Profile). Sends system prompt + summary +
  question; renders the answer. No writes.
- Suggested prompts: "How am I doing this month?", "Can I afford ₱X?", "When do
  I reach my <goal>?".
- System prompt enforces: use only the summary, don't invent numbers, coach not
  advise, add the not-a-licensed-advisor disclaimer where relevant.
- Lowest risk; proves the whole Gemini approach end to end.

### M2 — Chat logging + Review Queue (2b), the write path
- Type "spent 250 on lunch via GCash yesterday" → parse → **pending item**.
- Review screen: high confidence → Accept/Edit; medium/low → ask to clarify.
  Accepting calls `addTransaction` (reusing wallet/budget/category assignment);
  rejecting discards. Nothing saves without confirmation.

### M3 — Voice logging (2b)
- Browser Web Speech API → transcript → same parse → Review Queue.
- Caveat: speech recognition support in the installed Android PWA is uneven; may
  need a Capacitor speech plugin, which ties into M4.

### M4 — Notification logging (2c), Android — separate sub-project
- Requires Capacitor (still greenfield) + a notification-listener plugin +
  permissions; privacy-sensitive. Planned last, scoped on its own.

## Cross-cutting

- **Cost/limits:** free-tier rate limits — debounce, cache the summary, cap
  tokens, and surface 429s as "try again in a moment."
- **Privacy/opt-in:** an AI toggle in Settings with a plain-language note that
  summaries are sent to Google; default off.
- **Safety:** encode the no-personalized-investment-advice guardrail in the
  system prompt; keep a disclaimer in the UI.
- **Model:** use the current free-tier Gemini "flash" model — confirm the exact
  id in AI Studio at build time (see `claude-api` guidance / roadmap).

## Open questions for the user

1. Confirm the client-side Gemini key approach is still the direction (yes per
   Phase-1 decision) and that you'll provision the restricted key.
2. Persist the assistant chat history in Firestore, or keep it ephemeral for v1?
   (Storing conversations is a privacy choice.)
3. Assistant entry point: a new bottom-nav tab, or launched from Profile /
   dashboard? (Bottom nav is full at 5 slots.)
4. Is Android notification logging (M4) in scope soon, or parked until Capacitor
   is set up?

## Verification approach

Typecheck + build + boot for every slice. AI behavior itself needs the user's
key to exercise, so Claude ships robust "not configured" and error states and
the user tests live with their key on a throwaway workspace first.
