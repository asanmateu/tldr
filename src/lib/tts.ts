import { type ChildProcess, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ensureConfigDir, getConfigDir } from "./config.js";

export function stripMarkdownForSpeech(md: string): string {
  let text = md;

  // Convert headings to text with pause
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "$1.\n");

  // Convert checkboxes — add period at end if missing punctuation
  text = text.replace(/^(\s*)- \[ \]\s*(.+)$/gm, (_match, indent: string, content: string) => {
    const trimmed = content.trimEnd();
    const needsPeriod = !/[.!?:;]$/.test(trimmed);
    return `${indent}To do: ${trimmed}${needsPeriod ? "." : ""}`;
  });
  text = text.replace(/^(\s*)- \[x\]\s*(.+)$/gim, (_match, indent: string, content: string) => {
    const trimmed = content.trimEnd();
    const needsPeriod = !/[.!?:;]$/.test(trimmed);
    return `${indent}Done: ${trimmed}${needsPeriod ? "." : ""}`;
  });

  // Convert bullet items — add period at end if missing punctuation
  text = text.replace(/^(\s*)[-*]\s+(.+)$/gm, (_match, indent: string, content: string) => {
    const trimmed = content.trimEnd();
    const needsPeriod = !/[.!?:;]$/.test(trimmed);
    return `${indent}${trimmed}${needsPeriod ? "." : ""}`;
  });

  // Remove bold/italic markers
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/\*(.+?)\*/g, "$1");
  text = text.replace(/___(.+?)___/g, "$1");
  text = text.replace(/__(.+?)__/g, "$1");
  text = text.replace(/_(.+?)_/g, "$1");

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove horizontal rules
  text = text.replace(/^---+$/gm, "");

  // Remove link syntax, keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove em dashes used as separators (keep the content around them)
  text = text.replace(/\s*—\s*/g, ", ");

  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export async function generateAudio(
  text: string,
  voice: string,
  speed?: number,
  outputPath?: string,
): Promise<string> {
  const { EdgeTTS } = await import("edge-tts-universal");
  const rate =
    speed && speed !== 1.0
      ? `${speed >= 1 ? "+" : ""}${Math.round((speed - 1) * 100)}%`
      : undefined;
  const tts = new EdgeTTS(text, voice, rate ? { rate } : undefined);
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
