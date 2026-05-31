// Applies a profile's accent color to the app by overriding the shadcn CSS
// variables. The accent is exposed both as a solid (--primary, for text/rings)
// and as a subtle two-stop gradient (--primary-from / --primary-to) used by the
// .bg-accent-gradient utility so buttons/cards gradiate instead of being flat.

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function applyAccent(hex: string | null | undefined): void {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--primary-from');
    root.style.removeProperty('--primary-to');
    root.style.removeProperty('--ring');
    return;
  }
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const solid = hslStr(hsl);
  root.style.setProperty('--primary', solid);
  root.style.setProperty('--ring', solid);
  root.style.setProperty('--primary-from', hslStr(shift(hsl, 18, 12)));
  root.style.setProperty('--primary-to', hslStr(shift(hsl, -10, -4)));
  root.style.setProperty('--primary-foreground', hsl.l > 62 ? '222.2 47.4% 11.2%' : '210 40% 98%');
}

/** A subtle diagonal gradient derived from a single hex color (for chips/avatars). */
export function gradientFromHex(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return `linear-gradient(135deg, hsl(${hslStr(shift(hsl, 18, 12))}), hsl(${hslStr(shift(hsl, -10, -4))}))`;
}

/** True if text on this background should be dark. */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.62;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function shift(hsl: Hsl, dh: number, dl: number): Hsl {
  return { h: (hsl.h + dh + 360) % 360, s: hsl.s, l: clamp(hsl.l + dl, 4, 96) };
}

function hslStr(hsl: Hsl): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function hexToHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
