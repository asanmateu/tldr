import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { getProvider } from "./providers/index.js";
import type {
  CognitiveTrait,
  Config,
  ExtractionResult,
  ImageData,
  TldrResult,
  Tone,
} from "./types.js";

const TRAIT_AUDIO_RULES: Record<CognitiveTrait, string> = {
  dyslexia:
    "Use short, punchy sentences. Repeat key terms naturally for reinforcement. Pause between ideas. Avoid complex multi-clause sentences.",
  adhd: "Lead with the most surprising or actionable insight to hook attention. Keep energy high with varied pacing. Break into distinct segments with clear transitions. End each segment with a mini-takeaway.",
  autism:
    "Be direct and precise. Avoid idioms, sarcasm, and implied meanings. Explicitly state connections between topics. Clarify ambiguous meanings.",
  esl: "Use common everyday vocabulary. Briefly explain specialized terms inline. Avoid phrasal verbs and culturally-specific references. Use active voice.",
  "visual-thinker":
    "Paint word pictures with spatial language. Describe relationships as physical arrangements. Give items a memorable spatial or narrative structure.",
};

const TONE_HINTS: Record<Tone, string> = {
  eli5: "Keep it super simple and fun, like explaining to a curious kid.",
  academic: "Stay precise and analytical, but still conversational.",
  professional: "Be clear and polished, like a well-produced briefing.",
  casual: "Be relaxed and friendly, like chatting with a smart friend.",
};

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
  signal?: AbortSignal,
): Promise<string> {
  try {
    const provider = await getProvider(config.provider);
    return await provider.summarize(config, systemPrompt, userPrompt, onChunk, image, signal);
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw toSummarizerError(error);
  }
}

export async function summarize(
  extraction: ExtractionResult,
  config: Config,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
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

  const summary = await callProvider(
    config,
    systemPrompt,
    userPrompt,
    onChunk,
    extraction.image,
    signal,
  );

  return {
    extraction,
    summary,
    timestamp: Date.now(),
  };
}

export async function rewriteForSpeech(markdown: string, config: Config): Promise<string> {
  const toneHint = TONE_HINTS[config.tone];

  let traitSection = "";
  if (config.cognitiveTraits.length > 0) {
    const rules = config.cognitiveTraits
      .filter((t) => t in TRAIT_AUDIO_RULES)
      .map((t) => `- ${t}: ${TRAIT_AUDIO_RULES[t]}`)
      .join("\n");
    if (rules) {
      traitSection = `\n\nListener Accessibility:\n${rules}`;
    }
  }

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
- Use punctuation deliberately for pacing: commas for brief pauses, periods for full stops, ellipses for dramatic pauses.
- Vary sentence rhythm — mix short punchy sentences with longer flowing ones to maintain engagement.
- Write out numbers and abbreviations in full (e.g. "three" not "3", "for example" not "e.g.").
- ${toneHint}${traitSection}`;

  try {
    const provider = await getProvider(config.provider);
    return await provider.rewrite(markdown, config, systemPrompt);
  } catch (error) {
    throw toSummarizerError(error);
  }
}
