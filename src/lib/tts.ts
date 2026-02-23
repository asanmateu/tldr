import { type ChildProcess, spawn } from "node:child_process";
import { getTtsProvider } from "./tts/index.js";
import { getVoiceDisplayName as _getVoiceDisplayName } from "./tts/voices.js";
import type { PitchPreset, TtsProvider, VolumePreset } from "./types.js";

export async function generateAudio(
  text: string,
  voice: string,
  speed?: number,
  pitch?: PitchPreset,
  volume?: VolumePreset,
  outputPath?: string,
  ttsProvider?: TtsProvider,
  ttsModel?: string,
): Promise<string> {
  const provider = await getTtsProvider(ttsProvider ?? "edge-tts", ttsModel);
  return provider.generateAudio(text, { voice, speed, pitch, volume, outputPath, ttsModel });
}

export function getVoiceDisplayName(voiceId: string, ttsProvider?: TtsProvider): string {
  return _getVoiceDisplayName(voiceId, ttsProvider ?? "edge-tts");
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
