import { useState, type FormEvent } from 'react';
import { useSession } from '@/hooks/useSession';
import { createAccount } from '@/lib/workspace';
import { hashSecret } from '@/lib/crypto';
import { parseAmountToCents } from '@/lib/money';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/constants';
import { PinPad } from './PinPad';
import { ColorPicker, COLOR_PRESETS } from '@/components/common/ColorPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';

type Step = 'details' | 'pin' | 'confirm' | 'balance';

export function AddAccountFlow({ onBack }: { onBack: () => void }) {
  const { workspaceId, accounts, activateAccount } = useSession();

  const usedColors = new Set(accounts.map((a) => a.color.toLowerCase()));
  const defaultColor = COLOR_PRESETS.find((c) => !usedColors.has(c.toLowerCase())) ?? COLOR_PRESETS[0];

  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(accounts[0]?.baseCurrency ?? DEFAULT_CURRENCY);
  const [color, setColor] = useState(defaultColor);
  const [catChoice, setCatChoice] = useState<'default' | 'own'>('default');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!workspaceId) return null;
  const wsId = workspaceId;

  function submitDetails(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr('Enter a name.');
      return;
    }
    setErr(null);
    setStep('pin');
  }

  function goConfirm() {
    if (pin.length < 4) {
      setErr('PIN must be at least 4 digits.');
      return;
    }
    setErr(null);
    setStep('confirm');
  }

  function checkConfirm() {
    if (confirmPin !== pin) {
      setErr('PINs do not match. Start over.');
      setPin('');
      setConfirmPin('');
      setStep('pin');
      return;
    }
    setErr(null);
    setStep('balance');
  }

  async function finish(e: FormEvent) {
    e.preventDefault();
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setErr('Enter a valid amount (0 is fine).');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { hash, salt } = await hashSecret(pin);
      const id = await createAccount(
        wsId,
        {
          name: name.trim(),
          color,
          baseCurrency: currency,
          startingBalanceCents: cents,
          pinHash: hash,
          pinSalt: salt,
          pinLength: pin.length,
        },
        catChoice,
      );
      activateAccount(id);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not create the account.');
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
      }}
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add account</h1>
      </div>

      {step === 'details' && (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={submitDetails} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="acc-name">Name</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sam"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acc-currency">Base currency</Label>
                <select
                  id="acc-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Accent color</Label>
                <ColorPicker value={color} onChange={setColor} />
              </div>

              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceCard
                    active={catChoice === 'default'}
                    title="Use defaults"
                    desc="Start with the standard income & expense categories."
                    onClick={() => setCatChoice('default')}
                  />
                  <ChoiceCard
                    active={catChoice === 'own'}
                    title="Start blank"
                    desc="Add your own categories from scratch."
                    onClick={() => setCatChoice('own')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can add, edit, or remove categories anytime in the Categories tab.
                </p>
              </div>

              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full">
                Next
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'pin' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <p className="text-sm text-muted-foreground">Create a 4–6 digit PIN for {name.trim()}.</p>
            <PinPad
              value={pin}
              onChange={(v) => {
                setErr(null);
                setPin(v);
              }}
            />
            <div className="min-h-[1.25rem] text-sm text-destructive">{err}</div>
            <Button className="w-full" onClick={goConfirm} disabled={pin.length < 4}>
              Next
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'confirm' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <p className="text-sm text-muted-foreground">Re-enter the PIN to confirm.</p>
            <PinPad value={confirmPin} onChange={setConfirmPin} maxLength={pin.length} />
            <div className="min-h-[1.25rem] text-sm text-destructive">{err}</div>
            <Button className="w-full" onClick={checkConfirm} disabled={confirmPin.length < pin.length}>
              Confirm
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'balance' && (
        <Card>
          <CardContent className="py-8">
            <form onSubmit={finish} className="space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">Starting balance</h2>
                <p className="text-sm text-muted-foreground">
                  How much money does {name.trim()} have right now?
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acc-balance">Amount ({currency})</Label>
                <Input
                  id="acc-balance"
                  inputMode="decimal"
                  autoFocus
                  value={amount}
                  onChange={(e) => {
                    setErr(null);
                    setAmount(e.target.value);
                  }}
                  placeholder="0.00"
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChoiceCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-colors',
        active ? 'border-primary bg-primary/10' : 'hover:bg-accent',
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
