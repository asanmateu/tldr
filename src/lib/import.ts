import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { addEntry } from "./history.js";
import { getSessionPaths, saveSummary } from "./session.js";
import type { ExtractionResult, SessionPaths, TldrResult } from "./types.js";

export interface ImportOptions {
  outputDir: string;
}

export interface ImportResult {
  sessionPaths: SessionPaths;
  tldrResult: TldrResult;
}

export async function importMarkdown(
  filePath: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const content = await readFile(filePath, "utf-8");

  // Title from first # Heading or filename sans extension
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const title = headingMatch ? headingMatch[1] : basename(filePath, ".md");

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const extraction: ExtractionResult = {
    title,
    content,
    wordCount,
    source: filePath,
  };

  const tldrResult: TldrResult = {
    extraction,
    summary: content,
    timestamp: Date.now(),
  };

  const paths = getSessionPaths(options.outputDir, extraction);
  const sessionPaths = await saveSummary(paths, tldrResult.summary);
  await addEntry(tldrResult);

  return { sessionPaths, tldrResult };
}
