import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { effectiveAmountCents, setMonthlyAmount } from '@/lib/recurring';
import { updateTransaction } from '@/lib/transactions';
import { parseAmountToCents, formatCents } from '@/lib/money';
import { monthLabel } from '@/lib/date';
import type { RecurringTemplate } from '@/types';
import { Loader2, RotateCcw } from 'lucide-react';

/**
 * Edit a recurring bill's amount for one specific month. Setting the amount
 * writes an override into template.monthlyAmounts[month]; "Reset" clears it so
 * the month falls back to the default. If the bill is already ticked for that
 * month, the linked transaction is updated too so the user doesn't have to
 * untick/retick.
 */
export function MonthlyAmountDialog({
  open,
  onOpenChange,
  workspaceId,
  template,
  monthKey,
  baseCurrency,
  tickedTransactionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  template: RecurringTemplate | null;
  monthKey: string;
  baseCurrency: string;
  /** Id of the transaction created when the bill was ticked for monthKey (if any). */
  tickedTransactionId: string | null;
}) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !template) return;
    const current = effectiveAmountCents(template, monthKey);
    setAmount((current / 100).toString());
    setErr(null);
    setBusy(false);
  }, [open, template, monthKey]);

  if (!template) return null;

  const hasOverride = typeof template.monthlyAmounts?.[monthKey] === 'number';

  function save() {
    if (!template || busy) return;
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    setErr(null);
    setBusy(true);
    // Offline-first: don't await — the snapshot reflects the new amount instantly.
    setMonthlyAmount(workspaceId, template.id, monthKey, cents).catch((e) =>
      console.error('Monthly amount will sync on reconnect:', e),
    );
    if (tickedTransactionId) {
      updateTransaction(workspaceId, tickedTransactionId, { amountCents: cents }).catch((e) =>
        console.error('Transaction amount will sync on reconnect:', e),
      );
    }
    onOpenChange(false);
  }

  function reset() {
    if (!template || busy) return;
    setBusy(true);
    setMonthlyAmount(workspaceId, template.id, monthKey, null).catch((e) =>
      console.error('Monthly amount will sync on reconnect:', e),
    );
    if (tickedTransactionId) {
      updateTransaction(workspaceId, tickedTransactionId, {
        amountCents: template.amountCents,
      }).catch((e) => console.error('Transaction amount will sync on reconnect:', e));
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template.name} — {monthLabel(monthKey)}</DialogTitle>
          <DialogDescription>
            Set this month's amount. Other months keep the default
            ({formatCents(template.amountCents, baseCurrency)}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rec-month-amount">Amount ({baseCurrency})</Label>
          <Input
            id="rec-month-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex items-center gap-2">
          {hasOverride && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={reset}
              disabled={busy}
              aria-label="Reset to default amount"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
