import { GoogleGenAI } from "@google/genai";
import type { Config, ImageData, Provider } from "../types.js";

export class GeminiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "AUTH" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN",
  ) {
    super(message);
    this.name = "GeminiProviderError";
  }
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function getApiKey(config: Config): string {
  return process.env.GEMINI_API_KEY ?? config.apiKey;
}

function classifyError(error: unknown): GeminiProviderError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("api key") || lower.includes("401") || lower.includes("403")) {
    return new GeminiProviderError(
      "Invalid Gemini API key. Set GEMINI_API_KEY or run `tldr config set apiKey <key>`.",
      "AUTH",
    );
  }
  if (lower.includes("429") || lower.includes("rate") || lower.includes("quota")) {
    return new GeminiProviderError(
      "Rate limited by Gemini API. Please wait a moment and try again.",
      "RATE_LIMIT",
    );
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("econnrefused")) {
    return new GeminiProviderError("Network error. Check your connection.", "NETWORK");
  }
  return new GeminiProviderError(`Gemini error: ${message}`, "UNKNOWN");
}

function buildImagePart(image: ImageData): { inlineData: { mimeType: string; data: string } } {
  return { inlineData: { mimeType: image.mediaType, data: image.base64 } };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);
      if (classified.code === "AUTH" || classified.code === "NETWORK") throw classified;
      if (classified.code === "RATE_LIMIT" && attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * 2 ** attempt));
        continue;
      }
      throw classified;
    }
  }
  throw classifyError(lastError);
}

export const geminiProvider: Provider = {
  async summarize(config, systemPrompt, userPrompt, onChunk, image?, signal?) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const ai = new GoogleGenAI({ apiKey: getApiKey(config) });

    return withRetry(async () => {
      const contents = image
        ? [buildImagePart(image), { text: userPrompt }]
        : [{ text: userPrompt }];

      const chunks: string[] = [];
      const response = await ai.models.generateContentStream({
        model: config.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: config.maxTokens,
        },
      });

      for await (const chunk of response) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const text = chunk.text ?? "";
        if (text) {
          chunks.push(text);
          onChunk(text);
        }
      }

      return chunks.join("");
    });
  },

  async rewrite(markdown, config, systemPrompt) {
    const ai = new GoogleGenAI({ apiKey: getApiKey(config) });

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: config.model,
        contents: [{ text: `Rewrite this summary as an engaging audio script:\n\n${markdown}` }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: config.maxTokens,
        },
      });

      return response.text ?? markdown;
    });
  },

  async chat(config, systemPrompt, messages, onChunk) {
    const ai = new GoogleGenAI({ apiKey: getApiKey(config) });

    return withRetry(async () => {
      const contents = messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));

      const chunks: string[] = [];
      const response = await ai.models.generateContentStream({
        model: config.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: config.maxTokens,
        },
      });

      for await (const chunk of response) {
        const text = chunk.text ?? "";
        if (text) {
          chunks.push(text);
          onChunk(text);
        }
      }

      return chunks.join("");
    });
  },
};
