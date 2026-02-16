import type { ExtractionResult } from "../lib/types.js";
import { type FetchResult, safeFetch as defaultSafeFetch } from "./fetch.js";

interface ExtractOptions {
  fetchFn?: (url: string) => Promise<FetchResult>;
}

export async function extractFromUrl(
  url: string,
  options: ExtractOptions = {},
): Promise<ExtractionResult> {
  const fetchFn = options.fetchFn ?? defaultSafeFetch;
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
    return {
      content: "",
      wordCount: 0,
      source: result.url,
    };
  }

  const textContent = article.textContent ?? "";
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const isPartial = textContent.length < 200 && result.body.length > 5000;

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
