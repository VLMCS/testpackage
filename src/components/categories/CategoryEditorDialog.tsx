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
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/common/ColorPicker';
import { ImageUpload } from '@/components/common/ImageUpload';
import { IconPicker } from './IconPicker';
import { getCategoryIcon } from '@/lib/icons';
import { gradientFromHex, isLightColor } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { addCategory, updateCategory, deleteCategory } from '@/lib/categories';
import type { Category, CategoryType } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

type EditableType = Exclude<CategoryType, 'recurring'>;

export function CategoryEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  editing,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: string;
  editing: Category | null;
  defaultType: EditableType;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(defaultType);
  const [color, setColor] = useState('#2563eb');
  const [icon, setIcon] = useState('Tag');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [excludeFromTop, setExcludeFromTop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setColor(editing.color);
      setIcon(editing.icon);
      setImageUrl(editing.imageUrl ?? null);
      setExcludeFromTop(editing.excludeFromTop ?? false);
    } else {
      setName('');
      setType(defaultType);
      setColor('#2563eb');
      setIcon('Tag');
      setImageUrl(null);
      setExcludeFromTop(false);
    }
    setErr(null);
  }, [open, editing, defaultType]);

  const Icon = getCategoryIcon(icon);
  const darkGlyph = isLightColor(color);
  const isRecurring = type === 'recurring';
  const showTopToggle = type !== 'income'; // only expense + recurring appear in spending

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Give the category a name.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        await updateCategory(workspaceId, editing.id, {
          name: trimmed,
          type,
          color,
          icon,
          imageUrl,
          excludeFromTop,
        });
      } else {
        await addCategory(workspaceId, {
          accountId,
          name: trimmed,
          type,
          color,
          icon,
          imageUrl,
          isDefault: false,
          sortOrder: 100,
          excludeFromTop,
        });
      }
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await deleteCategory(workspaceId, editing.id);
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete.');
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>
            Pick an icon or upload a small image (PNG/JPG, auto-resized to 128px).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            style={{ backgroundImage: gradientFromHex(color) }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className={cn('h-8 w-8', darkGlyph ? 'text-slate-900' : 'text-white')} />
            )}
          </span>
          <div className="flex-1 space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries"
            />
          </div>
        </div>

        {!isRecurring && (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['expense', 'income'] as EditableType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                  type === t ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Icon</Label>
            <div className="flex items-center gap-2">
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
                  Use icon
                </Button>
              )}
              <ImageUpload onSelect={setImageUrl} label="Upload" options={{ maxDim: 128 }} />
            </div>
          </div>
          {!imageUrl && <IconPicker value={icon} onChange={setIcon} />}
        </div>

        {showTopToggle && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-3">
              <p className="text-sm font-medium">Count toward Top Category</p>
              <p className="text-xs text-muted-foreground">
                Turn off to keep this out of the "where you spend most" ranking. It still counts in
                total spending.
              </p>
            </div>
            <Switch checked={!excludeFromTop} onCheckedChange={(v) => setExcludeFromTop(!v)} />
          </div>
        )}

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex items-center gap-2">
          {editing && !editing.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label="Delete category"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
