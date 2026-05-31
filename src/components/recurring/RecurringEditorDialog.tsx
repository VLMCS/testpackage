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
import { addTemplate, updateTemplate, deleteTemplate } from '@/lib/recurring';
import { parseAmountToCents } from '@/lib/money';
import type { AccountId, RecurringTemplate } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

export function RecurringEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  baseCurrency,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: AccountId;
  baseCurrency: string;
  editing: RecurringTemplate | null;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setAmount((editing.amountCents / 100).toString());
      setNote(editing.note);
    } else {
      setName('');
      setAmount('');
      setNote('');
    }
    setErr(null);
  }, [open, editing]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Give the bill a name.');
      return;
    }
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        await updateTemplate(workspaceId, editing.id, {
          name: trimmed,
          amountCents: cents,
          note: note.trim(),
        });
      } else {
        await addTemplate(workspaceId, {
          accountId,
          name: trimmed,
          amountCents: cents,
          note: note.trim(),
          active: true,
          createdAt: Date.now(),
        });
      }
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await deleteTemplate(workspaceId, editing.id);
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete.');
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit recurring bill' : 'New recurring bill'}</DialogTitle>
          <DialogDescription>
            It reappears every month as an unchecked item. Tick it the month you pay it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rec-name">Name</Label>
          <Input
            id="rec-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent, Netflix"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rec-amount">Amount ({baseCurrency})</Label>
          <Input
            id="rec-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rec-note">Note (optional)</Label>
          <Input
            id="rec-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. due on the 5th"
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
              aria-label="Delete recurring bill"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add bill'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
