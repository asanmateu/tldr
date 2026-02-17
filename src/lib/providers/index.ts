import type { Provider, SummarizationProvider } from "../types.js";

export async function getProvider(type: SummarizationProvider): Promise<Provider> {
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
