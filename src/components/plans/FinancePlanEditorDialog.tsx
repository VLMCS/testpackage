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
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/common/ColorPicker';
import { IconPicker } from '@/components/categories/IconPicker';
import { getCategoryIcon } from '@/lib/icons';
import { gradientFromHex, isLightColor } from '@/lib/theme';
import { parseAmountToCents } from '@/lib/money';
import { PLAN_PRESETS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { addPlan, updatePlan, deletePlan } from '@/lib/plans';
import { useSession } from '@/hooks/useSession';
import type { FinancePlan, Wallet } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

export function FinancePlanEditorDialog({
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
  editing: FinancePlan | null;
}) {
  const { baseCurrency } = useSession();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#16a34a');
  const [icon, setIcon] = useState('PiggyBank');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [trackWallet, setTrackWallet] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setColor(editing.color);
      setIcon(editing.icon);
      setTarget((editing.targetCents / 100).toString());
      setDeadline(editing.deadline ?? '');
      setTrackWallet(Boolean(editing.walletId));
      setWalletId(editing.walletId ?? null);
      setSaved(editing.savedCents ? (editing.savedCents / 100).toString() : '');
    } else {
      setName('');
      setColor('#16a34a');
      setIcon('PiggyBank');
      setTarget('');
      setDeadline('');
      setTrackWallet(false);
      setWalletId(null);
      setSaved('');
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
      setErr('Give the plan a name.');
      return;
    }
    const targetCents = parseAmountToCents(target);
    if (targetCents === null || targetCents <= 0) {
      setErr('Enter a goal amount greater than 0.');
      return;
    }
    const useWallet = trackWallet && walletId;
    if (trackWallet && !walletId) {
      setErr('Pick a wallet to track, or turn that off.');
      return;
    }
    const savedCents = saved.trim() === '' ? 0 : parseAmountToCents(saved);
    if (!useWallet && savedCents === null) {
      setErr('Enter a valid saved amount.');
      return;
    }
    setErr(null);
    setBusy(true);
    const payload = {
      name: trimmed,
      color,
      icon,
      targetCents,
      deadline: deadline || null,
      walletId: useWallet ? walletId : null,
      // Keep the manual figure only when not tracking a wallet.
      savedCents: useWallet ? 0 : (savedCents as number),
    };
    const op = editing
      ? updatePlan(workspaceId, editing.id, payload)
      : addPlan(workspaceId, {
          accountId,
          active: true,
          createdAt: Date.now(),
          ...payload,
        });
    op.catch((e) => console.error('Plan will sync on reconnect:', e));
    onOpenChange(false);
  }

  function remove() {
    if (busy || !editing) return;
    setBusy(true);
    deletePlan(workspaceId, editing.id).catch((e) =>
      console.error('Delete will sync on reconnect:', e),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit plan' : 'New plan'}</DialogTitle>
          <DialogDescription>
            Set a savings goal. Track it against a wallet, or update progress yourself.
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <div className="space-y-2">
            <Label>Quick add</Label>
            <div className="flex flex-wrap gap-2">
              {PLAN_PRESETS.map((p) => {
                const PIcon = getCategoryIcon(p.icon);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setErr(null);
                      setName(p.name);
                      setColor(p.color);
                      setIcon(p.icon);
                    }}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <PIcon className="h-4 w-4" style={{ color: p.color }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundImage: gradientFromHex(color) }}
          >
            <Icon className={cn('h-8 w-8', darkGlyph ? 'text-slate-900' : 'text-white')} />
          </span>
          <div className="flex-1 space-y-2">
            <Label htmlFor="plan-name">Name</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => {
                setErr(null);
                setName(e.target.value);
              }}
              placeholder="e.g. Emergency Fund"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-target">Goal amount ({baseCurrency})</Label>
          <Input
            id="plan-target"
            inputMode="decimal"
            value={target}
            onChange={(e) => {
              setErr(null);
              setTarget(e.target.value);
            }}
            placeholder="0.00"
            className="text-lg"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="plan-track">Track a wallet</Label>
            <p className="text-xs text-muted-foreground">
              Progress mirrors a wallet's balance. Off = you enter progress manually.
            </p>
          </div>
          <Switch id="plan-track" checked={trackWallet} onCheckedChange={setTrackWallet} />
        </div>

        {trackWallet ? (
          wallets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => {
                const WIcon = getCategoryIcon(w.icon);
                const selected = walletId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setErr(null);
                      setWalletId(w.id);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      selected ? 'border-transparent text-white' : 'bg-background text-foreground',
                    )}
                    style={selected ? { backgroundColor: w.color } : undefined}
                  >
                    <WIcon className="h-4 w-4" style={selected ? undefined : { color: w.color }} />
                    {w.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No wallets yet — add one first, or track this plan manually.
            </p>
          )
        ) : (
          <div className="space-y-2">
            <Label htmlFor="plan-saved">Saved so far ({baseCurrency})</Label>
            <Input
              id="plan-saved"
              inputMode="decimal"
              value={saved}
              onChange={(e) => {
                setErr(null);
                setSaved(e.target.value);
              }}
              placeholder="0.00"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="plan-deadline">Target date (optional)</Label>
          <Input
            id="plan-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
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
              aria-label="Delete plan"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
