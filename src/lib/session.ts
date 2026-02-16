import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtractionResult, SessionPaths } from "./types.js";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function parseTitleFromSummary(markdown: string): string | undefined {
  const match = /^# +(.+)$/m.exec(markdown);
  if (match?.[1]) {
    const title = match[1].trim();
    if (title.length > 0 && title.length < 100) return title;
  }
  return undefined;
}

export function buildSessionName(extraction: ExtractionResult, summary?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const modelTitle = summary ? parseTitleFromSummary(summary) : undefined;
  const label = modelTitle ?? extraction.title ?? extraction.source;
  const slug = slugify(label);
  return `${date}-${slug || "summary"}`;
}

export function getSessionPaths(
  outputDir: string,
  extraction: ExtractionResult,
  summary?: string,
): SessionPaths {
  const sessionDir = join(outputDir, buildSessionName(extraction, summary));
  return {
    sessionDir,
    summaryPath: join(sessionDir, "summary.md"),
    audioPath: join(sessionDir, "audio.mp3"),
  };
}

async function dedupDir(dir: string): Promise<string> {
  let candidate = dir;
  let suffix = 2;
  while (true) {
    try {
      await stat(candidate);
      candidate = `${dir}-${suffix}`;
      suffix++;
    } catch {
      return candidate;
    }
  }
}

export async function saveSummary(paths: SessionPaths, markdown: string): Promise<SessionPaths> {
  const sessionDir = await dedupDir(paths.sessionDir);
  const resolved: SessionPaths = {
    sessionDir,
    summaryPath: join(sessionDir, "summary.md"),
    audioPath: join(sessionDir, "audio.mp3"),
  };
  await mkdir(resolved.sessionDir, { recursive: true });
  await writeFile(resolved.summaryPath, markdown, "utf-8");
  return resolved;
}
