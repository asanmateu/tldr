import { describe, expect, it, vi } from "vitest";
import { extractFromGitHub } from "../extractors/github.js";

describe("extractFromGitHub", () => {
  it("rewrites blob URL to raw.githubusercontent.com", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      body: "# Architecture\n\nThis is the content.",
      contentType: "text/plain",
      url: "https://raw.githubusercontent.com/owner/repo/main/ARCHITECTURE.md",
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
});
