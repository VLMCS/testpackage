import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCents } from '@/lib/money';
import { Lock, RefreshCw } from 'lucide-react';

export function AppShell() {
  const { activeAccount, baseCurrency, lock } = useSession();
  if (!activeAccount) return null;

  return (
    <div className="mx-auto max-w-md space-y-5 p-4">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white"
            style={{ backgroundColor: activeAccount.color }}
          >
            {activeAccount.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="font-semibold leading-tight">{activeAccount.name}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={lock}>
          <RefreshCw className="h-4 w-4" /> Switch
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {activeAccount.name}'s opening balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight">
            {formatCents(activeAccount.startingBalanceCents ?? 0, baseCurrency)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="space-y-2 py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">You're all set up. 🎉</p>
          <p>
            Phase 3 adds income &amp; expense entry, categories, and the transactions list. Phases
            4–6 bring recurring bills, the calendar view, and analytics.
          </p>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={lock}
        className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Lock className="h-3 w-3" /> Lock
      </button>
    </div>
  );
}
