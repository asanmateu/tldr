import type { ExtractionResult } from "../lib/types.js";

export class JinaError extends Error {
  constructor(
    message: string,
    public readonly code: "NETWORK" | "EMPTY_CONTENT" | "RATE_LIMITED",
  ) {
    super(message);
    this.name = "JinaError";
  }
}

export interface JinaOptions {
  fetchFn?: typeof globalThis.fetch;
}

const JINA_TIMEOUT = 30_000;

export async function extractViaJina(
  url: string,
  options: JinaOptions = {},
): Promise<ExtractionResult> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  const jinaUrl = `https://r.jina.ai/${url}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JINA_TIMEOUT);

  let response: Response;
  try {
    response = await fetchFn(jinaUrl, {
      headers: { Accept: "text/markdown" },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    throw new JinaError(
      `Jina Reader network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "NETWORK",
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    throw new JinaError("Jina Reader rate limited. Try again in a moment.", "RATE_LIMITED");
  }

  if (!response.ok) {
    throw new JinaError(`Jina Reader returned ${response.status}`, "NETWORK");
  }

  const markdown = await response.text();
  const trimmed = markdown.trim();

  if (!trimmed) {
    throw new JinaError(
      "Jina Reader returned empty content — the page may require authentication.",
      "EMPTY_CONTENT",
    );
  }

  // Parse title from first markdown heading
  const headingMatch = trimmed.match(/^#\s+(.+)$/m);
  const title = headingMatch?.[1]?.trim() || undefined;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  return {
    title,
    content: trimmed,
    wordCount,
    source: url,
  };
}
