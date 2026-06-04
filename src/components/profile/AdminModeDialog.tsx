import { useEffect, useState, type FormEvent } from 'react';
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
import { useSession } from '@/hooks/useSession';
import { fetchWorkspace, setAdminPassword, deleteAccount } from '@/lib/workspace';
import { hashSecret, verifySecret } from '@/lib/crypto';
import { gradientFromHex } from '@/lib/theme';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';

type Phase = 'loading' | 'setup' | 'verify' | 'manage';

export function AdminModeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspaceId, accounts, activeAccount } = useSession();

  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Decide setup-vs-verify each time the dialog opens, and always re-lock so the
  // password is required again on the next open.
  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;
    setPhase('loading');
    setPassword('');
    setConfirm('');
    setErr(null);
    setBusy(false);
    setConfirmingId(null);
    (async () => {
      try {
        const ws = await fetchWorkspace(workspaceId);
        if (cancelled) return;
        setPhase(ws?.adminHash && ws.adminSalt ? 'verify' : 'setup');
      } catch {
        if (!cancelled) setPhase('setup');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  if (!workspaceId) return null;
  const wsId = workspaceId;

  async function submitSetup(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 4) {
      setErr('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { hash, salt } = await hashSecret(password);
      await setAdminPassword(wsId, hash, salt);
      setPassword('');
      setConfirm('');
      setPhase('manage');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not save the password.');
    } finally {
      setBusy(false);
    }
  }

  async function submitVerify(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const ws = await fetchWorkspace(wsId);
      if (!ws?.adminHash || !ws.adminSalt) {
        setPhase('setup');
        return;
      }
      const ok = await verifySecret(password, ws.adminHash, ws.adminSalt);
      if (ok) {
        setPassword('');
        setPhase('manage');
      } else {
        setErr('Incorrect password.');
        setPassword('');
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(accountId: string) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteAccount(wsId, accountId);
      setConfirmingId(null);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not delete the profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Admin mode
          </DialogTitle>
          <DialogDescription>
            {phase === 'setup'
              ? 'Set an admin password. You will need it to manage profiles from now on.'
              : phase === 'verify'
                ? 'Enter your admin password to manage profiles.'
                : phase === 'manage'
                  ? 'Delete a profile and all of its data. This cannot be undone.'
                  : 'Checking admin status…'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'loading' && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {phase === 'setup' && (
          <form onSubmit={submitSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-pw">New password</Label>
              <Input
                id="admin-pw"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setErr(null);
                  setPassword(e.target.value);
                }}
                placeholder="At least 4 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pw-confirm">Confirm password</Label>
              <Input
                id="admin-pw-confirm"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setErr(null);
                  setConfirm(e.target.value);
                }}
                placeholder="Re-enter password"
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set password & continue'}
            </Button>
          </form>
        )}

        {phase === 'verify' && (
          <form onSubmit={submitVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-pw-verify">Admin password</Label>
              <Input
                id="admin-pw-verify"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setErr(null);
                  setPassword(e.target.value);
                }}
                placeholder="Enter password"
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
            </Button>
          </form>
        )}

        {phase === 'manage' && (
          <div className="space-y-3">
            <ul className="space-y-2">
              {accounts.map((acc) => {
                const isActive = acc.id === activeAccount?.id;
                const isLast = accounts.length <= 1;
                const confirming = confirmingId === acc.id;
                return (
                  <li
                    key={acc.id}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white"
                      style={{ backgroundImage: gradientFromHex(acc.color) }}
                    >
                      {acc.avatar ? (
                        <img src={acc.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        acc.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{acc.name}</p>
                      {isActive && (
                        <p className="text-xs text-muted-foreground">In use — can't delete</p>
                      )}
                    </div>
                    {confirming ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(null)}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(acc.id)}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${acc.name}`}
                        onClick={() => setConfirmingId(acc.id)}
                        disabled={isActive || isLast || busy}
                        className="text-destructive hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <p className="px-1 text-xs text-muted-foreground">
              Deleting a profile also removes its transactions, categories, and recurring bills.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
