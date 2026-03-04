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
  loadSettings: vi.fn(),
  truncateAndScale: vi.fn(),
  saveSummary: vi.fn(),
  saveAudioFile: vi.fn(),
  getSessionPaths: vi.fn(),
  generateAudio: vi.fn(),
  addEntry: vi.fn(),
}));

vi.mock("../pipeline.js", () => ({ extract: mocks.extract }));
vi.mock("../lib/summarizer.js", () => ({
  summarize: mocks.summarize,
  rewriteForSpeech: mocks.rewriteForSpeech,
}));
vi.mock("../lib/config.js", () => ({
  loadConfig: mocks.loadConfig,
  loadSettings: mocks.loadSettings,
}));
vi.mock("../lib/content.js", () => ({
  truncateAndScale: mocks.truncateAndScale,
}));
vi.mock("../lib/session.js", () => ({
  saveSummary: mocks.saveSummary,
  saveAudioFile: mocks.saveAudioFile,
  getSessionPaths: mocks.getSessionPaths,
}));
vi.mock("../lib/tts.js", () => ({
  generateAudio: mocks.generateAudio,
}));
vi.mock("../lib/history.js", () => ({
  addEntry: mocks.addEntry,
}));
vi.mock("../lib/markdownFormatter.js", () => ({
  formatMarkdown: (md: string) => `[FORMATTED]${md}[/FORMATTED]`,
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
  mocks.loadSettings.mockResolvedValue({ fallbackToJina: true });
  mocks.truncateAndScale.mockImplementation((_result: ExtractionResult, cfg: Config) => cfg);
  mocks.extract.mockResolvedValue(TEST_EXTRACTION);
  mocks.summarize.mockResolvedValue(TEST_RESULT);
  mocks.getSessionPaths.mockReturnValue(TEST_SESSION);
  mocks.saveSummary.mockResolvedValue(TEST_SESSION);
  mocks.saveAudioFile.mockResolvedValue(undefined);
  mocks.rewriteForSpeech.mockResolvedValue("Spoken version of summary...");
  mocks.generateAudio.mockResolvedValue("/tmp/audio-temp.mp3");
  mocks.addEntry.mockResolvedValue(undefined);
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
});

describe("runBatch", () => {
  it("extracts, summarizes, and writes summary", async () => {
    const results = await runBatch({
      inputs: ["https://techcrunch.com/article"],
      overrides: {},
      includeAudio: false,
    });

    expect(mocks.extract).toHaveBeenCalledWith("https://techcrunch.com/article", undefined, {
      fallbackToJina: true,
    });
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
    expect(results).toHaveLength(1);
    expect(results[0]?.result).toBeDefined();
    expect(results[0]?.error).toBeUndefined();
  });

  it("generates audio when --audio is set", async () => {
    await runBatch({
      inputs: ["https://techcrunch.com/article"],
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
      inputs: ["https://techcrunch.com/article"],
      overrides: {},
      includeAudio: false,
    });

    expect(mocks.rewriteForSpeech).not.toHaveBeenCalled();
    expect(mocks.generateAudio).not.toHaveBeenCalled();
    expect(mocks.saveAudioFile).not.toHaveBeenCalled();
  });

  it("uses --output directory when provided", async () => {
    await runBatch({
      inputs: ["https://techcrunch.com/article"],
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
      inputs: ["https://techcrunch.com/article"],
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
      inputs: ["https://techcrunch.com/article"],
      overrides,
      includeAudio: false,
    });

    expect(mocks.loadConfig).toHaveBeenCalledWith(overrides);
  });

  it("returns error result on extraction failure", async () => {
    mocks.extract.mockRejectedValue(new Error("Network error"));

    const results = await runBatch({
      inputs: ["https://bad-url.com"],
      overrides: {},
      includeAudio: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.error).toBe("Network error");
    expect(results[0]?.result).toBeUndefined();
    expect(stderrOutput).toContain("Error: Network error");
  });

  it("returns error result on summarization failure", async () => {
    mocks.summarize.mockRejectedValue(new Error("API rate limit"));

    const results = await runBatch({
      inputs: ["https://techcrunch.com/article"],
      overrides: {},
      includeAudio: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.error).toBe("API rate limit");
    expect(results[0]?.result).toBeUndefined();
  });

  it("logs progress to stderr", async () => {
    await runBatch({
      inputs: ["https://techcrunch.com/article"],
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
      inputs: [longUrl],
      overrides: {},
      includeAudio: false,
    });

    expect(stderrOutput).toContain("...");
    expect(stderrOutput).not.toContain(longUrl);
  });

  it("adds each result to history via addEntry", async () => {
    await runBatch({
      inputs: ["https://techcrunch.com/article"],
      overrides: {},
      includeAudio: false,
    });

    expect(mocks.addEntry).toHaveBeenCalledWith(TEST_RESULT);
  });

  // -----------------------------------------------------------------------
  // Multi-URL tests
  // -----------------------------------------------------------------------
  describe("multi-URL processing", () => {
    const EXTRACTION_2: ExtractionResult = {
      title: "Apple WWDC 2026",
      content: "Apple announced new features...",
      wordCount: 800,
      source: "https://apple.com/wwdc",
    };
    const SUMMARY_2 = "# Apple WWDC 2026\n\nApple announced new features...";
    const RESULT_2: TldrResult = {
      extraction: EXTRACTION_2,
      summary: SUMMARY_2,
      timestamp: Date.now(),
    };
    const SESSION_2: SessionPaths = {
      sessionDir: "/tmp/tldr-test-out/2026-02-23/apple-wwdc-2026",
      summaryPath: "/tmp/tldr-test-out/2026-02-23/apple-wwdc-2026/summary.md",
      audioPath: "/tmp/tldr-test-out/2026-02-23/apple-wwdc-2026/audio.mp3",
      chatPath: "/tmp/tldr-test-out/2026-02-23/apple-wwdc-2026/chat.md",
    };

    const EXTRACTION_3: ExtractionResult = {
      title: "Meta AI Update",
      content: "Meta released Llama 4...",
      wordCount: 600,
      source: "https://meta.com/ai",
    };
    const SUMMARY_3 = "# Meta AI Update\n\nMeta released Llama 4...";
    const RESULT_3: TldrResult = {
      extraction: EXTRACTION_3,
      summary: SUMMARY_3,
      timestamp: Date.now(),
    };
    const SESSION_3: SessionPaths = {
      sessionDir: "/tmp/tldr-test-out/2026-02-23/meta-ai-update",
      summaryPath: "/tmp/tldr-test-out/2026-02-23/meta-ai-update/summary.md",
      audioPath: "/tmp/tldr-test-out/2026-02-23/meta-ai-update/audio.mp3",
      chatPath: "/tmp/tldr-test-out/2026-02-23/meta-ai-update/chat.md",
    };

    it("processes multiple inputs sequentially", async () => {
      const callOrder: string[] = [];
      mocks.extract.mockImplementation(async (url: string) => {
        callOrder.push(`extract:${url}`);
        if (url === "https://apple.com/wwdc") return EXTRACTION_2;
        if (url === "https://meta.com/ai") return EXTRACTION_3;
        return TEST_EXTRACTION;
      });
      mocks.summarize.mockImplementation(async (extraction: ExtractionResult) => {
        callOrder.push(`summarize:${extraction.source}`);
        if (extraction.source === "https://apple.com/wwdc") return RESULT_2;
        if (extraction.source === "https://meta.com/ai") return RESULT_3;
        return TEST_RESULT;
      });
      mocks.getSessionPaths.mockImplementation((_dir: string, extraction: ExtractionResult) => {
        if (extraction.source === "https://apple.com/wwdc") return SESSION_2;
        if (extraction.source === "https://meta.com/ai") return SESSION_3;
        return TEST_SESSION;
      });
      mocks.saveSummary.mockImplementation(async (session: SessionPaths) => session);

      const results = await runBatch({
        inputs: ["https://techcrunch.com/article", "https://apple.com/wwdc", "https://meta.com/ai"],
        overrides: {},
        includeAudio: false,
      });

      expect(results).toHaveLength(3);
      expect(results[0]?.result).toBeDefined();
      expect(results[1]?.result).toBeDefined();
      expect(results[2]?.result).toBeDefined();

      // Verify sequential ordering
      expect(callOrder).toEqual([
        "extract:https://techcrunch.com/article",
        "summarize:https://techcrunch.com/article",
        "extract:https://apple.com/wwdc",
        "summarize:https://apple.com/wwdc",
        "extract:https://meta.com/ai",
        "summarize:https://meta.com/ai",
      ]);

      expect(mocks.extract).toHaveBeenCalledTimes(3);
      expect(mocks.summarize).toHaveBeenCalledTimes(3);
      expect(mocks.saveSummary).toHaveBeenCalledTimes(3);
    });

    it("continues on error for middle URL", async () => {
      mocks.extract.mockImplementation(async (url: string) => {
        if (url === "https://bad-url.com") throw new Error("Connection timeout");
        if (url === "https://meta.com/ai") return EXTRACTION_3;
        return TEST_EXTRACTION;
      });
      mocks.summarize.mockImplementation(async (extraction: ExtractionResult) => {
        if (extraction.source === "https://meta.com/ai") return RESULT_3;
        return TEST_RESULT;
      });
      mocks.getSessionPaths.mockImplementation((_dir: string, extraction: ExtractionResult) => {
        if (extraction.source === "https://meta.com/ai") return SESSION_3;
        return TEST_SESSION;
      });
      mocks.saveSummary.mockImplementation(async (session: SessionPaths) => session);

      const results = await runBatch({
        inputs: ["https://techcrunch.com/article", "https://bad-url.com", "https://meta.com/ai"],
        overrides: {},
        includeAudio: false,
      });

      expect(results).toHaveLength(3);
      expect(results[0]?.result).toBeDefined();
      expect(results[0]?.error).toBeUndefined();
      expect(results[1]?.error).toBe("Connection timeout");
      expect(results[1]?.result).toBeUndefined();
      expect(results[2]?.result).toBeDefined();
      expect(results[2]?.error).toBeUndefined();

      // First and third should still save
      expect(mocks.saveSummary).toHaveBeenCalledTimes(2);
    });

    it("adds each successful result to history", async () => {
      mocks.extract.mockImplementation(async (url: string) => {
        if (url === "https://bad-url.com") throw new Error("fail");
        return TEST_EXTRACTION;
      });

      await runBatch({
        inputs: ["https://techcrunch.com/article", "https://bad-url.com"],
        overrides: {},
        includeAudio: false,
      });

      // Only the successful one should be added
      expect(mocks.addEntry).toHaveBeenCalledTimes(1);
      expect(mocks.addEntry).toHaveBeenCalledWith(TEST_RESULT);
    });

    it("separates multiple summaries with --- on stdout", async () => {
      mocks.extract.mockImplementation(async (url: string) => {
        if (url === "https://apple.com/wwdc") return EXTRACTION_2;
        return TEST_EXTRACTION;
      });
      mocks.summarize.mockImplementation(async (extraction: ExtractionResult) => {
        if (extraction.source === "https://apple.com/wwdc") return RESULT_2;
        return TEST_RESULT;
      });
      mocks.getSessionPaths.mockImplementation((_dir: string, extraction: ExtractionResult) => {
        if (extraction.source === "https://apple.com/wwdc") return SESSION_2;
        return TEST_SESSION;
      });
      mocks.saveSummary.mockImplementation(async (session: SessionPaths) => session);

      await runBatch({
        inputs: ["https://techcrunch.com/article", "https://apple.com/wwdc"],
        overrides: {},
        includeAudio: false,
      });

      expect(stdoutOutput).toBe(`${TEST_SUMMARY}\n---\n\n${SUMMARY_2}`);
    });

    it("returns BatchResult[] with correct structure", async () => {
      mocks.extract.mockImplementation(async (url: string) => {
        if (url === "https://bad-url.com") throw new Error("fail");
        return TEST_EXTRACTION;
      });

      const results = await runBatch({
        inputs: ["https://techcrunch.com/article", "https://bad-url.com"],
        overrides: {},
        includeAudio: false,
      });

      expect(results).toHaveLength(2);

      // Successful result
      expect(results[0]).toEqual({
        input: "https://techcrunch.com/article",
        result: TEST_RESULT,
        sessionDir: TEST_SESSION.sessionDir,
      });

      // Failed result
      expect(results[1]).toEqual({
        input: "https://bad-url.com",
        error: "fail",
      });
    });

    it("prints completion report to stderr for multi-input batches", async () => {
      mocks.extract.mockImplementation(async (url: string) => {
        if (url === "https://bad-url.com") throw new Error("fail");
        return TEST_EXTRACTION;
      });

      await runBatch({
        inputs: ["https://techcrunch.com/article", "https://bad-url.com"],
        overrides: {},
        includeAudio: false,
      });

      expect(stderrOutput).toContain("Batch complete: 1 succeeded, 1 failed");
    });

    it("does not print completion report for single-input batches", async () => {
      await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
      });

      expect(stderrOutput).not.toContain("Batch complete:");
    });

    it("shows progress prefixes for multi-input batches", async () => {
      mocks.extract.mockImplementation(async (url: string) => {
        if (url === "https://apple.com/wwdc") return EXTRACTION_2;
        return TEST_EXTRACTION;
      });
      mocks.summarize.mockImplementation(async (extraction: ExtractionResult) => {
        if (extraction.source === "https://apple.com/wwdc") return RESULT_2;
        return TEST_RESULT;
      });
      mocks.getSessionPaths.mockImplementation((_dir: string, extraction: ExtractionResult) => {
        if (extraction.source === "https://apple.com/wwdc") return SESSION_2;
        return TEST_SESSION;
      });
      mocks.saveSummary.mockImplementation(async (session: SessionPaths) => session);

      await runBatch({
        inputs: ["https://techcrunch.com/article", "https://apple.com/wwdc"],
        overrides: {},
        includeAudio: false,
      });

      expect(stderrOutput).toContain("[1/2] Extracting:");
      expect(stderrOutput).toContain("[1/2] Summarizing:");
      expect(stderrOutput).toContain("[1/2] Saved to");
      expect(stderrOutput).toContain("[2/2] Extracting:");
      expect(stderrOutput).toContain("[2/2] Summarizing:");
      expect(stderrOutput).toContain("[2/2] Saved to");
    });

    it("does not show progress prefixes for single-input batches", async () => {
      await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
      });

      expect(stderrOutput).not.toContain("[1/1]");
    });
  });

  describe("fallbackToJina settings", () => {
    it("passes fallbackToJina from user settings to extract", async () => {
      mocks.loadSettings.mockResolvedValue({ fallbackToJina: false });

      await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
      });

      expect(mocks.extract).toHaveBeenCalledWith("https://techcrunch.com/article", undefined, {
        fallbackToJina: false,
      });
    });

    it("defaults fallbackToJina to true when setting is undefined", async () => {
      mocks.loadSettings.mockResolvedValue({});

      await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
      });

      expect(mocks.extract).toHaveBeenCalledWith("https://techcrunch.com/article", undefined, {
        fallbackToJina: true,
      });
    });
  });

  describe("truncateAndScale", () => {
    it("calls truncateAndScale before summarizing", async () => {
      const scaledConfig = { ...TEST_CONFIG, maxTokens: 4096 };
      mocks.truncateAndScale.mockReturnValue(scaledConfig);

      await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
      });

      expect(mocks.truncateAndScale).toHaveBeenCalledWith(TEST_EXTRACTION, TEST_CONFIG);
      expect(mocks.summarize).toHaveBeenCalledWith(
        TEST_EXTRACTION,
        scaledConfig,
        expect.any(Function),
      );
    });
  });

  describe("audio error isolation", () => {
    it("succeeds when audio generation fails", async () => {
      mocks.generateAudio.mockRejectedValue(new Error("TTS service unavailable"));

      const results = await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.result).toBeDefined();
      expect(results[0]?.error).toBeUndefined();
      expect(stderrOutput).toContain("Audio failed: TTS service unavailable");
      expect(mocks.addEntry).toHaveBeenCalledWith(TEST_RESULT);
      expect(stdoutOutput).toBe(TEST_SUMMARY);
    });

    it("succeeds when rewriteForSpeech fails", async () => {
      mocks.rewriteForSpeech.mockRejectedValue(new Error("Speech rewrite failed"));

      const results = await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.result).toBeDefined();
      expect(results[0]?.error).toBeUndefined();
      expect(stderrOutput).toContain("Audio failed: Speech rewrite failed");
    });
  });

  describe("browse option", () => {
    it("suppresses stdout when browse is true", async () => {
      const results = await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
        browse: true,
      });

      expect(stdoutOutput).toBe("");
      expect(results).toHaveLength(1);
      expect(results[0]?.result).toBeDefined();
    });

    it("still writes progress to stderr when browse is true", async () => {
      await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
        browse: true,
      });

      expect(stderrOutput).toContain("Extracting:");
      expect(stderrOutput).toContain("Summarizing:");
      expect(stderrOutput).toContain("Saved to");
    });

    it("returns results when browse is true", async () => {
      const results = await runBatch({
        inputs: ["https://techcrunch.com/article"],
        overrides: {},
        includeAudio: false,
        browse: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.result).toEqual(TEST_RESULT);
      expect(results[0]?.sessionDir).toBe(TEST_SESSION.sessionDir);
    });
  });

  describe("TTY formatting", () => {
    it("outputs formatted markdown when stdout is a TTY", async () => {
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

      try {
        await runBatch({
          inputs: ["https://techcrunch.com/article"],
          overrides: {},
          includeAudio: false,
        });

        expect(stdoutOutput).toContain("[FORMATTED]");
        expect(stdoutOutput).toContain(TEST_SUMMARY);
      } finally {
        Object.defineProperty(process.stdout, "isTTY", {
          value: originalIsTTY,
          writable: true,
        });
      }
    });

    it("outputs raw markdown when stdout is not a TTY", async () => {
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });

      try {
        await runBatch({
          inputs: ["https://techcrunch.com/article"],
          overrides: {},
          includeAudio: false,
        });

        expect(stdoutOutput).toBe(TEST_SUMMARY);
        expect(stdoutOutput).not.toContain("[FORMATTED]");
      } finally {
        Object.defineProperty(process.stdout, "isTTY", {
          value: originalIsTTY,
          writable: true,
        });
      }
    });
  });
});
