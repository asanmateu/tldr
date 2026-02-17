import { describe, expect, it, vi } from "vitest";
import type { Config, ResolvedConfig } from "../../lib/types.js";

function makeTestConfig(overrides?: Partial<ResolvedConfig>): Config {
  return {
    apiKey: "sk-ant-test-key",
    baseUrl: undefined,
    maxTokens: 1024,
    profileName: "default",
    cognitiveTraits: [],
    tone: "casual",
    summaryStyle: "quick",
    model: "claude-sonnet-4-5-20250929",
    customInstructions: undefined,
    voice: "en-US-JennyNeural",
    ttsSpeed: 1.0,
    pitch: "default",
    volume: "normal",
    provider: "claude-code",
    outputDir: "/tmp/tldr-output",
    ...overrides,
  };
}

function createMockChild(
  exitCode: number,
  stdoutData?: string,
  stderrData?: string,
  error?: Error,
) {
  const child = {
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: {
      on: vi.fn((event: string, handler: (data: Buffer) => void) => {
        if (event === "data" && stdoutData) {
          queueMicrotask(() => handler(Buffer.from(stdoutData)));
        }
      }),
    },
    stderr: {
      on: vi.fn((event: string, handler: (data: Buffer) => void) => {
        if (event === "data" && stderrData) {
          queueMicrotask(() => handler(Buffer.from(stderrData)));
        }
      }),
    },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (event === "close" && !error) {
        queueMicrotask(() => handler(exitCode));
      }
      if (event === "error" && error) {
        queueMicrotask(() => handler(error));
      }
    }),
    kill: vi.fn(),
  };
  return child;
}

const mockSpawn = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: mockSpawn,
}));

const { summarizeViaClaudeCode, rewriteViaClaudeCode, chatViaClaudeCode, claudeCodeProvider } =
  await import("../../lib/providers/claude-code.js");

describe("claude-code provider", () => {
  it("spawns claude with correct args and returns output", async () => {
    const child = createMockChild(0, "Summary output");
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    const result = await summarizeViaClaudeCode(config, "system prompt", "user prompt", () => {});

    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["-p", "--model", "claude-sonnet-4-5-20250929"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    expect(result).toBe("Summary output");
  });

  it("calls onChunk with stdout data", async () => {
    const child = createMockChild(0, "chunk data");
    mockSpawn.mockReturnValue(child);

    const chunks: string[] = [];
    const config = makeTestConfig();
    await summarizeViaClaudeCode(config, "sys", "usr", (text) => chunks.push(text));

    expect(chunks).toEqual(["chunk data"]);
  });

  it("writes combined prompt to stdin", async () => {
    const child = createMockChild(0, "ok");
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    await summarizeViaClaudeCode(config, "system", "user", () => {});

    expect(child.stdin.write).toHaveBeenCalledWith("system\n\n---\n\nuser");
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it("prepends image path instruction when image is provided", async () => {
    const child = createMockChild(0, "Image analysis result");
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    const image = { base64: "data", mediaType: "image/png" as const, filePath: "/tmp/photo.png" };
    await summarizeViaClaudeCode(config, "system", "user prompt", () => {}, image);

    const writtenPrompt = child.stdin.write.mock.calls[0]?.[0] as string;
    expect(writtenPrompt).toContain("Please read the image at this path: /tmp/photo.png");
    expect(writtenPrompt).toContain("Then follow these instructions:");
    expect(writtenPrompt).toContain("user prompt");
  });

  it("rejects with NOT_FOUND on ENOENT error", async () => {
    const err = Object.assign(new Error("not found"), { code: "ENOENT" });
    const child = createMockChild(1, undefined, undefined, err);
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    await expect(summarizeViaClaudeCode(config, "sys", "usr", () => {})).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects with UNKNOWN on non-zero exit code", async () => {
    const child = createMockChild(1, undefined, "error output");
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    await expect(summarizeViaClaudeCode(config, "sys", "usr", () => {})).rejects.toMatchObject({
      code: "UNKNOWN",
    });
  });

  it("exports claudeCodeProvider conforming to Provider interface", () => {
    expect(claudeCodeProvider).toBeDefined();
    expect(typeof claudeCodeProvider.summarize).toBe("function");
    expect(typeof claudeCodeProvider.rewrite).toBe("function");
    expect(typeof claudeCodeProvider.chat).toBe("function");
  });

  it("rewriteViaClaudeCode sends rewrite prompt and returns output", async () => {
    const child = createMockChild(0, "Rewritten audio script");
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    const result = await rewriteViaClaudeCode("## Summary\nKey points.", config, "system prompt");

    expect(result).toBe("Rewritten audio script");
    const writtenPrompt = child.stdin.write.mock.calls[0]?.[0] as string;
    expect(writtenPrompt).toContain("Rewrite this summary as an engaging audio script");
    expect(writtenPrompt).toContain("## Summary");
  });

  it("chatViaClaudeCode formats conversation and streams output", async () => {
    const child = createMockChild(0, "Chat response");
    mockSpawn.mockReturnValue(child);

    const config = makeTestConfig();
    const messages = [
      { role: "user" as const, content: "What is this about?" },
      { role: "assistant" as const, content: "It is about testing." },
      { role: "user" as const, content: "Tell me more." },
    ];
    const chunks: string[] = [];
    const result = await chatViaClaudeCode(config, "system prompt", messages, (text) =>
      chunks.push(text),
    );

    expect(result).toBe("Chat response");
    expect(chunks).toEqual(["Chat response"]);

    const writtenPrompt = child.stdin.write.mock.calls[0]?.[0] as string;
    expect(writtenPrompt).toContain("User: What is this about?");
    expect(writtenPrompt).toContain("Assistant: It is about testing.");
    expect(writtenPrompt).toContain("User: Tell me more.");
    expect(writtenPrompt).toContain("system prompt");
  });
});
