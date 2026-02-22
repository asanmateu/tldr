import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { getProvider } from "./providers/index.js";
import type {
  AudioMode,
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

export const AUDIO_MODE_PROMPTS: Record<
  AudioMode,
  { persona: string; structure: string; rules: string }
> = {
  podcast: {
    persona: "You are a podcast host rewriting a text summary into a short, engaging audio script.",
    structure: "Hook that grabs attention → conversational walkthrough → memorable takeaway.",
    rules:
      "Write as if hosting a brief podcast segment: conversational, energetic, with personality.\n" +
      'Use natural transitions ("Here\'s the interesting part...", "Now, what really stands out is...").\n' +
      "Open with a hook that grabs attention.\n" +
      "Close with a memorable takeaway.\n" +
      "Keep the same information density — don't drop facts, but make them compelling to hear.\n" +
      "Explain concepts through analogies and concrete examples. Make the listener feel like they're learning, not just listening.",
  },
  briefing: {
    persona:
      "You are an analyst delivering a concise briefing, rewriting a text summary into a short spoken brief.",
    structure: "Headlines first → key facts → implications → action items.",
    rules:
      "No filler, no opinions, pure signal.\n" +
      "Lead with what changed and what it means for the listener.\n" +
      "Number the items for mental tracking.\n" +
      "Be ruthlessly concise — every sentence must earn its place.\n" +
      "Close with concrete next steps or implications.",
  },
  lecture: {
    persona:
      "You are a patient, skilled teacher rewriting a text summary into an explanatory audio script.",
    structure: "Context setting → concept by concept → examples → connections → recap.",
    rules:
      "Build understanding progressively. Define terms before using them.\n" +
      "Use analogies to anchor new concepts to familiar ones.\n" +
      "Pause between concepts with clear transitions.\n" +
      'End with "the key things to remember are..." recap.\n' +
      "Make the listener feel they understand the topic deeply, not just the surface.",
  },
  storyteller: {
    persona:
      "You are a narrator weaving a compelling story, rewriting a text summary into a narrative audio script.",
    structure: "Scene setting → characters/players → tension/conflict → resolution → meaning.",
    rules:
      "Find the narrative thread in the content.\n" +
      'Use temporal flow ("It started when...", "Then came the turning point...").\n' +
      "Make abstract concepts concrete through characters and scenes.\n" +
      "Build toward a satisfying conclusion or insight.\n" +
      "Let the listener feel the story, not just hear the facts.",
  },
  "study-buddy": {
    persona:
      "You are a smart friend helping the listener review and retain material, rewriting a text summary into a study-friendly audio script.",
    structure:
      'Key concepts → "test yourself" moments → connections → mnemonic aids → quick recap.',
    rules:
      'Pose rhetorical questions before revealing answers ("So what do you think happens when...? Right —").\n' +
      "Use mnemonic devices when possible.\n" +
      "Group related facts together.\n" +
      'End with "quiz yourself on these three things..." or similar recall prompt.\n' +
      "Make the listener feel like they're actively learning, not passively hearing.",
  },
  calm: {
    persona:
      "You are a gentle, soothing narrator rewriting a text summary into a calming audio script.",
    structure: "Soft opening → unhurried walkthrough → reflective close.",
    rules:
      "No urgency language. Longer pauses between ideas.\n" +
      'Avoid alarming framing — use "interestingly" not "shockingly".\n' +
      "Be reflective rather than actionable.\n" +
      "Keep sentences flowing and unhurried.\n" +
      "Close with a quiet, reflective thought the listener can sit with.",
  },
};

const SHARED_AUDIO_RULES =
  "No markdown formatting — output plain spoken text only.\n" +
  "No stage directions or sound effects.\n" +
  "Use punctuation deliberately for pacing: commas for brief pauses, periods for full stops, ellipses for dramatic pauses.\n" +
  "Vary sentence rhythm — mix short punchy sentences with longer flowing ones to maintain engagement.\n" +
  'Write out numbers and abbreviations in full (e.g. "three" not "3", "for example" not "e.g.").';

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
  const mode = AUDIO_MODE_PROMPTS[config.audioMode];
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

  const systemPrompt = `${mode.persona}

Structure:
${mode.structure}

Rules:
${mode.rules}
${SHARED_AUDIO_RULES}
- ${toneHint}${traitSection}`;

  try {
    const provider = await getProvider(config.provider);
    return await provider.rewrite(markdown, config, systemPrompt);
  } catch (error) {
    throw toSummarizerError(error);
  }
}
