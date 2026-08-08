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
import { getCategoryIcon } from '@/lib/icons';
import { parseAmountToCents } from '@/lib/money';
import { todayIso } from '@/lib/date';
import { cn } from '@/lib/utils';
import { addTransfer, updateTransfer, deleteTransfer } from '@/lib/transfers';
import { useSession } from '@/hooks/useSession';
import type { Transfer, Wallet } from '@/types';
import { ArrowRight, Loader2, Trash2, Wallet as WalletIcon } from 'lucide-react';

// Sentinel used in local state to represent the Unassigned bucket (stored null).
const UNASSIGNED = '__unassigned__';
const toStored = (v: string): string | null => (v === UNASSIGNED ? null : v);
const fromStored = (v: string | null): string => v ?? UNASSIGNED;

export function TransferDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  wallets,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: string;
  wallets: Wallet[];
  editing?: Transfer | null;
}) {
  const { baseCurrency } = useSession();
  const [from, setFrom] = useState<string>(UNASSIGNED);
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFrom(fromStored(editing.fromWalletId));
      setTo(fromStored(editing.toWalletId));
      setAmount((editing.amountCents / 100).toString());
      setDate(editing.date);
      setNote(editing.note);
    } else {
      // Default: move money out of Unassigned into the first named wallet.
      setFrom(UNASSIGNED);
      setTo(wallets[0]?.id ?? '');
      setAmount('');
      setDate(todayIso());
      setNote('');
    }
    setErr(null);
    setBusy(false);
  }, [open, editing, wallets]);

  // Options are the named wallets plus the Unassigned bucket.
  const options: { value: string; label: string; color?: string; icon?: string }[] = [
    { value: UNASSIGNED, label: 'Unassigned', icon: 'Wallet' },
    ...wallets.map((w) => ({ value: w.id, label: w.name, color: w.color, icon: w.icon })),
  ];

  function save() {
    if (busy) return;
    if (from === to) {
      setErr('Pick two different places.');
      return;
    }
    if (!to) {
      setErr('Pick where the money goes.');
      return;
    }
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    setErr(null);
    setBusy(true);
    const op = editing
      ? updateTransfer(workspaceId, editing.id, {
          fromWalletId: toStored(from),
          toWalletId: toStored(to),
          amountCents: cents,
          date,
          note: note.trim(),
        })
      : addTransfer(workspaceId, {
          accountId,
          fromWalletId: toStored(from),
          toWalletId: toStored(to),
          amountCents: cents,
          date,
          note: note.trim(),
          createdAt: Date.now(),
        });
    op.catch((e) => console.error('Transfer will sync on reconnect:', e));
    onOpenChange(false);
  }

  function remove() {
    if (busy || !editing) return;
    setBusy(true);
    deleteTransfer(workspaceId, editing.id).catch((e) =>
      console.error('Delete will sync on reconnect:', e),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit transfer' : 'Move money'}</DialogTitle>
          <DialogDescription>
            Shift money between wallets. This isn't spending or income — your total balance stays the
            same.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>From</Label>
          <EndpointRow options={options} value={from} onSelect={setFrom} />
        </div>

        <div className="flex justify-center text-muted-foreground">
          <ArrowRight className="h-5 w-5 rotate-90" />
        </div>

        <div className="space-y-2">
          <Label>To</Label>
          <EndpointRow options={options} value={to} onSelect={setTo} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-amount">Amount ({baseCurrency})</Label>
          <Input
            id="transfer-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setErr(null);
              setAmount(e.target.value);
            }}
            placeholder="0.00"
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-date">Date</Label>
          <Input
            id="transfer-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Input
            id="transfer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. move savings to bank"
          />
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex items-center gap-2">
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label="Delete transfer"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Move money'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EndpointRow({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string; color?: string; icon?: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const Icon = o.icon ? getCategoryIcon(o.icon) : WalletIcon;
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? 'border-transparent text-white' : 'bg-background text-foreground',
            )}
            style={selected ? { backgroundColor: o.color ?? '#64748b' } : undefined}
          >
            <Icon className="h-4 w-4" style={selected ? undefined : { color: o.color }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
