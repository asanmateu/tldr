import { afterEach, describe, expect, it, vi } from "vitest";
import * as providers from "../lib/providers/index.js";
import type { ChatMessage, Config, ResolvedConfig } from "../lib/types.js";

const { buildChatSystemPrompt, chatWithSession } = await import("../lib/chat.js");

const mockChat = vi
  .fn()
  .mockImplementation(
    async (
      _config: Config,
      _system: string,
      _messages: ChatMessage[],
      onChunk: (text: string) => void,
    ) => {
      onChunk("Hello ");
      onChunk("world!");
      return "Hello world!";
    },
  );

vi.spyOn(providers, "getProvider").mockResolvedValue({
  summarize: vi.fn().mockResolvedValue(""),
  rewrite: vi.fn().mockResolvedValue(""),
  chat: mockChat,
});

afterEach(() => {
  mockChat.mockClear();
});

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
    ...overrides,
  };
}

describe("buildChatSystemPrompt", () => {
  it("includes the summary content", () => {
    const prompt = buildChatSystemPrompt("# My Summary\n\nKey point here.");
    expect(prompt).toContain("# My Summary");
    expect(prompt).toContain("Key point here.");
  });

  it("includes grounding instructions", () => {
    const prompt = buildChatSystemPrompt("Some content.");
    expect(prompt).toContain("helpful assistant");
    expect(prompt).toContain("summary");
  });
});

describe("chatWithSession", () => {
  it("streams chunks and returns full response", async () => {
    const config = makeTestConfig();
    const messages: ChatMessage[] = [{ role: "user", content: "What is this about?" }];
    const chunks: string[] = [];

    const result = await chatWithSession(config, "Summary content.", messages, (chunk) =>
      chunks.push(chunk),
    );

    expect(result).toBe("Hello world!");
    expect(chunks).toEqual(["Hello ", "world!"]);
  });

  it("passes messages to the provider", async () => {
    const config = makeTestConfig();
    const messages: ChatMessage[] = [
      { role: "user", content: "Question 1" },
      { role: "assistant", content: "Answer 1" },
      { role: "user", content: "Question 2" },
    ];

    await chatWithSession(config, "Content.", messages, () => {});

    expect(mockChat).toHaveBeenCalledWith(
      config,
      expect.stringContaining("Content."),
      messages,
      expect.any(Function),
    );
  });
});
