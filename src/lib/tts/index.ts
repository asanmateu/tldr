import type { TtsProvider, TtsProviderInterface } from "../types.js";

export { getVoicesForProvider, getDefaultVoiceForProvider } from "./voices.js";

export async function getTtsProvider(type: TtsProvider): Promise<TtsProviderInterface> {
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
