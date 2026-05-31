import { isFirebaseConfigured } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, AlertCircle, Check } from 'lucide-react';

function ConfigChecklist() {
  const configured = isFirebaseConfigured();
  return (
    <div className="space-y-3">
      <ChecklistItem done label="Phase 1 scaffold deployed" />
      <ChecklistItem done={configured} label="Firebase config pasted into src/lib/firebase.ts" />
      <ChecklistItem done={false} label="Phase 2 — workspace, pairing, accounts (next)" />
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className={
          done
            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
            : 'h-5 w-5 rounded-full border border-muted-foreground/40'
        }
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </div>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

export default function App() {
  const configured = isFirebaseConfigured();

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/30 p-4 sm:p-8">
      <div className="mx-auto max-w-md space-y-6 pt-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Jan & Aki — Budget Tracker</h1>
          <p className="text-sm text-muted-foreground">Household budget, synced across phones and web.</p>
        </div>

        {!configured && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <CardTitle className="text-base">Firebase config required</CardTitle>
                  <CardDescription className="mt-1">
                    Paste your Firebase config into <code className="text-xs">src/lib/firebase.ts</code> to continue.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfigChecklist />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          v0.1.0 · Phase 1 scaffold
        </p>
      </div>
    </div>
  );
}
