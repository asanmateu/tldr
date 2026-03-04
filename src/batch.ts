import { loadConfig, loadSettings } from "./lib/config.js";
import { truncateAndScale } from "./lib/content.js";
import { addEntry } from "./lib/history.js";
import { getSessionPaths, saveAudioFile, saveSummary } from "./lib/session.js";
import { rewriteForSpeech, summarize } from "./lib/summarizer.js";
import { generateAudio } from "./lib/tts.js";
import type { ConfigOverrides, TldrResult } from "./lib/types.js";
import { extract } from "./pipeline.js";

export interface BatchResult {
  input: string;
  result?: TldrResult | undefined;
  error?: string | undefined;
  sessionDir?: string | undefined;
}

export async function runBatch(options: {
  inputs: string[];
  overrides: ConfigOverrides;
  outputDir?: string | undefined;
  includeAudio: boolean;
}): Promise<BatchResult[]> {
  const config = await loadConfig(options.overrides);
  const total = options.inputs.length;
  const results: BatchResult[] = [];

  for (let i = 0; i < total; i++) {
    const input = options.inputs[i] as string;
    const prefix = total > 1 ? `[${i + 1}/${total}] ` : "";

    try {
      // Extract
      const source = input.length > 60 ? `${input.slice(0, 57)}...` : input;
      process.stderr.write(`${prefix}Extracting: ${source}\n`);
      const settings = await loadSettings();
      const extraction = await extract(input, undefined, {
        fallbackToJina: settings.fallbackToJina ?? true,
      });

      // Truncate long content and scale maxTokens (matches interactive mode)
      const effectiveConfig = truncateAndScale(extraction, config);

      // Summarize (no-op chunk handler — no TUI to stream to)
      const title = extraction.title ?? extraction.source;
      process.stderr.write(
        `${prefix}Summarizing: "${title}" (${extraction.wordCount.toLocaleString()} words)\n`,
      );
      const result = await summarize(extraction, effectiveConfig, () => {});

      // Determine output directory
      const outputDir = options.outputDir ?? config.outputDir;
      const sessionPaths = getSessionPaths(outputDir, extraction, result.summary);
      const saved = await saveSummary(sessionPaths, result.summary);

      // Audio (opt-in) — isolated so TTS failure doesn't mark the URL as failed
      if (options.includeAudio) {
        try {
          process.stderr.write(`${prefix}Generating audio...\n`);
          const speechText = await rewriteForSpeech(result.summary, config);
          const audioPath = await generateAudio(
            speechText,
            config.voice,
            config.ttsSpeed,
            config.pitch,
            config.volume,
            undefined,
            config.ttsProvider,
            config.ttsModel,
          );
          await saveAudioFile(saved, audioPath);
        } catch (audioErr) {
          const audioMessage = audioErr instanceof Error ? audioErr.message : String(audioErr);
          process.stderr.write(`${prefix}Audio failed: ${audioMessage}\n`);
        }
      }

      // Add to history
      await addEntry(result);

      // Print summary to stdout (with separator between multiple results)
      if (results.length > 0) {
        process.stdout.write("\n---\n\n");
      }
      process.stdout.write(result.summary);

      // Log saved location to stderr
      process.stderr.write(`${prefix}Saved to ${saved.sessionDir}/\n`);

      results.push({ input, result, sessionDir: saved.sessionDir });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${prefix}Error: ${message}\n`);
      results.push({ input, error: message });
    }
  }

  // Completion report for multi-input batches
  if (total > 1) {
    const succeeded = results.filter((r) => r.result).length;
    const failed = results.filter((r) => r.error).length;
    process.stderr.write(`\nBatch complete: ${succeeded} succeeded, ${failed} failed\n`);
  }

  return results;
}
