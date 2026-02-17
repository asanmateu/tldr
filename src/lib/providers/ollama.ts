import type { Config, Provider } from "../types.js";

export class OllamaProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "NETWORK" | "NOT_FOUND" | "UNKNOWN",
  ) {
    super(message);
    this.name = "OllamaProviderError";
  }
}

const DEFAULT_BASE_URL = "http://localhost:11434";

function getBaseUrl(config: Config): string {
  return process.env.OLLAMA_BASE_URL ?? config.baseUrl ?? DEFAULT_BASE_URL;
}

function classifyError(error: unknown): OllamaProviderError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("econnrefused") || lower.includes("fetch") || lower.includes("network")) {
    return new OllamaProviderError(
      "Cannot connect to Ollama. Make sure it's running (ollama serve).",
      "NETWORK",
    );
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return new OllamaProviderError(
      "Model not found. Pull it first with: ollama pull <model>",
      "NOT_FOUND",
    );
  }
  return new OllamaProviderError(`Ollama error: ${message}`, "UNKNOWN");
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

async function ollamaChat(
  baseUrl: string,
  model: string,
  messages: OllamaChatMessage[],
  stream: boolean,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${baseUrl}/api/chat`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream }),
      signal: signal ?? null,
    });
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw classifyError(error);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 404) {
      throw new OllamaProviderError(
        "Model not found. Pull it first with: ollama pull <model>",
        "NOT_FOUND",
      );
    }
    throw new OllamaProviderError(
      `Ollama HTTP ${response.status}: ${body.slice(0, 200)}`,
      "UNKNOWN",
    );
  }

  if (!stream) {
    const json = (await response.json()) as { message?: { content?: string } };
    return json.message?.content ?? "";
  }

  // Streaming: read NDJSON line by line
  const reader = response.body?.getReader();
  if (!reader) throw new OllamaProviderError("No response body", "UNKNOWN");

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          const text = json.message?.content ?? "";
          if (text) {
            chunks.push(text);
            onChunk?.(text);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer) as { message?: { content?: string } };
        const text = json.message?.content ?? "";
        if (text) {
          chunks.push(text);
          onChunk?.(text);
        }
      } catch {
        // Skip
      }
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.join("");
}

export const ollamaProvider: Provider = {
  async summarize(config, systemPrompt, userPrompt, onChunk, image?, signal?) {
    const baseUrl = getBaseUrl(config);
    const userMessage: OllamaChatMessage = image
      ? { role: "user", content: userPrompt, images: [image.base64] }
      : { role: "user", content: userPrompt };

    return ollamaChat(
      baseUrl,
      config.model,
      [{ role: "system", content: systemPrompt }, userMessage],
      true,
      onChunk,
      signal,
    );
  },

  async rewrite(markdown, config, systemPrompt) {
    const baseUrl = getBaseUrl(config);
    return ollamaChat(
      baseUrl,
      config.model,
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Rewrite this summary as an engaging audio script:\n\n${markdown}`,
        },
      ],
      false,
    );
  },

  async chat(config, systemPrompt, messages, onChunk) {
    const baseUrl = getBaseUrl(config);
    const ollamaMessages: OllamaChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
    return ollamaChat(baseUrl, config.model, ollamaMessages, true, onChunk);
  },
};
