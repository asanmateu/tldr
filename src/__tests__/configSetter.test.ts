import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => tempDir,
  };
});

const { loadSettings, saveSettings } = await import("../lib/config.js");
const { applyConfigSet, ConfigSetError, getValidConfigKeys } = await import(
  "../lib/configSetter.js"
);

describe("configSetter", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tldr-setter-"));
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function seedSettings() {
    await saveSettings({
      activeProfile: "default",
      profiles: {
        default: {
          cognitiveTraits: ["dyslexia"],
          tone: "casual",
          summaryStyle: "standard",
        },
      },
    });
  }

  describe("getValidConfigKeys", () => {
    it("returns all supported keys", () => {
      const keys = getValidConfigKeys();
      expect(keys).toContain("tone");
      expect(keys).toContain("style");
      expect(keys).toContain("apiKey");
      expect(keys).toContain("traits");
      expect(keys).toContain("custom-instructions");
      expect(keys).toContain("theme");
      expect(keys).toContain("appearance");
      expect(keys).toContain("tts-speed");
      expect(keys).toContain("save-audio");
      expect(keys).toContain("output-dir");
    });
  });

  describe("unknown key", () => {
    it("throws ConfigSetError for unknown key", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("banana", "value", ["config", "set", "banana", "value"]),
      ).rejects.toThrow(ConfigSetError);
    });

    it("error message contains valid keys", async () => {
      await seedSettings();
      try {
        await applyConfigSet("banana", "value", ["config", "set", "banana", "value"]);
      } catch (err) {
        expect((err as Error).message).toContain("Unknown key: banana");
        expect((err as Error).message).toContain("tone");
      }
    });
  });

  describe("top-level settings keys", () => {
    it("sets apiKey and masks display", async () => {
      await seedSettings();
      const msg = await applyConfigSet("apiKey", "sk-ant-secret", [
        "config",
        "set",
        "apiKey",
        "sk-ant-secret",
      ]);
      expect(msg).toContain("***");
      const settings = await loadSettings();
      expect(settings.apiKey).toBe("sk-ant-secret");
    });

    it("sets baseUrl", async () => {
      await seedSettings();
      const msg = await applyConfigSet("baseUrl", "https://proxy.example.com", [
        "config",
        "set",
        "baseUrl",
        "https://proxy.example.com",
      ]);
      expect(msg).toContain("https://proxy.example.com");
      const settings = await loadSettings();
      expect(settings.baseUrl).toBe("https://proxy.example.com");
    });

    it("sets maxTokens as integer", async () => {
      await seedSettings();
      await applyConfigSet("maxTokens", "2048", ["config", "set", "maxTokens", "2048"]);
      const settings = await loadSettings();
      expect(settings.maxTokens).toBe(2048);
    });

    it("sets activeProfile", async () => {
      await seedSettings();
      await applyConfigSet("activeProfile", "work", ["config", "set", "activeProfile", "work"]);
      const settings = await loadSettings();
      expect(settings.activeProfile).toBe("work");
    });

    it("sets output-dir", async () => {
      await seedSettings();
      await applyConfigSet("output-dir", "/custom/path", [
        "config",
        "set",
        "output-dir",
        "/custom/path",
      ]);
      const settings = await loadSettings();
      expect(settings.outputDir).toBe("/custom/path");
    });
  });

  describe("profile keys", () => {
    it("sets tone on active profile", async () => {
      await seedSettings();
      const msg = await applyConfigSet("tone", "professional", [
        "config",
        "set",
        "tone",
        "professional",
      ]);
      expect(msg).toContain("professional");
      expect(msg).toContain("profile: default");
      const settings = await loadSettings();
      expect(settings.profiles.default?.tone).toBe("professional");
    });

    it("rejects invalid tone", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("tone", "snarky", ["config", "set", "tone", "snarky"]),
      ).rejects.toThrow("Invalid tone");
    });

    it("sets style on active profile", async () => {
      await seedSettings();
      await applyConfigSet("style", "detailed", ["config", "set", "style", "detailed"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.summaryStyle).toBe("detailed");
    });

    it("rejects invalid style", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("style", "ultra", ["config", "set", "style", "ultra"]),
      ).rejects.toThrow("Invalid style");
    });

    it("sets model on active profile", async () => {
      await seedSettings();
      await applyConfigSet("model", "sonnet", ["config", "set", "model", "sonnet"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.model).toBe("sonnet");
    });

    it("sets provider to anthropic", async () => {
      await seedSettings();
      await applyConfigSet("provider", "anthropic", ["config", "set", "provider", "anthropic"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBe("anthropic");
    });

    it("sets provider to claude-code (stores undefined)", async () => {
      await seedSettings();
      await applyConfigSet("provider", "claude-code", ["config", "set", "provider", "claude-code"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBeUndefined();
    });

    it("sets provider to openai", async () => {
      await seedSettings();
      await applyConfigSet("provider", "openai", ["config", "set", "provider", "openai"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBe("openai");
    });

    it("sets provider to gemini", async () => {
      await seedSettings();
      await applyConfigSet("provider", "gemini", ["config", "set", "provider", "gemini"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBe("gemini");
    });

    it("sets provider to codex", async () => {
      await seedSettings();
      await applyConfigSet("provider", "codex", ["config", "set", "provider", "codex"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBe("codex");
    });

    it("sets provider to ollama", async () => {
      await seedSettings();
      await applyConfigSet("provider", "ollama", ["config", "set", "provider", "ollama"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBe("ollama");
    });

    it("sets provider to xai", async () => {
      await seedSettings();
      await applyConfigSet("provider", "xai", ["config", "set", "provider", "xai"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.provider).toBe("xai");
    });

    it("rejects invalid provider", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("provider", "banana", ["config", "set", "provider", "banana"]),
      ).rejects.toThrow("Invalid provider");
    });

    it("sets voice", async () => {
      await seedSettings();
      await applyConfigSet("voice", "en-US-GuyNeural", [
        "config",
        "set",
        "voice",
        "en-US-GuyNeural",
      ]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.voice).toBe("en-US-GuyNeural");
    });

    it("sets default voice (stores undefined)", async () => {
      await seedSettings();
      await applyConfigSet("voice", "en-US-JennyNeural", [
        "config",
        "set",
        "voice",
        "en-US-JennyNeural",
      ]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.voice).toBeUndefined();
    });

    it("rejects invalid voice", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("voice", "en-US-RobotNeural", [
          "config",
          "set",
          "voice",
          "en-US-RobotNeural",
        ]),
      ).rejects.toThrow("Invalid voice");
    });

    it("sets pitch", async () => {
      await seedSettings();
      await applyConfigSet("pitch", "high", ["config", "set", "pitch", "high"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.pitch).toBe("high");
    });

    it("sets default pitch (stores undefined)", async () => {
      await seedSettings();
      await applyConfigSet("pitch", "default", ["config", "set", "pitch", "default"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.pitch).toBeUndefined();
    });

    it("sets volume", async () => {
      await seedSettings();
      await applyConfigSet("volume", "loud", ["config", "set", "volume", "loud"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.volume).toBe("loud");
    });

    it("sets default volume (stores undefined)", async () => {
      await seedSettings();
      await applyConfigSet("volume", "normal", ["config", "set", "volume", "normal"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.volume).toBeUndefined();
    });
  });

  describe("save-audio", () => {
    it("sets saveAudio to true", async () => {
      await seedSettings();
      const msg = await applyConfigSet("save-audio", "true", [
        "config",
        "set",
        "save-audio",
        "true",
      ]);
      expect(msg).toContain("true");
      const settings = await loadSettings();
      expect(settings.profiles.default?.saveAudio).toBe(true);
    });

    it("sets saveAudio to false (stores undefined)", async () => {
      await seedSettings();
      await applyConfigSet("save-audio", "false", ["config", "set", "save-audio", "false"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.saveAudio).toBeUndefined();
    });

    it("rejects invalid save-audio value", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("save-audio", "yes", ["config", "set", "save-audio", "yes"]),
      ).rejects.toThrow("Invalid save-audio");
    });
  });

  describe("tts-speed", () => {
    it("sets ttsSpeed", async () => {
      await seedSettings();
      await applyConfigSet("tts-speed", "1.25", ["config", "set", "tts-speed", "1.25"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.ttsSpeed).toBe(1.25);
    });

    it("sets default ttsSpeed (stores undefined)", async () => {
      await seedSettings();
      await applyConfigSet("tts-speed", "1.0", ["config", "set", "tts-speed", "1.0"]);
      const settings = await loadSettings();
      expect(settings.profiles.default?.ttsSpeed).toBeUndefined();
    });

    it("rejects non-numeric tts-speed", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("tts-speed", "fast", ["config", "set", "tts-speed", "fast"]),
      ).rejects.toThrow("Invalid tts-speed");
    });

    it("rejects zero tts-speed", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("tts-speed", "0", ["config", "set", "tts-speed", "0"]),
      ).rejects.toThrow("Invalid tts-speed");
    });
  });

  describe("traits", () => {
    it("sets comma-separated traits", async () => {
      await seedSettings();
      const msg = await applyConfigSet("traits", "adhd,autism", [
        "config",
        "set",
        "traits",
        "adhd,autism",
      ]);
      expect(msg).toContain("adhd, autism");
      const settings = await loadSettings();
      expect(settings.profiles.default?.cognitiveTraits).toEqual(["adhd", "autism"]);
    });

    it("rejects invalid traits", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("traits", "adhd,superpower", ["config", "set", "traits", "adhd,superpower"]),
      ).rejects.toThrow("Invalid trait(s): superpower");
    });
  });

  describe("custom-instructions", () => {
    it("joins args from index 3 onward", async () => {
      await seedSettings();
      const msg = await applyConfigSet("custom-instructions", "be", [
        "config",
        "set",
        "custom-instructions",
        "be",
        "extra",
        "concise",
      ]);
      expect(msg).toContain("be extra concise");
      const settings = await loadSettings();
      expect(settings.profiles.default?.customInstructions).toBe("be extra concise");
    });

    it("throws when args are empty after key", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("custom-instructions", "", ["config", "set", "custom-instructions"]),
      ).rejects.toThrow("Usage");
    });
  });

  describe("theme keys", () => {
    it("sets theme name", async () => {
      await seedSettings();
      const msg = await applyConfigSet("theme", "ocean", ["config", "set", "theme", "ocean"]);
      expect(msg).toContain("ocean");
      const settings = await loadSettings();
      expect(settings.theme?.name).toBe("ocean");
    });

    it("rejects invalid theme", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("theme", "neon", ["config", "set", "theme", "neon"]),
      ).rejects.toThrow("Invalid theme");
    });

    it("sets appearance", async () => {
      await seedSettings();
      await applyConfigSet("appearance", "dark", ["config", "set", "appearance", "dark"]);
      const settings = await loadSettings();
      expect(settings.theme?.appearance).toBe("dark");
    });

    it("rejects invalid appearance", async () => {
      await seedSettings();
      await expect(
        applyConfigSet("appearance", "neon", ["config", "set", "appearance", "neon"]),
      ).rejects.toThrow("Invalid appearance");
    });
  });
});
