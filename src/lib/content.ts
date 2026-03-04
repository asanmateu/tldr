import type { Config, ExtractionResult } from "./types.js";

export const MAX_INPUT_WORDS = 100_000;
export const LONG_CONTENT_WORD_THRESHOLD = 10_000;
export const LONG_CONTENT_MAX_TOKENS = 4096;

/**
 * Truncate content that exceeds MAX_INPUT_WORDS and scale maxTokens for
 * content above LONG_CONTENT_WORD_THRESHOLD. Mutates `result.content`
 * when truncation occurs.
 */
export function truncateAndScale(result: ExtractionResult, cfg: Config): Config {
  if (result.image) return cfg;

  const words = result.content.split(/\s+/);
  if (words.length > MAX_INPUT_WORDS) {
    result.content = words.slice(0, MAX_INPUT_WORDS).join(" ");
  }
  if (words.length > LONG_CONTENT_WORD_THRESHOLD) {
    return { ...cfg, maxTokens: Math.min(cfg.maxTokens * 2, LONG_CONTENT_MAX_TOKENS) };
  }
  return cfg;
}
