import { getCachedModels, suggestModel } from "../modelDiscovery.js";
import type { TtsProvider, TtsProviderInterface } from "../types.js";

export { getVoicesForProvider, getDefaultVoiceForProvider } from "./voices.js";

export async function getTtsProvider(
  type: TtsProvider,
  ttsModel?: string,
): Promise<TtsProviderInterface> {
  // Validate ttsModel against cache for OpenAI TTS
  if (type === "openai" && ttsModel) {
    const cached = await getCachedModels("openai-tts");
    if (cached && cached.length > 0) {
      const valid = cached.some((m) => m.id === ttsModel);
      if (!valid) {
        const suggestion = suggestModel(ttsModel, cached);
        const hint = suggestion ? ` Did you mean '${suggestion}'?` : "";
        throw new Error(`TTS model '${ttsModel}' not found.${hint}`);
      }
    }
  }

  switch (type) {
    case "edge-tts": {
      const { edgeTtsProvider } = await import("./edge-tts.js");
      return edgeTtsProvider;
    }
    case "openai": {
      const { openaiTtsProvider } = await import("./openai-tts.js");
      return openaiTtsProvider;
    }
    default:
      throw new Error(`Unknown TTS provider: ${type}`);
  }
}
