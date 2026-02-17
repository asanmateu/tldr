import { type ChildProcess, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ensureConfigDir, getConfigDir } from "./config.js";
import type { PitchPreset, VolumePreset } from "./types.js";

const VOICE_DISPLAY_NAMES: Record<string, string> = {
  "en-US-JennyNeural": "Jenny",
  "en-US-GuyNeural": "Guy",
  "en-US-AriaNeural": "Aria",
  "en-GB-SoniaNeural": "Sonia",
  "en-AU-NatashaNeural": "Natasha",
};

export function getVoiceDisplayName(voiceId: string): string {
  return VOICE_DISPLAY_NAMES[voiceId] ?? voiceId;
}

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

export async function generateAudio(
  text: string,
  voice: string,
  speed?: number,
  pitch?: PitchPreset,
  volume?: VolumePreset,
  outputPath?: string,
): Promise<string> {
  const { EdgeTTS } = await import("edge-tts-universal");
  const rate =
    speed && speed !== 1.0
      ? `${speed >= 1 ? "+" : ""}${Math.round((speed - 1) * 100)}%`
      : undefined;
  const pitchVal = PITCH_VALUES[pitch ?? "default"];
  const volumeVal = VOLUME_VALUES[volume ?? "normal"];
  const options =
    rate || pitchVal || volumeVal
      ? {
          ...(rate ? { rate } : {}),
          ...(pitchVal ? { pitch: pitchVal } : {}),
          ...(volumeVal ? { volume: volumeVal } : {}),
        }
      : undefined;
  const tts = new EdgeTTS(text, voice, options);
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
}

export function playAudio(filePath: string): ChildProcess {
  const platform = process.platform;

  if (platform === "darwin") {
    return spawn("afplay", [filePath], { stdio: "ignore" });
  }

  if (platform === "win32") {
    return spawn("cmd", ["/c", "start", "", filePath], { stdio: "ignore" });
  }

  // Linux and others
  return spawn("mpv", ["--no-video", filePath], { stdio: "ignore" });
}

export function stopAudio(proc: ChildProcess): void {
  if (!proc.killed) {
    proc.kill();
  }
}

export function speakFallback(text: string): ChildProcess | undefined {
  if (process.platform === "darwin") {
    return spawn("say", [text], { stdio: "ignore" });
  }
  if (process.platform === "linux") {
    return spawn("espeak", [text], { stdio: "ignore" });
  }
  return undefined;
}
