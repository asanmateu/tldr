import { loadConfig } from "./lib/config.js";
import { getSessionPaths, saveAudioFile, saveSummary } from "./lib/session.js";
import { rewriteForSpeech, summarize } from "./lib/summarizer.js";
import { generateAudio } from "./lib/tts.js";
import type { ConfigOverrides } from "./lib/types.js";
import { extract } from "./pipeline.js";

export async function runBatch(options: {
  input: string;
  overrides: ConfigOverrides;
  outputDir?: string | undefined;
  includeAudio: boolean;
}): Promise<void> {
  const config = await loadConfig(options.overrides);

  // Extract
  const source = options.input.length > 60 ? `${options.input.slice(0, 57)}...` : options.input;
  process.stderr.write(`Extracting: ${source}\n`);
  const extraction = await extract(options.input);

  // Summarize (no-op chunk handler — no TUI to stream to)
  const title = extraction.title ?? extraction.source;
  process.stderr.write(
    `Summarizing: "${title}" (${extraction.wordCount.toLocaleString()} words)\n`,
  );
  const result = await summarize(extraction, config, () => {});

  // Determine output directory
  const outputDir = options.outputDir ?? config.outputDir;
  const sessionPaths = getSessionPaths(outputDir, extraction, result.summary);
  const saved = await saveSummary(sessionPaths, result.summary);

  // Audio (opt-in)
  if (options.includeAudio) {
    process.stderr.write("Generating audio...\n");
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
  }

  // Print summary to stdout
  process.stdout.write(result.summary);

  // Log saved location to stderr
  process.stderr.write(`Saved to ${saved.sessionDir}/\n`);
}
