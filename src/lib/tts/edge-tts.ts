import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ensureConfigDir, getConfigDir } from "../config.js";
import type {
  PitchPreset,
  TtsGenerateOptions,
  TtsProviderInterface,
  VolumePreset,
} from "../types.js";
import { EDGE_TTS_VOICES } from "./voices.js";

const PITCH_VALUES: Record<PitchPreset, string | undefined> = {
  low: "-5Hz",
  default: undefined,
  high: "+5Hz",
};

const VOLUME_VALUES: Record<VolumePreset, string | undefined> = {
  quiet: "-20%",
  normal: undefined,
  loud: "+20%",
};

const VOICE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  EDGE_TTS_VOICES.map((v) => [v.id, v.label]),
);

export const edgeTtsProvider: TtsProviderInterface = {
  voices: EDGE_TTS_VOICES,

  getVoiceDisplayName(voiceId: string): string {
    return VOICE_DISPLAY_NAMES[voiceId] ?? voiceId;
  },

  async generateAudio(text: string, options: TtsGenerateOptions): Promise<string> {
    const { EdgeTTS } = await import("edge-tts-universal");
    const { voice, speed, pitch, volume, outputPath } = options;

    const rate =
      speed && speed !== 1.0
        ? `${speed >= 1 ? "+" : ""}${Math.round((speed - 1) * 100)}%`
        : undefined;
    const pitchVal = PITCH_VALUES[pitch ?? "default"];
    const volumeVal = VOLUME_VALUES[volume ?? "normal"];
    const edgeOptions =
      rate || pitchVal || volumeVal
        ? {
            ...(rate ? { rate } : {}),
            ...(pitchVal ? { pitch: pitchVal } : {}),
            ...(volumeVal ? { volume: volumeVal } : {}),
          }
        : undefined;

    const tts = new EdgeTTS(text, voice, edgeOptions);
    const result = await Promise.race([
      tts.synthesize(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TTS synthesis timed out")), 15_000),
      ),
    ]);

    const arrayBuffer = await result.audio.arrayBuffer();
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
