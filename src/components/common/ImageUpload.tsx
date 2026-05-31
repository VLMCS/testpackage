import { useRef, useState, type ChangeEvent } from 'react';
import { processImageToDataUrl, type ProcessImageOptions } from '@/lib/image';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';

export function ImageUpload({
  onSelect,
  options,
  label = 'Upload image',
}: {
  onSelect: (dataUrl: string) => void;
  options?: ProcessImageOptions;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await processImageToDataUrl(file, options);
      onSelect(url);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handle}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {label}
      </Button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
