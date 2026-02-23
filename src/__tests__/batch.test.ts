import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config, ExtractionResult, SessionPaths, TldrResult } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  extract: vi.fn(),
  summarize: vi.fn(),
  rewriteForSpeech: vi.fn(),
  loadConfig: vi.fn(),
  saveSummary: vi.fn(),
  saveAudioFile: vi.fn(),
  getSessionPaths: vi.fn(),
  generateAudio: vi.fn(),
}));

vi.mock("../pipeline.js", () => ({ extract: mocks.extract }));
vi.mock("../lib/summarizer.js", () => ({
  summarize: mocks.summarize,
  rewriteForSpeech: mocks.rewriteForSpeech,
}));
vi.mock("../lib/config.js", () => ({
  loadConfig: mocks.loadConfig,
}));
vi.mock("../lib/session.js", () => ({
  saveSummary: mocks.saveSummary,
  saveAudioFile: mocks.saveAudioFile,
  getSessionPaths: mocks.getSessionPaths,
}));
vi.mock("../lib/tts.js", () => ({
  generateAudio: mocks.generateAudio,
}));

import { runBatch } from "../batch.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TEST_CONFIG: Config = {
  apiKey: "test-key",
  baseUrl: undefined,
  maxTokens: 1024,
  profileName: "default",
  cognitiveTraits: [],
  tone: "casual",
  summaryStyle: "standard",
  model: "claude-opus-4-6",
  customInstructions: undefined,
  voice: "en-US-JennyNeural",
  ttsSpeed: 1.0,
  pitch: "default",
  volume: "normal",
  provider: "claude-code",
  ttsProvider: "edge-tts",
  ttsModel: "tts-1",
  audioMode: "podcast",
  outputDir: "/tmp/tldr-test-out",
};

const TEST_EXTRACTION: ExtractionResult = {
  title: "Google Launches New AI Model",
  content: "Google announced Gemini 3.0 today...",
  wordCount: 1200,
  source: "https://techcrunch.com/article",
};

const TEST_SUMMARY = "# Google Launches New AI Model\n\nGoogle announced Gemini 3.0 today...";

const TEST_RESULT: TldrResult = {
  extraction: TEST_EXTRACTION,
  summary: TEST_SUMMARY,
  timestamp: Date.now(),
};

const TEST_SESSION: SessionPaths = {
  sessionDir: "/tmp/tldr-test-out/2026-02-23/google-launches-new-ai-model",
  summaryPath: "/tmp/tldr-test-out/2026-02-23/google-launches-new-ai-model/summary.md",
  audioPath: "/tmp/tldr-test-out/2026-02-23/google-launches-new-ai-model/audio.mp3",
  chatPath: "/tmp/tldr-test-out/2026-02-23/google-launches-new-ai-model/chat.md",
};

// Capture stderr/stdout
let stderrOutput: string;
let stdoutOutput: string;
const originalStderrWrite = process.stderr.write;
const originalStdoutWrite = process.stdout.write;

beforeEach(() => {
  vi.clearAllMocks();

  stderrOutput = "";
  stdoutOutput = "";
  process.stderr.write = ((chunk: string) => {
    stderrOutput += chunk;
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    stdoutOutput += chunk;
    return true;
  }) as typeof process.stdout.write;

  // Default mock implementations
  mocks.loadConfig.mockResolvedValue(TEST_CONFIG);
  mocks.extract.mockResolvedValue(TEST_EXTRACTION);
  mocks.summarize.mockResolvedValue(TEST_RESULT);
  mocks.getSessionPaths.mockReturnValue(TEST_SESSION);
  mocks.saveSummary.mockResolvedValue(TEST_SESSION);
  mocks.saveAudioFile.mockResolvedValue(undefined);
  mocks.rewriteForSpeech.mockResolvedValue("Spoken version of summary...");
  mocks.generateAudio.mockResolvedValue("/tmp/audio-temp.mp3");
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
});

describe("runBatch", () => {
  it("extracts, summarizes, and writes summary", async () => {
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides: {},
      includeAudio: false,
    });

    expect(mocks.extract).toHaveBeenCalledWith("https://techcrunch.com/article");
    expect(mocks.summarize).toHaveBeenCalledWith(
      TEST_EXTRACTION,
      TEST_CONFIG,
      expect.any(Function),
    );
    expect(mocks.saveSummary).toHaveBeenCalledWith(TEST_SESSION, TEST_SUMMARY);
    expect(stdoutOutput).toBe(TEST_SUMMARY);
    expect(stderrOutput).toContain("Extracting:");
    expect(stderrOutput).toContain("Summarizing:");
    expect(stderrOutput).toContain("Saved to");
  });

  it("generates audio when --audio is set", async () => {
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides: {},
      includeAudio: true,
    });

    expect(mocks.rewriteForSpeech).toHaveBeenCalledWith(TEST_SUMMARY, TEST_CONFIG);
    expect(mocks.generateAudio).toHaveBeenCalledWith(
      "Spoken version of summary...",
      TEST_CONFIG.voice,
      TEST_CONFIG.ttsSpeed,
      TEST_CONFIG.pitch,
      TEST_CONFIG.volume,
      undefined,
      TEST_CONFIG.ttsProvider,
      TEST_CONFIG.ttsModel,
    );
    expect(mocks.saveAudioFile).toHaveBeenCalledWith(TEST_SESSION, "/tmp/audio-temp.mp3");
    expect(stderrOutput).toContain("Generating audio...");
  });

  it("does not generate audio when --audio is not set", async () => {
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides: {},
      includeAudio: false,
    });

    expect(mocks.rewriteForSpeech).not.toHaveBeenCalled();
    expect(mocks.generateAudio).not.toHaveBeenCalled();
    expect(mocks.saveAudioFile).not.toHaveBeenCalled();
  });

  it("uses --output directory when provided", async () => {
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides: {},
      outputDir: "/custom/output",
      includeAudio: false,
    });

    expect(mocks.getSessionPaths).toHaveBeenCalledWith(
      "/custom/output",
      TEST_EXTRACTION,
      TEST_SUMMARY,
    );
  });

  it("uses config outputDir when --output not provided", async () => {
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides: {},
      includeAudio: false,
    });

    expect(mocks.getSessionPaths).toHaveBeenCalledWith(
      TEST_CONFIG.outputDir,
      TEST_EXTRACTION,
      TEST_SUMMARY,
    );
  });

  it("passes overrides to loadConfig", async () => {
    const overrides = { provider: "openai", style: "quick" };
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides,
      includeAudio: false,
    });

    expect(mocks.loadConfig).toHaveBeenCalledWith(overrides);
  });

  it("throws on extraction failure", async () => {
    mocks.extract.mockRejectedValue(new Error("Network error"));

    await expect(
      runBatch({
        input: "https://bad-url.com",
        overrides: {},
        includeAudio: false,
      }),
    ).rejects.toThrow("Network error");
  });

  it("throws on summarization failure", async () => {
    mocks.summarize.mockRejectedValue(new Error("API rate limit"));

    await expect(
      runBatch({
        input: "https://techcrunch.com/article",
        overrides: {},
        includeAudio: false,
      }),
    ).rejects.toThrow("API rate limit");
  });

  it("logs progress to stderr", async () => {
    await runBatch({
      input: "https://techcrunch.com/article",
      overrides: {},
      includeAudio: false,
    });

    expect(stderrOutput).toContain("Extracting: https://techcrunch.com/article");
    expect(stderrOutput).toContain('Summarizing: "Google Launches New AI Model" (1,200 words)');
    expect(stderrOutput).toContain("Saved to");
  });

  it("truncates long input in progress log", async () => {
    const longUrl = `https://example.com/${"a".repeat(100)}`;
    await runBatch({
      input: longUrl,
      overrides: {},
      includeAudio: false,
    });

    expect(stderrOutput).toContain("...");
    expect(stderrOutput).not.toContain(longUrl);
  });
});
