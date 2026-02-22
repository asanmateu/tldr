export const FILE_PATH_PATTERN = /^(\/|~\/|\.\/|\.\.\/)/;

export function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return path.replace("~", process.env.HOME ?? "");
  }
  return path;
}

export function normalizeDraggedPath(input: string): string {
  let s = input.trim();

  // Strip matching surrounding quotes (single or double)
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1);
  }

  // Unescape backslash-escaped non-alphanumeric characters
  s = s.replace(/\\([^a-zA-Z0-9])/g, "$1");

  return s;
}

export function looksLikeFilePath(input: string): boolean {
  const normalized = normalizeDraggedPath(input);
  if (!FILE_PATH_PATTERN.test(normalized)) return false;
  // For bare /word inputs, require a second slash or file extension
  // to distinguish from slash commands like /help or /history
  if (/^\/[^/]+$/.test(normalized)) {
    return /\.\w+$/.test(normalized);
  }
  return true;
}
