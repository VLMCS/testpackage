import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useTheme } from '@/hooks/useTheme';
import { updateBaseCurrency } from '@/lib/workspace';
import { CURRENCIES } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/themeMode';
import { ArrowLeft, Loader2, Monitor, Moon, Sun } from 'lucide-react';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { baseCurrency, workspaceId } = useSession();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  if (!workspaceId) return null;
  const wsId = workspaceId;

  async function changeCurrency(code: string) {
    if (code === baseCurrency) return;
    setSaving(true);
    try {
      await updateBaseCurrency(wsId, code);
    } finally {
      setSaving(false);
    }
  }

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Base currency</Label>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <select
              id="currency"
              value={baseCurrency}
              onChange={(e) => changeCurrency(e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {saving && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>
        <p className="px-1 text-xs text-muted-foreground">
          Shared across both profiles. Amounts are shown with this symbol; existing values aren't
          converted.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Appearance</Label>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors',
                theme === value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        More settings will live here as the app grows.
      </p>
    </div>
  );
}
