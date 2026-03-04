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
  resolveConfig: vi.fn(),
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
  validateCliProvider: vi.fn(),
  resolveTheme: vi.fn(),
  checkForUpdate: vi.fn(),
  chatWithSession: vi.fn(),
  buildChatSystemPrompt: vi.fn(),
  canListModels: vi.fn(),
  listModelsForProvider: vi.fn(),
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
  resolveConfig: mocks.resolveConfig,
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
}));
vi.mock("../lib/providers/index.js", () => ({
  validateCliProvider: mocks.validateCliProvider,
  PROVIDER_ENV_VARS: {
    anthropic: "ANTHROPIC_API_KEY",
    "claude-code": null,
    codex: null,
    gemini: "GEMINI_API_KEY",
    ollama: null,
    openai: "OPENAI_API_KEY",
    xai: "XAI_API_KEY",
  },
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
vi.mock("../lib/modelDiscovery.js", () => ({
  canListModels: mocks.canListModels,
  listModelsForProvider: mocks.listModelsForProvider,
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
  audioMode: "podcast" as const,
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
    mocks.resolveConfig.mockImplementation(
      (settings: {
        apiKey?: string;
        activeProfile?: string;
        profiles?: Record<string, Record<string, unknown>>;
      }) => {
        const profileName = settings.activeProfile ?? "default";
        const profile = settings.profiles?.[profileName] ?? {};
        return {
          ...TEST_CONFIG,
          profileName,
          apiKey: settings.apiKey ?? TEST_CONFIG.apiKey,
          provider: profile.provider ?? "claude-code",
          audioMode: profile.audioMode ?? "podcast",
          tone: profile.tone ?? TEST_CONFIG.tone,
          summaryStyle: profile.summaryStyle ?? TEST_CONFIG.summaryStyle,
          cognitiveTraits: profile.cognitiveTraits ?? TEST_CONFIG.cognitiveTraits,
        };
      },
    );
    mocks.loadSettings.mockResolvedValue({
      setupCompleted: true,
      activeProfile: "default",
      profiles: {
        default: { tone: "casual", summaryStyle: "standard", cognitiveTraits: [] },
      },
    });
    mocks.loadConfig.mockResolvedValue(TEST_CONFIG);
    mocks.getRecent.mockResolvedValue([]);
    mocks.validateCliProvider.mockResolvedValue(null);
    mocks.getVoiceDisplayName.mockReturnValue("Jenny");
    mocks.checkForUpdate.mockResolvedValue(null);
    mocks.deduplicateBySource.mockImplementation((e: TldrResult[]) => e);
    mocks.addEntry.mockResolvedValue(undefined);
    mocks.saveChat.mockResolvedValue(undefined);
    mocks.getSessionPaths.mockReturnValue(TEST_SESSION);
    mocks.saveSummary.mockResolvedValue(TEST_SESSION);
    mocks.canListModels.mockReturnValue(false);
    mocks.listModelsForProvider.mockResolvedValue([]);
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
            expect.objectContaining({ fallbackToJina: true }),
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

    it("shows specific auth error when summarize throws ProviderAuthError", async () => {
      // Simulates what happens when provider auth validation fails —
      // the real pipeline wraps ProviderAuthError into a SummarizerError
      // with the original message preserved
      const authError = new Error(
        "Missing API key for anthropic. Set ANTHROPIC_API_KEY in your shell profile.",
      );
      authError.name = "SummarizerError";
      mocks.summarize.mockRejectedValue(authError);

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("ANTHROPIC_API_KEY");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows fallback message when pipeline throws non-Error value", async () => {
      // Regression test: at v2.2.1, provider SDKs could throw non-Error values
      // which hit the generic fallback instead of showing a useful message
      mocks.extract.mockRejectedValue("raw string error from SDK");

      const instance = render(<App initialInput="https://example.com/fail" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("An unexpected error occurred");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows error when summarize fails with descriptive message", async () => {
      mocks.summarize.mockRejectedValue(
        new Error("Rate limited by API. Please wait a moment and try again."),
      );

      const instance = render(<App initialInput="https://example.com/article" />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Rate limited");
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
  // Group 6: showHistory prop
  // -----------------------------------------------------------------------
  describe("showHistory prop", () => {
    it("renders history view immediately when showHistory is true", async () => {
      const instance = render(<App showHistory={true} />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("History");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 7: Slash commands
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
  // Group 8: Provider fallback
  // -----------------------------------------------------------------------
  describe("provider fallback", () => {
    it("shows error when claude-code unavailable and no API key", async () => {
      mocks.validateCliProvider.mockResolvedValue({
        message: "Claude Code is not installed or not authenticated.",
        hint: 'Install it with: npm install -g @anthropic-ai/claude-code\nThen run "claude" to log in.',
      });
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
      mocks.validateCliProvider.mockResolvedValue({
        message: "Claude Code is not installed or not authenticated.",
        hint: "Install it.",
      });
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
      mocks.validateCliProvider.mockResolvedValue({
        message: "Codex CLI is not installed.",
        hint: "Install it with: npm install -g @openai/codex",
      });
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
  // Group 9: First-run setup wizard
  // -----------------------------------------------------------------------
  describe("first-run setup wizard", () => {
    beforeEach(() => {
      // Override: first-run state (setupCompleted is undefined)
      mocks.loadSettings.mockResolvedValue({
        setupCompleted: undefined,
        activeProfile: "default",
        profiles: {
          default: { tone: "casual", summaryStyle: "standard", cognitiveTraits: [] },
        },
      });
    });

    it("shows provider step first on fresh install", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("tldr Setup");
          expect(frame).toContain("AI Provider");
          expect(frame).toContain("Anthropic");
          expect(frame).toContain("Claude Code");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("selecting claude-code skips API key guidance and goes to theme", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("AI Provider");
        },
        { timeout: 2000 },
      );

      // Navigate down to Claude Code (index 1)
      instance.stdin.write("\x1B[B"); // down arrow
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Color theme");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("selecting anthropic without env var shows API key guidance", async () => {
      // Ensure ANTHROPIC_API_KEY is not set
      const origKey = process.env.ANTHROPIC_API_KEY;
      Reflect.deleteProperty(process.env, "ANTHROPIC_API_KEY");

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("AI Provider");
        },
        { timeout: 2000 },
      );

      // Anthropic is first in the list, just press Enter
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("ANTHROPIC_API_KEY");
          expect(frame).toContain("shell profile");
        },
        { timeout: 2000 },
      );

      // Restore env
      if (origKey !== undefined) process.env.ANTHROPIC_API_KEY = origKey;

      instance.unmount();
    });

    it("selecting anthropic with env var set skips guidance and goes to theme", async () => {
      const origKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "sk-test-key";

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("AI Provider");
        },
        { timeout: 2000 },
      );

      // Anthropic is first, press Enter
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Color theme");
        },
        { timeout: 2000 },
      );

      // Restore env
      if (origKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = origKey;
      } else {
        Reflect.deleteProperty(process.env, "ANTHROPIC_API_KEY");
      }

      instance.unmount();
    });

    it("selecting ollama skips API key guidance", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("AI Provider");
        },
        { timeout: 2000 },
      );

      // Navigate to Ollama (index 4: anthropic=0, claude-code=1, codex=2, gemini=3, ollama=4)
      for (let i = 0; i < 4; i++) {
        instance.stdin.write("\x1B[B");
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Color theme");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("audio mode step appears after style selection", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("AI Provider");
        },
        { timeout: 2000 },
      );

      // Step 1: Select claude-code (skip API key)
      instance.stdin.write("\x1B[B");
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Step 2: Theme name
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Color theme");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Step 3: Appearance
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Appearance mode");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Step 4: Traits
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Cognitive traits");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Step 5: Tone
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Tone");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Step 6: Style
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Summary style");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Step 7: Audio mode
      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Audio mode");
          expect(frame).toContain("Podcast");
          expect(frame).toContain("Briefing");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("completing wizard saves config with correct provider and audioMode", async () => {
      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("AI Provider");
        },
        { timeout: 2000 },
      );

      // Select claude-code (index 1)
      instance.stdin.write("\x1B[B");
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Theme name
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Color theme");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Appearance
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Appearance mode");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Traits
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Cognitive traits");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Tone
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Tone");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Style
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Summary style");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Audio mode — select "Briefing" (index 1)
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Audio mode");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\x1B[B");
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Verify saveConfig was called with the correct provider and audioMode
      await vi.waitFor(
        () => {
          expect(mocks.saveConfig).toHaveBeenCalled();
          const savedConfig = mocks.saveConfig.mock.calls[0]?.[0] as Config;
          expect(savedConfig.provider).toBe("claude-code");
          expect(savedConfig.audioMode).toBe("briefing");
        },
        { timeout: 3000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 10: Audio UX
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

  // -----------------------------------------------------------------------
  // Group 11: Multi-input queue processing
  // -----------------------------------------------------------------------
  describe("multi-input queue processing", () => {
    it("processes multiple inputs sequentially and auto-saves intermediates", async () => {
      let extractCount = 0;
      mocks.extract.mockImplementation(async (input: string) => {
        extractCount++;
        return {
          ...TEST_EXTRACTION,
          source: input,
          title: `Article ${extractCount}`,
        };
      });

      let summarizeCount = 0;
      mocks.summarize.mockImplementation(
        async (result: ExtractionResult, _config: Config, onChunk: (text: string) => void) => {
          summarizeCount++;
          const summary = `## Summary ${summarizeCount}`;
          onChunk(summary);
          return { extraction: result, summary, timestamp: Date.now() };
        },
      );

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      // Type two URLs and submit
      instance.stdin.write("https://a.com https://b.com");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("+ 1 more");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Should process both — first auto-saved, second in active view
      await vi.waitFor(
        () => {
          expect(mocks.extract).toHaveBeenCalledTimes(2);
          expect(mocks.summarize).toHaveBeenCalledTimes(2);
        },
        { timeout: 5000 },
      );

      // First item auto-saved
      await vi.waitFor(
        () => {
          expect(mocks.saveSummary).toHaveBeenCalled();
          expect(mocks.addEntry).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      // Last item in result view
      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Summary 2");
          expect(frame).toContain("[Enter] save");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows queue progress in processing view", async () => {
      // Make extract hang so we can observe the processing view
      mocks.extract.mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("https://a.com https://b.com");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("+ 1 more");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("(1/2)");
          expect(frame).toContain("Extracting");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("ESC during queue cancels remaining items", async () => {
      // First extract succeeds, second hangs
      let callCount = 0;
      mocks.extract.mockImplementation((_input: string, signal?: AbortSignal) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ...TEST_EXTRACTION, source: "https://a.com" });
        }
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      });

      const instance = render(<App />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.stdin.write("https://a.com https://b.com");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("+ 1 more");
        },
        { timeout: 2000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      instance.stdin.write("\r");

      // Wait for second extraction to start
      await vi.waitFor(
        () => {
          expect(callCount).toBe(2);
        },
        { timeout: 5000 },
      );

      // Press ESC
      instance.stdin.write("\x1B");

      // Should return to idle
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("tl;dr");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 12: Model picker in preset editor
  // -----------------------------------------------------------------------
  describe("model picker in preset editor", () => {
    beforeEach(() => {
      // Use anthropic provider so canListModels returns true
      mocks.loadConfig.mockResolvedValue({ ...TEST_CONFIG, provider: "anthropic" });
      mocks.resolveConfig.mockImplementation(
        (settings: {
          apiKey?: string;
          activeProfile?: string;
          profiles?: Record<string, Record<string, unknown>>;
        }) => {
          const profileName = settings.activeProfile ?? "default";
          const profile = settings.profiles?.[profileName] ?? {};
          return {
            ...TEST_CONFIG,
            profileName,
            provider: profile.provider ?? "anthropic",
            audioMode: profile.audioMode ?? "podcast",
            tone: profile.tone ?? TEST_CONFIG.tone,
            summaryStyle: profile.summaryStyle ?? TEST_CONFIG.summaryStyle,
            cognitiveTraits: profile.cognitiveTraits ?? TEST_CONFIG.cognitiveTraits,
          };
        },
      );
    });

    async function navigateToModelField(instance: ReturnType<typeof render>) {
      // Wait for the preset editor menu to appear
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Model");
          expect(instance.lastFrame()).toContain("Cognitive traits");
        },
        { timeout: 2000 },
      );

      // Give the component time to stabilize after render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Navigate to Model (index 4: traits=0, tone=1, style=2, provider=3, model=4)
      for (let i = 0; i < 4; i++) {
        instance.stdin.write("\x1B[B");
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Small delay before pressing Enter to ensure navigation has settled
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Enter to edit
      instance.stdin.write("\r");
    }

    it("shows SelectionList when models are fetched successfully", async () => {
      mocks.canListModels.mockReturnValue(true);
      mocks.listModelsForProvider.mockResolvedValue([
        { id: "claude-opus-4-6", displayName: "Claude Opus 4", tier: "opus" },
        { id: "claude-sonnet-4-5-20250929", tier: "sonnet" },
      ]);

      const instance = render(<App showConfig editProfile />);
      await navigateToModelField(instance);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Model (Enter to confirm):");
          // Should show the fetched models in the selection list
          expect(frame).toMatch(/claude-opus-4-6|Claude Opus 4/);
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows 'Fetching available models...' while loading", async () => {
      mocks.canListModels.mockReturnValue(true);
      // Never resolve — stay in loading state
      mocks.listModelsForProvider.mockReturnValue(new Promise(() => {}));

      const instance = render(<App showConfig editProfile />);
      await navigateToModelField(instance);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Fetching available models...");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows free-text fallback when model fetch returns empty", async () => {
      mocks.canListModels.mockReturnValue(true);
      mocks.listModelsForProvider.mockResolvedValue([]);

      const instance = render(<App showConfig editProfile />);
      await navigateToModelField(instance);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Could not fetch models");
          expect(frame).toContain("Type a model ID manually");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows alias hint for non-listable providers", async () => {
      mocks.canListModels.mockReturnValue(false);
      mocks.loadConfig.mockResolvedValue({ ...TEST_CONFIG, provider: "claude-code" });
      mocks.resolveConfig.mockReturnValue({ ...TEST_CONFIG, provider: "claude-code" });

      const instance = render(<App showConfig editProfile />);
      await navigateToModelField(instance);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Alias (haiku, sonnet, opus) or full model ID");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Group 13: Batch results view
  // -----------------------------------------------------------------------
  describe("batch results view", () => {
    const BATCH_RESULTS = [
      {
        input: "https://example.com/success",
        result: {
          extraction: {
            ...TEST_EXTRACTION,
            title: "Success Article",
            source: "https://example.com/success",
          },
          summary: "## Summary\nSuccess content.",
          timestamp: Date.now(),
        },
        sessionDir: "/tmp/tldr-test/success",
      },
      {
        input: "https://example.com/fail",
        error: "Connection timeout",
      },
    ];

    it("renders batch results view with success and fail counts", async () => {
      const instance = render(<App showHistory batchResults={BATCH_RESULTS} />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Batch Results");
          expect(frame).toContain("1 succeeded");
          expect(frame).toContain("1 failed");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows success and fail markers", async () => {
      const instance = render(<App showHistory batchResults={BATCH_RESULTS} />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("✓");
          expect(frame).toContain("✗");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows error message for selected failed item", async () => {
      const instance = render(<App showHistory batchResults={BATCH_RESULTS} />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Batch Results");
        },
        { timeout: 2000 },
      );

      // Navigate down to the failed item
      instance.stdin.write("\x1B[B"); // down arrow

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Connection timeout");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("Enter on success item opens summary view", async () => {
      const instance = render(<App showHistory batchResults={BATCH_RESULTS} />);

      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("Batch Results");
        },
        { timeout: 2000 },
      );

      // First item is selected by default (success), press Enter
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("Summary");
          expect(frame).toContain("Success content");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows footer with navigation hints", async () => {
      const instance = render(<App showHistory batchResults={BATCH_RESULTS} />);

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("[Enter] view summary");
          expect(frame).toContain("[Esc/q] exit");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });
});
