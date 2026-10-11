// Color helpers for the custom accent-color setting: parse/format hex, and
// derive the translucent + darker shades that keep buttons, sliders, selected
// states and highlights readable while following the chosen accent.

export type AccentTheme = 'dark' | 'light';

/** The built-in accent for each theme, shown as the "current" color until the
 *  user customizes it. Keep in sync with `--accent` in index.css. */
export const DEFAULT_ACCENT: Record<AccentTheme, string> = {
  dark: '#4f8cff',
  light: '#2f6fed',
};

/** Alpha of `--accent-soft` for each theme (matches index.css). */
const SOFT_ALPHA: Record<AccentTheme, number> = {
  dark: 0.18,
  light: 0.12,
};

/** How much darker `--black-key-active` is than the accent (matches index.css). */
const ACTIVE_DARKEN = 0.18;

/** The CSS custom properties that follow the accent color. */
const ACCENT_VARS = [
  '--accent',
  '--accent-soft',
  '--white-key-active',
  '--black-key-active',
  '--fret-active',
] as const;

/** Normalize a hex color to lowercase `#rrggbb`, or null when invalid. Accepts
 *  `#rgb` shorthand and an optional leading `#`. */
export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toLowerCase()}`;
}

/** Type guard for a valid hex color string. */
export function isValidHex(v: unknown): v is string {
  return typeof v === 'string' && normalizeHex(v) !== null;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse a hex color into 0..255 channels, or null when invalid. */
export function hexToRgb(hex: string): Rgb | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const v = parseInt(n.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

/** Format 0..255 channels as a lowercase `#rrggbb` string (channels clamped). */
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Darken a hex color by a 0..1 factor (0 = unchanged, 1 = black). */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(rgb.r * f, rgb.g * f, rgb.b * f);
}

/** A translucent `rgba()` version of a hex color. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Apply (or clear) the accent override on the document root. Passing null (or
 *  an invalid color) restores the theme's built-in accent. */
export function applyAccent(color: string | null, theme: AccentTheme): void {
  const el = document.documentElement;
  const hex = color ? normalizeHex(color) : null;
  if (!hex) {
    for (const name of ACCENT_VARS) el.style.removeProperty(name);
    return;
  }
  const alpha = SOFT_ALPHA[theme];
  el.style.setProperty('--accent', hex);
  el.style.setProperty('--accent-soft', withAlpha(hex, alpha));
  el.style.setProperty('--white-key-active', hex);
  el.style.setProperty('--black-key-active', shade(hex, ACTIVE_DARKEN));
  el.style.setProperty('--fret-active', hex);
}
