import type { TtsProvider } from "../types.js";

export interface VoiceEntry {
  id: string;
  label: string;
  hint: string;
}

export const EDGE_TTS_VOICES: ReadonlyArray<VoiceEntry> = [
  { id: "en-US-JennyNeural", label: "Jenny", hint: "friendly, warm" },
  { id: "en-US-GuyNeural", label: "Guy", hint: "professional, clear" },
  { id: "en-US-AriaNeural", label: "Aria", hint: "positive, conversational" },
  { id: "en-GB-SoniaNeural", label: "Sonia", hint: "clear, British" },
  { id: "en-AU-NatashaNeural", label: "Natasha", hint: "bright, Australian" },
];

export const OPENAI_TTS_VOICES: ReadonlyArray<VoiceEntry> = [
  { id: "alloy", label: "Alloy", hint: "neutral, balanced" },
  { id: "echo", label: "Echo", hint: "warm, engaging" },
  { id: "fable", label: "Fable", hint: "expressive, British" },
  { id: "onyx", label: "Onyx", hint: "deep, authoritative" },
  { id: "nova", label: "Nova", hint: "friendly, upbeat" },
  { id: "shimmer", label: "Shimmer", hint: "clear, gentle" },
];

const VOICE_MAP: Record<TtsProvider, ReadonlyArray<VoiceEntry>> = {
  "edge-tts": EDGE_TTS_VOICES,
  openai: OPENAI_TTS_VOICES,
};

const DEFAULT_VOICE: Record<TtsProvider, string> = {
  "edge-tts": "en-US-JennyNeural",
  openai: "alloy",
};

export function getVoicesForProvider(provider: TtsProvider): ReadonlyArray<VoiceEntry> {
  return VOICE_MAP[provider];
}

export function getDefaultVoiceForProvider(provider: TtsProvider): string {
  return DEFAULT_VOICE[provider];
}
