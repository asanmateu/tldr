import { createOpenAICompatibleProvider } from "./openai.js";

export const xaiProvider = createOpenAICompatibleProvider({
  defaultBaseUrl: "https://api.x.ai/v1",
  envApiKey: "XAI_API_KEY",
  envBaseUrl: "XAI_BASE_URL",
  providerName: "xAI",
});
