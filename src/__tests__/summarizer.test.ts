import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config, ExtractionResult, ImageData, ResolvedConfig } from "../lib/types.js";

const MAX_RETRIES = 3;

const mockStream = vi.hoisted(() => {
  const handlers = new Map<string, (data: string) => void>();
  return {
    on: vi.fn((event: string, handler: (data: string) => void) => {
      handlers.set(event, handler);
      return mockStream;
    }),
    finalMessage: vi.fn(async () => {
      const textHandler = handlers.get("text");
      if (textHandler) {
        textHandler("## TL;DR\n");
        textHandler("A test summary.");
      }
      return { id: "msg_123", content: [{ type: "text", text: "## TL;DR\nA test summary." }] };
    }),
    _handlers: handlers,
  };
});

const mockMessagesStream = vi.hoisted(() => vi.fn().mockReturnValue(mockStream));
const mockMessagesCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Here's the thing about this article..." }],
  }),
);

vi.mock("@anthropic-ai/sdk", () => {
  class AuthenticationError extends Error {
    status: number;
    constructor(
      status: number,
      _error: object | undefined,
      message: string | undefined,
      _headers: object | undefined,
    ) {
      super(message);
      this.status = status;
      this.name = "AuthenticationError";
    }
  }
  class RateLimitError extends Error {
    status: number;
    constructor(
      status: number,
      _error: object | undefined,
      message: string | undefined,
      _headers: object | undefined,
    ) {
      super(message);
      this.status = status;
      this.name = "RateLimitError";
    }
  }
  class APIConnectionError extends Error {
    constructor(opts: { message?: string | undefined; cause?: Error | undefined }) {
      super(opts.message);
      this.name = "APIConnectionError";
    }
  }

  return {
    default: class Anthropic {
      static AuthenticationError = AuthenticationError;
      static RateLimitError = RateLimitError;
      static APIConnectionError = APIConnectionError;
      messages = { stream: mockMessagesStream, create: mockMessagesCreate };
    },
  };
});

const { summarize, rewriteForSpeech } = await import("../lib/summarizer.js");
const { chatViaAnthropic } = await import("../lib/providers/anthropic.js");
const Anthropic = (await import("@anthropic-ai/sdk")).default;

const TEST_EXTRACTION: ExtractionResult = {
  title: "Test Article",
  author: "Test Author",
  content: "This is test content for summarization.",
  wordCount: 7,
  source: "https://example.com/article",
};

function makeTestConfig(overrides?: Partial<ResolvedConfig>): Config {
  return {
    apiKey: "sk-ant-test-key",
    baseUrl: undefined,
    maxTokens: 1024,
    profileName: "default",
    cognitiveTraits: [],
    tone: "casual",
    summaryStyle: "quick",
    model: "claude-haiku-4-5-20251001",
    customInstructions: undefined,
    voice: "en-US-JennyNeural",
    ttsSpeed: 1.0,
    pitch: "default",
    volume: "normal",
    provider: "anthropic",
    outputDir: "/tmp/tldr-output",
    ttsProvider: "edge-tts" as const,
    ttsModel: "tts-1",
    ...overrides,
  };
}

const TEST_CONFIG = makeTestConfig();

describe("summarize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStream._handlers.clear();
    mockMessagesStream.mockReturnValue(mockStream);
    mockStream.on.mockImplementation((event: string, handler: (data: string) => void) => {
      mockStream._handlers.set(event, handler);
      return mockStream;
    });
    mockStream.finalMessage.mockImplementation(async () => {
      const textHandler = mockStream._handlers.get("text");
      if (textHandler) {
        textHandler("## TL;DR\n");
        textHandler("A test summary.");
      }
      return { id: "msg_123", content: [{ type: "text", text: "## TL;DR\nA test summary." }] };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streams chunks to callback and returns TldrResult", async () => {
    const chunks: string[] = [];
    const result = await summarize(TEST_EXTRACTION, TEST_CONFIG, (text) => chunks.push(text));

    expect(chunks).toEqual(["## TL;DR\n", "A test summary."]);
    expect(result.summary).toBe("## TL;DR\nA test summary.");
    expect(result.extraction).toBe(TEST_EXTRACTION);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("uses model from resolved config", async () => {
    await summarize(TEST_EXTRACTION, TEST_CONFIG, () => {});

    expect(mockMessagesStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
      }),
    );
  });

  it("uses sonnet model when config specifies it", async () => {
    const config = makeTestConfig({ model: "claude-sonnet-4-5-20250929" });
    await summarize(TEST_EXTRACTION, config, () => {});

    expect(mockMessagesStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-5-20250929",
      }),
    );
  });

  it("uses max_tokens from config", async () => {
    const config = makeTestConfig({ maxTokens: 2048 });
    await summarize(TEST_EXTRACTION, config, () => {});

    expect(mockMessagesStream).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 2048,
      }),
    );
  });

  it("passes dynamic system prompt", async () => {
    const config = makeTestConfig({ cognitiveTraits: ["dyslexia"], tone: "professional" });
    await summarize(TEST_EXTRACTION, config, () => {});

    const call = mockMessagesStream.mock.calls[0];
    const system = call?.[0]?.system as string;

    expect(system).toContain("learning-focused summarization assistant");
    expect(system).toContain("Short sentences");
    expect(system).toContain("formal tone");
  });

  it("includes article metadata in the prompt", async () => {
    await summarize(TEST_EXTRACTION, TEST_CONFIG, () => {});

    const call = mockMessagesStream.mock.calls[0];
    const userMessage = call?.[0]?.messages?.[0]?.content as string;

    expect(userMessage).toContain("Title: Test Article");
    expect(userMessage).toContain("Author: Test Author");
    expect(userMessage).toContain("Source: https://example.com/article");
  });

  it("throws AUTH error on authentication failure", async () => {
    mockMessagesStream.mockImplementation(() => {
      throw new (Anthropic.AuthenticationError as new (...args: unknown[]) => Error)(
        401,
        undefined,
        "invalid key",
        undefined,
      );
    });

    await expect(summarize(TEST_EXTRACTION, TEST_CONFIG, () => {})).rejects.toMatchObject({
      code: "AUTH",
      message: "Invalid API key. Run `tldr config setup` to update.",
    });
  });

  it("throws NETWORK error on connection failure", async () => {
    mockMessagesStream.mockImplementation(() => {
      throw new (Anthropic.APIConnectionError as new (...args: unknown[]) => Error)({
        message: "connection refused",
      });
    });

    await expect(summarize(TEST_EXTRACTION, TEST_CONFIG, () => {})).rejects.toMatchObject({
      code: "NETWORK",
    });
  });

  it("rewriteForSpeech returns rewritten text from Claude", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Here's the thing about this article..." }],
    });

    const result = await rewriteForSpeech("## TL;DR\nA test summary.", TEST_CONFIG);

    expect(result).toBe("Here's the thing about this article...");
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: TEST_CONFIG.model,
      }),
    );
  });

  it("rewriteForSpeech uses config.model, not hardcoded haiku", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Rewritten text." }],
    });

    const config = makeTestConfig({ model: "claude-sonnet-4-5-20250929" });
    await rewriteForSpeech("## TL;DR\nA test summary.", config);

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-5-20250929",
      }),
    );
  });

  it("retries on rate limit then throws after max retries", async () => {
    mockMessagesStream.mockImplementation(() => {
      throw new (Anthropic.RateLimitError as new (...args: unknown[]) => Error)(
        429,
        undefined,
        "too many requests",
        undefined,
      );
    });

    await expect(summarize(TEST_EXTRACTION, TEST_CONFIG, () => {})).rejects.toMatchObject({
      code: "RATE_LIMIT",
    });
    expect(mockMessagesStream).toHaveBeenCalledTimes(MAX_RETRIES);
  }, 15_000);

  it("sends multimodal content when extraction has image", async () => {
    const imageData: ImageData = {
      base64: "aW1hZ2UtZGF0YQ==",
      mediaType: "image/png",
      filePath: "/tmp/screenshot.png",
    };

    const imageExtraction: ExtractionResult = {
      content: "",
      wordCount: 0,
      source: "./screenshot.png",
      title: "screenshot.png",
      image: imageData,
    };

    await summarize(imageExtraction, TEST_CONFIG, () => {});

    const call = mockMessagesStream.mock.calls[0];
    const messages = call?.[0]?.messages;
    const content = messages?.[0]?.content;

    expect(Array.isArray(content)).toBe(true);
    expect(content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          source: expect.objectContaining({
            type: "base64",
            media_type: "image/png",
            data: "aW1hZ2UtZGF0YQ==",
          }),
        }),
        expect.objectContaining({ type: "text" }),
      ]),
    );
  });

  it("sends image prompt instead of text content for images", async () => {
    const imageExtraction: ExtractionResult = {
      content: "",
      wordCount: 0,
      source: "./screenshot.png",
      title: "screenshot.png",
      image: { base64: "data", mediaType: "image/png", filePath: "/tmp/screenshot.png" },
    };

    await summarize(imageExtraction, TEST_CONFIG, () => {});

    const call = mockMessagesStream.mock.calls[0];
    const messages = call?.[0]?.messages;
    const content = messages?.[0]?.content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((b) => b.type === "text");

    expect(textBlock?.text).toContain("Summarize the content of this image");
  });

  it("rewriteForSpeech includes cognitive trait rules in system prompt", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Rewritten text." }],
    });

    const config = makeTestConfig({
      cognitiveTraits: ["adhd", "dyslexia"],
    });
    await rewriteForSpeech("## TL;DR\nA test summary.", config);

    const callArgs = mockMessagesCreate.mock.calls[0]?.[0];
    expect(callArgs.system).toContain("Listener Accessibility");
    expect(callArgs.system).toContain("hook attention");
    expect(callArgs.system).toContain("short, punchy");
  });

  it("rewriteForSpeech omits trait section when no traits configured", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Rewritten text." }],
    });

    const config = makeTestConfig({ cognitiveTraits: [] });
    await rewriteForSpeech("## TL;DR\nA test summary.", config);

    const callArgs = mockMessagesCreate.mock.calls[0]?.[0];
    expect(callArgs.system).not.toContain("Listener Accessibility");
  });

  it("rewriteForSpeech includes correct tone hint", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Rewritten." }],
    });

    const config = makeTestConfig({ tone: "eli5" });
    await rewriteForSpeech("## TL;DR\nA test summary.", config);

    const callArgs = mockMessagesCreate.mock.calls[0]?.[0];
    expect(callArgs.system).toContain("super simple and fun");
  });

  it("rewriteForSpeech includes all trait types in prompt", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Rewritten." }],
    });

    const config = makeTestConfig({
      cognitiveTraits: ["autism", "esl", "visual-thinker"],
    });
    await rewriteForSpeech("## TL;DR\nA test summary.", config);

    const callArgs = mockMessagesCreate.mock.calls[0]?.[0];
    expect(callArgs.system).toContain("direct and precise");
    expect(callArgs.system).toContain("common everyday");
    expect(callArgs.system).toContain("word pictures");
  });
});

describe("summarize abort", () => {
  it("rejects with AbortError when signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await summarize(TEST_EXTRACTION, TEST_CONFIG, () => {}, controller.signal).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });
});

describe("chatViaAnthropic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStream._handlers.clear();
    mockMessagesStream.mockReturnValue(mockStream);
    mockStream.on.mockImplementation((event: string, handler: (data: string) => void) => {
      mockStream._handlers.set(event, handler);
      return mockStream;
    });
    mockStream.finalMessage.mockImplementation(async () => {
      const textHandler = mockStream._handlers.get("text");
      if (textHandler) {
        textHandler("Chat ");
        textHandler("reply.");
      }
      return { id: "msg_chat", content: [{ type: "text", text: "Chat reply." }] };
    });
  });

  it("streams chat response and returns full text", async () => {
    const chunks: string[] = [];
    const messages = [{ role: "user" as const, content: "What is this about?" }];

    const result = await chatViaAnthropic(TEST_CONFIG, "system prompt", messages, (text) =>
      chunks.push(text),
    );

    expect(result).toBe("Chat reply.");
    expect(chunks).toEqual(["Chat ", "reply."]);
    expect(mockMessagesStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: TEST_CONFIG.model,
        system: "system prompt",
        messages: [{ role: "user", content: "What is this about?" }],
      }),
    );
  });
});
