import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TldrResult } from "../lib/types.js";

let tempDir: string;

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => tempDir,
  };
});

const { addEntry, deduplicateBySource, getRecent } = await import("../lib/history.js");

function makeEntry(i: number): TldrResult {
  return {
    extraction: {
      content: `Content ${i}`,
      wordCount: 100,
      source: `https://example.com/${i}`,
    },
    summary: `Summary ${i}`,
    timestamp: Date.now() + i,
  };
}

describe("history", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tldr-hist-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty array when no history exists", async () => {
    const entries = await getRecent(10);
    expect(entries).toEqual([]);
  });

  it("adds and retrieves entries", async () => {
    const entry = makeEntry(1);
    await addEntry(entry);

    const entries = await getRecent(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.summary).toBe("Summary 1");
  });

  it("prepends new entries (newest first)", async () => {
    await addEntry(makeEntry(1));
    await addEntry(makeEntry(2));

    const entries = await getRecent(10);
    expect(entries[0]?.summary).toBe("Summary 2");
    expect(entries[1]?.summary).toBe("Summary 1");
  });

  it("caps at 100 entries", async () => {
    for (let i = 0; i < 105; i++) {
      await addEntry(makeEntry(i));
    }

    const entries = await getRecent(200);
    expect(entries).toHaveLength(100);
  });

  it("respects the n parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await addEntry(makeEntry(i));
    }

    const entries = await getRecent(3);
    expect(entries).toHaveLength(3);
  });
});

describe("deduplicateBySource", () => {
  it("returns empty array for empty input", () => {
    expect(deduplicateBySource([])).toEqual([]);
  });

  it("returns all entries when no duplicates", () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    expect(deduplicateBySource(entries)).toHaveLength(3);
  });

  it("keeps first occurrence and removes duplicates", () => {
    const a = makeEntry(1); // source: https://example.com/1
    const b = makeEntry(2); // source: https://example.com/2
    const aDup: TldrResult = {
      extraction: { content: "Dup", wordCount: 50, source: "https://example.com/1" },
      summary: "Dup summary",
      timestamp: Date.now() + 10,
    };
    const result = deduplicateBySource([a, b, aDup]);
    expect(result).toHaveLength(2);
    expect(result[0]?.summary).toBe("Summary 1");
    expect(result[1]?.summary).toBe("Summary 2");
  });
});
