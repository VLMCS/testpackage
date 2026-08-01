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
import { ColorPicker } from '@/components/common/ColorPicker';
import { IconPicker } from '@/components/categories/IconPicker';
import { getCategoryIcon } from '@/lib/icons';
import { gradientFromHex, isLightColor } from '@/lib/theme';
import { parseAmountToCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import { addWallet, updateWallet, deleteWallet } from '@/lib/wallets';
import { useSession } from '@/hooks/useSession';
import type { Wallet } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

export function WalletEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: string;
  editing: Wallet | null;
}) {
  const { baseCurrency } = useSession();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#16a34a');
  const [icon, setIcon] = useState('Wallet');
  const [balance, setBalance] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setColor(editing.color);
      setIcon(editing.icon);
      setBalance((editing.startingBalanceCents / 100).toString());
    } else {
      setName('');
      setColor('#16a34a');
      setIcon('Wallet');
      setBalance('');
    }
    setErr(null);
    setBusy(false);
  }, [open, editing]);

  const Icon = getCategoryIcon(icon);
  const darkGlyph = isLightColor(color);

  function save() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Give the wallet a name.');
      return;
    }
    // Empty balance means 0; a typed value must parse. Negatives are allowed
    // (e.g. a credit-card wallet that starts in the red).
    const startingBalanceCents = balance.trim() === '' ? 0 : parseAmountToCents(balance);
    if (startingBalanceCents === null) {
      setErr('Enter a valid starting balance.');
      return;
    }
    setErr(null);
    setBusy(true);
    // Offline-first: issue the write without awaiting (see AddTransactionDialog).
    const op = editing
      ? updateWallet(workspaceId, editing.id, {
          name: trimmed,
          color,
          icon,
          startingBalanceCents,
        })
      : addWallet(workspaceId, {
          accountId,
          name: trimmed,
          color,
          icon,
          startingBalanceCents,
          sortOrder: 100,
          active: true,
          createdAt: Date.now(),
        });
    op.catch((e) => console.error('Wallet will sync on reconnect:', e));
    onOpenChange(false);
  }

  function remove() {
    if (busy || !editing) return;
    setBusy(true);
    deleteWallet(workspaceId, editing.id).catch((e) =>
      console.error('Delete will sync on reconnect:', e),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit wallet' : 'New wallet'}</DialogTitle>
          <DialogDescription>
            A wallet is a money source — Cash, Bank, Credit Card. Expenses draw from it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            style={{ backgroundImage: gradientFromHex(color) }}
          >
            <Icon className={cn('h-8 w-8', darkGlyph ? 'text-slate-900' : 'text-white')} />
          </span>
          <div className="flex-1 space-y-2">
            <Label htmlFor="wallet-name">Name</Label>
            <Input
              id="wallet-name"
              value={name}
              onChange={(e) => {
                setErr(null);
                setName(e.target.value);
              }}
              placeholder="e.g. Cash"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wallet-balance">Starting balance ({baseCurrency})</Label>
          <Input
            id="wallet-balance"
            inputMode="decimal"
            value={balance}
            onChange={(e) => {
              setErr(null);
              setBalance(e.target.value);
            }}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            What's in this wallet right now, before any transactions. Leave blank for 0.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="space-y-2">
          <Label>Icon</Label>
          <IconPicker value={icon} onChange={setIcon} />
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
              aria-label="Delete wallet"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add wallet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
