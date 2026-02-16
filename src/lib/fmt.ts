import type { ThemePalette } from "./types.js";

let palette: ThemePalette | undefined;

export function initTheme(p: ThemePalette): void {
  palette = p;
}

// Convert hex (#rrggbb) to ANSI 24-bit escape
function hex(color: string, s: string): string {
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m`;
}

export const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
export const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
export const cyan = (s: string) => (palette ? hex(palette.accent, s) : `\x1b[36m${s}\x1b[39m`);
export const green = (s: string) => (palette ? hex(palette.success, s) : `\x1b[32m${s}\x1b[39m`);
export const yellow = (s: string) => (palette ? hex(palette.warning, s) : `\x1b[33m${s}\x1b[39m`);
export const red = (s: string) => (palette ? hex(palette.error, s) : `\x1b[31m${s}\x1b[39m`);
export const reset = "\x1b[0m";

// Composites
export const brand = (s: string) => bold(palette ? hex(palette.accent, s) : cyan(s));
export const label = (s: string) => bold(s);
export const success = (s: string) => green(s);
export const warn = (s: string) => yellow(s);
export const error = (s: string) => red(s);
