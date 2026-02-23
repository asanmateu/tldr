import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvedConfig } from "../../lib/types.js";

function makeTestConfig(overrides?: Partial<ResolvedConfig>): ResolvedConfig {
  return {
    apiKey: "",
    baseUrl: undefined,
    maxTokens: 1024,
    profileName: "default",
    cognitiveTraits: [],
    tone: "casual",
    summaryStyle: "quick",
    model: "claude-sonnet-4-5-20250929",
    customInstructions: undefined,
    voice: "en-US-JennyNeural",
    ttsSpeed: 1.0,
    pitch: "default",
    volume: "normal",
    provider: "anthropic",
    outputDir: "/tmp/tldr-output",
    ttsProvider: "edge-tts",
    ttsModel: "tts-1",
    audioMode: "podcast",
    ...overrides,
  };
}

const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
  spawn: vi.fn(),
}));

const { getProvider, ProviderAuthError } = await import("../../lib/providers/index.js");

function unsetEnv(key: string) {
  const { [key]: _, ...rest } = process.env;
  process.env = rest as NodeJS.ProcessEnv;
}

describe("getProvider auth validation", () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("throws ProviderAuthError for anthropic without API key", async () => {
    unsetEnv("ANTHROPIC_API_KEY");
    const config = makeTestConfig({ provider: "anthropic", apiKey: "" });

    await expect(getProvider("anthropic", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("anthropic", config)).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("throws ProviderAuthError for openai without API key", async () => {
    unsetEnv("OPENAI_API_KEY");
    const config = makeTestConfig({ provider: "openai", apiKey: "" });

    await expect(getProvider("openai", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("openai", config)).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("throws ProviderAuthError for gemini without API key", async () => {
    unsetEnv("GEMINI_API_KEY");
    const config = makeTestConfig({ provider: "gemini", apiKey: "" });

    await expect(getProvider("gemini", config)).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("throws ProviderAuthError for xai without API key", async () => {
    unsetEnv("XAI_API_KEY");
    const config = makeTestConfig({ provider: "xai", apiKey: "" });

    await expect(getProvider("xai", config)).rejects.toThrow(/XAI_API_KEY/);
  });

  it("passes when API key is in config", async () => {
    unsetEnv("ANTHROPIC_API_KEY");
    const config = makeTestConfig({ provider: "anthropic", apiKey: "sk-ant-test" });

    const provider = await getProvider("anthropic", config);
    expect(provider).toBeDefined();
  });

  it("passes when API key is in env var", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-env";
    const config = makeTestConfig({ provider: "anthropic", apiKey: "" });

    const provider = await getProvider("anthropic", config);
    expect(provider).toBeDefined();
  });

  it("throws for claude-code when CLI is not found", async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not found");
    });
    const config = makeTestConfig({ provider: "claude-code" });

    await expect(getProvider("claude-code", config)).rejects.toThrow(/Claude Code CLI not found/);
  });

  it("includes install link for claude-code", async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not found");
    });
    const config = makeTestConfig({ provider: "claude-code" });

    await expect(getProvider("claude-code", config)).rejects.toThrow(/docs\.anthropic\.com/);
  });

  it("passes for claude-code when CLI is available", async () => {
    mockExecSync.mockReturnValue("1.0.0");
    const config = makeTestConfig({ provider: "claude-code" });

    const provider = await getProvider("claude-code", config);
    expect(provider).toBeDefined();
  });

  it("throws for codex when CLI is not found", async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not found");
    });
    const config = makeTestConfig({ provider: "codex" });

    await expect(getProvider("codex", config)).rejects.toThrow(/Codex CLI not found/);
  });

  it("does not validate when config is omitted", async () => {
    unsetEnv("ANTHROPIC_API_KEY");

    const provider = await getProvider("anthropic");
    expect(provider).toBeDefined();
  });

  it("does not require API key for ollama", async () => {
    const config = makeTestConfig({ provider: "ollama", apiKey: "" });

    const provider = await getProvider("ollama", config);
    expect(provider).toBeDefined();
  });
});
