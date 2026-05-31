import { useEffect, useState } from 'react';
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
import { ColorPicker } from '@/components/common/ColorPicker';
import { ImageUpload } from '@/components/common/ImageUpload';
import { updateAccountProfile } from '@/lib/workspace';
import { gradientFromHex } from '@/lib/theme';
import type { Account } from '@/types';
import { Loader2 } from 'lucide-react';

export function ProfileEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  account: Account;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(account.name);
    setColor(account.color);
    setAvatar(account.avatar ?? null);
    setErr(null);
  }, [open, account]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Name is required.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await updateAccountProfile(workspaceId, account.id, { name: trimmed, color, avatar });
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Personalize this profile's name, color, and avatar.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-semibold text-white"
            style={{ backgroundImage: gradientFromHex(color) }}
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase() || '?'
            )}
          </span>
          <div className="space-y-2">
            <ImageUpload
              onSelect={setAvatar}
              label="Upload avatar"
              options={{ maxDim: 256, maxBytes: 80 * 1024 }}
            />
            {avatar && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatar(null)}>
                Remove avatar
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Accent color</Label>
          <ColorPicker value={color} onChange={setColor} />
          <p className="text-xs text-muted-foreground">
            This re-tints the app while you're using this profile.
          </p>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
