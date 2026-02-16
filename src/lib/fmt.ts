export const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
export const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
export const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`;
export const green = (s: string) => `\x1b[32m${s}\x1b[39m`;
export const yellow = (s: string) => `\x1b[33m${s}\x1b[39m`;
export const red = (s: string) => `\x1b[31m${s}\x1b[39m`;
export const reset = "\x1b[0m";

// Composites
export const brand = (s: string) => bold(cyan(s));
export const label = (s: string) => bold(s);
export const success = (s: string) => green(s);
export const warn = (s: string) => yellow(s);
export const error = (s: string) => red(s);
