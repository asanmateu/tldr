import { describe, expect, it, vi } from "vitest";
import { extractViaJina } from "../extractors/jina.js";

function mockFetch(body: string, init?: ResponseInit) {
  return vi.fn().mockResolvedValue(new Response(body, init));
}

describe("extractViaJina", () => {
  it("extracts content from Jina Reader markdown", async () => {
    const markdown = "# Test Article\n\nThis is the article body with several words.";
    const fetchFn = mockFetch(markdown, { status: 200 });

    const result = await extractViaJina("https://example.com/article", { fetchFn });

    expect(result.title).toBe("Test Article");
    expect(result.content).toContain("This is the article body");
    expect(result.wordCount).toBeGreaterThan(5);
    expect(result.source).toBe("https://example.com/article");
  });

  it("calls Jina Reader URL with Accept: text/markdown", async () => {
    const fetchFn = mockFetch("# Title\n\nContent", { status: 200 });

    await extractViaJina("https://example.com/page", { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, options] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://r.jina.ai/https://example.com/page");
    expect((options.headers as Record<string, string>).Accept).toBe("text/markdown");
  });

  it("throws EMPTY_CONTENT when response is empty", async () => {
    const fetchFn = mockFetch("", { status: 200 });

    await expect(extractViaJina("https://example.com/empty", { fetchFn })).rejects.toMatchObject({
      name: "JinaError",
      code: "EMPTY_CONTENT",
    });
  });

  it("throws EMPTY_CONTENT when response is whitespace only", async () => {
    const fetchFn = mockFetch("   \n\n  ", { status: 200 });

    await expect(
      extractViaJina("https://example.com/whitespace", { fetchFn }),
    ).rejects.toMatchObject({ code: "EMPTY_CONTENT" });
  });

  it("throws RATE_LIMITED on 429", async () => {
    const fetchFn = mockFetch("Too Many Requests", { status: 429 });

    await expect(extractViaJina("https://example.com/limited", { fetchFn })).rejects.toMatchObject({
      name: "JinaError",
      code: "RATE_LIMITED",
    });
  });

  it("throws NETWORK on non-200 non-429 responses", async () => {
    const fetchFn = mockFetch("Internal Server Error", { status: 500 });

    await expect(extractViaJina("https://example.com/error", { fetchFn })).rejects.toMatchObject({
      name: "JinaError",
      code: "NETWORK",
      message: expect.stringContaining("500"),
    });
  });

  it("throws NETWORK on fetch failure", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(extractViaJina("https://example.com/down", { fetchFn })).rejects.toMatchObject({
      name: "JinaError",
      code: "NETWORK",
    });
  });

  it("returns undefined title when no heading present", async () => {
    const fetchFn = mockFetch("Just plain text without a heading.", { status: 200 });

    const result = await extractViaJina("https://example.com/no-heading", { fetchFn });

    expect(result.title).toBeUndefined();
    expect(result.content).toContain("Just plain text");
  });

  it("extracts title from first # heading only", async () => {
    const markdown = "Some intro text\n\n# The Real Title\n\n## Subtitle\n\nBody text.";
    const fetchFn = mockFetch(markdown, { status: 200 });

    const result = await extractViaJina("https://example.com/multi-heading", { fetchFn });

    expect(result.title).toBe("The Real Title");
  });
});
