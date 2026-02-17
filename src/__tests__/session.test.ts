import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSessionName,
  getSessionPaths,
  parseTitleFromSummary,
  saveAudioFile,
  saveSummary,
  slugify,
} from "../lib/session.js";
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

describe("parseTitleFromSummary", () => {
  it("extracts title from top-level heading", () => {
    expect(parseTitleFromSummary("# How LLMs Work\n\n## TL;DR\nSome text")).toBe("How LLMs Work");
  });

  it("returns undefined when no heading exists", () => {
    expect(parseTitleFromSummary("## TL;DR\nJust a summary")).toBeUndefined();
  });

  it("returns undefined for empty title", () => {
    expect(parseTitleFromSummary("# \n\nSome text")).toBeUndefined();
  });

  it("returns undefined for very long titles", () => {
    const longTitle = `# ${"a".repeat(150)}`;
    expect(parseTitleFromSummary(longTitle)).toBeUndefined();
  });

  it("trims whitespace from title", () => {
    expect(parseTitleFromSummary("#   Spaced Title   \n\n## TL;DR")).toBe("Spaced Title");
  });

  it("picks the first h1 not an h2", () => {
    expect(parseTitleFromSummary("## TL;DR\nText\n# Real Title\nMore")).toBe("Real Title");
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

  it("prefers model-generated title from summary over extraction title", () => {
    const extraction: ExtractionResult = {
      title: "Some Page Title",
      content: "...",
      wordCount: 100,
      source: "https://example.com",
    };
    const summary = "# How AI Changes Everything\n\n## TL;DR\nContent here";
    const name = buildSessionName(extraction, summary);
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-how-ai-changes-everything$/);
  });

  it("falls back to extraction title when summary has no h1", () => {
    const extraction: ExtractionResult = {
      title: "Page Title",
      content: "...",
      wordCount: 100,
      source: "https://example.com",
    };
    const summary = "## TL;DR\nNo top-level heading here";
    const name = buildSessionName(extraction, summary);
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-page-title$/);
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

describe("saveAudioFile", () => {
  it("copies audio file to session audioPath", async () => {
    const sessionDir = join(tempDir, "2026-01-01-test");
    const paths = {
      sessionDir,
      summaryPath: join(sessionDir, "summary.md"),
      audioPath: join(sessionDir, "audio.mp3"),
    };

    // Create the session directory first (as saveSummary would)
    const saved = await saveSummary(paths, "# Test");

    // Create a fake source audio file
    const sourceAudio = join(tempDir, "temp-audio.mp3");
    await writeFile(sourceAudio, "fake-audio-data");

    await saveAudioFile(saved, sourceAudio);

    const content = await readFile(saved.audioPath, "utf-8");
    expect(content).toBe("fake-audio-data");
  });

  it("works with deduped paths (audio lands in same dir as summary)", async () => {
    const sessionDir = join(tempDir, "2026-01-01-test");
    const paths = {
      sessionDir,
      summaryPath: join(sessionDir, "summary.md"),
      audioPath: join(sessionDir, "audio.mp3"),
    };

    // Create two sessions to trigger dedup
    await saveSummary(paths, "first");
    const second = await saveSummary(paths, "second");

    expect(second.sessionDir).toBe(`${sessionDir}-2`);

    // Create fake audio and save to the deduped session
    const sourceAudio = join(tempDir, "temp-audio.mp3");
    await writeFile(sourceAudio, "audio-for-second");

    await saveAudioFile(second, sourceAudio);

    const audioContent = await readFile(second.audioPath, "utf-8");
    expect(audioContent).toBe("audio-for-second");

    // Verify audio is in the same dir as the summary
    const summaryContent = await readFile(second.summaryPath, "utf-8");
    expect(summaryContent).toBe("second");
  });
});
