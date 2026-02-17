import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Config, ImageData, Provider } from "../types.js";

export class AnthropicProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "AUTH" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN",
  ) {
    super(message);
    this.name = "AnthropicProviderError";
  }
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function summarizeViaAnthropic(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  image?: ImageData,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ?? undefined,
  });

  const messageContent = image
    ? [
        {
          type: "image" as const,
          source: { type: "base64" as const, media_type: image.mediaType, data: image.base64 },
        },
        { type: "text" as const, text: userPrompt },
      ]
    : userPrompt;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const chunks: string[] = [];

      const stream = client.messages.stream({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: messageContent }],
      });

      signal?.addEventListener("abort", () => stream.abort(), { once: true });

      stream.on("text", (text) => {
        chunks.push(text);
        onChunk(text);
      });

      await stream.finalMessage();

      return chunks.join("");
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Anthropic.AuthenticationError) {
        throw new AnthropicProviderError(
          "Invalid API key. Run `tldr config setup` to update.",
          "AUTH",
        );
      }

      if (error instanceof Anthropic.RateLimitError) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new AnthropicProviderError(
          "Rate limited by API. Please wait a moment and try again.",
          "RATE_LIMIT",
        );
      }

      if (error instanceof Anthropic.APIConnectionError) {
        throw new AnthropicProviderError("Network error. Check your connection.", "NETWORK");
      }

      throw new AnthropicProviderError(`Summarization failed: ${lastError.message}`, "UNKNOWN");
    }
  }

  throw new AnthropicProviderError(
    `Summarization failed after ${MAX_RETRIES} attempts: ${lastError?.message ?? "unknown error"}`,
    "UNKNOWN",
  );
}

export async function rewriteViaAnthropic(
  markdown: string,
  config: Config,
  systemPrompt: string,
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ?? undefined,
  });

  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Rewrite this summary as an engaging audio script:\n\n${markdown}`,
      },
    ],
  });

  const block = response.content[0];
  if (block?.type === "text") {
    return block.text;
  }
  return markdown;
}

export async function chatViaAnthropic(
  config: Config,
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ?? undefined,
  });

  const chunks: string[] = [];

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  stream.on("text", (text) => {
    chunks.push(text);
    onChunk(text);
  });

  await stream.finalMessage();

  return chunks.join("");
}

export const anthropicProvider: Provider = {
  summarize: summarizeViaAnthropic,
  rewrite: rewriteViaAnthropic,
  chat: chatViaAnthropic,
};
