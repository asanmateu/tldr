import { writeFile as fsWriteFile, mkdtemp, rm, stat } from "node:fs/promises";
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

const {
  loadConfig,
  saveConfig,
  loadSettings,
  saveSettings,
  resolveConfig,
  ensureConfigDir,
  getConfigDir,
  getEnvOverrides,
  resolveModelId,
  listProfiles,
  createProfile,
  deleteProfile,
  setActiveProfile,
  setTheme,
  MODEL_IDS,
} = await import("../lib/config.js");

function makeTestConfig(overrides?: Partial<import("../lib/types.js").ResolvedConfig>) {
  return {
    apiKey: "sk-ant-test-key",
    baseUrl: undefined,
    maxTokens: 1024,
    profileName: "default",
    cognitiveTraits: [] as import("../lib/types.js").CognitiveTrait[],
    tone: "casual" as const,
    summaryStyle: "standard" as const,
    model: MODEL_IDS.opus,
    customInstructions: undefined,
    voice: "en-US-JennyNeural",
    ttsSpeed: 1.0,
    pitch: "default" as const,
    volume: "normal" as const,
    provider: "cli" as const,
    outputDir: `${tempDir}/.tldr/output`,
    ...overrides,
  };
}

describe("config", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tldr-test-"));
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns defaults when no config exists", async () => {
    const config = await loadConfig();

    expect(config.apiKey).toBe("");
    expect(config.voice).toBe("en-US-JennyNeural");
    expect(config.profileName).toBe("default");
    expect(config.tone).toBe("casual");
    expect(config.summaryStyle).toBe("standard");
    expect(config.model).toBe(MODEL_IDS.opus);
    expect(config.provider).toBe("cli");
  });

  it("creates config dir", async () => {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const stats = await stat(configDir);
    expect(stats.isDirectory()).toBe(true);
  });

  it("saves and loads settings round-trip", async () => {
    const settings: import("../lib/types.js").TldrSettings = {
      apiKey: "sk-ant-test-key",
      activeProfile: "default",
      profiles: {
        default: {
          cognitiveTraits: ["dyslexia", "adhd"],
          tone: "professional",
          summaryStyle: "detailed",
        },
      },
    };

    await saveSettings(settings);
    const loaded = await loadSettings();

    expect(loaded.apiKey).toBe("sk-ant-test-key");
    expect(loaded.profiles.default?.tone).toBe("professional");
    expect(loaded.profiles.default?.cognitiveTraits).toEqual(["dyslexia", "adhd"]);
  });

  it("sets file permissions to 0600", async () => {
    const config = makeTestConfig();
    await saveConfig(config);

    const settingsPath = join(getConfigDir(), "settings.json");
    const stats = await stat(settingsPath);
    expect(stats.mode & 0o777).toBe(0o600);
  });

  it("handles corrupt config file gracefully", async () => {
    await ensureConfigDir();
    const settingsPath = join(getConfigDir(), "settings.json");
    await fsWriteFile(settingsPath, "not json!!!", "utf-8");

    const config = await loadConfig();
    expect(config.apiKey).toBe("");
    expect(config.summaryStyle).toBe("standard");
  });

  it("fills missing fields with defaults", async () => {
    await ensureConfigDir();
    const settingsPath = join(getConfigDir(), "settings.json");
    await fsWriteFile(
      settingsPath,
      JSON.stringify({ apiKey: "my-key", activeProfile: "default", profiles: {} }),
      "utf-8",
    );

    const config = await loadConfig();
    expect(config.apiKey).toBe("my-key");
    expect(config.voice).toBe("en-US-JennyNeural");
    expect(config.summaryStyle).toBe("standard");
  });

  describe("migration from flat config.json", () => {
    it("migrates old flat config to new settings format", async () => {
      await ensureConfigDir();
      const legacyPath = join(getConfigDir(), "config.json");
      await fsWriteFile(
        legacyPath,
        JSON.stringify({
          apiKey: "sk-ant-old-key",
          voice: "en-US-GuyNeural",
          summaryDepth: "detailed",
        }),
        "utf-8",
      );

      const config = await loadConfig();

      expect(config.apiKey).toBe("sk-ant-old-key");
      expect(config.voice).toBe("en-US-GuyNeural");
      expect(config.summaryStyle).toBe("detailed");
      expect(config.cognitiveTraits).toEqual(["dyslexia", "adhd"]);
    });

    it("renames old config.json to .bak after migration", async () => {
      await ensureConfigDir();
      const legacyPath = join(getConfigDir(), "config.json");
      await fsWriteFile(
        legacyPath,
        JSON.stringify({ apiKey: "key", voice: "v", summaryDepth: "concise" }),
        "utf-8",
      );

      await loadConfig();

      const bakStats = await stat(`${legacyPath}.bak`);
      expect(bakStats.isFile()).toBe(true);

      const settingsStats = await stat(join(getConfigDir(), "settings.json"));
      expect(settingsStats.isFile()).toBe(true);
    });
  });

  describe("resolveConfig", () => {
    it("resolves model from summaryStyle default", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });

      expect(config.model).toBe(MODEL_IDS.opus);
    });

    it("resolves model from profile setting", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick", model: "opus" },
        },
      });

      expect(config.model).toBe(MODEL_IDS.opus);
    });

    it("CLI override takes precedence over profile model", () => {
      const config = resolveConfig(
        {
          activeProfile: "default",
          profiles: {
            default: {
              cognitiveTraits: [],
              tone: "casual",
              summaryStyle: "quick",
              model: "opus",
            },
          },
        },
        { model: "sonnet" },
      );

      expect(config.model).toBe(MODEL_IDS.sonnet);
    });

    it("resolves arbitrary model string from profile", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: {
            cognitiveTraits: [],
            tone: "casual",
            summaryStyle: "quick",
            model: "gpt-4o",
          },
        },
      });

      expect(config.model).toBe("gpt-4o");
    });

    it("resolves full model ID passed as override", () => {
      const config = resolveConfig(
        {
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          },
        },
        { model: "claude-opus-4-6" },
      );

      expect(config.model).toBe("claude-opus-4-6");
    });

    it("uses specified profile", () => {
      const config = resolveConfig(
        {
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
            work: { cognitiveTraits: [], tone: "professional", summaryStyle: "detailed" },
          },
        },
        { profileName: "work" },
      );

      expect(config.profileName).toBe("work");
      expect(config.tone).toBe("professional");
      expect(config.summaryStyle).toBe("detailed");
    });

    it("falls back to default profile for unknown profile name", () => {
      const config = resolveConfig(
        {
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: ["adhd"], tone: "casual", summaryStyle: "quick" },
          },
        },
        { profileName: "nonexistent" },
      );

      expect(config.cognitiveTraits).toEqual(["adhd"]);
    });

    it("defaults provider to cli", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });
      expect(config.provider).toBe("cli");
    });

    it("resolves provider from profile", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: {
            cognitiveTraits: [],
            tone: "casual",
            summaryStyle: "quick",
            provider: "cli",
          },
        },
      });
      expect(config.provider).toBe("cli");
    });

    it("overrides provider from CLI override", () => {
      const config = resolveConfig(
        {
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          },
        },
        { provider: "cli" },
      );
      expect(config.provider).toBe("cli");
    });

    it("defaults outputDir to ~/Documents/tldr", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });
      expect(config.outputDir).toContain("Documents/tldr");
    });

    it("uses custom outputDir from settings", () => {
      const config = resolveConfig({
        activeProfile: "default",
        outputDir: "/custom/output",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });
      expect(config.outputDir).toBe("/custom/output");
    });

    it("overrides apiKey from overrides", () => {
      const config = resolveConfig(
        {
          apiKey: "stored-key",
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          },
        },
        { apiKey: "override-key" },
      );

      expect(config.apiKey).toBe("override-key");
    });

    it("defaults pitch to 'default' and volume to 'normal'", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });
      expect(config.pitch).toBe("default");
      expect(config.volume).toBe("normal");
    });

    it("resolves pitch and volume from profile", () => {
      const config = resolveConfig({
        activeProfile: "default",
        profiles: {
          default: {
            cognitiveTraits: [],
            tone: "casual",
            summaryStyle: "quick",
            pitch: "low",
            volume: "loud",
          },
        },
      });
      expect(config.pitch).toBe("low");
      expect(config.volume).toBe("loud");
    });

    it("ignores invalid pitch/volume and falls back to defaults", () => {
      const profile = {
        cognitiveTraits: [] as import("../lib/types.js").CognitiveTrait[],
        tone: "casual" as const,
        summaryStyle: "quick" as const,
        pitch: "invalid",
        volume: "invalid",
      } as unknown as import("../lib/types.js").Profile;
      const config = resolveConfig({
        activeProfile: "default",
        profiles: { default: profile },
      });
      expect(config.pitch).toBe("default");
      expect(config.volume).toBe("normal");
    });
  });

  describe("resolveModelId", () => {
    it("maps tier aliases to full IDs", () => {
      expect(resolveModelId("haiku")).toBe(MODEL_IDS.haiku);
      expect(resolveModelId("sonnet")).toBe(MODEL_IDS.sonnet);
      expect(resolveModelId("opus")).toBe(MODEL_IDS.opus);
    });

    it("passes through full model IDs unchanged", () => {
      expect(resolveModelId("claude-opus-4-6")).toBe("claude-opus-4-6");
    });

    it("passes through arbitrary model IDs unchanged", () => {
      expect(resolveModelId("gpt-4o")).toBe("gpt-4o");
    });
  });

  describe("env var overrides", () => {
    it("reads ANTHROPIC_API_KEY", () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "env-key");
      const overrides = getEnvOverrides();
      expect(overrides.apiKey).toBe("env-key");
    });

    it("reads ANTHROPIC_BASE_URL", () => {
      vi.stubEnv("ANTHROPIC_BASE_URL", "https://proxy.example.com");
      const overrides = getEnvOverrides();
      expect(overrides.baseUrl).toBe("https://proxy.example.com");
    });

    it("reads ANTHROPIC_MODEL", () => {
      vi.stubEnv("ANTHROPIC_MODEL", "sonnet");
      const overrides = getEnvOverrides();
      expect(overrides.model).toBe("sonnet");
    });

    it("returns empty object when no env vars set", () => {
      const overrides = getEnvOverrides();
      expect(overrides).toEqual({});
    });
  });

  describe("profile CRUD", () => {
    it("lists profiles with active marker", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          work: { cognitiveTraits: [], tone: "professional", summaryStyle: "detailed" },
        },
      });

      const profiles = await listProfiles();

      expect(profiles).toEqual([
        { name: "default", active: true },
        { name: "work", active: false },
      ]);
    });

    it("creates a new profile", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });

      await createProfile("work", { tone: "professional" });

      const settings = await loadSettings();
      expect(settings.profiles.work).toBeDefined();
      expect(settings.profiles.work?.tone).toBe("professional");
    });

    it("throws when creating duplicate profile", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });

      await expect(createProfile("default")).rejects.toThrow("already exists");
    });

    it("deletes a profile", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          work: { cognitiveTraits: [], tone: "professional", summaryStyle: "detailed" },
        },
      });

      await deleteProfile("work");

      const settings = await loadSettings();
      expect(settings.profiles.work).toBeUndefined();
    });

    it("prevents deleting default profile", async () => {
      await expect(deleteProfile("default")).rejects.toThrow("Cannot delete");
    });

    it("resets active profile when deleting the active one", async () => {
      await saveSettings({
        activeProfile: "work",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          work: { cognitiveTraits: [], tone: "professional", summaryStyle: "detailed" },
        },
      });

      await deleteProfile("work");

      const settings = await loadSettings();
      expect(settings.activeProfile).toBe("default");
    });

    it("sets active profile", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
          work: { cognitiveTraits: [], tone: "professional", summaryStyle: "detailed" },
        },
      });

      await setActiveProfile("work");

      const settings = await loadSettings();
      expect(settings.activeProfile).toBe("work");
    });

    it("throws when setting active to nonexistent profile", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "quick" },
        },
      });

      await expect(setActiveProfile("nonexistent")).rejects.toThrow("does not exist");
    });
  });

  describe("theme settings", () => {
    it("saves and loads theme round-trip", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
        theme: { name: "ocean", appearance: "dark" },
      });

      const loaded = await loadSettings();
      expect(loaded.theme).toEqual({ name: "ocean", appearance: "dark" });
    });

    it("returns undefined theme when not set", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
      });

      const loaded = await loadSettings();
      expect(loaded.theme).toBeUndefined();
    });

    it("ignores invalid theme name", async () => {
      await ensureConfigDir();
      const settingsPath = join(getConfigDir(), "settings.json");
      await fsWriteFile(
        settingsPath,
        JSON.stringify({
          activeProfile: "default",
          profiles: {},
          theme: { name: "neon", appearance: "dark" },
        }),
        "utf-8",
      );

      const loaded = await loadSettings();
      expect(loaded.theme).toBeUndefined();
    });

    it("ignores invalid appearance mode", async () => {
      await ensureConfigDir();
      const settingsPath = join(getConfigDir(), "settings.json");
      await fsWriteFile(
        settingsPath,
        JSON.stringify({
          activeProfile: "default",
          profiles: {},
          theme: { name: "coral", appearance: "neon" },
        }),
        "utf-8",
      );

      const loaded = await loadSettings();
      expect(loaded.theme).toBeUndefined();
    });

    it("ignores theme when not an object", async () => {
      await ensureConfigDir();
      const settingsPath = join(getConfigDir(), "settings.json");
      await fsWriteFile(
        settingsPath,
        JSON.stringify({
          activeProfile: "default",
          profiles: {},
          theme: "coral",
        }),
        "utf-8",
      );

      const loaded = await loadSettings();
      expect(loaded.theme).toBeUndefined();
    });

    it("parses all valid theme names", async () => {
      for (const name of ["coral", "ocean", "forest"]) {
        await saveSettings({
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
          },
          theme: { name: name as "coral" | "ocean" | "forest", appearance: "auto" },
        });

        const loaded = await loadSettings();
        expect(loaded.theme?.name).toBe(name);
      }
    });

    it("parses all valid appearance modes", async () => {
      for (const appearance of ["auto", "dark", "light"]) {
        await saveSettings({
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
          },
          theme: {
            name: "coral",
            appearance: appearance as "auto" | "dark" | "light",
          },
        });

        const loaded = await loadSettings();
        expect(loaded.theme?.appearance).toBe(appearance);
      }
    });
  });

  describe("setTheme", () => {
    it("sets theme name while preserving appearance", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
        theme: { name: "coral", appearance: "dark" },
      });

      await setTheme({ name: "ocean" });

      const loaded = await loadSettings();
      expect(loaded.theme).toEqual({ name: "ocean", appearance: "dark" });
    });

    it("sets appearance while preserving theme name", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
        theme: { name: "forest", appearance: "dark" },
      });

      await setTheme({ appearance: "light" });

      const loaded = await loadSettings();
      expect(loaded.theme).toEqual({ name: "forest", appearance: "light" });
    });

    it("creates theme from defaults when none exists", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
      });

      await setTheme({ name: "ocean" });

      const loaded = await loadSettings();
      expect(loaded.theme).toEqual({ name: "ocean", appearance: "auto" });
    });

    it("sets both name and appearance at once", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
      });

      await setTheme({ name: "forest", appearance: "light" });

      const loaded = await loadSettings();
      expect(loaded.theme).toEqual({ name: "forest", appearance: "light" });
    });
  });

  describe("backward compatibility", () => {
    it("ignores legacy ttsMode in settings", async () => {
      await ensureConfigDir();
      const settingsPath = join(getConfigDir(), "settings.json");
      await fsWriteFile(
        settingsPath,
        JSON.stringify({
          apiKey: "key",
          activeProfile: "default",
          profiles: {
            default: {
              cognitiveTraits: ["adhd"],
              tone: "casual",
              summaryStyle: "quick",
              ttsMode: "strip",
            },
          },
        }),
        "utf-8",
      );

      const config = await loadConfig();
      expect(config.tone).toBe("casual");
      expect((config as unknown as Record<string, unknown>).ttsMode).toBeUndefined();
    });
  });

  describe("pitch/volume round-trip", () => {
    it("saves and loads pitch/volume round-trip", async () => {
      const config = makeTestConfig({ pitch: "high" as const, volume: "quiet" as const });
      await saveConfig(config);
      const loaded = await loadConfig();
      expect(loaded.pitch).toBe("high");
      expect(loaded.volume).toBe("quiet");
    });
  });

  describe("setupCompleted", () => {
    it("fresh install (no file) returns setupCompleted as undefined", async () => {
      const settings = await loadSettings();
      // Fresh install has no file, so setupCompleted stays undefined from DEFAULT_SETTINGS
      // But loadSettings returns undefined for fresh installs (no migration path hit)
      expect(settings.setupCompleted).toBeUndefined();
    });

    it("existing file without setupCompleted defaults to true (migration)", async () => {
      await ensureConfigDir();
      const settingsPath = join(getConfigDir(), "settings.json");
      await fsWriteFile(
        settingsPath,
        JSON.stringify({
          activeProfile: "default",
          profiles: {
            default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
          },
        }),
        "utf-8",
      );

      const settings = await loadSettings();
      expect(settings.setupCompleted).toBe(true);
    });

    it("saveConfig sets setupCompleted to true", async () => {
      const config = makeTestConfig();
      await saveConfig(config);
      const settings = await loadSettings();
      expect(settings.setupCompleted).toBe(true);
    });

    it("round-trip: save with setupCompleted=true, load it back", async () => {
      await saveSettings({
        activeProfile: "default",
        profiles: {
          default: { cognitiveTraits: [], tone: "casual", summaryStyle: "standard" },
        },
        setupCompleted: true,
      });

      const loaded = await loadSettings();
      expect(loaded.setupCompleted).toBe(true);
    });
  });
});
