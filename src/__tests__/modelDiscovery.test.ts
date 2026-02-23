import { writeFile as fsWriteFile, mkdtemp, rm } from "node:fs/promises";
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
  getCachedModels,
  clearModelCache,
  resolveModelIdDynamic,
  suggestModel,
  canListModels,
  listModelsForProvider,
} = await import("../lib/modelDiscovery.js");
const { MODEL_IDS } = await import("../lib/config.js");
const { ensureConfigDir } = await import("../lib/config.js");

describe("modelDiscovery", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tldr-model-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("cache read/write round-trip", () => {
    it("returns null when no cache exists", async () => {
      const result = await getCachedModels("anthropic");
      expect(result).toBeNull();
    });

    it("stores and retrieves models from cache", async () => {
      // Write a cache file directly
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          {
            provider: "anthropic",
            models: [
              { id: "claude-opus-4-6", displayName: "Claude Opus 4", tier: "opus" },
              { id: "claude-sonnet-4-5-20250929", tier: "sonnet" },
            ],
            fetchedAt: Date.now(),
          },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      const result = await getCachedModels("anthropic");
      expect(result).toHaveLength(2);
      expect(result?.[0]?.id).toBe("claude-opus-4-6");
      expect(result?.[0]?.tier).toBe("opus");
    });

    it("returns null for unknown provider", async () => {
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          {
            provider: "anthropic",
            models: [{ id: "claude-opus-4-6" }],
            fetchedAt: Date.now(),
          },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      const result = await getCachedModels("openai");
      expect(result).toBeNull();
    });
  });

  describe("cache TTL expiration", () => {
    it("returns null for expired cache entries", async () => {
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          {
            provider: "anthropic",
            models: [{ id: "claude-opus-4-6" }],
            fetchedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
          },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      const result = await getCachedModels("anthropic");
      expect(result).toBeNull();
    });

    it("returns models for fresh cache entries", async () => {
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          {
            provider: "anthropic",
            models: [{ id: "claude-opus-4-6" }],
            fetchedAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
          },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      const result = await getCachedModels("anthropic");
      expect(result).toHaveLength(1);
    });
  });

  describe("clearModelCache", () => {
    it("clears specific provider from cache", async () => {
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          { provider: "anthropic", models: [{ id: "m1" }], fetchedAt: Date.now() },
          { provider: "openai", models: [{ id: "m2" }], fetchedAt: Date.now() },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      await clearModelCache("anthropic");

      const anthropic = await getCachedModels("anthropic");
      const openai = await getCachedModels("openai");
      expect(anthropic).toBeNull();
      expect(openai).toHaveLength(1);
    });

    it("clears all providers when no argument given", async () => {
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          { provider: "anthropic", models: [{ id: "m1" }], fetchedAt: Date.now() },
          { provider: "openai", models: [{ id: "m2" }], fetchedAt: Date.now() },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      await clearModelCache();

      const anthropic = await getCachedModels("anthropic");
      const openai = await getCachedModels("openai");
      expect(anthropic).toBeNull();
      expect(openai).toBeNull();
    });
  });

  describe("resolveModelIdDynamic", () => {
    it("resolves tier alias to latest cached model for anthropic", () => {
      const cached = [
        { id: "claude-opus-4-6", tier: "opus" as const },
        { id: "claude-sonnet-4-5-20250929", tier: "sonnet" as const },
        { id: "claude-haiku-4-5-20251001", tier: "haiku" as const },
      ];

      expect(resolveModelIdDynamic("opus", "anthropic", cached)).toBe("claude-opus-4-6");
      expect(resolveModelIdDynamic("sonnet", "anthropic", cached)).toBe(
        "claude-sonnet-4-5-20250929",
      );
      expect(resolveModelIdDynamic("haiku", "anthropic", cached)).toBe("claude-haiku-4-5-20251001");
    });

    it("falls back to static MODEL_IDS when cache is empty", () => {
      expect(resolveModelIdDynamic("opus", "anthropic", [])).toBe(MODEL_IDS.opus);
      expect(resolveModelIdDynamic("sonnet", "anthropic", [])).toBe(MODEL_IDS.sonnet);
      expect(resolveModelIdDynamic("haiku", "anthropic", [])).toBe(MODEL_IDS.haiku);
    });

    it("falls back to static MODEL_IDS for non-anthropic provider", () => {
      const cached = [{ id: "gpt-4o" }];

      expect(resolveModelIdDynamic("opus", "openai", cached)).toBe(MODEL_IDS.opus);
    });

    it("passes through arbitrary model IDs unchanged", () => {
      const cached = [{ id: "claude-opus-4-6", tier: "opus" as const }];

      expect(resolveModelIdDynamic("gpt-4o", "openai", cached)).toBe("gpt-4o");
      expect(resolveModelIdDynamic("claude-opus-4-6", "anthropic", cached)).toBe("claude-opus-4-6");
      expect(resolveModelIdDynamic("llama3.3", "ollama", cached)).toBe("llama3.3");
    });
  });

  describe("suggestModel", () => {
    const models = [
      { id: "claude-opus-4-6" },
      { id: "claude-sonnet-4-5-20250929" },
      { id: "claude-haiku-4-5-20251001" },
      { id: "gpt-4o" },
    ];

    it("fuzzy matches 'claude-opus-4.6' to 'claude-opus-4-6'", () => {
      expect(suggestModel("claude-opus-4.6", models)).toBe("claude-opus-4-6");
    });

    it("fuzzy matches common typos", () => {
      expect(suggestModel("gpt-40", models)).toBe("gpt-4o");
    });

    it("returns undefined for totally different strings", () => {
      expect(suggestModel("totally-different-model-name", models)).toBeUndefined();
    });

    it("returns undefined for empty model list", () => {
      expect(suggestModel("claude-opus-4-6", [])).toBeUndefined();
    });
  });

  describe("canListModels", () => {
    it("returns true for API providers", () => {
      expect(canListModels("anthropic")).toBe(true);
      expect(canListModels("openai")).toBe(true);
      expect(canListModels("gemini")).toBe(true);
      expect(canListModels("ollama")).toBe(true);
      expect(canListModels("xai")).toBe(true);
    });

    it("returns false for CLI providers", () => {
      expect(canListModels("claude-code")).toBe(false);
      expect(canListModels("codex")).toBe(false);
    });
  });

  describe("listModelsForProvider", () => {
    it("returns empty array for non-listable providers", async () => {
      const result = await listModelsForProvider("claude-code");
      expect(result).toEqual([]);
    });

    it("returns empty array for codex", async () => {
      const result = await listModelsForProvider("codex");
      expect(result).toEqual([]);
    });

    it("returns cached models when cache is fresh", async () => {
      // Pre-populate the cache
      await ensureConfigDir();
      const cacheFile = join(tempDir, ".tldr", "models-cache.json");
      const cache = {
        version: 1,
        entries: [
          {
            provider: "anthropic",
            models: [{ id: "cached-model", tier: "opus" }],
            fetchedAt: Date.now(),
          },
        ],
      };
      await fsWriteFile(cacheFile, JSON.stringify(cache), "utf-8");

      const result = await listModelsForProvider("anthropic", { apiKey: "test" });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("cached-model");
    });

    it("returns empty array on network failure (no cache)", async () => {
      // No cache, invalid API key — should fail silently
      const result = await listModelsForProvider("anthropic", { apiKey: "invalid" });
      expect(result).toEqual([]);
    });
  });
});
