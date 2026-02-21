import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Config,
  ExtractionResult,
  SessionPaths,
  ThemePalette,
  TldrResult,
} from "../lib/types.js";

// ---------------------------------------------------------------------------
// Hoisted mocks — created before any module loads
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  extract: vi.fn(),
  summarize: vi.fn(),
  rewriteForSpeech: vi.fn(),
  loadConfig: vi.fn(),
  loadSettings: vi.fn(),
  saveConfig: vi.fn(),
  saveSettings: vi.fn(),
  listProfiles: vi.fn(),
  setActiveProfile: vi.fn(),
  addEntry: vi.fn(),
  getRecent: vi.fn(),
  removeEntry: vi.fn(),
  deduplicateBySource: vi.fn((e: TldrResult[]) => e),
  saveSummary: vi.fn(),
  saveAudioFile: vi.fn(),
  saveChat: vi.fn(),
  getSessionPaths: vi.fn(),
  generateAudio: vi.fn(),
  playAudio: vi.fn(),
  stopAudio: vi.fn(),
  speakFallback: vi.fn(),
  getVoiceDisplayName: vi.fn(),
  writeClipboard: vi.fn(),
  readClipboard: vi.fn(),
  isClaudeCodeAvailable: vi.fn(),
  isCodexAvailable: vi.fn(),
  resolveTheme: vi.fn(),
  checkForUpdate: vi.fn(),
  chatWithSession: vi.fn(),
  buildChatSystemPrompt: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("../pipeline.js", () => ({ extract: mocks.extract }));
vi.mock("../lib/summarizer.js", () => ({
  summarize: mocks.summarize,
  rewriteForSpeech: mocks.rewriteForSpeech,
}));
vi.mock("../lib/config.js", () => ({
  loadConfig: mocks.loadConfig,
  loadSettings: mocks.loadSettings,
  saveConfig: mocks.saveConfig,
  saveSettings: mocks.saveSettings,
  listProfiles: mocks.listProfiles,
  setActiveProfile: mocks.setActiveProfile,
}));
vi.mock("../lib/history.js", () => ({
  addEntry: mocks.addEntry,
  getRecent: mocks.getRecent,
  removeEntry: mocks.removeEntry,
  deduplicateBySource: mocks.deduplicateBySource,
}));
vi.mock("../lib/session.js", () => ({
  saveSummary: mocks.saveSummary,
  saveAudioFile: mocks.saveAudioFile,
  saveChat: mocks.saveChat,
  getSessionPaths: mocks.getSessionPaths,
}));
vi.mock("../lib/tts.js", () => ({
  generateAudio: mocks.generateAudio,
  playAudio: mocks.playAudio,
  stopAudio: mocks.stopAudio,
  speakFallback: mocks.speakFallback,
  getVoiceDisplayName: mocks.getVoiceDisplayName,
}));
vi.mock("../lib/clipboard.js", () => ({
  writeClipboard: mocks.writeClipboard,
  readClipboard: mocks.readClipboard,
}));
vi.mock("../lib/providers/claude-code.js", () => ({
  isClaudeCodeAvailable: mocks.isClaudeCodeAvailable,
}));
vi.mock("../lib/providers/codex.js", () => ({
  isCodexAvailable: mocks.isCodexAvailable,
}));
vi.mock("../lib/theme.js", () => ({
  resolveTheme: mocks.resolveTheme,
}));
vi.mock("../lib/updateCheck.js", () => ({
  checkForUpdate: mocks.checkForUpdate,
  compareSemver: vi.fn(() => 0),
  getUpdateCommand: vi.fn(() => "brew upgrade tldr-cli"),
  isHomebrew: vi.fn(() => false),
}));
vi.mock("../lib/chat.js", () => ({
  chatWithSession: mocks.chatWithSession,
  buildChatSystemPrompt: mocks.buildChatSystemPrompt,
}));

// ---------------------------------------------------------------------------
// Dynamic import AFTER mocks are in place
// ---------------------------------------------------------------------------
const { App } = await import("../App.js");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const DEFAULT_PALETTE: ThemePalette = {
  brand: "#ff6b6b",
  brandBorder: "#ff8882",
  brandAccent: "#ffd6c0",
  accent: "#f9ca24",
  success: "#69db7c",
  warning: "#ffd43b",
  error: "#ff6b6b",
};

const TEST_CONFIG: Config = {
  apiKey: "sk-test",
  baseUrl: undefined,
  maxTokens: 1024,
  profileName: "default",
  cognitiveTraits: [],
  tone: "casual",
  summaryStyle: "standard",
  model: "claude-haiku-4-5-20251001",
  customInstructions: undefined,
  voice: "en-US-JennyNeural",
  ttsSpeed: 1.0,
  pitch: "default",
  volume: "normal",
  provider: "anthropic",
  outputDir: "/tmp/tldr-test",
  ttsProvider: "edge-tts",
  ttsModel: "tts-1",
};

const TEST_EXTRACTION: ExtractionResult = {
  title: "Test Article",
  content: "This is test content for summarization.",
  wordCount: 7,
  source: "https://example.com/article",
};

const TEST_RESULT: TldrResult = {
  extraction: TEST_EXTRACTION,
  summary: "## TL;DR\nA test summary.",
  timestamp: Date.now(),
};

const TEST_SESSION: SessionPaths = {
  sessionDir: "/tmp/tldr-test/2026-02-18-test-article",
  summaryPath: "/tmp/tldr-test/2026-02-18-test-article/summary.md",
  audioPath: "/tmp/tldr-test/2026-02-18-test-article/audio.mp3",
  chatPath: "/tmp/tldr-test/2026-02-18-test-article/chat.md",
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.resolveTheme.mockReturnValue(DEFAULT_PALETTE);
    mocks.loadSettings.mockResolvedValue({
      setupCompleted: true,
      activeProfile: "default",
      profiles: {
        default: { tone: "casual", summaryStyle: "standard", cognitiveTraits: [] },
      },
    });
    mocks.loadConfig.mockResolvedValue(TEST_CONFIG);
    mocks.getRecent.mockResolvedValue([]);
    mocks.isClaudeCodeAvailable.mockReturnValue(true);
    mocks.isCodexAvailable.mockReturnValue(true);
    mocks.getVoiceDisplayName.mockReturnValue("Jenny");
    mocks.readClipboard.mockReturnValue("");
    mocks.checkForUpdate.mockResolvedValue(null);
    mocks.deduplicateBySource.mockImplementation((e: TldrResult[]) => e);
    mocks.addEntry.mockResolvedValue(undefined);
    mocks.saveChat.mockResolvedValue(undefined);
    mocks.getSessionPaths.mockReturnValue(TEST_SESSION);
    mocks.saveSummary.mockResolvedValue(TEST_SESSION);
    mocks.extract.mockResolvedValue(TEST_EXTRACTION);
    mocks.summarize.mockImplementation(
      async (_result: ExtractionResult, _config: Config, onChunk: (text: string) => void) => {
        onChunk("## TL;DR\nA test summary.");
        return TEST_RESULT;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Group 1: Happy path
  // -----------------------------------------------------------------------
  describe("happy path", () => {
    it("processes initialInput through to result view", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(mocks.extract).toHaveBeenCalledWith(
            "https://example.com/article",
            expect.any(AbortSignal),
          );
        },
        { timeout: 2000 },
      );

      await vi.waitFor(
        () => {
          expect(mocks.summarize).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("TL;DR");
          expect(frame).toContain("A test summary.");
        },
        { timeout: 2000 },
      );

      const frame = instance.lastFrame();
      expect(frame).toContain("[Enter] save");
      expect(frame).toContain("[c]");

      instance.unmount();
    });

    it("saves on Enter and stays on result view", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(mocks.saveSummary).toHaveBeenCalledWith(TEST_SESSION, TEST_RESULT.summary);
        },
        { timeout: 2000 },
      );

      await vi.waitFor(
        () => {
          expect(mocks.addEntry).toHaveBeenCalledWith(TEST_RESULT);
        },
        { timeout: 2000 },
      );

      // Should stay on result view with "Saved" in footer
      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("TL;DR");
          expect(frame).toContain("Saved");
          expect(frame).not.toContain("[Enter] save");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 2: Abort with ESC
  // -----------------------------------------------------------------------
  describe("abort with ESC", () => {
    it("ESC during extraction exits app when initialInput provided", async () => {
      mocks.extract.mockImplementation(
        (_input: string, signal?: AbortSignal) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Extracting");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\x1B");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).not.toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("ESC during summarization exits app when initialInput provided", async () => {
      mocks.summarize.mockImplementation(
        (
          _result: ExtractionResult,
          _config: Config,
          _onChunk: (text: string) => void,
          signal?: AbortSignal,
        ) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Summarizing");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\x1B");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).not.toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 3: Error states
  // -----------------------------------------------------------------------
  describe("error states", () => {
    it("shows error for empty extraction", async () => {
      mocks.extract.mockResolvedValue({
        ...TEST_EXTRACTION,
        content: "",
        wordCount: 0,
      });

      const instance = render(<App initialInput="https://example.com/empty" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Couldn't extract content");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows error message on extraction failure", async () => {
      mocks.extract.mockRejectedValue(new Error("Network error"));

      const instance = render(<App initialInput="https://example.com/fail" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Network error");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows paywall hint for partial extraction", async () => {
      mocks.extract.mockResolvedValue({
        ...TEST_EXTRACTION,
        content: "",
        wordCount: 0,
        partial: true,
      });

      const instance = render(<App initialInput="https://example.com/paywall" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("paywall");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 4: Double processing (retry aborts previous)
  // -----------------------------------------------------------------------
  describe("double processing", () => {
    it("re-runs pipeline on 'r' key", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      expect(mocks.extract).toHaveBeenCalledTimes(1);

      instance.stdin.write("r");

      await vi.waitFor(
        () => {
          expect(mocks.extract).toHaveBeenCalledTimes(2);
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 5: Result keybindings
  // -----------------------------------------------------------------------
  describe("result keybindings", () => {
    it("'c' copies summary to clipboard", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("c");

      await vi.waitFor(
        () => {
          expect(mocks.writeClipboard).toHaveBeenCalledWith("## TL;DR\nA test summary.");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("'t' transitions away from result view", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("t");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).not.toContain("[Enter] save");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("double-tap 'q' exits app when initialInput provided", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      // First q — warning appears
      instance.stdin.write("q");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("press again to discard");
        },
        { timeout: 2000 },
      );

      // Let useEffect flush so useInput handler ref captures discardPending=true
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Second q — app should exit (not return to idle prompt)
      instance.stdin.write("q");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).not.toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows save toast in result view", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Saved to");
          expect(frame).toContain("TL;DR");
        },
        { timeout: 3000 },
      );

      instance.unmount();
    });

    it("single-tap q exits app after save when initialInput provided", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Saved");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("q");

      await vi.waitFor(
        () => {
          // App should exit (not return to idle prompt)
          expect(instance.lastFrame()).not.toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("Enter is no-op after save", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Saved");
        },
        { timeout: 2000 },
      );

      // Press Enter again — should be a no-op
      instance.stdin.write("\r");

      // Small delay to ensure no re-save happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mocks.saveSummary).toHaveBeenCalledTimes(1);

      instance.unmount();
    });

    it("re-summarize after save creates fresh unsaved result", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Saved");
        },
        { timeout: 2000 },
      );

      // Re-summarize
      instance.stdin.write("r");

      await vi.waitFor(
        () => {
          expect(mocks.extract).toHaveBeenCalledTimes(2);
        },
        { timeout: 2000 },
      );

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("TL;DR");
          expect(frame).toContain("[Enter] save");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("Ctrl+S in chat triggers saveChat", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      // Enter chat mode
      instance.stdin.write("t");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Chat");
          expect(instance.lastFrame()).toContain("Ctrl+s");
          expect(instance.lastFrame()).toContain("save chat");
        },
        { timeout: 2000 },
      );

      // Let effects flush before sending Ctrl+S
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Ctrl+S (raw mode: \x13)
      instance.stdin.write("\x13");

      await vi.waitFor(
        () => {
          // Since there's a pending result, saveSummary is called first, then saveChat
          expect(mocks.saveSummary).toHaveBeenCalled();
          expect(mocks.saveChat).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      // Toast should appear
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Chat saved");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows Chat panel in result view", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Chat");
          expect(frame).toContain("follow-up questions");
          expect(frame).toContain("[t] start chatting");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 6: Slash commands
  // -----------------------------------------------------------------------
  describe("slash commands", () => {
    it("/help shows help view", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      // Type characters, wait for render, flush effects, then submit
      instance.stdin.write("/help");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("/help");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Slash Commands");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("/history shows history view", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("/history");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("/history");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("History");
        },
        { timeout: 3000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 7: Provider fallback
  // -----------------------------------------------------------------------
  describe("provider fallback", () => {
    it("shows error when claude-code unavailable and no API key", async () => {
      mocks.isClaudeCodeAvailable.mockReturnValue(false);
      mocks.loadConfig.mockResolvedValue({
        ...TEST_CONFIG,
        provider: "claude-code" as const,
        apiKey: "",
      });

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Claude Code is not installed");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("falls back to anthropic when claude-code unavailable but API key present", async () => {
      mocks.isClaudeCodeAvailable.mockReturnValue(false);
      mocks.loadConfig.mockResolvedValue({
        ...TEST_CONFIG,
        provider: "claude-code" as const,
        apiKey: "sk-test",
      });

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows error when codex unavailable", async () => {
      mocks.isCodexAvailable.mockReturnValue(false);
      mocks.loadConfig.mockResolvedValue({
        ...TEST_CONFIG,
        provider: "codex" as const,
      });

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Codex CLI is not installed");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 8: Audio UX
  // -----------------------------------------------------------------------
  describe("audio UX", () => {
    it("shows bordered audio panel on result", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Audio");
          expect(frame).toContain("rewritten as a spoken");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("audio panel shows generating state on 'a' keypress", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("rewritten as a spoken");
        },
        { timeout: 2000 },
      );

      // Mock generateAudio to hang so we stay in generating state
      mocks.rewriteForSpeech.mockResolvedValue("speech text");
      mocks.generateAudio.mockImplementation(() => new Promise(() => {}));

      instance.stdin.write("a");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Generating audio");
          expect(frame).not.toContain("rewritten as a spoken");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("footer does not contain [a] or [w] shortcuts", async () => {
      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      const frame = instance.lastFrame();
      // Find the footer line (dimColor text with [Enter])
      const footerLine = frame
        ?.split("\n")
        .find((line) => line.includes("[Enter]") && line.includes("[c]"));
      expect(footerLine).toBeDefined();
      expect(footerLine).not.toContain("[a]");
      expect(footerLine).not.toContain("[w]");

      instance.unmount();
    });

    it("save toast says 'Saved with audio' on successful audio save", async () => {
      mocks.rewriteForSpeech.mockResolvedValue("speech text");
      mocks.generateAudio.mockResolvedValue("/tmp/audio.mp3");
      mocks.saveAudioFile.mockResolvedValue(undefined);

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("w");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Saved with audio");
        },
        { timeout: 3000 },
      );

      instance.unmount();
    });

    it("save toast says '(audio failed)' when audio generation fails", async () => {
      mocks.rewriteForSpeech.mockResolvedValue("speech text");
      mocks.generateAudio.mockRejectedValue(new Error("TTS failed"));

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("w");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("(audio failed)");
        },
        { timeout: 3000 },
      );

      instance.unmount();
    });

    it("'w' after successful 'a' saves with audio using temp path", async () => {
      mocks.rewriteForSpeech.mockResolvedValue("speech text");
      mocks.generateAudio.mockResolvedValue("/tmp/audio.mp3");
      mocks.saveAudioFile.mockResolvedValue(undefined);
      const fakeProc = { on: vi.fn((_e: string, cb: () => void) => cb()), kill: vi.fn() };
      mocks.playAudio.mockReturnValue(fakeProc);

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      // Press 'a' to generate and play audio
      instance.stdin.write("a");

      await vi.waitFor(
        () => {
          expect(mocks.generateAudio).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      // Now press 'w' to save with audio — should use tempAudioPath
      instance.stdin.write("w");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Saved with audio");
        },
        { timeout: 3000 },
      );

      expect(mocks.saveAudioFile).toHaveBeenCalledWith(TEST_SESSION, "/tmp/audio.mp3");

      instance.unmount();
    });

    it("'w' after fallback TTS shows audio failed", async () => {
      mocks.rewriteForSpeech.mockResolvedValue("speech text");
      mocks.generateAudio.mockRejectedValue(new Error("edge-tts failed"));
      const fakeProc = { on: vi.fn((_e: string, cb: () => void) => cb()), kill: vi.fn() };
      mocks.speakFallback.mockReturnValue(fakeProc);

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      // Press 'a' — edge-tts fails, falls back to system TTS
      instance.stdin.write("a");

      await vi.waitFor(
        () => {
          expect(mocks.speakFallback).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      // [w] should be hidden when audioIsFallback is true
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).not.toContain("[w]");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("'w' surfaces saveAudioFile errors", async () => {
      mocks.rewriteForSpeech.mockResolvedValue("speech text");
      mocks.generateAudio.mockResolvedValue("/tmp/audio.mp3");
      mocks.saveAudioFile.mockRejectedValue(new Error("ENOSPC: disk full"));
      const fakeProc = { on: vi.fn((_e: string, cb: () => void) => cb()), kill: vi.fn() };
      mocks.playAudio.mockReturnValue(fakeProc);

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("TL;DR");
        },
        { timeout: 2000 },
      );

      // Press 'a' first so tempAudioPath is set
      instance.stdin.write("a");

      await vi.waitFor(
        () => {
          expect(mocks.generateAudio).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      // Press 'w' — saveAudioFile will reject
      instance.stdin.write("w");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("ENOSPC: disk full");
        },
        { timeout: 3000 },
      );

      instance.unmount();
    });

    it("HelpView shows 'w' shortcut and 'Save with audio'", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("/help");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("/help");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Slash Commands");
          expect(frame).toContain("Save with audio");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });
});
