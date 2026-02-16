import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { getProvider } from "./providers/index.js";
import type { Config, ExtractionResult, ImageData, TldrResult } from "./types.js";

type SummarizerErrorCode = "AUTH" | "RATE_LIMIT" | "NETWORK" | "NOT_FOUND" | "TIMEOUT" | "UNKNOWN";

const VALID_ERROR_CODES = new Set<string>([
  "AUTH",
  "RATE_LIMIT",
  "NETWORK",
  "NOT_FOUND",
  "TIMEOUT",
  "UNKNOWN",
]);

export class SummarizerError extends Error {
  constructor(
    message: string,
    public readonly code: SummarizerErrorCode,
  ) {
    super(message);
    this.name = "SummarizerError";
  }
}

function toSummarizerError(error: unknown): SummarizerError {
  if (error instanceof SummarizerError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error instanceof Error && "code" in error && VALID_ERROR_CODES.has(String(error.code))
      ? (String(error.code) as SummarizerErrorCode)
      : "UNKNOWN";
  return new SummarizerError(message, code);
}

async function callProvider(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  image?: ImageData,
): Promise<string> {
  try {
    const provider = await getProvider(config.provider);
    return await provider.summarize(config, systemPrompt, userPrompt, onChunk, image);
  } catch (error) {
    throw toSummarizerError(error);
  }
}

export async function summarize(
  extraction: ExtractionResult,
  config: Config,
  onChunk: (text: string) => void,
): Promise<TldrResult> {
  const isImage = !!extraction.image;

  const userPrompt = buildUserPrompt(
    extraction.content,
    {
      title: extraction.title,
      author: extraction.author,
      source: extraction.source,
    },
    { isImage },
  );

  const systemPrompt = buildSystemPrompt(config);

  const summary = await callProvider(config, systemPrompt, userPrompt, onChunk, extraction.image);

  return {
    extraction,
    summary,
    timestamp: Date.now(),
  };
}

export async function rewriteForSpeech(markdown: string, config: Config): Promise<string> {
  const toneHint =
    config.tone === "eli5"
      ? "Keep it super simple and fun, like explaining to a curious kid."
      : config.tone === "academic"
        ? "Stay precise and analytical, but still conversational."
        : config.tone === "professional"
          ? "Be clear and polished, like a well-produced briefing."
          : "Be relaxed and friendly, like chatting with a smart friend.";

  const systemPrompt = `You are a podcast host rewriting a text summary into a short, engaging audio script.

Rules:
- Write as if hosting a brief podcast segment: conversational, energetic, with personality.
- Use natural transitions ("Here's the interesting part...", "Now, what really stands out is...").
- Open with a hook that grabs attention.
- Close with a memorable takeaway.
- Keep the same information density — don't drop facts, but make them compelling to hear.
- Explain concepts through analogies and concrete examples. Make the listener feel like they're learning, not just listening.
- No markdown formatting — output plain spoken text only.
- No stage directions or sound effects.
- ${toneHint}`;

  try {
    const provider = await getProvider(config.provider);
    return await provider.rewrite(markdown, config, systemPrompt);
  } catch (error) {
    throw toSummarizerError(error);
  }
}
