import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ModelTier, SummarizationProvider } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  displayName?: string;
  tier?: ModelTier;
}

interface CacheEntry {
  provider: string;
  models: ModelInfo[];
  fetchedAt: number;
}

interface ModelsCache {
  version: 1;
  entries: CacheEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 5000;

const LISTABLE_PROVIDERS = new Set<SummarizationProvider>([
  "anthropic",
  "openai",
  "gemini",
  "ollama",
  "xai",
]);

const TIER_PATTERNS: Record<ModelTier, RegExp> = {
  haiku: /claude-.*haiku/i,
  sonnet: /claude-.*sonnet/i,
  opus: /claude-.*opus/i,
};

// Static fallback IDs — used when cache has no match for a tier
const STATIC_TIER_IDS: Record<ModelTier, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
  opus: "claude-opus-4-6",
};

// ---------------------------------------------------------------------------
// Cache helpers (same silent-failure pattern as updateCheck.ts)
// ---------------------------------------------------------------------------

function getConfigDir(): string {
  return join(homedir(), ".tldr");
}

function getCacheFile(): string {
  return join(getConfigDir(), "models-cache.json");
}

async function ensureDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
}

async function readCacheFile(): Promise<ModelsCache | null> {
  try {
    const raw = await readFile(getCacheFile(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1 && Array.isArray(parsed.entries)) {
      return parsed as ModelsCache;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCacheFile(cache: ModelsCache): Promise<void> {
  try {
    await ensureDir();
    await writeFile(getCacheFile(), JSON.stringify(cache), "utf-8");
  } catch {
    // Fail silently
  }
}

export async function getCachedModels(provider: string): Promise<ModelInfo[] | null> {
  const cache = await readCacheFile();
  if (!cache) return null;

  const entry = cache.entries.find((e) => e.provider === provider);
  if (!entry) return null;

  if (Date.now() - entry.fetchedAt >= CACHE_TTL_MS) return null;
  return entry.models;
}

async function updateCacheEntry(provider: string, models: ModelInfo[]): Promise<void> {
  const cache = (await readCacheFile()) ?? { version: 1, entries: [] };
  const idx = cache.entries.findIndex((e) => e.provider === provider);
  const entry: CacheEntry = { provider, models, fetchedAt: Date.now() };
  if (idx >= 0) {
    cache.entries[idx] = entry;
  } else {
    cache.entries.push(entry);
  }
  await writeCacheFile(cache);
}

export async function clearModelCache(provider?: string): Promise<void> {
  if (!provider) {
    await writeCacheFile({ version: 1, entries: [] });
    return;
  }
  const cache = await readCacheFile();
  if (!cache) return;
  cache.entries = cache.entries.filter((e) => e.provider !== provider);
  await writeCacheFile(cache);
}

// ---------------------------------------------------------------------------
// Per-provider listing functions
// ---------------------------------------------------------------------------

function assignTier(id: string): ModelTier | undefined {
  for (const [tier, pattern] of Object.entries(TIER_PATTERNS)) {
    if (pattern.test(id)) return tier as ModelTier;
  }
  return undefined;
}

async function listAnthropicModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, baseURL: baseUrl ?? undefined });

  const models: ModelInfo[] = [];
  for await (const model of client.models.list({ limit: 100 })) {
    const tier = assignTier(model.id);
    const displayName = model.display_name ?? undefined;
    const info: ModelInfo = { id: model.id };
    if (displayName) info.displayName = displayName;
    if (tier) info.tier = tier;
    models.push(info);
  }

  // Sort: models with tiers first (opus > sonnet > haiku), then by ID descending
  const tierOrder: Record<string, number> = { opus: 0, sonnet: 1, haiku: 2 };
  models.sort((a, b) => {
    const aTier = a.tier ? (tierOrder[a.tier] ?? 99) : 99;
    const bTier = b.tier ? (tierOrder[b.tier] ?? 99) : 99;
    if (aTier !== bTier) return aTier - bTier;
    return b.id.localeCompare(a.id);
  });

  return models;
}

async function listOpenAIModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey, baseURL: baseUrl ?? undefined });

  const response = await client.models.list();
  const chatPattern = /^(gpt-|o1-|o3-|o4-|chatgpt-)/i;
  const models: ModelInfo[] = [];

  for (const model of response.data) {
    if (chatPattern.test(model.id)) {
      models.push({ id: model.id });
    }
  }

  models.sort((a, b) => b.id.localeCompare(a.id));
  return models;
}

async function listGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const models: ModelInfo[] = [];

  for (const model of pager.page) {
    if (model.name) {
      const id = model.name.replace(/^models\//, "");
      const info: ModelInfo = { id };
      if (model.displayName) info.displayName = model.displayName;
      models.push(info);
    }
  }

  models.sort((a, b) => b.id.localeCompare(a.id));
  return models;
}

async function listOllamaModels(baseUrl?: string): Promise<ModelInfo[]> {
  const url = `${baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/api/tags`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { models?: { name: string }[] };
  if (!Array.isArray(data.models)) return [];

  return data.models.map((m) => ({ id: m.name }));
}

async function listXAIModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl ?? process.env.XAI_BASE_URL ?? "https://api.x.ai/v1",
  });

  const response = await client.models.list();
  const models: ModelInfo[] = [];

  for (const model of response.data) {
    models.push({ id: model.id });
  }

  models.sort((a, b) => b.id.localeCompare(a.id));
  return models;
}

async function listOpenAITtsModels(apiKey: string): Promise<ModelInfo[]> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const response = await client.models.list();
  const models: ModelInfo[] = [];

  for (const model of response.data) {
    if (/tts/i.test(model.id)) {
      models.push({ id: model.id });
    }
  }

  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

// ---------------------------------------------------------------------------
// Unified dispatcher
// ---------------------------------------------------------------------------

export async function listModelsForProvider(
  provider: SummarizationProvider | "openai-tts",
  options?: { apiKey?: string; baseUrl?: string; forceRefresh?: boolean },
): Promise<ModelInfo[]> {
  if (provider !== "openai-tts" && !LISTABLE_PROVIDERS.has(provider)) {
    return [];
  }

  if (!options?.forceRefresh) {
    const cached = await getCachedModels(provider);
    if (cached) return cached;
  }

  try {
    let models: ModelInfo[];
    const apiKey = options?.apiKey ?? "";
    const baseUrl = options?.baseUrl;

    switch (provider) {
      case "anthropic":
        models = await listAnthropicModels(apiKey, baseUrl);
        break;
      case "openai":
        models = await listOpenAIModels(apiKey, baseUrl);
        break;
      case "gemini":
        models = await listGeminiModels(apiKey);
        break;
      case "ollama":
        models = await listOllamaModels(baseUrl);
        break;
      case "xai":
        models = await listXAIModels(apiKey, baseUrl);
        break;
      case "openai-tts":
        models = await listOpenAITtsModels(apiKey);
        break;
      default:
        return [];
    }

    if (models.length > 0) {
      await updateCacheEntry(provider, models);
    }

    return models;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dynamic tier resolution
// ---------------------------------------------------------------------------

export function resolveModelIdDynamic(
  input: string,
  provider: SummarizationProvider,
  cachedModels: ModelInfo[],
): string {
  const tier = input.toLowerCase();
  const isTier = tier === "haiku" || tier === "sonnet" || tier === "opus";

  if (!isTier) return input;

  if (provider === "anthropic" && cachedModels.length > 0) {
    const match = cachedModels.find((m) => m.tier === tier);
    if (match) return match.id;
  }

  // Fall back to static IDs
  return STATIC_TIER_IDS[tier as ModelTier];
}

// ---------------------------------------------------------------------------
// Model suggestion (fuzzy match)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use two rows instead of full matrix to avoid non-null assertion noise
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? (prev[j - 1] ?? 0)
          : 1 + Math.min(prev[j] ?? 0, curr[j - 1] ?? 0, prev[j - 1] ?? 0);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n] ?? 0;
}

export function suggestModel(input: string, models: ModelInfo[]): string | undefined {
  let best: string | undefined;
  let bestDist = 4; // threshold: must be ≤ 3

  for (const m of models) {
    const dist = levenshtein(input.toLowerCase(), m.id.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = m.id;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Public helper
// ---------------------------------------------------------------------------

export function canListModels(provider: SummarizationProvider): boolean {
  return LISTABLE_PROVIDERS.has(provider);
}
