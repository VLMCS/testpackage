import { useState, type FormEvent } from 'react';
import { useSession } from '@/hooks/useSession';
import type { Account, AccountId } from '@/types';
import { PinPad } from './PinPad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { parseAmountToCents } from '@/lib/money';
import { gradientFromHex } from '@/lib/theme';
import { ArrowLeft, ChevronRight, Loader2, Lock, Plus } from 'lucide-react';

export function AccountGate() {
  const { accounts, lastAccountId } = useSession();
  const [selected, setSelected] = useState<AccountId | null>(null);
  const account = accounts.find((a) => a.id === selected) ?? null;

  if (!account) {
    return (
      <AccountPicker accounts={accounts} lastAccountId={lastAccountId} onPick={setSelected} />
    );
  }
  if (!account.pinHash) {
    return <PinSetup account={account} onBack={() => setSelected(null)} />;
  }
  return <PinEntry account={account} onBack={() => setSelected(null)} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-4">
      {children}
    </div>
  );
}

function AccountPicker({
  accounts,
  lastAccountId,
  onPick,
}: {
  accounts: Account[];
  lastAccountId: AccountId | null;
  onPick: (id: AccountId) => void;
}) {
  const ordered = [...accounts].sort((a, b) => {
    if (a.id === lastAccountId) return -1;
    if (b.id === lastAccountId) return 1;
    return a.id.localeCompare(b.id);
  });

  return (
    <Shell>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Who's this?</h1>
        <p className="text-sm text-muted-foreground">Choose an account to continue.</p>
      </div>
      <div className="space-y-3">
        {ordered.map((acc) => {
          const needsSetup = !acc.pinHash;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => onPick(acc.id)}
              className="flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
            >
              <span
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-lg font-semibold text-white"
                style={{ backgroundImage: gradientFromHex(acc.color) }}
              >
                {acc.avatar ? (
                  <img src={acc.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  acc.name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="flex-1">
                <span className="block font-medium">{acc.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {needsSetup ? (
                    <>
                      <Plus className="h-3 w-3" /> Tap to set up
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> Enter PIN
                    </>
                  )}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}

function PinEntry({ account, onBack }: { account: Account; onBack: () => void }) {
  const { unlockWithPin } = useSession();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const lockedOut = attempts >= 5;

  async function tryUnlock() {
    if (pin.length < 4 || busy || lockedOut) return;
    setBusy(true);
    setErr(null);
    const ok = await unlockWithPin(account.id, pin);
    setBusy(false);
    if (!ok) {
      setAttempts((a) => a + 1);
      setErr('Incorrect PIN. Try again.');
      setPin('');
    }
  }

  return (
    <Shell>
      <BackHeader title={`${account.name}'s PIN`} onBack={onBack} />
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <PinPad
            value={pin}
            onChange={(v) => {
              setErr(null);
              setPin(v);
            }}
          />
          <div className="min-h-[1.25rem] text-sm">
            {lockedOut ? (
              <span className="text-destructive">Too many attempts. Reopen the app to retry.</span>
            ) : err ? (
              <span className="text-destructive">{err}</span>
            ) : null}
          </div>
          <Button className="w-full" onClick={tryUnlock} disabled={pin.length < 4 || busy || lockedOut}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </Button>
        </CardContent>
      </Card>
    </Shell>
  );
}

type SetupStep = 'pin' | 'confirm' | 'balance';

function PinSetup({ account, onBack }: { account: Account; onBack: () => void }) {
  const { setupPinAndBalance, baseCurrency } = useSession();
  const [step, setStep] = useState<SetupStep>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function goToConfirm() {
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
      setConfirmPin('');
      setPin('');
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
      setErr('Enter a valid amount (0 is fine if you want to start from scratch).');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await setupPinAndBalance(account.id, pin, cents);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <Shell>
      <BackHeader title={`Set up ${account.name}`} onBack={onBack} />

      {step === 'pin' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <p className="text-sm text-muted-foreground">Create a 4–6 digit PIN for {account.name}.</p>
            <PinPad
              value={pin}
              onChange={(v) => {
                setErr(null);
                setPin(v);
              }}
            />
            <div className="min-h-[1.25rem] text-sm text-destructive">{err}</div>
            <Button className="w-full" onClick={goToConfirm} disabled={pin.length < 4}>
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
                  How much money does {account.name} have right now? This is the opening balance the
                  tracker builds on.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Amount ({baseCurrency})</Label>
                <Input
                  id="balance"
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Finish setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
