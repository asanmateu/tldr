import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  isClaudeCodeAvailable: vi.fn(),
  isCodexAvailable: vi.fn(),
  getCachedModels: vi.fn(),
  suggestModel: vi.fn(),
}));

// Mock modelDiscovery to control cache behavior in tests
vi.mock("../lib/modelDiscovery.js", () => ({
  getCachedModels: mocks.getCachedModels,
  suggestModel: mocks.suggestModel,
}));

// ---------------------------------------------------------------------------
// Mock all provider modules to avoid importing real SDKs
// ---------------------------------------------------------------------------
vi.mock("../lib/providers/claude-code.js", () => ({
  isClaudeCodeAvailable: mocks.isClaudeCodeAvailable,
  claudeCodeProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));
vi.mock("../lib/providers/codex.js", () => ({
  isCodexAvailable: mocks.isCodexAvailable,
  codexProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));
vi.mock("../lib/providers/anthropic.js", () => ({
  anthropicProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));
vi.mock("../lib/providers/openai.js", () => ({
  openaiProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));
vi.mock("../lib/providers/gemini.js", () => ({
  geminiProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));
vi.mock("../lib/providers/ollama.js", () => ({
  ollamaProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));
vi.mock("../lib/providers/xai.js", () => ({
  xaiProvider: { summarize: vi.fn(), rewrite: vi.fn(), chat: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Dynamic import AFTER mocks
// ---------------------------------------------------------------------------
const { getProvider, ProviderAuthError, ProviderConfigError } = await import(
  "../lib/providers/index.js"
);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const BASE_CONFIG: Config = {
  apiKey: "",
  baseUrl: undefined,
  maxTokens: 1024,
  profileName: "default",
  cognitiveTraits: [],
  tone: "casual",
  summaryStyle: "standard",
  model: "claude-haiku-4-5-20251001",
  customInstructions: undefined,
  voice: "en-US-JennyNeural",
  ttsSpeed: 1.0,
  pitch: "default",
  volume: "normal",
  provider: "anthropic",
  outputDir: "/tmp/test",
  ttsProvider: "edge-tts",
  ttsModel: "tts-1",
  audioMode: "podcast" as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("getProvider auth validation", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    // Save and clear relevant env vars
    for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY"]) {
      savedEnv[key] = process.env[key];
      Reflect.deleteProperty(process.env, key);
    }
    mocks.isClaudeCodeAvailable.mockReturnValue(true);
    mocks.isCodexAvailable.mockReturnValue(true);
    // Default: no cached models (skip model validation)
    mocks.getCachedModels.mockResolvedValue(null);
    mocks.suggestModel.mockReturnValue(undefined);
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val !== undefined) {
        process.env[key] = val;
      } else {
        Reflect.deleteProperty(process.env, key);
      }
    }
  });

  it("throws ProviderAuthError for anthropic without API key or env var", async () => {
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "" };
    await expect(getProvider("anthropic", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("anthropic", config)).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("throws ProviderAuthError for openai without API key or env var", async () => {
    const config = { ...BASE_CONFIG, provider: "openai" as const, apiKey: "" };
    await expect(getProvider("openai", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("openai", config)).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("throws ProviderAuthError for gemini without API key or env var", async () => {
    const config = { ...BASE_CONFIG, provider: "gemini" as const, apiKey: "" };
    await expect(getProvider("gemini", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("gemini", config)).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("throws ProviderAuthError for xai without API key or env var", async () => {
    const config = { ...BASE_CONFIG, provider: "xai" as const, apiKey: "" };
    await expect(getProvider("xai", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("xai", config)).rejects.toThrow(/XAI_API_KEY/);
  });

  it("does not throw for anthropic when config has API key", async () => {
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "sk-test" };
    await expect(getProvider("anthropic", config)).resolves.toBeDefined();
  });

  it("does not throw for anthropic when env var is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-env-test";
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "" };
    await expect(getProvider("anthropic", config)).resolves.toBeDefined();
  });

  it("throws ProviderAuthError for claude-code when CLI unavailable", async () => {
    mocks.isClaudeCodeAvailable.mockReturnValue(false);
    const config = { ...BASE_CONFIG, provider: "claude-code" as const };
    await expect(getProvider("claude-code", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("claude-code", config)).rejects.toThrow(/Claude Code CLI/);
  });

  it("throws ProviderAuthError for codex when CLI unavailable", async () => {
    mocks.isCodexAvailable.mockReturnValue(false);
    const config = { ...BASE_CONFIG, provider: "codex" as const };
    await expect(getProvider("codex", config)).rejects.toThrow(ProviderAuthError);
    await expect(getProvider("codex", config)).rejects.toThrow(/Codex CLI/);
  });

  it("does not throw for claude-code when CLI available", async () => {
    mocks.isClaudeCodeAvailable.mockReturnValue(true);
    const config = { ...BASE_CONFIG, provider: "claude-code" as const };
    await expect(getProvider("claude-code", config)).resolves.toBeDefined();
  });

  it("does not throw for ollama (no auth required)", async () => {
    const config = { ...BASE_CONFIG, provider: "ollama" as const };
    await expect(getProvider("ollama", config)).resolves.toBeDefined();
  });

  it("skips validation when no config is passed", async () => {
    await expect(getProvider("anthropic")).resolves.toBeDefined();
  });
});

describe("getProvider model validation", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY"]) {
      savedEnv[key] = process.env[key];
      Reflect.deleteProperty(process.env, key);
    }
    mocks.isClaudeCodeAvailable.mockReturnValue(true);
    mocks.isCodexAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val !== undefined) {
        process.env[key] = val;
      } else {
        Reflect.deleteProperty(process.env, key);
      }
    }
  });

  it("does not throw when model is in cached list", async () => {
    mocks.getCachedModels.mockResolvedValue([
      { id: "claude-opus-4-6" },
      { id: "claude-sonnet-4-5-20250929" },
    ]);
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "sk-test" };
    config.model = "claude-opus-4-6";
    await expect(getProvider("anthropic", config)).resolves.toBeDefined();
  });

  it("throws ProviderConfigError when model is not in cached list", async () => {
    mocks.getCachedModels.mockResolvedValue([
      { id: "claude-opus-4-6" },
      { id: "claude-sonnet-4-5-20250929" },
    ]);
    mocks.suggestModel.mockReturnValue("claude-opus-4-6");
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "sk-test" };
    config.model = "claude-opus-4.6";
    await expect(getProvider("anthropic", config)).rejects.toThrow(ProviderConfigError);
    await expect(getProvider("anthropic", config)).rejects.toThrow(/Did you mean/);
  });

  it("skips model validation when cache is empty", async () => {
    mocks.getCachedModels.mockResolvedValue([]);
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "sk-test" };
    config.model = "any-model-name";
    await expect(getProvider("anthropic", config)).resolves.toBeDefined();
  });

  it("skips model validation when cache is null", async () => {
    mocks.getCachedModels.mockResolvedValue(null);
    const config = { ...BASE_CONFIG, provider: "anthropic" as const, apiKey: "sk-test" };
    config.model = "any-model-name";
    await expect(getProvider("anthropic", config)).resolves.toBeDefined();
  });
});
