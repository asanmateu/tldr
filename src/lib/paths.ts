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
  return FILE_PATH_PATTERN.test(normalizeDraggedPath(input));
}
