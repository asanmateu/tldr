import type { CognitiveTrait, ResolvedConfig, SummaryStyle, Tone } from "./types.js";

const BASE_ACCESSIBILITY = `Structure for scannability. Use bullet points over paragraphs.
Bold key terms. Keep sentences under 20 words.
Lead with the most important information. No filler.`;

const VISUAL_FIRST = `When data can be compared or categorized, use a markdown table.
When a process has steps, use numbered lists.
Prefer structure over prose.`;

export const TRAIT_RULES: Record<CognitiveTrait, string> = {
  dyslexia:
    "Short sentences (max 20 words). Simple vocabulary. Bold key terms. Bullet points over prose.",
  adhd: "Most important info first. No filler phrases. No hedging. Action-oriented takeaways.",
  autism: "Literal/precise language. No idioms or sarcasm. Explicit structure. Flag ambiguity.",
  esl: "Simple vocabulary (common 3000 words). No phrasal verbs. Define jargon inline.",
  "visual-thinker":
    "Hierarchical structure. Numbered steps for processes. Group related ideas with headers.",
};

export const TONE_INSTRUCTIONS: Record<Tone, string> = {
  casual: "Use a conversational, friendly tone. Write like explaining to a colleague.",
  professional: "Use a clear, formal tone. No slang. Precise and direct.",
  academic: "Use an analytical, scholarly tone. Reference key concepts and terminology.",
  eli5: "Explain like I'm five. Use analogies. Avoid jargon entirely. Keep it simple and fun.",
};

export const STYLE_TEMPLATES: Record<SummaryStyle, string> = {
  quick: `Output format (strictly follow):

## TL;DR
[One sentence. Max 25 words.]

## Key Points
- **Bold term** — short explanation (max 15 words per bullet)
- [3-7 bullets depending on content length]

## Why It Matters
[One sentence connecting this to the reader's world.]

## Action Items
- [ ] [Only if the content implies things the reader should do]`,

  detailed: `Output format (strictly follow):

## TL;DR
[2-3 sentences summarizing the core message.]

## Context
[1-2 sentences on why this matters or where it comes from.]

## Key Points
- **Bold term** — explanation (max 20 words per bullet)
- [5-12 bullets depending on content length]

## Analogy
[Explain the core idea through a familiar comparison. One short paragraph.]

## Notable Details
- [Details that add depth but aren't essential]

## Action Items
- [ ] [Only if the content implies things the reader should do]`,

  "study-notes": `Output format (strictly follow):

## TL;DR
[1-2 sentences summarizing the core topic.]

## Core Concepts
- **Concept** — definition and significance

## How They Connect
[Brief explanation of relationships between core concepts.]

## Key Facts
- [Specific facts, data points, or examples worth remembering]

## Visual Map
[ASCII diagram showing how core concepts relate to each other]

## Review Questions
1. [Question that tests understanding of a core concept]
2. [Question that requires connecting multiple ideas]
3. [Question that applies the knowledge to a scenario]`,
};

export function buildSystemPrompt(config: ResolvedConfig): string {
  const sections: string[] = [
    "You are a learning-focused summarization assistant. Your goal is to help the reader understand and retain the material — not just skim it. Explain concepts clearly, connect ideas, and surface the 'why' behind facts.",
  ];

  // Base accessibility — always applied
  sections.push(`Base Formatting Rules:\n${BASE_ACCESSIBILITY}`);

  if (config.cognitiveTraits.length > 0) {
    const rules = config.cognitiveTraits.map((trait) => `- ${TRAIT_RULES[trait]}`).join("\n");
    sections.push(`Reading Accessibility Rules:\n${rules}`);
  }

  sections.push(`Tone:\n${TONE_INSTRUCTIONS[config.tone]}`);

  // Visual-first instruction before style template
  sections.push(`Visual Structure:\n${VISUAL_FIRST}`);

  sections.push(STYLE_TEMPLATES[config.summaryStyle]);

  if (config.customInstructions) {
    sections.push(`Additional Instructions:\n${config.customInstructions}`);
  }

  return sections.join("\n\n");
}

export function buildUserPrompt(
  text: string,
  metadata: {
    title?: string | undefined;
    author?: string | undefined;
    source?: string | undefined;
  },
  options?: { isImage?: boolean },
): string {
  const parts: string[] = [];

  if (metadata.title) parts.push(`Title: ${metadata.title}`);
  if (metadata.author) parts.push(`Author: ${metadata.author}`);
  if (metadata.source) parts.push(`Source: ${metadata.source}`);

  if (parts.length > 0) {
    parts.push("");
  }

  if (options?.isImage) {
    parts.push(
      "Summarize the content of this image. Describe what you see, extract any text or data visible, and provide insights about the visual content.",
    );
  } else {
    parts.push("Content to summarize:");
    parts.push(text);
  }

  return parts.join("\n");
}
