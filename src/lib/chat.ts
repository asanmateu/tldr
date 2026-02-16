import { getProvider } from "./providers/index.js";
import type { ChatMessage, Config } from "./types.js";

export function buildChatSystemPrompt(summaryContent: string): string {
  return `You are a helpful assistant. Answer questions based on the following summary. Stay grounded — if the answer isn't in the summary, say so.

---

${summaryContent}`;
}

export async function chatWithSession(
  config: Config,
  summaryContent: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<string> {
  const systemPrompt = buildChatSystemPrompt(summaryContent);
  const provider = await getProvider(config.provider);
  return provider.chat(config, systemPrompt, messages, onChunk);
}
