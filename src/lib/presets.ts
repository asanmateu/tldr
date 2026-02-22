import type { Profile } from "./types.js";

export interface BuiltInPreset extends Profile {
  builtIn: true;
  description: string;
}

export const BUILT_IN_PRESETS: Record<string, BuiltInPreset> = {
  "morning-brief": {
    builtIn: true,
    description: "Fast daily digest with a professional briefing voice",
    audioMode: "briefing",
    summaryStyle: "quick",
    tone: "professional",
    ttsSpeed: 1.15,
    voice: "en-US-GuyNeural",
    cognitiveTraits: [],
    customInstructions: "Lead with the single most important development. Be ruthlessly concise.",
  },
  "commute-catch-up": {
    builtIn: true,
    description: "Relaxed podcast-style listening for your commute",
    audioMode: "podcast",
    summaryStyle: "standard",
    tone: "casual",
    ttsSpeed: 1.0,
    voice: "en-US-JennyNeural",
    cognitiveTraits: [],
  },
  "deep-study": {
    builtIn: true,
    description: "Lecture-style deep dives for focused learning",
    audioMode: "lecture",
    summaryStyle: "study-notes",
    tone: "academic",
    ttsSpeed: 0.9,
    voice: "en-US-AriaNeural",
    cognitiveTraits: [],
    customInstructions:
      "Explain technical terms as if the listener has foundational knowledge but is encountering this specific topic for the first time.",
  },
  "exam-prep": {
    builtIn: true,
    description: "Study-buddy quizzes and mnemonics for retention",
    audioMode: "study-buddy",
    summaryStyle: "study-notes",
    tone: "casual",
    ttsSpeed: 0.95,
    voice: "en-US-JennyNeural",
    cognitiveTraits: [],
    customInstructions: "Focus on testable facts and common exam pitfalls.",
  },
  "bedtime-read": {
    builtIn: true,
    description: "Calm, soothing narration for winding down",
    audioMode: "calm",
    summaryStyle: "standard",
    tone: "casual",
    ttsSpeed: 0.85,
    voice: "en-GB-SoniaNeural",
    pitch: "low",
    volume: "quiet",
    cognitiveTraits: [],
    customInstructions: "Keep it gentle and reflective. No alarming language.",
  },
  "story-mode": {
    builtIn: true,
    description: "Narrative storytelling that finds the human angle",
    audioMode: "storyteller",
    summaryStyle: "detailed",
    tone: "casual",
    ttsSpeed: 1.0,
    voice: "en-US-GuyNeural",
    cognitiveTraits: [],
    customInstructions: "Find the human story. Who are the characters? What's the conflict?",
  },
  "team-debrief": {
    builtIn: true,
    description: "Professional catch-up focused on decisions and next steps",
    audioMode: "briefing",
    summaryStyle: "standard",
    tone: "professional",
    ttsSpeed: 1.0,
    voice: "en-US-JennyNeural",
    cognitiveTraits: [],
    customInstructions:
      "Focus on decisions made, blockers, and next steps. Assume listener has context but missed recent events.",
  },
};

export function isBuiltInPreset(name: string): boolean {
  return name in BUILT_IN_PRESETS;
}
