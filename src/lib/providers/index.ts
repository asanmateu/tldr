import { getCachedModels, suggestModel } from "../modelDiscovery.js";
import type { Config, Provider, SummarizationProvider } from "../types.js";

export const PROVIDER_ENV_VARS: Record<SummarizationProvider, string | null> = {
  anthropic: "ANTHROPIC_API_KEY",
  "claude-code": null,
  codex: null,
  gemini: "GEMINI_API_KEY",
  ollama: null,
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
};

export class ProviderAuthError extends Error {
  public readonly code = "AUTH" as const;
  constructor(message: string) {
    super(message);
    this.name = "ProviderAuthError";
  }
}

export class ProviderConfigError extends Error {
  public readonly code = "CONFIG" as const;
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

async function validateAuth(type: SummarizationProvider, config: Config): Promise<void> {
  const envVar = PROVIDER_ENV_VARS[type];
  if (envVar) {
    if (!config.apiKey && !process.env[envVar]) {
      throw new ProviderAuthError(
        `Missing API key for ${type}. Set ${envVar} in your shell profile or run \`tldr config setup\`.`,
      );
    }
    return;
  }

  if (type === "claude-code") {
    const { isClaudeCodeAvailable } = await import("./claude-code.js");
    if (!isClaudeCodeAvailable()) {
      throw new ProviderAuthError(
        "Claude Code CLI not found. Install it from https://docs.anthropic.com/en/docs/claude-code",
      );
    }
  } else if (type === "codex") {
    const { isCodexAvailable } = await import("./codex.js");
    if (!isCodexAvailable()) {
      throw new ProviderAuthError(
        "Codex CLI not found. Install it with: npm install -g @openai/codex",
      );
    }
  }
}

async function validateModel(type: SummarizationProvider, config: Config): Promise<void> {
  const cached = await getCachedModels(type);
  if (!cached || cached.length === 0) return; // no cache → skip validation

  const match = cached.some((m) => m.id === config.model);
  if (match) return;

  const suggestion = suggestModel(config.model, cached);
  const hint = suggestion ? ` Did you mean '${suggestion}'?` : "";
  const available = cached
    .slice(0, 5)
    .map((m) => m.id)
    .join(", ");
  throw new ProviderConfigError(
    `Model '${config.model}' not found for ${type}.${hint}\nAvailable: ${available}${cached.length > 5 ? `, ... (${cached.length} total)` : ""}`,
  );
}

/**
 * Check if a CLI-based provider is available on the system.
 * Returns an error message/hint pair if unavailable, or null if OK.
 */
export async function validateCliProvider(
  type: SummarizationProvider,
): Promise<{ message: string; hint: string } | null> {
  if (type === "claude-code") {
    const { isClaudeCodeAvailable } = await import("./claude-code.js");
    if (!isClaudeCodeAvailable()) {
      return {
        message: "Claude Code is not installed or not authenticated.",
        hint: 'Install it with: npm install -g @anthropic-ai/claude-code\nThen run "claude" to log in.\n\nOr run: tldr config set provider anthropic — and set ANTHROPIC_API_KEY.\nOr run: tldr config set provider openai — and set OPENAI_API_KEY.',
      };
    }
  } else if (type === "codex") {
    const { isCodexAvailable } = await import("./codex.js");
    if (!isCodexAvailable()) {
      return {
        message: "Codex CLI is not installed.",
        hint: "Install it with: npm install -g @openai/codex\n\nOr switch provider:\n  tldr config set provider openai — and set OPENAI_API_KEY.\n  tldr config set provider anthropic — and set ANTHROPIC_API_KEY.",
      };
    }
  }
  return null;
}

export async function getProvider(type: SummarizationProvider, config?: Config): Promise<Provider> {
  if (config) {
    await validateAuth(type, config);
    await validateModel(type, config);
  }

  switch (type) {
    case "claude-code": {
      const mod = await import("./claude-code.js");
      return mod.claudeCodeProvider;
    }
    case "openai": {
      const mod = await import("./openai.js");
      return mod.openaiProvider;
    }
    case "gemini": {
      const mod = await import("./gemini.js");
      return mod.geminiProvider;
    }
    case "codex": {
      const mod = await import("./codex.js");
      return mod.codexProvider;
    }
    case "ollama": {
      const mod = await import("./ollama.js");
      return mod.ollamaProvider;
    }
    case "xai": {
      const mod = await import("./xai.js");
      return mod.xaiProvider;
    }
    default: {
      const mod = await import("./anthropic.js");
      return mod.anthropicProvider;
    }
  }
}
