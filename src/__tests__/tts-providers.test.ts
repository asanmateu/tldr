import { describe, expect, it, vi } from "vitest";

// Mock edge-tts-universal
const mockEdgeTTSConstructor = vi.fn();
const mockSynthesize = vi.fn().mockResolvedValue({
  audio: new Blob([new Uint8Array(100)], { type: "audio/mpeg" }),
  subtitle: [],
});

vi.mock("edge-tts-universal", () => ({
  EdgeTTS: class {
    constructor(...args: unknown[]) {
      mockEdgeTTSConstructor(...args);
      this.synthesize = mockSynthesize;
    }
    synthesize = mockSynthesize;
  },
}));

// Mock openai
const mockSpeechCreate = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
});

vi.mock("openai", () => ({
  default: class {
    audio = {
      speech: {
        create: mockSpeechCreate,
      },
    };
  },
}));

// Mock fs
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock("node:fs/promises", () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  access: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(new Error("not found")),
  rename: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:os", () => ({
  homedir: () => "/mock-home",
}));

const { getTtsProvider, getVoicesForProvider, getDefaultVoiceForProvider } = await import(
  "../lib/tts/index.js"
);

describe("tts providers", () => {
  describe("getVoicesForProvider", () => {
    it("returns edge-tts voices", () => {
      const voices = getVoicesForProvider("edge-tts");
      expect(voices.length).toBe(5);
      expect(voices[0]?.id).toBe("en-US-JennyNeural");
    });

    it("returns openai voices", () => {
      const voices = getVoicesForProvider("openai");
      expect(voices.length).toBe(6);
      expect(voices[0]?.id).toBe("alloy");
    });
  });

  describe("getDefaultVoiceForProvider", () => {
    it("returns en-US-JennyNeural for edge-tts", () => {
      expect(getDefaultVoiceForProvider("edge-tts")).toBe("en-US-JennyNeural");
    });

    it("returns alloy for openai", () => {
      expect(getDefaultVoiceForProvider("openai")).toBe("alloy");
    });
  });

  describe("getTtsProvider", () => {
    it("returns edge-tts provider", async () => {
      const provider = await getTtsProvider("edge-tts");
      expect(provider.voices.length).toBe(5);
      expect(provider.getVoiceDisplayName("en-US-JennyNeural")).toBe("Jenny");
    });

    it("returns openai provider", async () => {
      const provider = await getTtsProvider("openai");
      expect(provider.voices.length).toBe(6);
      expect(provider.getVoiceDisplayName("alloy")).toBe("Alloy");
    });
  });

  describe("edge-tts provider", () => {
    it("generates audio with correct params", async () => {
      const provider = await getTtsProvider("edge-tts");
      const path = await provider.generateAudio("Hello world", {
        voice: "en-US-JennyNeural",
      });

      expect(mockSynthesize).toHaveBeenCalled();
      expect(path).toContain("audio.mp3");
    });

    it("passes speed, pitch, and volume options", async () => {
      const provider = await getTtsProvider("edge-tts");
      await provider.generateAudio("Hello", {
        voice: "en-US-JennyNeural",
        speed: 1.5,
        pitch: "low",
        volume: "loud",
      });

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith(
        "Hello",
        "en-US-JennyNeural",
        expect.objectContaining({ rate: "+50%", pitch: "-5Hz", volume: "+20%" }),
      );
    });

    it("returns display name for known voices", async () => {
      const provider = await getTtsProvider("edge-tts");
      expect(provider.getVoiceDisplayName("en-US-GuyNeural")).toBe("Guy");
    });

    it("returns raw ID for unknown voices", async () => {
      const provider = await getTtsProvider("edge-tts");
      expect(provider.getVoiceDisplayName("custom-voice")).toBe("custom-voice");
    });
  });

  describe("openai provider", () => {
    it("generates audio with correct params", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = await getTtsProvider("openai");
      const path = await provider.generateAudio("Hello world", {
        voice: "alloy",
      });

      expect(mockSpeechCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "tts-1",
          voice: "alloy",
          input: "Hello world",
        }),
      );
      expect(path).toContain("audio.mp3");
      vi.unstubAllEnvs();
    });

    it("passes speed option", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = await getTtsProvider("openai");
      await provider.generateAudio("Hello", {
        voice: "nova",
        speed: 1.5,
      });

      expect(mockSpeechCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "tts-1",
          voice: "nova",
          speed: 1.5,
        }),
      );
      vi.unstubAllEnvs();
    });

    it("uses custom ttsModel when provided", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = await getTtsProvider("openai");
      await provider.generateAudio("Hello", {
        voice: "alloy",
        ttsModel: "tts-1-hd",
      });

      expect(mockSpeechCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "tts-1-hd",
          voice: "alloy",
        }),
      );
      vi.unstubAllEnvs();
    });

    it("throws when OPENAI_API_KEY is missing", async () => {
      const original = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "";
      try {
        const provider = await getTtsProvider("openai");
        await expect(provider.generateAudio("Hello", { voice: "alloy" })).rejects.toThrow(
          "OPENAI_API_KEY",
        );
      } finally {
        process.env.OPENAI_API_KEY = original;
      }
    });

    it("returns display name for known voices", async () => {
      const provider = await getTtsProvider("openai");
      expect(provider.getVoiceDisplayName("nova")).toBe("Nova");
      expect(provider.getVoiceDisplayName("shimmer")).toBe("Shimmer");
    });

    it("returns raw ID for unknown voices", async () => {
      const provider = await getTtsProvider("openai");
      expect(provider.getVoiceDisplayName("custom")).toBe("custom");
    });
  });
});
