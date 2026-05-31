// Applies a profile's accent color to the app by overriding the shadcn CSS
// variables (--primary / --ring). The active account's color thus re-tints
// buttons, highlights, and focus rings — reinforcing "this is my profile".

export function applyAccent(hex: string | null | undefined): void {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--ring');
    return;
  }
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const triplet = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
  root.style.setProperty('--primary', triplet);
  root.style.setProperty('--ring', triplet);
  // Pick a readable foreground based on the accent's lightness.
  root.style.setProperty('--primary-foreground', hsl.l > 62 ? '222.2 47.4% 11.2%' : '210 40% 98%');
}

/** True if text on this background should be dark (for inline-styled chips/avatars). */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // Perceived luminance (sRGB).
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.62;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
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
