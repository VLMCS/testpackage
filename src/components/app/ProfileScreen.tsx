import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { ProfileEditorDialog } from '@/components/profile/ProfileEditorDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { currentBalanceCents } from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { Pencil, RefreshCw } from 'lucide-react';

export function ProfileScreen() {
  const { activeAccount, baseCurrency, workspaceId, lock } = useSession();
  const { transactions } = useData();
  const [editing, setEditing] = useState(false);

  if (!activeAccount || !workspaceId) return null;

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-semibold text-white"
            style={{ backgroundColor: activeAccount.color }}
          >
            {activeAccount.avatar ? (
              <img src={activeAccount.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              activeAccount.name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{activeAccount.name}</p>
            <p className="text-sm text-muted-foreground">
              Balance {formatCents(currentBalanceCents(activeAccount, transactions), baseCurrency)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="px-1 text-sm font-medium text-muted-foreground">Settings</p>
        <Card>
          <CardContent className="flex items-center justify-between py-4 text-sm">
            <span className="text-muted-foreground">Base currency</span>
            <span className="font-medium">{baseCurrency}</span>
          </CardContent>
        </Card>
        <p className="px-1 text-xs text-muted-foreground">
          More settings (currency change, dark mode, recurring bills) arrive in upcoming updates.
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={lock}>
        <RefreshCw className="h-4 w-4" /> Switch profile
      </Button>

      <ProfileEditorDialog
        open={editing}
        onOpenChange={setEditing}
        workspaceId={workspaceId}
        account={activeAccount}
      />
    </div>
  );
}
