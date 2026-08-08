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
import { parseAmountToCents, formatCents } from '@/lib/money';
import { projectInterest, FREQUENCY_LABEL } from '@/lib/interest';
import { WALLET_PRESETS, INTEREST_RATES_AS_OF, type WalletPreset } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { addWallet, updateWallet, deleteWallet } from '@/lib/wallets';
import { useSession } from '@/hooks/useSession';
import type { InterestTier, Wallet, WalletInterest } from '@/types';
import { Loader2, Plus, Trash2, X } from 'lucide-react';

type Frequency = WalletInterest['frequency'];
type TierInput = { rate: string; upTo: string };

/** Parse a percentage string (e.g. "3.25") into a number, or null if invalid. */
function parseRate(input: string): number | null {
  const v = Number(input.replace(/[^0-9.]/g, ''));
  return Number.isFinite(v) && v >= 0 ? v : null;
}

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
  const [interestOn, setInterestOn] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [tiers, setTiers] = useState<TierInput[]>([{ rate: '', upTo: '' }]);
  const [tax, setTax] = useState('20');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setColor(editing.color);
      setIcon(editing.icon);
      setBalance((editing.startingBalanceCents / 100).toString());
      const it = editing.interest;
      setInterestOn(Boolean(it));
      setFrequency(it?.frequency ?? 'monthly');
      setTax(it ? String(it.withholdingTaxPercent) : '20');
      setTiers(
        it && it.tiers.length > 0
          ? it.tiers.map((t) => ({
              rate: String(t.ratePercent),
              upTo: t.upToCents === null ? '' : String(t.upToCents / 100),
            }))
          : [{ rate: '', upTo: '' }],
      );
    } else {
      setName('');
      setColor('#16a34a');
      setIcon('Wallet');
      setBalance('');
      setInterestOn(false);
      setFrequency('monthly');
      setTiers([{ rate: '', upTo: '' }]);
      setTax('20');
    }
    setErr(null);
    setBusy(false);
  }, [open, editing]);

  // Build a valid WalletInterest from the inputs, or return an error string.
  function buildInterest(): { interest: WalletInterest } | { error: string } {
    const built: InterestTier[] = [];
    for (let i = 0; i < tiers.length; i++) {
      const rate = parseRate(tiers[i].rate);
      if (rate === null) return { error: `Enter a valid rate for tier ${i + 1}.` };
      const isLast = i === tiers.length - 1;
      let upToCents: number | null = null;
      if (!isLast) {
        const c = parseAmountToCents(tiers[i].upTo);
        if (c === null || c <= 0) return { error: `Enter an "up to" amount for tier ${i + 1}.` };
        upToCents = c;
      }
      built.push({ ratePercent: rate, upToCents });
    }
    // Thresholds must strictly ascend so the bands don't overlap.
    for (let i = 1; i < built.length; i++) {
      const prev = built[i - 1].upToCents;
      const cur = built[i].upToCents;
      if (prev !== null && cur !== null && cur <= prev) {
        return { error: 'Tier "up to" amounts must increase.' };
      }
    }
    const taxPct = parseRate(tax);
    if (taxPct === null || taxPct > 100) return { error: 'Enter a tax between 0 and 100.' };
    return { interest: { frequency, tiers: built, withholdingTaxPercent: taxPct } };
  }

  // Apply a quick-add preset: name/color/icon, plus interest when the preset
  // carries a known rate (otherwise clear interest back to defaults).
  function applyPreset(p: WalletPreset) {
    setErr(null);
    setName(p.name);
    setColor(p.color);
    setIcon(p.icon);
    if (p.interest) {
      setInterestOn(true);
      setFrequency(p.interest.frequency);
      setTax(String(p.interest.withholdingTaxPercent));
      setTiers(
        p.interest.tiers.map((t) => ({
          rate: String(t.ratePercent),
          upTo: t.upToCents === null ? '' : String(t.upToCents / 100),
        })),
      );
    } else {
      setInterestOn(false);
      setFrequency('monthly');
      setTiers([{ rate: '', upTo: '' }]);
      setTax('20');
    }
  }

  // Live projection preview from the current inputs (0 until valid).
  const previewProjection = (() => {
    if (!interestOn) return null;
    const bal = balance.trim() === '' ? 0 : (parseAmountToCents(balance) ?? 0);
    const built = buildInterest();
    if ('error' in built) return null;
    return projectInterest(bal, built.interest);
  })();

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
    // Interest is optional; when on, it must validate. null clears it on save.
    let interest: WalletInterest | null = null;
    if (interestOn) {
      const built = buildInterest();
      if ('error' in built) {
        setErr(built.error);
        return;
      }
      interest = built.interest;
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
          interest,
        })
      : addWallet(workspaceId, {
          accountId,
          name: trimmed,
          color,
          icon,
          startingBalanceCents,
          interest,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit wallet' : 'New wallet'}</DialogTitle>
          <DialogDescription>
            A wallet is a money source — Cash, Bank, Credit Card. Expenses draw from it.
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <div className="space-y-2">
            <Label>Quick add</Label>
            <div className="flex flex-wrap gap-2">
              {WALLET_PRESETS.map((p) => {
                const PIcon = getCategoryIcon(p.icon);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <PIcon className="h-4 w-4" style={{ color: p.color }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Tap one to pre-fill, then adjust below. You can still change everything.
            </p>
          </div>
        )}

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

        {/* Interest --------------------------------------------------------- */}
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="wallet-interest">Earns interest</Label>
              <p className="text-xs text-muted-foreground">
                For savings accounts like MariBank, GoTyme, etc.
              </p>
            </div>
            <Switch id="wallet-interest" checked={interestOn} onCheckedChange={setInterestOn} />
          </div>

          {interestOn && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label>Credited</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={cn(
                        'rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                        frequency === f ? 'bg-background shadow-sm' : 'text-muted-foreground',
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Annual rate {tiers.length > 1 ? '(tiered)' : ''}</Label>
                <p className="text-xs text-muted-foreground">
                  Preset rates are as of {INTEREST_RATES_AS_OF} — verify against your bank.
                </p>
                {tiers.map((t, i) => {
                  const isLast = i === tiers.length - 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative w-24 shrink-0">
                        <Input
                          inputMode="decimal"
                          value={t.rate}
                          onChange={(e) => {
                            setErr(null);
                            setTiers((cur) =>
                              cur.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)),
                            );
                          }}
                          placeholder="3.25"
                          className="pr-6"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                      {isLast ? (
                        <span className="flex-1 text-sm text-muted-foreground">
                          {tiers.length > 1 ? 'and above' : 'on the whole balance'}
                        </span>
                      ) : (
                        <div className="flex flex-1 items-center gap-1.5">
                          <span className="text-sm text-muted-foreground">up to</span>
                          <Input
                            inputMode="decimal"
                            value={t.upTo}
                            onChange={(e) => {
                              setErr(null);
                              setTiers((cur) =>
                                cur.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)),
                              );
                            }}
                            placeholder="1,000,000"
                          />
                        </div>
                      )}
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTiers((cur) => cur.filter((_, j) => j !== i))
                          }
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove tier ${i + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTiers((cur) => [...cur, { rate: '', upTo: '' }])}
                >
                  <Plus className="h-4 w-4" /> Add tier
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wallet-tax">Withholding tax</Label>
                <div className="relative w-24">
                  <Input
                    id="wallet-tax"
                    inputMode="decimal"
                    value={tax}
                    onChange={(e) => {
                      setErr(null);
                      setTax(e.target.value);
                    }}
                    placeholder="20"
                    className="pr-6"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              {previewProjection && (
                <div className="rounded-md bg-muted/60 p-2.5 text-sm">
                  <p className="font-medium">
                    ≈ {formatCents(previewProjection.perPeriodCents, baseCurrency)} / {FREQUENCY_LABEL[frequency]}
                    <span className="text-muted-foreground"> (net)</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCents(previewProjection.netAnnualCents, baseCurrency)} per year after tax ·{' '}
                    {previewProjection.effectiveNetRatePercent.toFixed(2)}% effective
                  </p>
                </div>
              )}
            </div>
          )}
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
