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

/**
 * Shell-like tokenizer: splits on whitespace, respects single/double quotes
 * and backslash escapes. Only tokenizes if the raw input contains a URL or
 * file-path-like pattern — plain text is returned as a single token.
 */
export function tokenizeInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const hasUrl = /https?:\/\//i.test(trimmed);
  const hasPath = FILE_PATH_PATTERN.test(trimmed) || /['"][\\/~.]/.test(trimmed);
  if (!hasUrl && !hasPath) return [trimmed];

  const tokens: string[] = [];
  let current = "";
  let state: "normal" | "single" | "double" = "normal";

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i] ?? "";
    const next = trimmed[i + 1];
    const isEscape = ch === "\\" && next !== undefined && !/[a-zA-Z0-9]/.test(next);

    if (state === "single") {
      if (ch === "'") {
        state = "normal";
      } else {
        current += ch;
      }
    } else if (state === "double") {
      if (ch === '"') {
        state = "normal";
      } else if (isEscape) {
        current += next;
        i++;
      } else {
        current += ch;
      }
    } else if (ch === "'") {
      state = "single";
    } else if (ch === '"') {
      state = "double";
    } else if (isEscape) {
      current += next;
      i++;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens.length > 0 ? tokens : [trimmed];
}

export function looksLikeFilePath(input: string): boolean {
  const normalized = normalizeDraggedPath(input);
  if (!FILE_PATH_PATTERN.test(normalized)) return false;
  // Bare "/" is the slash-command trigger, not a file path
  if (normalized === "/") return false;
  // For bare /word inputs, require a second slash or file extension
  // to distinguish from slash commands like /help or /history
  if (/^\/[^/]+$/.test(normalized)) {
    return /\.\w+$/.test(normalized);
  }
  return true;
}
