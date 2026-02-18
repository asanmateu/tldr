import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ensureConfigDir, getConfigDir } from "../config.js";
import type { TtsGenerateOptions, TtsProviderInterface } from "../types.js";
import { OPENAI_TTS_VOICES } from "./voices.js";

const VOICE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  OPENAI_TTS_VOICES.map((v) => [v.id, v.label]),
);

export const openaiTtsProvider: TtsProviderInterface = {
  voices: OPENAI_TTS_VOICES,

  getVoiceDisplayName(voiceId: string): string {
    return VOICE_DISPLAY_NAMES[voiceId] ?? voiceId;
  },

  async generateAudio(text: string, options: TtsGenerateOptions): Promise<string> {
    const { default: OpenAI } = await import("openai");
    const { voice, speed, outputPath } = options;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required for OpenAI TTS");
    }

    const client = new OpenAI({ apiKey });
    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      ...(speed && speed !== 1.0 ? { speed } : {}),
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let filePath: string;
    if (outputPath) {
      await mkdir(dirname(outputPath), { recursive: true });
      filePath = outputPath;
    } else {
      await ensureConfigDir();
      filePath = join(getConfigDir(), "audio.mp3");
    }

    await writeFile(filePath, buffer);
    return filePath;
  },
};
