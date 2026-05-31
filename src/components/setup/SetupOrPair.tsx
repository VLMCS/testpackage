import { useState, type FormEvent } from 'react';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Loader2, ShieldCheck, Wallet } from 'lucide-react';

type Mode = 'new' | 'pair';

export function SetupOrPair() {
  const { setupWorkspace, pairDevice } = useSession();
  const [mode, setMode] = useState<Mode>('new');
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const pass = passphrase.trim();
    if (pass.length < 8) {
      setErr('Use a passphrase of at least 8 characters.');
      return;
    }
    if (mode === 'new' && pass !== confirm.trim()) {
      setErr('The two passphrases do not match.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'new') await setupWorkspace(pass);
      else await pairDevice(pass);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong.');
    } finally {
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
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Clerune Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Connect this device to your shared budget.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <ModeTab active={mode === 'new'} onClick={() => setMode('new')}>
              Set up
            </ModeTab>
            <ModeTab active={mode === 'pair'} onClick={() => setMode('pair')}>
              Pair device
            </ModeTab>
          </div>
          <CardTitle className="pt-4 text-base">
            {mode === 'new' ? 'Create your budget' : 'Pair this device'}
          </CardTitle>
          <CardDescription>
            {mode === 'new'
              ? 'First device? Choose a shared passphrase. Use the same one on every device you and your partner sign in from.'
              : 'Enter the same passphrase you used on your first device to join the existing budget.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">Shared passphrase</Label>
              <div className="relative">
                <Input
                  id="passphrase"
                  type={show ? 'text' : 'password'}
                  autoComplete="off"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="e.g. blue-tiger-coffee-42"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'new' && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm passphrase</Label>
                <Input
                  id="confirm"
                  type={show ? 'text' : 'password'}
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                />
              </div>
            )}

            {err && <p className="text-sm text-destructive">{err}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                </>
              ) : mode === 'new' ? (
                'Create budget'
              ) : (
                'Pair device'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Your passphrase never leaves your device in plain form — it only unlocks access to your
          data. There's no way to recover it if forgotten, so keep it somewhere safe.
        </p>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md py-2 text-sm font-medium transition-colors',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}
