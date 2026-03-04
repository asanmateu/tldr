import { describe, expect, it } from "vitest";
import { formatInline, formatMarkdown } from "../lib/markdownFormatter.js";

describe("formatInline", () => {
  it("returns plain text unchanged", () => {
    expect(formatInline("hello world")).toBe("hello world");
  });

  it("wraps single bold segment with ANSI bold", () => {
    const result = formatInline("this is **bold** text");
    expect(result).toContain("\x1b[1m");
    expect(result).toContain("bold");
    expect(result).not.toContain("**");
  });

  it("wraps multiple bold segments", () => {
    const result = formatInline("**first** and **second**");
    expect(result).not.toContain("**");
    expect(result).toContain("first");
    expect(result).toContain("second");
    // Two bold open sequences
    expect(result.split("\x1b[1m").length - 1).toBe(2);
  });

  it("handles empty string", () => {
    expect(formatInline("")).toBe("");
  });
});

describe("formatMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(formatMarkdown("")).toBe("");
  });

  it("formats h1 with brand styling", () => {
    const result = formatMarkdown("# Main Title");
    expect(result).toContain("Main Title");
    expect(result).toContain("\x1b[1m"); // bold
  });

  it("formats h2 with bold + accent", () => {
    const result = formatMarkdown("## Section");
    expect(result).toContain("Section");
    expect(result).toContain("\x1b[1m"); // bold
  });

  it("adds blank line before h1 (except first)", () => {
    const result = formatMarkdown("# First\nSome text\n# Second");
    const lines = result.split("\n");
    // Find the line before "Second"
    const secondIdx = lines.findIndex((l) => l.includes("Second"));
    expect(secondIdx).toBeGreaterThan(0);
    expect(lines[secondIdx - 1]).toBe("");
  });

  it("always adds blank line before h2", () => {
    const result = formatMarkdown("Some text\n## Section");
    const lines = result.split("\n");
    const sectionIdx = lines.findIndex((l) => l.includes("Section"));
    expect(sectionIdx).toBeGreaterThan(0);
    expect(lines[sectionIdx - 1]).toBe("");
  });

  it("formats bullets with accent-colored marker", () => {
    const result = formatMarkdown("- item one\n- item two");
    expect(result).toContain("●");
    expect(result).toContain("item one");
    expect(result).toContain("item two");
  });

  it("formats checked checkbox with green marker", () => {
    const result = formatMarkdown("- [x] done task");
    expect(result).toContain("☑");
    expect(result).toContain("done task");
  });

  it("formats unchecked checkbox with dim marker", () => {
    const result = formatMarkdown("- [ ] pending task");
    expect(result).toContain("☐");
    expect(result).toContain("pending task");
  });

  it("formats numbered list with accent-colored number", () => {
    const result = formatMarkdown("1. first\n2. second");
    expect(result).toContain("first");
    expect(result).toContain("second");
  });

  it("formats table with separator and column alignment", () => {
    const md = "| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |";
    const result = formatMarkdown(md);
    expect(result).toContain("─");
    expect(result).toContain("Name");
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
  });

  it("renders blank lines", () => {
    const result = formatMarkdown("line 1\n\nline 2");
    const lines = result.split("\n");
    expect(lines).toContain("");
  });

  it("formats paragraphs with inline styling", () => {
    const result = formatMarkdown("This has **bold** in it");
    expect(result).not.toContain("**");
    expect(result).toContain("bold");
  });

  it("renders a full summary without errors or raw markers", () => {
    const summary = [
      "# Article Title",
      "",
      "## Key Points",
      "",
      "- **Point one**: details here",
      "- **Point two**: more details",
      "",
      "## Checklist",
      "",
      "- [x] Completed item",
      "- [ ] Pending item",
      "",
      "## Data",
      "",
      "| Metric | Value |",
      "|--------|-------|",
      "| Users  | 1000  |",
      "| Growth | 25%   |",
      "",
      "1. First step",
      "2. Second step",
    ].join("\n");

    const result = formatMarkdown(summary);
    expect(result).not.toContain("**");
    expect(result).toContain("●");
    expect(result).toContain("─");
    expect(result).toContain("☑");
    expect(result).toContain("☐");
    expect(result).toContain("Article Title");
    expect(result).toContain("Key Points");
  });
});
