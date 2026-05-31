import { SessionProvider, useSession } from '@/hooks/useSession';
import { DataProvider } from '@/hooks/useData';
import { SetupOrPair } from '@/components/setup/SetupOrPair';
import { AccountGate } from '@/components/account/AccountGate';
import { MainApp } from '@/components/app/MainApp';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
      }}
    >
      {children}
    </div>
  );
}

function Router() {
  const { status, error } = useSession();

  if (status === 'initializing') {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecting…</p>
      </Centered>
    );
  }

  if (status === 'error') {
    return (
      <Centered>
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-start gap-3 text-left">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle className="text-base">Something went wrong</CardTitle>
                <CardDescription className="mt-1">{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </Centered>
    );
  }

  if (status === 'needs-workspace') return <SetupOrPair />;
  if (status === 'needs-account') return <AccountGate />;
  return <ReadyApp />;
}

function ReadyApp() {
  const { workspaceId } = useSession();
  if (!workspaceId) return null;
  return (
    <DataProvider workspaceId={workspaceId}>
      <MainApp />
    </DataProvider>
  );
}

export default function App() {
  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-full">
        <Centered>
          <Card className="border-amber-500/50">
            <CardHeader>
              <div className="flex items-start gap-3 text-left">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <CardTitle className="text-base">Firebase config required</CardTitle>
                  <CardDescription className="mt-1">
                    Paste your Firebase config into <code className="text-xs">src/lib/firebase.ts</code>.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Centered>
      </div>
    );
  }

  return (
    <SessionProvider>
      <div className="min-h-full">
        <Router />
      </div>
    </SessionProvider>
  );
}
