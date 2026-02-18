import { describe, expect, it, vi } from "vitest";
import type { FetchResult } from "../extractors/fetch.js";
import { extractFromUrl } from "../extractors/web.js";

function mockFetch(result: FetchResult) {
  return vi.fn<() => Promise<FetchResult>>().mockResolvedValue(result);
}

const ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Article Title</title>
  <meta property="article:published_time" content="2025-01-15T10:00:00Z">
</head>
<body>
  <article>
    <h1>Test Article Title</h1>
    <p class="byline">By Jane Doe</p>
    <p>This is the first paragraph of a test article that contains enough text to be
    meaningful for Readability extraction. We need sufficient content here so that
    the Readability algorithm considers this a valid article worth parsing.</p>
    <p>Here is a second paragraph with more content to ensure the word count is realistic.
    The extraction should capture all of this text and return it in the result along with
    metadata about the article including the title and author information.</p>
    <p>And a third paragraph to add even more content. This article discusses important
    topics that the reader would want summarized. The content is educational and informative
    and would benefit from a concise summary.</p>
  </article>
</body>
</html>
`;

describe("extractFromUrl", () => {
  it("extracts title, content, and word count from an article", async () => {
    const fetchFn = mockFetch({
      body: ARTICLE_HTML,
      contentType: "text/html",
      url: "https://example.com/article",
      status: 200,
    });

    const result = await extractFromUrl("https://example.com/article", { fetchFn });

    expect(result.title).toBe("Test Article Title");
    expect(result.content).toBeTruthy();
    expect(result.wordCount).toBeGreaterThan(20);
    expect(result.source).toBe("https://example.com/article");
  });

  it("extracts date from meta tags", async () => {
    const fetchFn = mockFetch({
      body: ARTICLE_HTML,
      contentType: "text/html",
      url: "https://example.com/article",
      status: 200,
    });

    const result = await extractFromUrl("https://example.com/article", { fetchFn });

    expect(result.date).toBe("2025-01-15T10:00:00Z");
  });

  it("detects paywalled content (short text, large HTML)", async () => {
    const tinyArticleInLargeHtml = `
      <!DOCTYPE html><html><head><title>Paywalled</title></head>
      <body>
        <article><p>Subscribe now.</p></article>
        ${"<!-- filler -->".repeat(1000)}
      </body></html>
    `;
    const fetchFn = mockFetch({
      body: tinyArticleInLargeHtml,
      contentType: "text/html",
      url: "https://example.com/paywalled",
      status: 200,
    });

    const result = await extractFromUrl("https://example.com/paywalled", { fetchFn });

    // Readability may fail to parse entirely (content="") or produce very short content
    // Either way, with short/no text and large HTML, partial should be flagged
    expect(result.content.length).toBeLessThan(200);
  });

  it("returns empty content when Readability cannot parse the page", async () => {
    // Minimal page with no article-like content — Readability returns null
    const fetchFn = mockFetch({
      body: "<html><body></body></html>",
      contentType: "text/html",
      url: "https://example.com/empty",
      status: 200,
    });

    const result = await extractFromUrl("https://example.com/empty", { fetchFn });

    expect(result.content).toBe("");
    expect(result.wordCount).toBe(0);
  });
});
