import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSessionName, getSessionPaths, saveSummary, slugify } from "../lib/session.js";
import type { ExtractionResult } from "../lib/types.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "tldr-session-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("slugify", () => {
  it("lowercases and strips non-alphanumeric", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("caps length at 60", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });

  it("strips leading/trailing dashes", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("buildSessionName", () => {
  it("uses title when available", () => {
    const extraction: ExtractionResult = {
      title: "How LLMs Work",
      content: "...",
      wordCount: 100,
      source: "https://example.com",
    };
    const name = buildSessionName(extraction);
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-how-llms-work$/);
  });

  it("falls back to source when no title", () => {
    const extraction: ExtractionResult = {
      content: "...",
      wordCount: 100,
      source: "https://example.com/article",
    };
    const name = buildSessionName(extraction);
    expect(name).toContain("example-com");
  });
});

describe("getSessionPaths", () => {
  it("returns paths under outputDir", () => {
    const extraction: ExtractionResult = {
      title: "Test",
      content: "...",
      wordCount: 10,
      source: "test",
    };
    const paths = getSessionPaths("/out", extraction);
    expect(paths.sessionDir).toMatch(/^\/out\//);
    expect(paths.summaryPath).toContain("summary.md");
    expect(paths.audioPath).toContain("audio.mp3");
  });
});

describe("saveSummary", () => {
  it("creates session directory and writes summary.md", async () => {
    const sessionDir = join(tempDir, "2026-01-01-test");
    const paths = {
      sessionDir,
      summaryPath: join(sessionDir, "summary.md"),
      audioPath: join(sessionDir, "audio.mp3"),
    };

    const saved = await saveSummary(paths, "# Hello\nWorld");

    const content = await readFile(saved.summaryPath, "utf-8");
    expect(content).toBe("# Hello\nWorld");

    const stats = await stat(saved.sessionDir);
    expect(stats.isDirectory()).toBe(true);
  });

  it("deduplicates when directory already exists", async () => {
    const sessionDir = join(tempDir, "2026-01-01-test");

    const paths = {
      sessionDir,
      summaryPath: join(sessionDir, "summary.md"),
      audioPath: join(sessionDir, "audio.mp3"),
    };

    const first = await saveSummary(paths, "first");
    const second = await saveSummary(paths, "second");

    expect(first.sessionDir).toBe(sessionDir);
    expect(second.sessionDir).toBe(`${sessionDir}-2`);

    const content1 = await readFile(first.summaryPath, "utf-8");
    expect(content1).toBe("first");

    const content2 = await readFile(second.summaryPath, "utf-8");
    expect(content2).toBe("second");
  });
});
