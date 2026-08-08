# AI Architecture

Model

Google Gemini API (Free Tier), called **directly from the client**.
See `02_System_Architecture.md` → "Decision: no Cloud Functions backend" for why
there is no server, and for the required API-key hardening (free tier + referrer
restriction + API restriction + quota cap).

Responsibilities

- Explain
- Forecast
- Recommend
- Coach
- Simulate
- Generate yearly financial roadmaps

The AI should NOT perform arithmetic already available in code.
All money math stays in client code using integer cents (see `src/lib/money.ts`).

Provide structured financial summaries instead of raw transactions whenever possible.

Privacy note: because the client calls Gemini directly, whatever is sent leaves
the device and goes to Google — which is a departure from this app's otherwise
no-server, client-side-crypto design. Send **structured summaries** (category
rollups, totals, goal figures), never raw transaction lists or the passphrase.
This limits what is disclosed and doubles as the "no arithmetic in the AI" rule.

Future AI Memory

Remember:

- Financial goals
- Monthly allowance
- Emergency fund target
- Risk tolerance
- Preferred saving strategy
