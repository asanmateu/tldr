import OpenAI from "openai";
import type { Config, ImageData, Provider } from "../types.js";

export class OpenAIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "AUTH" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN",
  ) {
    super(message);
    this.name = "OpenAIProviderError";
  }
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function buildUserContent(
  userPrompt: string,
  image?: ImageData,
): string | OpenAI.ChatCompletionContentPart[] {
  if (!image) return userPrompt;
  return [
    {
      type: "image_url" as const,
      image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
    },
    { type: "text" as const, text: userPrompt },
  ];
}

export interface OpenAIProviderOptions {
  defaultBaseUrl?: string;
  envApiKey?: string;
  envBaseUrl?: string;
  providerName?: string;
}

function buildClient(config: Config, options: OpenAIProviderOptions): OpenAI {
  const apiKey = (options.envApiKey && process.env[options.envApiKey]) || config.apiKey;
  const baseURL =
    (options.envBaseUrl && process.env[options.envBaseUrl]) ||
    config.baseUrl ||
    options.defaultBaseUrl ||
    undefined;
  return new OpenAI({ apiKey, baseURL });
}

export function createOpenAICompatibleProvider(options: OpenAIProviderOptions = {}): Provider {
  const name = options.providerName ?? "OpenAI";

  const summarize: Provider["summarize"] = async (
    config,
    systemPrompt,
    userPrompt,
    onChunk,
    image?,
    signal?,
  ) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const client = buildClient(config, options);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      try {
        const chunks: string[] = [];

        const stream = await client.chat.completions.create({
          model: config.model,
          max_tokens: config.maxTokens,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: buildUserContent(userPrompt, image) },
          ],
        });

        for await (const event of stream) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          const delta = event.choices[0]?.delta?.content;
          if (delta) {
            chunks.push(delta);
            onChunk(delta);
          }
        }

        return chunks.join("");
      } catch (error) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof OpenAI.AuthenticationError) {
          throw new OpenAIProviderError(
            `Invalid ${name} API key. Run \`tldr config set apiKey <key>\` to update.`,
            "AUTH",
          );
        }

        if (error instanceof OpenAI.RateLimitError) {
          if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_DELAY_MS * 2 ** attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new OpenAIProviderError(
            "Rate limited by API. Please wait a moment and try again.",
            "RATE_LIMIT",
          );
        }

        if (error instanceof OpenAI.APIConnectionError) {
          throw new OpenAIProviderError("Network error. Check your connection.", "NETWORK");
        }

        throw new OpenAIProviderError(`Summarization failed: ${lastError.message}`, "UNKNOWN");
      }
    }

    throw new OpenAIProviderError(
      `Summarization failed after ${MAX_RETRIES} attempts: ${lastError?.message ?? "unknown error"}`,
      "UNKNOWN",
    );
  };

  const rewrite: Provider["rewrite"] = async (markdown, config, systemPrompt) => {
    const client = buildClient(config, options);

    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Rewrite this summary as an engaging audio script:\n\n${markdown}`,
        },
      ],
    });

    return response.choices[0]?.message?.content ?? markdown;
  };

  const chat: Provider["chat"] = async (config, systemPrompt, messages, onChunk) => {
    const client = buildClient(config, options);

    const chunks: string[] = [];

    const stream = await client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    for await (const event of stream) {
      const delta = event.choices[0]?.delta?.content;
      if (delta) {
        chunks.push(delta);
        onChunk(delta);
      }
    }

    return chunks.join("");
  };

  return { summarize, rewrite, chat };
}

export const openaiProvider: Provider = createOpenAICompatibleProvider();
