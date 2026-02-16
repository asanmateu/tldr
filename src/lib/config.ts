import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  AppearanceMode,
  CognitiveTrait,
  ConfigOverrides,
  ModelTier,
  PitchPreset,
  Profile,
  ResolvedConfig,
  SummarizationProvider,
  SummaryStyle,
  ThemeConfig,
  ThemeName,
  TldrSettings,
  Tone,
  VolumePreset,
} from "./types.js";

export const MODEL_IDS: Record<ModelTier, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
  opus: "claude-opus-4-6",
};

const SUMMARY_STYLE_DEFAULTS: Record<SummaryStyle, ModelTier> = {
  quick: "opus",
  standard: "opus",
  detailed: "opus",
  "study-notes": "opus",
};

const DEFAULT_PROFILE: Profile = {
  cognitiveTraits: ["dyslexia"],
  tone: "casual",
  summaryStyle: "standard",
};

const DEFAULT_SETTINGS: TldrSettings = {
  activeProfile: "default",
  profiles: { default: { ...DEFAULT_PROFILE } },
};

export function getConfigDir(): string {
  return join(homedir(), ".tldr");
}

function getSettingsFile(): string {
  return join(getConfigDir(), "settings.json");
}

function getLegacyConfigFile(): string {
  return join(getConfigDir(), "config.json");
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
}

function isOldFlatConfig(obj: Record<string, unknown>): boolean {
  return "summaryDepth" in obj && !("profiles" in obj);
}

function migrateFromFlat(obj: Record<string, unknown>): TldrSettings {
  const summaryStyle: SummaryStyle = obj.summaryDepth === "detailed" ? "detailed" : "standard";

  const profile: Profile = {
    cognitiveTraits: ["dyslexia", "adhd"],
    tone: "casual",
    summaryStyle,
    voice: typeof obj.voice === "string" ? obj.voice : undefined,
  };

  return {
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey : undefined,
    activeProfile: "default",
    profiles: { default: profile },
  };
}

function parseSettings(parsed: unknown): TldrSettings {
  if (typeof parsed !== "object" || parsed === null) {
    return { ...DEFAULT_SETTINGS, profiles: { default: { ...DEFAULT_PROFILE } } };
  }

  const obj = parsed as Record<string, unknown>;

  if (isOldFlatConfig(obj)) {
    return migrateFromFlat(obj);
  }

  const profiles: Record<string, Profile> = {};
  if (typeof obj.profiles === "object" && obj.profiles !== null) {
    for (const [name, raw] of Object.entries(obj.profiles as Record<string, unknown>)) {
      profiles[name] = parseProfile(raw);
    }
  }
  if (!profiles.default) {
    profiles.default = { ...DEFAULT_PROFILE };
  }

  let theme: ThemeConfig | undefined;
  if (typeof obj.theme === "object" && obj.theme !== null) {
    const t = obj.theme as Record<string, unknown>;
    if (
      typeof t.name === "string" &&
      VALID_THEME_NAMES.has(t.name) &&
      typeof t.appearance === "string" &&
      VALID_APPEARANCES.has(t.appearance)
    ) {
      theme = { name: t.name as ThemeName, appearance: t.appearance as AppearanceMode };
    }
  }

  return {
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey : undefined,
    baseUrl: typeof obj.baseUrl === "string" ? obj.baseUrl : undefined,
    maxTokens: typeof obj.maxTokens === "number" ? obj.maxTokens : undefined,
    outputDir: typeof obj.outputDir === "string" ? obj.outputDir : undefined,
    activeProfile: typeof obj.activeProfile === "string" ? obj.activeProfile : "default",
    profiles,
    theme,
    setupCompleted: typeof obj.setupCompleted === "boolean" ? obj.setupCompleted : undefined,
  };
}

export const VALID_TONES = new Set(["casual", "professional", "academic", "eli5"]);
export const VALID_STYLES = new Set(["quick", "standard", "detailed", "study-notes"]);
export const VALID_TRAITS = new Set(["dyslexia", "adhd", "autism", "esl", "visual-thinker"]);
export const VALID_PITCHES = new Set(["low", "default", "high"]);
export const VALID_VOLUMES = new Set(["quiet", "normal", "loud"]);
export const VALID_PROVIDERS = new Set(["api", "cli"]);
export const VALID_THEME_NAMES = new Set(["coral", "ocean", "forest"]);
export const VALID_APPEARANCES = new Set(["dark", "light", "auto"]);
export const VALID_VOICES = new Set([
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "en-US-AriaNeural",
  "en-GB-SoniaNeural",
  "en-AU-NatashaNeural",
]);

function parseProfile(raw: unknown): Profile {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_PROFILE };
  }

  const obj = raw as Record<string, unknown>;

  const cognitiveTraits = Array.isArray(obj.cognitiveTraits)
    ? (obj.cognitiveTraits.filter(
        (t): t is string => typeof t === "string" && VALID_TRAITS.has(t),
      ) as CognitiveTrait[])
    : [];

  let styleModels: Partial<Record<SummaryStyle, string>> | undefined;
  if (typeof obj.styleModels === "object" && obj.styleModels !== null) {
    const raw = obj.styleModels as Record<string, unknown>;
    const parsed: Partial<Record<SummaryStyle, string>> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (VALID_STYLES.has(key) && typeof val === "string" && val.length > 0) {
        parsed[key as SummaryStyle] = val;
      }
    }
    if (Object.keys(parsed).length > 0) styleModels = parsed;
  }

  return {
    cognitiveTraits,
    tone: (typeof obj.tone === "string" && VALID_TONES.has(obj.tone) ? obj.tone : "casual") as Tone,
    summaryStyle: (typeof obj.summaryStyle === "string" && VALID_STYLES.has(obj.summaryStyle)
      ? obj.summaryStyle
      : "standard") as SummaryStyle,
    customInstructions:
      typeof obj.customInstructions === "string" ? obj.customInstructions : undefined,
    model: typeof obj.model === "string" && obj.model.length > 0 ? obj.model : undefined,
    styleModels,
    voice: typeof obj.voice === "string" ? obj.voice : undefined,
    ttsSpeed: typeof obj.ttsSpeed === "number" ? obj.ttsSpeed : undefined,
    pitch:
      typeof obj.pitch === "string" && VALID_PITCHES.has(obj.pitch)
        ? (obj.pitch as PitchPreset)
        : undefined,
    volume:
      typeof obj.volume === "string" && VALID_VOLUMES.has(obj.volume)
        ? (obj.volume as VolumePreset)
        : undefined,
    provider:
      typeof obj.provider === "string" && VALID_PROVIDERS.has(obj.provider)
        ? (obj.provider as SummarizationProvider)
        : undefined,
  };
}

export async function loadSettings(): Promise<TldrSettings> {
  // Try settings.json first
  try {
    const raw = await readFile(getSettingsFile(), "utf-8");
    const settings = parseSettings(JSON.parse(raw));
    // Migration: existing file without setupCompleted → treat as already set up
    if (settings.setupCompleted === undefined) {
      settings.setupCompleted = true;
    }
    return settings;
  } catch {
    // Fall through to legacy
  }

  // Try legacy config.json and auto-migrate
  try {
    const legacyPath = getLegacyConfigFile();
    const raw = await readFile(legacyPath, "utf-8");
    const settings = parseSettings(JSON.parse(raw));
    // Existing user — mark as already set up
    settings.setupCompleted = true;

    // Migrate: save as settings.json and rename old file
    await saveSettings(settings);
    await rename(legacyPath, `${legacyPath}.bak`);

    return settings;
  } catch {
    // No config at all
  }

  // Fresh install: setupCompleted remains undefined (falsy)
  return { ...DEFAULT_SETTINGS, profiles: { default: { ...DEFAULT_PROFILE } } };
}

export async function saveSettings(settings: TldrSettings): Promise<void> {
  await ensureConfigDir();
  const settingsFile = getSettingsFile();
  await writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf-8");
  await chmod(settingsFile, 0o600);
}

export function getEnvOverrides(): Partial<ConfigOverrides> {
  const overrides: Partial<ConfigOverrides> = {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) overrides.apiKey = apiKey;

  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  if (baseUrl) overrides.baseUrl = baseUrl;

  const model = process.env.ANTHROPIC_MODEL;
  if (model) overrides.model = model;

  return overrides;
}

export function resolveModelId(input: string): string {
  const tier = input.toLowerCase();
  if (tier in MODEL_IDS) {
    return MODEL_IDS[tier as ModelTier];
  }
  return input;
}

export function resolveConfig(settings: TldrSettings, overrides?: ConfigOverrides): ResolvedConfig {
  const profileName = overrides?.profileName ?? settings.activeProfile;
  const profile = settings.profiles[profileName] ?? settings.profiles.default ?? DEFAULT_PROFILE;

  // Style resolution: CLI override > profile setting
  const summaryStyle: SummaryStyle =
    overrides?.style && VALID_STYLES.has(overrides.style)
      ? (overrides.style as SummaryStyle)
      : profile.summaryStyle;

  // Model resolution: CLI/env override > per-style setting > profile.model > style default
  let model: string;
  if (overrides?.model) {
    model = resolveModelId(overrides.model);
  } else if (profile.styleModels?.[summaryStyle]) {
    model = resolveModelId(profile.styleModels[summaryStyle]);
  } else if (profile.model) {
    model = resolveModelId(profile.model);
  } else {
    model = MODEL_IDS[SUMMARY_STYLE_DEFAULTS[summaryStyle]];
  }

  // API key: override > settings
  const apiKey = overrides?.apiKey ?? settings.apiKey ?? "";

  // Base URL: override > settings
  const baseUrl = overrides?.baseUrl ?? settings.baseUrl;

  // Provider resolution: CLI override > profile setting > default "cli"
  let provider: SummarizationProvider = "cli";
  if (
    overrides?.provider &&
    typeof overrides.provider === "string" &&
    VALID_PROVIDERS.has(overrides.provider)
  ) {
    provider = overrides.provider as SummarizationProvider;
  } else if (profile.provider) {
    provider = profile.provider;
  }

  const outputDir = settings.outputDir ?? join(homedir(), "Documents", "tldr");

  return {
    apiKey,
    baseUrl,
    maxTokens: settings.maxTokens ?? 1024,
    profileName,
    cognitiveTraits: [...profile.cognitiveTraits],
    tone: profile.tone,
    summaryStyle,
    model,
    customInstructions: profile.customInstructions,
    voice: profile.voice ?? "en-US-JennyNeural",
    ttsSpeed: profile.ttsSpeed ?? 1.0,
    pitch: profile.pitch && VALID_PITCHES.has(profile.pitch) ? profile.pitch : "default",
    volume: profile.volume && VALID_VOLUMES.has(profile.volume) ? profile.volume : "normal",
    provider,
    outputDir,
  };
}

export async function loadConfig(overrides?: ConfigOverrides): Promise<ResolvedConfig> {
  const settings = await loadSettings();
  const envOverrides = getEnvOverrides();
  const merged: ConfigOverrides = { ...envOverrides, ...overrides };
  return resolveConfig(settings, merged);
}

// Kept for backward compat — saves a ResolvedConfig back as settings
export async function saveConfig(config: ResolvedConfig): Promise<void> {
  const settings = await loadSettings();

  settings.setupCompleted = true;
  settings.apiKey = config.apiKey;
  settings.baseUrl = config.baseUrl;
  settings.maxTokens = config.maxTokens !== 1024 ? config.maxTokens : undefined;
  settings.outputDir =
    config.outputDir !== join(homedir(), "Documents", "tldr") ? config.outputDir : undefined;

  const profileName = config.profileName;
  settings.activeProfile = profileName;
  const existingProfile = settings.profiles[profileName];
  settings.profiles[profileName] = {
    cognitiveTraits: [...config.cognitiveTraits],
    tone: config.tone,
    summaryStyle: config.summaryStyle,
    customInstructions: config.customInstructions,
    model: resolveModelTier(config.model) ?? config.model,
    styleModels: existingProfile?.styleModels,
    voice: config.voice !== "en-US-JennyNeural" ? config.voice : undefined,
    ttsSpeed: config.ttsSpeed !== 1.0 ? config.ttsSpeed : undefined,
    pitch: config.pitch !== "default" ? config.pitch : undefined,
    volume: config.volume !== "normal" ? config.volume : undefined,
    provider: config.provider !== "cli" ? config.provider : undefined,
  };

  await saveSettings(settings);
}

function resolveModelTier(modelId: string): ModelTier | undefined {
  for (const [tier, id] of Object.entries(MODEL_IDS)) {
    if (id === modelId) return tier as ModelTier;
  }
  return undefined;
}

// --- Profile CRUD ---

export async function listProfiles(): Promise<{ name: string; active: boolean }[]> {
  const settings = await loadSettings();
  return Object.keys(settings.profiles).map((name) => ({
    name,
    active: name === settings.activeProfile,
  }));
}

export async function createProfile(name: string, profile?: Partial<Profile>): Promise<void> {
  const settings = await loadSettings();
  if (settings.profiles[name]) {
    throw new Error(`Profile "${name}" already exists.`);
  }
  settings.profiles[name] = { ...DEFAULT_PROFILE, ...profile };
  await saveSettings(settings);
}

export async function deleteProfile(name: string): Promise<void> {
  if (name === "default") {
    throw new Error('Cannot delete the "default" profile.');
  }
  const settings = await loadSettings();
  if (!settings.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist.`);
  }
  delete settings.profiles[name];
  if (settings.activeProfile === name) {
    settings.activeProfile = "default";
  }
  await saveSettings(settings);
}

export async function setActiveProfile(name: string): Promise<void> {
  const settings = await loadSettings();
  if (!settings.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist.`);
  }
  settings.activeProfile = name;
  await saveSettings(settings);
}

export async function setTheme(theme: Partial<ThemeConfig>): Promise<void> {
  const settings = await loadSettings();
  const current = settings.theme ?? { name: "coral", appearance: "auto" };
  settings.theme = { ...current, ...theme };
  await saveSettings(settings);
}
