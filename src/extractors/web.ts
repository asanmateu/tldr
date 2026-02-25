import type { ExtractionResult } from "../lib/types.js";
import { type FetchResult, safeFetch as defaultSafeFetch } from "./fetch.js";

export class WebExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: "EMPTY_CONTENT",
  ) {
    super(message);
    this.name = "WebExtractionError";
  }
}

interface ExtractOptions {
  fetchFn?: (url: string) => Promise<FetchResult>;
  fallbackToJina?: boolean | undefined;
  jinaExtractFn?: (url: string) => Promise<ExtractionResult>;
}

export async function extractFromUrl(
  url: string,
  options: ExtractOptions = {},
): Promise<ExtractionResult> {
  const fetchFn = options.fetchFn ?? defaultSafeFetch;
  const fallbackToJina = options.fallbackToJina ?? true;
  const result = await fetchFn(url);

  if (result.contentType.includes("application/pdf") || /\.pdf(\?.*)?$/i.test(result.url)) {
    const { extractFromPdf } = await import("./pdf.js");
    return extractFromPdf(url);
  }

  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");

  const dom = new JSDOM(result.body, { url: result.url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    if (fallbackToJina) {
      const jinaExtract = options.jinaExtractFn ?? (await import("./jina.js")).extractViaJina;
      return jinaExtract(url);
    }
    throw new WebExtractionError(
      "Could not extract content — the page may require JavaScript. Try pasting the text directly.",
      "EMPTY_CONTENT",
    );
  }

  const textContent = article.textContent ?? "";
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const isPartial = textContent.length < 200 && result.body.length > 5000;

  if (isPartial && fallbackToJina) {
    try {
      const jinaExtract = options.jinaExtractFn ?? (await import("./jina.js")).extractViaJina;
      return await jinaExtract(url);
    } catch {
      // Jina failed on partial content — fall back to what Readability gave us
    }
  }

  const dateElement = dom.window.document.querySelector(
    'meta[property="article:published_time"], meta[name="date"], meta[name="DC.date"], time[datetime]',
  );
  const date =
    dateElement?.getAttribute("content") ?? dateElement?.getAttribute("datetime") ?? undefined;

  return {
    title: article.title || undefined,
    author: article.byline || undefined,
    date,
    content: textContent,
    wordCount,
    source: result.url,
    partial: isPartial || undefined,
  };
}
