import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { FinancePlanEditorDialog } from '@/components/plans/FinancePlanEditorDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { gradientFromHex } from '@/lib/theme';
import { avgMonthlySavingsCents, planSavedCents, forecastPlan } from '@/lib/forecast';
import { ChevronLeft, Plus, CalendarClock, CheckCircle2, TrendingUp } from 'lucide-react';
import type { FinancePlan } from '@/types';

export function PlansScreen({ onBack }: { onBack: () => void }) {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { financePlans, wallets, transactions, transfers } = useData();
  const [editing, setEditing] = useState<FinancePlan | null>(null);
  const [adding, setAdding] = useState(false);

  const accId = activeAccount?.id ?? '';
  const mine = useMemo(() => financePlans.filter((p) => p.accountId === accId), [financePlans, accId]);
  const myWallets = useMemo(
    () => wallets.filter((w) => w.accountId === accId && w.active),
    [wallets, accId],
  );
  const pace = useMemo(() => avgMonthlySavingsCents(transactions, accId), [transactions, accId]);

  if (!activeAccount || !workspaceId) return null;

  const open = editing !== null || adding;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 px-1">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Finance Plans</h1>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Recent saving pace</p>
            <p className="font-semibold">
              {pace > 0 ? `${formatCents(pace, baseCurrency)} / month` : 'Not saving yet'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {mine.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">
            No plans yet. Add a goal like an Emergency Fund or a Vacation and track your progress.
          </p>
        )}

        {mine.map((p) => {
          const saved = planSavedCents(p, myWallets, transactions, transfers);
          const f = forecastPlan(p, saved, pace);
          const Icon = getCategoryIcon(p.icon);
          const pct = Math.round(f.progress * 100);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setEditing(p)}
              className="block w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundImage: gradientFromHex(p.color) }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCents(saved, baseCurrency)} of {formatCents(p.targetCents, baseCurrency)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{pct}%</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {f.reached ? (
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Goal reached
                  </span>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      {formatCents(f.remainingCents, baseCurrency)} to go
                    </span>
                    {f.etaLabel && (
                      <span
                        className={
                          f.behindDeadline
                            ? 'flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400'
                            : 'flex items-center gap-1 text-muted-foreground'
                        }
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        {f.etaLabel}
                        {f.monthsToGoal != null && ` (${f.monthsToGoal} mo)`}
                      </span>
                    )}
                    {!f.etaLabel && (
                      <span className="text-muted-foreground">Add savings to project an ETA</span>
                    )}
                  </>
                )}
                {p.walletId && (
                  <span className="text-muted-foreground">
                    · tracks {myWallets.find((w) => w.id === p.walletId)?.name ?? 'a wallet'}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed p-3 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Add plan</span>
        </button>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        ETAs are estimated from your average monthly savings over the last 3 months. They update as
        your spending and income change.
      </p>

      <FinancePlanEditorDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setAdding(false);
          }
        }}
        workspaceId={workspaceId}
        accountId={accId}
        wallets={myWallets}
        editing={editing}
      />
    </div>
  );
}
