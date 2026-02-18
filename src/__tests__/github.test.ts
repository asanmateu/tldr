import { describe, expect, it, vi } from "vitest";
import { extractFromGitHub } from "../extractors/github.js";

describe("extractFromGitHub", () => {
  it("rewrites blob URL to raw.githubusercontent.com", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      body: "# Architecture\n\nThis is the content.",
      contentType: "text/plain",
      url: "https://raw.githubusercontent.com/owner/repo/main/ARCHITECTURE.md",
      status: 200,
    });

    const result = await extractFromGitHub(
      "https://github.com/owner/repo/blob/main/ARCHITECTURE.md",
      { fetchFn },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/owner/repo/main/ARCHITECTURE.md",
    );
    expect(result.title).toBe("ARCHITECTURE.md — owner/repo");
    expect(result.content).toBe("# Architecture\n\nThis is the content.");
    expect(result.wordCount).toBe(6);
    expect(result.source).toBe("https://github.com/owner/repo/blob/main/ARCHITECTURE.md");
  });

  it("handles nested file paths in blob URLs", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      body: "nested content",
      contentType: "text/plain",
      url: "https://raw.githubusercontent.com/org/project/v2/src/lib/utils.ts",
      status: 200,
    });

    const result = await extractFromGitHub(
      "https://github.com/org/project/blob/v2/src/lib/utils.ts",
      { fetchFn },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/org/project/v2/src/lib/utils.ts",
    );
    expect(result.title).toBe("utils.ts — org/project");
  });

  it("delegates non-blob GitHub URLs to web extractor", async () => {
    const fetchFn = vi.fn();

    // Non-blob URLs fall through to extractFromUrl (web.ts), which uses its own safeFetch.
    // The injected fetchFn should NOT be called — it's only used for blob URL rewriting.
    const result = await extractFromGitHub("https://github.com/owner/repo", { fetchFn });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.source).toBe("https://github.com/owner/repo");
  });

  it("handles www.github.com blob URLs", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      body: "www content",
      contentType: "text/plain",
      url: "https://raw.githubusercontent.com/owner/repo/main/file.md",
      status: 200,
    });

    const result = await extractFromGitHub("https://www.github.com/owner/repo/blob/main/file.md", {
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/owner/repo/main/file.md",
    );
    expect(result.title).toBe("file.md — owner/repo");
    expect(result.content).toBe("www content");
  });

  it("falls back to web extractor on 404 status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      body: "404: Not Found",
      contentType: "text/plain",
      url: "https://raw.githubusercontent.com/owner/repo/main/SECRET.md",
      status: 404,
    });

    const result = await extractFromGitHub("https://github.com/owner/repo/blob/main/SECRET.md", {
      fetchFn,
    });

    // Should fall back to web extractor (source preserved, fetchFn was called for raw attempt)
    expect(fetchFn).toHaveBeenCalled();
    expect(result.source).toBe("https://github.com/owner/repo/blob/main/SECRET.md");
    expect(result.content).not.toBe("404: Not Found");
  });

  it("falls back to web extractor when raw URL returns HTML", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      body: "<html><body>Sign in to GitHub</body></html>",
      contentType: "text/html; charset=utf-8",
      url: "https://raw.githubusercontent.com/owner/repo/main/PRIVATE.md",
      status: 200,
    });

    const result = await extractFromGitHub("https://github.com/owner/repo/blob/main/PRIVATE.md", {
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result.source).toBe("https://github.com/owner/repo/blob/main/PRIVATE.md");
    expect(result.content).not.toBe("<html><body>Sign in to GitHub</body></html>");
  });

  it("falls back to web extractor when fetch throws", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await extractFromGitHub("https://github.com/owner/repo/blob/main/BROKEN.md", {
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result.source).toBe("https://github.com/owner/repo/blob/main/BROKEN.md");
  });
});
