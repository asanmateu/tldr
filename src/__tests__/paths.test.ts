import { describe, expect, it } from "vitest";
import {
  expandHome,
  looksLikeFilePath,
  normalizeDraggedPath,
  tokenizeInput,
} from "../lib/paths.js";

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

  it("rejects bare slash (slash-command trigger)", () => {
    expect(looksLikeFilePath("/")).toBe(false);
  });

  it("rejects slash commands like /help", () => {
    expect(looksLikeFilePath("/help")).toBe(false);
  });

  it("accepts bare /word with file extension", () => {
    expect(looksLikeFilePath("/file.txt")).toBe(true);
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

describe("tokenizeInput", () => {
  it("returns single URL as-is", () => {
    expect(tokenizeInput("https://example.com")).toEqual(["https://example.com"]);
  });

  it("splits two space-separated URLs", () => {
    expect(tokenizeInput("https://a.com https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("handles single-quoted path with spaces", () => {
    expect(tokenizeInput("'/Users/foo/my file.pdf'")).toEqual(["/Users/foo/my file.pdf"]);
  });

  it("handles multiple quoted paths", () => {
    expect(tokenizeInput("'/path/a.pdf' '/path/b.pdf'")).toEqual(["/path/a.pdf", "/path/b.pdf"]);
  });

  it("handles backslash-escaped path", () => {
    expect(tokenizeInput("/path/my\\ file.pdf")).toEqual(["/path/my file.pdf"]);
  });

  it("handles mixed URLs and paths", () => {
    expect(tokenizeInput("https://a.com /path/file.pdf")).toEqual([
      "https://a.com",
      "/path/file.pdf",
    ]);
  });

  it("does not split plain text", () => {
    expect(tokenizeInput("some random text")).toEqual(["some random text"]);
  });

  it("returns empty array for empty input", () => {
    expect(tokenizeInput("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(tokenizeInput("   ")).toEqual([]);
  });

  it("handles double-quoted paths", () => {
    expect(tokenizeInput('"/path/my file.pdf" "/path/other.pdf"')).toEqual([
      "/path/my file.pdf",
      "/path/other.pdf",
    ]);
  });

  it("splits newline-separated URLs", () => {
    expect(tokenizeInput("https://a.com\nhttps://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
});
