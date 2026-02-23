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

export async function getProvider(type: SummarizationProvider, config?: Config): Promise<Provider> {
  if (config) await validateAuth(type, config);

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
