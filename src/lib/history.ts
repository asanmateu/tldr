import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureConfigDir, getConfigDir } from "./config.js";
import type { TldrResult } from "./types.js";

const MAX_ENTRIES = 100;

function getHistoryPath(): string {
  return join(getConfigDir(), "history.json");
}

function stripBase64(result: TldrResult): TldrResult {
  if (!result.extraction.image) return result;
  return {
    ...result,
    extraction: {
      ...result.extraction,
      image: { ...result.extraction.image, base64: "" },
    },
  };
}

export async function addEntry(result: TldrResult): Promise<void> {
  const entries = await getRecent(MAX_ENTRIES);
  entries.unshift(stripBase64(result));

  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  await ensureConfigDir();
  await writeFile(getHistoryPath(), JSON.stringify(entries, null, 2), "utf-8");
}

export async function getRecent(n: number): Promise<TldrResult[]> {
  try {
    const raw = await readFile(getHistoryPath(), "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, n) as TldrResult[];
  } catch {
    return [];
  }
}
