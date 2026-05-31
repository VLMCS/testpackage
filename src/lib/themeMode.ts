import { STORAGE_KEYS } from './constants';

export type ThemeMode = 'light' | 'dark' | 'system';

export function getStoredTheme(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEYS.theme);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function storeTheme(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEYS.theme, mode);
}

export function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveDark(mode: ThemeMode): boolean {
  return mode === 'system' ? prefersDark() : mode === 'dark';
}

/** Toggle the `dark` class on <html> so the CSS variables switch palettes. */
export function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', resolveDark(mode));
}
