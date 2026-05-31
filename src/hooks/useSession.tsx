import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirebase, isFirebaseConfigured } from '@/lib/firebase';
import { deriveWorkspaceId, hashSecret, verifySecret } from '@/lib/crypto';
import {
  createWorkspace,
  fetchWorkspace,
  joinWorkspace,
  subscribeAccounts,
  subscribeWorkspace,
  setAccountPinAndBalance,
} from '@/lib/workspace';
import { STORAGE_KEYS, DEFAULT_CURRENCY } from '@/lib/constants';
import { applyAccent } from '@/lib/theme';
import type { Account, AccountId } from '@/types';

type Status = 'initializing' | 'needs-workspace' | 'needs-account' | 'ready' | 'error';

interface SessionContextValue {
  status: Status;
  error: string | null;
  uid: string | null;
  workspaceId: string | null;
  baseCurrency: string;
  accounts: Account[];
  activeAccount: Account | null;
  lastAccountId: AccountId | null;
  setupWorkspace: (passphrase: string) => Promise<void>;
  pairDevice: (passphrase: string) => Promise<void>;
  unlockWithPin: (accountId: AccountId, pin: string) => Promise<boolean>;
  setupPinAndBalance: (accountId: AccountId, pin: string, startingBalanceCents: number) => Promise<void>;
  activateAccount: (accountId: AccountId) => void;
  lock: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceCurrency, setWorkspaceCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<AccountId | null>(null);
  const lastAccountIdRef = useRef<AccountId | null>(
    ((): AccountId | null => {
      const v = localStorage.getItem(STORAGE_KEYS.lastAccount);
      return v && v.length > 0 ? v : null;
    })(),
  );

  // 1) Anonymous sign-in on mount.
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setStatus('error');
      setError('Firebase is not configured.');
      return;
    }
    const { auth } = getFirebase();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });
    signInAnonymously(auth).catch((e) => {
      setStatus('error');
      setError(authErrorMessage(e));
    });
    return unsub;
  }, []);

  // 2) Resolve the workspace from localStorage once we have an identity.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const stored = localStorage.getItem(STORAGE_KEYS.workspaceId);
      if (!stored) {
        setStatus('needs-workspace');
        return;
      }
      try {
        const ws = await fetchWorkspace(stored);
        if (cancelled) return;
        if (ws && ws.allowedUids.includes(uid)) {
          setWorkspaceId(stored);
        } else {
          // Either the workspace is gone, or this device's anonymous identity was
          // cleared and is no longer paired. Re-pair from scratch.
          localStorage.removeItem(STORAGE_KEYS.workspaceId);
          setStatus('needs-workspace');
          if (ws) setError('This device was signed out. Pair it again with your passphrase.');
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(genericMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // 3) Subscribe to workspace + accounts; drop to the account gate (locked).
  useEffect(() => {
    if (!workspaceId) return;
    const unsubWs = subscribeWorkspace(workspaceId, (ws) => {
      if (ws) setWorkspaceCurrency(ws.baseCurrency || DEFAULT_CURRENCY);
    });
    const unsubAcc = subscribeAccounts(workspaceId, (accs) => {
      const sorted = [...accs].sort((a, b) => a.createdAt - b.createdAt);
      setAccounts(sorted);
      // Restore an unlocked session across a refresh. sessionStorage survives a
      // reload but is cleared on full app/tab close, so a cold start re-locks.
      const storedId = sessionStorage.getItem(STORAGE_KEYS.activeSession);
      const restorable = storedId ? sorted.find((a) => a.id === storedId && a.pinHash) : undefined;
      setActiveAccountId((cur) => cur ?? (restorable ? restorable.id : null));
      setStatus((s) => (s === 'ready' || restorable ? 'ready' : 'needs-account'));
    });
    return () => {
      unsubWs();
      unsubAcc();
    };
  }, [workspaceId]);

  // Re-tint the app with the active profile's accent color (cleared when locked).
  useEffect(() => {
    const acc = accounts.find((a) => a.id === activeAccountId);
    applyAccent(acc?.color ?? null);
  }, [accounts, activeAccountId]);

  async function setupWorkspace(passphrase: string): Promise<void> {
    if (!uid) throw new Error('Still connecting — wait a moment and try again.');
    const wid = await deriveWorkspaceId(passphrase);
    const existing = await fetchWorkspace(wid);
    if (existing) {
      if (!existing.allowedUids.includes(uid)) await joinWorkspace(wid, uid);
    } else {
      await createWorkspace(wid, uid);
    }
    localStorage.setItem(STORAGE_KEYS.workspaceId, wid);
    setError(null);
    setWorkspaceId(wid);
  }

  async function pairDevice(passphrase: string): Promise<void> {
    if (!uid) throw new Error('Still connecting — wait a moment and try again.');
    const wid = await deriveWorkspaceId(passphrase);
    const existing = await fetchWorkspace(wid);
    if (!existing) {
      throw new Error(
        'No budget found with that passphrase. Double-check it, or choose "Set up" if this is your first device.',
      );
    }
    if (!existing.allowedUids.includes(uid)) await joinWorkspace(wid, uid);
    localStorage.setItem(STORAGE_KEYS.workspaceId, wid);
    setError(null);
    setWorkspaceId(wid);
  }

  async function unlockWithPin(accountId: AccountId, pin: string): Promise<boolean> {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc || !acc.pinHash || !acc.pinSalt) return false;
    const ok = await verifySecret(pin, acc.pinHash, acc.pinSalt);
    if (ok) {
      setActiveAccountId(accountId);
      lastAccountIdRef.current = accountId;
      localStorage.setItem(STORAGE_KEYS.lastAccount, accountId);
      sessionStorage.setItem(STORAGE_KEYS.activeSession, accountId);
      setStatus('ready');
    }
    return ok;
  }

  async function setupPinAndBalance(
    accountId: AccountId,
    pin: string,
    startingBalanceCents: number,
  ): Promise<void> {
    if (!workspaceId) throw new Error('No workspace is loaded.');
    const { hash, salt } = await hashSecret(pin);
    // Offline-first: the Firestore write syncs on reconnect; don't block unlock.
    void setAccountPinAndBalance(workspaceId, accountId, hash, salt, startingBalanceCents).catch(
      (e) => console.error('PIN setup will sync on reconnect:', e),
    );
    setActiveAccountId(accountId);
    lastAccountIdRef.current = accountId;
    localStorage.setItem(STORAGE_KEYS.lastAccount, accountId);
    sessionStorage.setItem(STORAGE_KEYS.activeSession, accountId);
    setStatus('ready');
  }

  // Activate a just-created account (PIN already set during creation).
  function activateAccount(accountId: AccountId): void {
    setActiveAccountId(accountId);
    lastAccountIdRef.current = accountId;
    localStorage.setItem(STORAGE_KEYS.lastAccount, accountId);
    sessionStorage.setItem(STORAGE_KEYS.activeSession, accountId);
    setStatus('ready');
  }

  function lock(): void {
    sessionStorage.removeItem(STORAGE_KEYS.activeSession);
    setActiveAccountId(null);
    setStatus('needs-account');
  }

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;
  const baseCurrency = activeAccount?.baseCurrency ?? workspaceCurrency;

  const value: SessionContextValue = {
    status,
    error,
    uid,
    workspaceId,
    baseCurrency,
    accounts,
    activeAccount,
    lastAccountId: lastAccountIdRef.current,
    setupWorkspace,
    pairDevice,
    unlockWithPin,
    setupPinAndBalance,
    activateAccount,
    lock,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/operation-not-allowed') {
    return 'Anonymous sign-in is not enabled. In the Firebase console, go to Authentication → Sign-in method → enable Anonymous.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Could not reach Firebase. Check your internet connection.';
  }
  return genericMessage(e);
}

function genericMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
