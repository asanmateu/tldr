import type { ExtractionResult } from "../lib/types.js";

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export class YouTubeError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_URL" | "NO_TRANSCRIPT" | "NETWORK",
  ) {
    super(message);
    this.name = "YouTubeError";
  }
}

export interface YouTubeOptions {
  fetchTranscript?: (videoId: string) => Promise<TranscriptSegment[]>;
  fetchTitle?: (url: string) => Promise<string | undefined>;
}

const VIDEO_ID_PATTERNS = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /\/shorts\/([a-zA-Z0-9_-]{11})/,
];

export function parseVideoId(url: string): string {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  throw new YouTubeError(`Could not parse YouTube video ID from URL: ${url}`, "INVALID_URL");
}

async function defaultFetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  const { YoutubeTranscript } = await import("youtube-transcript");
  try {
    return await YoutubeTranscript.fetchTranscript(videoId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("disabled") ||
      message.includes("not available") ||
      message.includes("unavailable") ||
      message.includes("Could not")
    ) {
      throw new YouTubeError(
        "No transcript available for this video. Try a video with captions enabled, or paste a transcript directly.",
        "NO_TRANSCRIPT",
      );
    }
    throw new YouTubeError(`Failed to fetch transcript: ${message}`, "NETWORK");
  }
}

async function defaultFetchTitle(url: string): Promise<string | undefined> {
  try {
    const { safeFetch } = await import("./fetch.js");
    const result = await safeFetch(url);
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(result.body, { url: result.url });
    const titleEl = dom.window.document.querySelector("title");
    if (!titleEl?.textContent) return undefined;
    return titleEl.textContent.replace(/ - YouTube$/, "").trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function extractFromYouTube(
  url: string,
  options: YouTubeOptions = {},
): Promise<ExtractionResult> {
  const fetchTranscript = options.fetchTranscript ?? defaultFetchTranscript;
  const fetchTitle = options.fetchTitle ?? defaultFetchTitle;

  const videoId = parseVideoId(url);

  const segments = await fetchTranscript(videoId);

  if (segments.length === 0) {
    throw new YouTubeError(
      "No transcript available for this video. Try a video with captions enabled, or paste a transcript directly.",
      "NO_TRANSCRIPT",
    );
  }

  const content = segments.map((s) => s.text).join(" ");
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const title = await fetchTitle(url);

  return {
    title,
    content,
    wordCount,
    source: url,
  };
}
