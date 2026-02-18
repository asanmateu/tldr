import type { ExtractionResult } from "../lib/types.js";
import { type FetchResult, safeFetch as defaultSafeFetch } from "./fetch.js";
import { extractFromUrl } from "./web.js";

const BLOB_PATTERN = /^https?:\/\/(www\.)?github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/i;

interface GitHubOptions {
  fetchFn?: (url: string) => Promise<FetchResult>;
}

export async function extractFromGitHub(
  url: string,
  options: GitHubOptions = {},
): Promise<ExtractionResult> {
  const match = url.match(BLOB_PATTERN);

  if (!match) {
    return extractFromUrl(url);
  }

  const [, , owner, repo, ref, filePath] = match as RegExpMatchArray &
    [string, string, string, string, string, string];
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
  const fetchFn = options.fetchFn ?? defaultSafeFetch;
  const result = await fetchFn(rawUrl);

  const filename = filePath.split("/").pop() ?? filePath;
  const wordCount = result.body.split(/\s+/).filter(Boolean).length;

  return {
    title: `${filename} — ${owner}/${repo}`,
    content: result.body,
    wordCount,
    source: url,
  };
}
