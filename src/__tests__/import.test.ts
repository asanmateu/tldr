import { mkdtemp, readFile, rm } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as history from "../lib/history.js";

const { importMarkdown } = await import("../lib/import.js");

const addEntrySpy = vi.spyOn(history, "addEntry").mockResolvedValue(undefined);

let tempDir: string;
let outputDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "tldr-import-test-"));
  outputDir = join(tempDir, "output");
  addEntrySpy.mockClear();
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("importMarkdown", () => {
  it("imports a markdown file with a heading as title", async () => {
    const mdPath = join(tempDir, "notes.md");
    await writeFile(mdPath, "# My Notes\n\nSome content here.", "utf-8");

    const result = await importMarkdown(mdPath, { outputDir });

    expect(result.tldrResult.extraction.title).toBe("My Notes");
    expect(result.tldrResult.summary).toBe("# My Notes\n\nSome content here.");
    expect(result.tldrResult.extraction.source).toBe(mdPath);
    expect(result.tldrResult.extraction.wordCount).toBe(6);
    expect(result.tldrResult.timestamp).toBeGreaterThan(0);

    const saved = await readFile(result.sessionPaths.summaryPath, "utf-8");
    expect(saved).toBe("# My Notes\n\nSome content here.");
  });

  it("uses filename as title when no heading exists", async () => {
    const mdPath = join(tempDir, "quick-notes.md");
    await writeFile(mdPath, "Just some plain text without headings.", "utf-8");

    const result = await importMarkdown(mdPath, { outputDir });

    expect(result.tldrResult.extraction.title).toBe("quick-notes");
  });

  it("creates session directory under outputDir", async () => {
    const mdPath = join(tempDir, "test.md");
    await writeFile(mdPath, "# Test\n\nContent.", "utf-8");

    const result = await importMarkdown(mdPath, { outputDir });

    expect(result.sessionPaths.sessionDir).toContain(outputDir);
    expect(result.sessionPaths.summaryPath).toContain("summary.md");
    expect(result.sessionPaths.audioPath).toContain("audio.mp3");
  });

  it("calls addEntry with the result", async () => {
    const mdPath = join(tempDir, "test.md");
    await writeFile(mdPath, "# Test\n\nContent.", "utf-8");

    await importMarkdown(mdPath, { outputDir });

    expect(addEntrySpy).toHaveBeenCalledOnce();
  });

  it("counts words correctly", async () => {
    const mdPath = join(tempDir, "words.md");
    await writeFile(mdPath, "one two three four five", "utf-8");

    const result = await importMarkdown(mdPath, { outputDir });

    expect(result.tldrResult.extraction.wordCount).toBe(5);
  });
});
