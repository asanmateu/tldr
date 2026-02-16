import {
  VALID_APPEARANCES,
  VALID_PITCHES,
  VALID_PROVIDERS,
  VALID_STYLES,
  VALID_THEME_NAMES,
  VALID_TONES,
  VALID_TRAITS,
  VALID_VOICES,
  VALID_VOLUMES,
  loadSettings,
  saveSettings,
  setTheme,
} from "./config.js";
import type { TldrSettings } from "./types.js";

export class ConfigSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigSetError";
  }
}

type ConfigTarget = "settings" | "profile" | "theme";

interface ConfigKeyDescriptor {
  target: ConfigTarget;
  property: string;
  validValues?: Set<string>;
  label?: string;
  transform?: (value: string, args: string[]) => unknown;
  defaultValue?: unknown;
}

const CONFIG_KEYS: Record<string, ConfigKeyDescriptor> = {
  // Top-level settings keys
  apiKey: {
    target: "settings",
    property: "apiKey",
  },
  baseUrl: {
    target: "settings",
    property: "baseUrl",
  },
  maxTokens: {
    target: "settings",
    property: "maxTokens",
    transform: (v) => Number.parseInt(v, 10),
  },
  activeProfile: {
    target: "settings",
    property: "activeProfile",
  },
  "output-dir": {
    target: "settings",
    property: "outputDir",
  },

  // Theme keys (handled via setTheme)
  theme: {
    target: "theme",
    property: "name",
    validValues: VALID_THEME_NAMES,
  },
  appearance: {
    target: "theme",
    property: "appearance",
    validValues: VALID_APPEARANCES,
  },

  // Profile keys
  tone: {
    target: "profile",
    property: "tone",
    validValues: VALID_TONES,
  },
  style: {
    target: "profile",
    property: "summaryStyle",
    validValues: VALID_STYLES,
  },
  model: {
    target: "profile",
    property: "model",
  },
  provider: {
    target: "profile",
    property: "provider",
    validValues: VALID_PROVIDERS,
    defaultValue: "cli",
  },
  voice: {
    target: "profile",
    property: "voice",
    validValues: VALID_VOICES,
    defaultValue: "en-US-JennyNeural",
  },
  "tts-speed": {
    target: "profile",
    property: "ttsSpeed",
    transform: (v) => {
      const speed = Number.parseFloat(v);
      if (Number.isNaN(speed) || speed <= 0) {
        throw new ConfigSetError("Invalid tts-speed. Use a positive number (e.g. 1.0, 1.25, 1.5).");
      }
      return speed === 1.0 ? undefined : speed;
    },
  },
  pitch: {
    target: "profile",
    property: "pitch",
    validValues: VALID_PITCHES,
    defaultValue: "default",
  },
  volume: {
    target: "profile",
    property: "volume",
    validValues: VALID_VOLUMES,
    defaultValue: "normal",
  },
  traits: {
    target: "profile",
    property: "cognitiveTraits",
    transform: (v) => {
      const traits = v.split(",").map((t) => t.trim());
      const invalid = traits.filter((t) => !VALID_TRAITS.has(t));
      if (invalid.length > 0) {
        throw new ConfigSetError(
          `Invalid trait(s): ${invalid.join(", ")}\nValid traits: ${[...VALID_TRAITS].join(", ")}`,
        );
      }
      return traits;
    },
  },
  "custom-instructions": {
    target: "profile",
    property: "customInstructions",
    transform: (_v, args) => {
      const text = args.slice(3).join(" ");
      if (!text) {
        throw new ConfigSetError("Usage: tldr config set custom-instructions <text>");
      }
      return text;
    },
  },
};

function applyToProfile(settings: TldrSettings, property: string, value: unknown): string {
  const profileName = settings.activeProfile;
  const profile = settings.profiles[profileName];
  if (!profile) return profileName;
  (profile as unknown as Record<string, unknown>)[property] = value;
  return profileName;
}

export function getValidConfigKeys(): string[] {
  return Object.keys(CONFIG_KEYS);
}

export async function applyConfigSet(
  key: string,
  value: string,
  allArgs: string[],
): Promise<string> {
  const descriptor = CONFIG_KEYS[key];
  if (!descriptor) {
    throw new ConfigSetError(`Unknown key: ${key}\nValid keys: ${getValidConfigKeys().join(", ")}`);
  }

  // Validate against allowed values
  if (descriptor.validValues && !descriptor.validValues.has(value)) {
    throw new ConfigSetError(
      `Invalid ${key}. Use one of: ${[...descriptor.validValues].join(", ")}`,
    );
  }

  // Theme keys use setTheme() directly
  if (descriptor.target === "theme") {
    await setTheme({ [descriptor.property]: value } as Record<string, string>);
    return `Set ${key} = ${value}`;
  }

  const settings = await loadSettings();

  if (descriptor.target === "settings") {
    const transformed = descriptor.transform ? descriptor.transform(value, allArgs) : value;
    (settings as unknown as Record<string, unknown>)[descriptor.property] = transformed;
    await saveSettings(settings);
    const display = key === "apiKey" ? "***" : String(transformed);
    return `Set ${key} = ${display}`;
  }

  // Profile keys
  const transformed = descriptor.transform
    ? descriptor.transform(value, allArgs)
    : descriptor.defaultValue !== undefined && value === String(descriptor.defaultValue)
      ? undefined
      : value;
  const profileName = applyToProfile(settings, descriptor.property, transformed);
  await saveSettings(settings);

  const display =
    key === "traits" && Array.isArray(transformed)
      ? transformed.join(", ")
      : key === "custom-instructions"
        ? `"${String(transformed)}"`
        : String(value);
  return `Set ${key} = ${display} (profile: ${profileName})`;
}
