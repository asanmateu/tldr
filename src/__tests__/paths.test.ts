import { describe, expect, it } from "vitest";
import { expandHome, looksLikeFilePath, normalizeDraggedPath } from "../lib/paths.js";

describe("normalizeDraggedPath", () => {
  it("strips single quotes (iTerm2 style)", () => {
    expect(normalizeDraggedPath("'/Users/foo/my file.png'")).toBe("/Users/foo/my file.png");
  });

  it("strips double quotes", () => {
    expect(normalizeDraggedPath('"/Users/foo/my file.png"')).toBe("/Users/foo/my file.png");
  });

  it("unescapes backslash-escaped spaces (Terminal.app style)", () => {
    expect(normalizeDraggedPath("/Users/foo/my\\ file.png")).toBe("/Users/foo/my file.png");
  });

  it("unescapes backslash-escaped parentheses", () => {
    expect(normalizeDraggedPath("/Users/foo/file\\ \\(1\\).pdf")).toBe("/Users/foo/file (1).pdf");
  });

  it("does not unescape backslash-escaped alphanumeric chars", () => {
    expect(normalizeDraggedPath("/Users/foo/file\\n.txt")).toBe("/Users/foo/file\\n.txt");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDraggedPath("  /tmp/file.txt  ")).toBe("/tmp/file.txt");
  });

  it("trims trailing newlines", () => {
    expect(normalizeDraggedPath("/tmp/file.txt\n")).toBe("/tmp/file.txt");
  });

  it("does not strip mismatched quotes", () => {
    expect(normalizeDraggedPath("'/Users/foo/file\"")).toBe("'/Users/foo/file\"");
  });

  it("returns plain paths unchanged", () => {
    expect(normalizeDraggedPath("/Users/foo/bar.txt")).toBe("/Users/foo/bar.txt");
  });

  it("handles home-relative quoted paths", () => {
    expect(normalizeDraggedPath("'~/Documents/notes.md'")).toBe("~/Documents/notes.md");
  });

  it("handles relative quoted paths", () => {
    expect(normalizeDraggedPath("'./readme.md'")).toBe("./readme.md");
  });
});

describe("looksLikeFilePath", () => {
  it("detects absolute paths", () => {
    expect(looksLikeFilePath("/tmp/file.txt")).toBe(true);
  });

  it("detects home-relative paths", () => {
    expect(looksLikeFilePath("~/file.txt")).toBe(true);
  });

  it("detects relative paths", () => {
    expect(looksLikeFilePath("./file.txt")).toBe(true);
  });

  it("detects parent-relative paths", () => {
    expect(looksLikeFilePath("../file.txt")).toBe(true);
  });

  it("detects single-quoted absolute paths", () => {
    expect(looksLikeFilePath("'/Users/foo/my file.png'")).toBe(true);
  });

  it("detects double-quoted absolute paths", () => {
    expect(looksLikeFilePath('"/Users/foo/my file.png"')).toBe(true);
  });

  it("detects backslash-escaped paths", () => {
    expect(looksLikeFilePath("/Users/foo/my\\ file.png")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(looksLikeFilePath("hello world")).toBe(false);
  });

  it("rejects URLs", () => {
    expect(looksLikeFilePath("https://example.com")).toBe(false);
  });

  it("rejects quoted text that is not a path", () => {
    expect(looksLikeFilePath("'just some text'")).toBe(false);
  });
});

describe("expandHome", () => {
  it("expands ~ to HOME", () => {
    const result = expandHome("~/Documents/file.txt");
    expect(result).toBe(`${process.env.HOME}/Documents/file.txt`);
  });

  it("leaves absolute paths unchanged", () => {
    expect(expandHome("/tmp/file.txt")).toBe("/tmp/file.txt");
  });

  it("leaves relative paths unchanged", () => {
    expect(expandHome("./file.txt")).toBe("./file.txt");
  });
});
