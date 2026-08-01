# Finance Planning

Core Concepts

- Wallets
- Finance Plans
- Budget Allocations
- Transactions
- Milestones

---

## Wallets — definition (2026-08-01)

A **Wallet** is a money source that lives *inside* a person-"Account" (the
existing `jan`/`aki` profiles). It answers "where did this expense actually come
from" — e.g. Cash, Checking, Savings, Credit Card, GCash. This is the model the
Tarsi budget app uses.

Behavior:

- When adding an EXPENSE (or income), the user picks a **Wallet**. The amount is
  automatically deducted from (or added to) that wallet's balance.
- Each wallet tracks its own running balance; the account's total is the sum of
  its wallets.
- A transaction keeps its normal category AND records which wallet it came from,
  so reports can break spending down by wallet as well as by category.

Wallet vs Account (important — do NOT conflate):

- **Account** = a *person* / profile, gated by a soft PIN. Unchanged.
- **Wallet** = a *money bucket* owned by one account. New concept.
- A person has many wallets; a wallet belongs to exactly one person.

Data model (additive, backward-compatible — follows the existing migration rule):

- New subcollection `workspaces/{wid}/wallets`, each doc owned by `accountId`,
  with `name`, `color`/`icon`, `startingBalanceCents` (integer cents, per
  `src/lib/money.ts`), `sortOrder`, `active`, `createdAt`.
- `Transaction` gains an **optional** `walletId?: string`. Older transactions
  have no wallet and must keep working (treated as "unassigned"), so the field is
  optional and nothing back-fills it destructively.
- Wallet balances are computed the same way account balances are today
  (`startingBalanceCents` + sum of that wallet's transactions), so no stored
  running total to keep in sync.
- Bump `schemaVersion` and, if any default wallet seeding is needed, add an
  idempotent migration alongside the existing ones in `src/lib/migrate.ts`.

Open question for later: should a transfer between two wallets (e.g. Checking →
Savings) reuse the existing `notTracked` flag so it moves both balances without
counting as spending? Likely yes — revisit when building this.

Finance Plans examples

- Emergency Fund
- House
- Retirement
- Vacation
- Wedding
- New Car

Planning Features

- Monthly saving capacity
- Goal forecasting
- Purchase affordability
- Cash-flow projection
- Scenario simulation

Example questions

- Can I afford this?
- What if my salary increases?
- What if my bills go up?
- When will I reach my goal?
