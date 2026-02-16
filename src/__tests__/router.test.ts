import { describe, expect, it } from "vitest";
import { classify } from "../extractors/router.js";

describe("classify", () => {
  describe("URLs", () => {
    it("classifies plain HTTP URLs", () => {
      expect(classify("https://example.com/article")).toEqual({
        type: "url",
        value: "https://example.com/article",
      });
    });

    it("classifies HTTP (non-HTTPS) URLs", () => {
      expect(classify("http://example.com/page")).toEqual({
        type: "url",
        value: "http://example.com/page",
      });
    });

    it("classifies URLs with query params and fragments", () => {
      expect(classify("https://example.com/article?id=1&lang=en#section")).toEqual({
        type: "url",
        value: "https://example.com/article?id=1&lang=en#section",
      });
    });

    it("is case-insensitive for scheme", () => {
      expect(classify("HTTPS://Example.COM/Article")).toEqual({
        type: "url",
        value: "HTTPS://Example.COM/Article",
      });
    });
  });

  describe("PDF URLs", () => {
    it("classifies URLs ending in .pdf", () => {
      expect(classify("https://example.com/paper.pdf")).toEqual({
        type: "url:pdf",
        value: "https://example.com/paper.pdf",
      });
    });

    it("classifies PDF URLs with query params", () => {
      expect(classify("https://example.com/doc.pdf?dl=1")).toEqual({
        type: "url:pdf",
        value: "https://example.com/doc.pdf?dl=1",
      });
    });

    it("classifies arxiv PDF URLs as url:pdf", () => {
      expect(classify("https://arxiv.org/pdf/2401.12345.pdf")).toEqual({
        type: "url:pdf",
        value: "https://arxiv.org/pdf/2401.12345.pdf",
      });
    });
  });

  describe("platform URLs", () => {
    it("classifies Slack URLs", () => {
      expect(classify("https://myteam.slack.com/archives/C01234")).toEqual({
        type: "url:slack",
        value: "https://myteam.slack.com/archives/C01234",
      });
    });

    it("classifies YouTube URLs", () => {
      expect(classify("https://www.youtube.com/watch?v=abc123")).toEqual({
        type: "url:youtube",
        value: "https://www.youtube.com/watch?v=abc123",
      });
    });

    it("classifies youtu.be short URLs", () => {
      expect(classify("https://youtu.be/abc123")).toEqual({
        type: "url:youtube",
        value: "https://youtu.be/abc123",
      });
    });

    it("classifies Notion URLs", () => {
      expect(classify("https://www.notion.so/My-Page-abc123")).toEqual({
        type: "url:notion",
        value: "https://www.notion.so/My-Page-abc123",
      });
    });

    it("classifies arxiv abstract URLs", () => {
      expect(classify("https://arxiv.org/abs/2401.12345")).toEqual({
        type: "url:arxiv",
        value: "https://arxiv.org/abs/2401.12345",
      });
    });
  });

  describe("image URLs", () => {
    it("classifies URLs ending in .png", () => {
      expect(classify("https://example.com/chart.png")).toEqual({
        type: "url:image",
        value: "https://example.com/chart.png",
      });
    });

    it("classifies URLs ending in .jpg", () => {
      expect(classify("https://example.com/photo.jpg")).toEqual({
        type: "url:image",
        value: "https://example.com/photo.jpg",
      });
    });

    it("classifies URLs ending in .jpeg", () => {
      expect(classify("https://example.com/photo.jpeg")).toEqual({
        type: "url:image",
        value: "https://example.com/photo.jpeg",
      });
    });

    it("classifies URLs ending in .gif", () => {
      expect(classify("https://example.com/anim.gif")).toEqual({
        type: "url:image",
        value: "https://example.com/anim.gif",
      });
    });

    it("classifies URLs ending in .webp", () => {
      expect(classify("https://example.com/image.webp")).toEqual({
        type: "url:image",
        value: "https://example.com/image.webp",
      });
    });

    it("classifies image URLs with query params", () => {
      expect(classify("https://example.com/photo.png?w=800")).toEqual({
        type: "url:image",
        value: "https://example.com/photo.png?w=800",
      });
    });

    it("is case-insensitive for image extensions", () => {
      expect(classify("https://example.com/PHOTO.JPG")).toEqual({
        type: "url:image",
        value: "https://example.com/PHOTO.JPG",
      });
    });
  });

  describe("file paths", () => {
    it("classifies absolute paths", () => {
      expect(classify("/home/user/doc.txt")).toEqual({
        type: "file",
        value: "/home/user/doc.txt",
      });
    });

    it("classifies home-relative paths", () => {
      expect(classify("~/Documents/notes.md")).toEqual({
        type: "file",
        value: "~/Documents/notes.md",
      });
    });

    it("classifies relative paths", () => {
      expect(classify("./readme.md")).toEqual({
        type: "file",
        value: "./readme.md",
      });
    });

    it("classifies parent-relative paths", () => {
      expect(classify("../other/file.txt")).toEqual({
        type: "file",
        value: "../other/file.txt",
      });
    });

    it("classifies local PDF files", () => {
      expect(classify("/home/user/paper.pdf")).toEqual({
        type: "file:pdf",
        value: "/home/user/paper.pdf",
      });
    });

    it("classifies relative PDF paths", () => {
      expect(classify("./docs/report.pdf")).toEqual({
        type: "file:pdf",
        value: "./docs/report.pdf",
      });
    });

    it("classifies local PNG files", () => {
      expect(classify("./screenshot.png")).toEqual({
        type: "file:image",
        value: "./screenshot.png",
      });
    });

    it("classifies local JPG files", () => {
      expect(classify("/home/user/photo.jpg")).toEqual({
        type: "file:image",
        value: "/home/user/photo.jpg",
      });
    });

    it("classifies local WebP files", () => {
      expect(classify("~/images/photo.webp")).toEqual({
        type: "file:image",
        value: "~/images/photo.webp",
      });
    });

    it("classifies local GIF files", () => {
      expect(classify("../animations/demo.gif")).toEqual({
        type: "file:image",
        value: "../animations/demo.gif",
      });
    });
  });

  describe("raw text", () => {
    it("classifies plain text", () => {
      expect(classify("This is just some text to summarize")).toEqual({
        type: "text",
        value: "This is just some text to summarize",
      });
    });

    it("classifies empty string as text", () => {
      expect(classify("")).toEqual({ type: "text", value: "" });
    });

    it("classifies whitespace-only as text", () => {
      expect(classify("   ")).toEqual({ type: "text", value: "" });
    });

    it("classifies text that starts with a word (not a path)", () => {
      expect(classify("some random notes about a topic")).toEqual({
        type: "text",
        value: "some random notes about a topic",
      });
    });
  });

  describe("drag-and-drop paths", () => {
    it("classifies single-quoted absolute paths (iTerm2)", () => {
      expect(classify("'/Users/foo/my file.png'")).toEqual({
        type: "file:image",
        value: "/Users/foo/my file.png",
      });
    });

    it("classifies double-quoted absolute paths", () => {
      expect(classify('"/Users/foo/my file.pdf"')).toEqual({
        type: "file:pdf",
        value: "/Users/foo/my file.pdf",
      });
    });

    it("classifies backslash-escaped spaces (Terminal.app)", () => {
      expect(classify("/Users/foo/my\\ file.png")).toEqual({
        type: "file:image",
        value: "/Users/foo/my file.png",
      });
    });

    it("classifies backslash-escaped parentheses", () => {
      expect(classify("/Users/foo/file\\ \\(1\\).pdf")).toEqual({
        type: "file:pdf",
        value: "/Users/foo/file (1).pdf",
      });
    });

    it("classifies quoted home-relative paths", () => {
      expect(classify("'~/Documents/notes.md'")).toEqual({
        type: "file",
        value: "~/Documents/notes.md",
      });
    });

    it("classifies quoted relative paths", () => {
      expect(classify("'./readme.md'")).toEqual({
        type: "file",
        value: "./readme.md",
      });
    });

    it("handles trailing whitespace and newlines", () => {
      expect(classify("'/tmp/file.txt'\n")).toEqual({
        type: "file",
        value: "/tmp/file.txt",
      });
    });

    it("does not misclassify quoted regular text as a file", () => {
      expect(classify("'hello world'")).toEqual({
        type: "text",
        value: "'hello world'",
      });
    });

    it("does not misclassify double-quoted regular text as a file", () => {
      expect(classify('"some random text"')).toEqual({
        type: "text",
        value: '"some random text"',
      });
    });
  });

  describe("edge cases", () => {
    it("trims whitespace around URLs", () => {
      expect(classify("  https://example.com  ")).toEqual({
        type: "url",
        value: "https://example.com",
      });
    });

    it("trims whitespace around file paths", () => {
      expect(classify("  /tmp/file.txt  ")).toEqual({
        type: "file",
        value: "/tmp/file.txt",
      });
    });

    it("handles Unicode in URLs", () => {
      expect(classify("https://example.com/ñoño")).toEqual({
        type: "url",
        value: "https://example.com/ñoño",
      });
    });

    it("does not classify ftp:// as a URL", () => {
      expect(classify("ftp://example.com/file")).toEqual({
        type: "text",
        value: "ftp://example.com/file",
      });
    });
  });
});
