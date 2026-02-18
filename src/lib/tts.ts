import { type ChildProcess, spawn } from "node:child_process";
import { getTtsProvider } from "./tts/index.js";
import type { PitchPreset, TtsProvider, VolumePreset } from "./types.js";

export async function generateAudio(
  text: string,
  voice: string,
  speed?: number,
  pitch?: PitchPreset,
  volume?: VolumePreset,
  outputPath?: string,
  ttsProvider?: TtsProvider,
): Promise<string> {
  const provider = await getTtsProvider(ttsProvider ?? "edge-tts");
  return provider.generateAudio(text, { voice, speed, pitch, volume, outputPath });
}

export function getVoiceDisplayName(voiceId: string, ttsProvider?: TtsProvider): string {
  // Synchronous lookup — import voices directly to avoid async
  // Uses the voice lists from the voices module
  if (ttsProvider === "openai") {
    const OPENAI_NAMES: Record<string, string> = {
      alloy: "Alloy",
      echo: "Echo",
      fable: "Fable",
      onyx: "Onyx",
      nova: "Nova",
      shimmer: "Shimmer",
    };
    return OPENAI_NAMES[voiceId] ?? voiceId;
  }
  const EDGE_NAMES: Record<string, string> = {
    "en-US-JennyNeural": "Jenny",
    "en-US-GuyNeural": "Guy",
    "en-US-AriaNeural": "Aria",
    "en-GB-SoniaNeural": "Sonia",
    "en-AU-NatashaNeural": "Natasha",
  };
  return EDGE_NAMES[voiceId] ?? voiceId;
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
