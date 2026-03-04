import type { ChildProcess } from "node:child_process";
import { Box, Static, Text, useApp, useInput, useStdout } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BatchResult } from "./batch.js";
import { BatchResultsView } from "./components/BatchResultsView.js";
import { ChatView } from "./components/ChatView.js";
import { ConfigSetup } from "./components/ConfigSetup.js";
import { ErrorView } from "./components/ErrorView.js";
import { HelpView } from "./components/HelpView.js";
import { HistoryView } from "./components/HistoryView.js";
import { InputPrompt } from "./components/InputPrompt.js";
import { ProcessingView } from "./components/ProcessingView.js";
import { ProfilePicker } from "./components/ProfilePicker.js";
import { SummaryContent } from "./components/SummaryContent.js";
import { SummaryView } from "./components/SummaryView.js";
import { useToast } from "./hooks/useToast.js";
import { ThemeProvider } from "./lib/ThemeContext.js";
import { writeClipboard } from "./lib/clipboard.js";
import {
  listProfiles,
  loadConfig,
  loadSettings,
  saveConfig,
  saveSettings,
  setActiveProfile,
} from "./lib/config.js";
import { truncateAndScale } from "./lib/content.js";
import { addEntry, deduplicateBySource, getRecent, removeEntry } from "./lib/history.js";
import { validateCliProvider } from "./lib/providers/index.js";
import { getSessionPaths, saveAudioFile, saveChat, saveSummary } from "./lib/session.js";
import { rewriteForSpeech, summarize } from "./lib/summarizer.js";
import { resolveTheme } from "./lib/theme.js";
import {
  generateAudio,
  getVoiceDisplayName,
  playAudio,
  speakFallback,
  stopAudio,
} from "./lib/tts.js";
import type {
  AppState,
  ChatMessage,
  Config,
  ConfigOverrides,
  ExtractionResult,
  SessionPaths,
  ThemeConfig,
  ThemePalette,
  TldrResult,
} from "./lib/types.js";
import { extract } from "./pipeline.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCARD_TIMEOUT_MS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAbortError(err: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (err instanceof DOMException && err.name === "AbortError");
}

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "An unexpected error occurred.";
}

// ---------------------------------------------------------------------------
// Slash-command dispatch map
// ---------------------------------------------------------------------------

type SlashCommandHandler = (ctx: {
  setState: (s: AppState) => void;
  setConfigMode: (m: "setup" | "edit") => void;
  setProfiles: (p: { name: string; active: boolean }[]) => void;
  audioProcess: ChildProcess | undefined;
  exit: () => void;
  onUpdate?: (() => void) | undefined;
}) => void;

const SLASH_COMMANDS: Record<string, SlashCommandHandler> = {
  history: ({ setState }) => setState("history"),
  setup: ({ setState, setConfigMode }) => {
    setConfigMode("setup");
    setState("config");
  },
  config: ({ setState, setConfigMode }) => {
    setConfigMode("edit");
    setState("config");
  },
  theme: ({ setState, setConfigMode }) => {
    setConfigMode("edit");
    setState("config");
  },
  preset: ({ setState, setProfiles }) => {
    (async () => {
      const profileList = await listProfiles();
      setProfiles(profileList);
      setState("profile");
    })();
  },
  help: ({ setState }) => setState("help"),
  update: ({ audioProcess, exit, onUpdate }) => {
    if (audioProcess) stopAudio(audioProcess);
    onUpdate?.();
    exit();
  },
  quit: ({ audioProcess, exit }) => {
    if (audioProcess) stopAudio(audioProcess);
    exit();
  },
};
// "profile" is an alias for "preset"
SLASH_COMMANDS.profile = SLASH_COMMANDS.preset as SlashCommandHandler;

// ---------------------------------------------------------------------------
// App component
// ---------------------------------------------------------------------------

interface AppProps {
  initialInput?: string | undefined;
  showConfig?: boolean | undefined;
  showHistory?: boolean | undefined;
  editProfile?: boolean | undefined;
  overrides?: ConfigOverrides | undefined;
  batchResults?: BatchResult[] | undefined;
  onUpdate?: () => void;
}

export function App({
  initialInput,
  showConfig,
  showHistory,
  editProfile,
  overrides,
  batchResults: batchResultsProp,
  onUpdate,
}: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const clearScreen = useCallback(() => {
    stdout.write("\x1B[2J\x1B[3J\x1B[H");
  }, [stdout]);

  // --- State ---
  const [state, setState] = useState<AppState>(
    showConfig
      ? "config"
      : showHistory && batchResultsProp
        ? "batch-results"
        : showHistory
          ? "history"
          : "idle",
  );
  const [config, setConfig] = useState<Config | undefined>(undefined);
  const [input, setInput] = useState(initialInput ?? "");
  const [extraction, setExtraction] = useState<ExtractionResult | undefined>(undefined);
  const [summary, setSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string | undefined }>({
    message: "",
  });
  const [history, setHistory] = useState<TldrResult[]>([]);
  const [audioProcess, setAudioProcess] = useState<ChildProcess | undefined>(undefined);
  const [audioError, setAudioError] = useState<string | undefined>(undefined);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionPaths | undefined>(undefined);
  const [themePalette, setThemePalette] = useState<ThemePalette>(resolveTheme());
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | undefined>(undefined);
  const [configMode, setConfigMode] = useState<"setup" | "edit">("setup");
  const [pendingResult, setPendingResult] = useState<TldrResult | undefined>(undefined);
  const [discardPending, setDiscardPending] = useState(false);
  const [tempAudioPath, setTempAudioPath] = useState<string | undefined>(undefined);
  const [audioIsFallback, setAudioIsFallback] = useState(false);
  const [cachedSpeechText, setCachedSpeechText] = useState<string | undefined>(undefined);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [profiles, setProfiles] = useState<{ name: string; active: boolean }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSaveEnabled, setChatSaveEnabled] = useState(false);
  const [summaryPinned, setSummaryPinned] = useState(false);
  const [pinnedSummaries, setPinnedSummaries] = useState<
    { id: string; extraction: ExtractionResult; summary: string; sessionDir: string | undefined }[]
  >([]);
  const [inputQueue, setInputQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const { toast, showToast, clearToast } = useToast();

  // --- Refs ---
  const abortRef = useRef<AbortController | null>(null);
  const queueCancelledRef = useRef(false);
  const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Helpers ---

  /** Reset all transient state back to idle. */
  const resetToIdle = useCallback(() => {
    setSummaryPinned(false);
    setPinnedSummaries([]);
    setChatMessages([]);
    setChatSaveEnabled(false);
    setInputQueue([]);
    setQueueIndex(0);
    setPendingResult(undefined);
    setState("idle");
    setSummary("");
    setExtraction(undefined);
    setInput("");
    setCurrentSession(undefined);
    setTempAudioPath(undefined);
    setAudioIsFallback(false);
    setCachedSpeechText(undefined);
  }, []);

  const refreshHistory = useCallback(async () => {
    const updated = await getRecent(100);
    setHistory(updated);
  }, []);

  // --- Mount: load config & history ---

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      setThemeConfig(settings.theme);
      setThemePalette(resolveTheme(settings.theme));

      let cfg = await loadConfig(overrides);
      const recent = await getRecent(100);
      setHistory(recent);

      // Graceful CLI fallback
      const cliError = await validateCliProvider(cfg.provider);
      if (cliError) {
        if (cfg.provider === "claude-code" && cfg.apiKey) {
          cfg = { ...cfg, provider: "anthropic" };
        } else {
          setConfig(cfg);
          setError(cliError);
          setState("error");
          return;
        }
      }

      setConfig(cfg);

      if (!settings.setupCompleted && !showConfig && !initialInput) {
        setConfigMode("setup");
        setState("config");
      } else if (initialInput) {
        processInput(initialInput, cfg);
      }
    })();
  }, []);

  // --- Processing pipeline ---

  const processInput = useCallback(
    async (rawInput: string, cfg: Config) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      try {
        // Reset state for new pipeline run
        setState("extracting");
        setInput(rawInput);
        setSummary("");
        setExtraction(undefined);
        setPendingResult(undefined);
        setSummaryPinned(false);
        setPinnedSummaries([]);
        setInputQueue([]);
        setQueueIndex(0);
        setChatMessages([]);
        setChatSaveEnabled(false);

        // Extraction
        const settings = await loadSettings();
        const result = await extract(rawInput, signal, {
          fallbackToJina: settings.fallbackToJina ?? true,
        });

        if (!result.content && !result.image) {
          setError({
            message: "Couldn't extract content from this input.",
            hint: result.partial
              ? "This content may be behind a paywall. Try pasting the text directly."
              : undefined,
          });
          setState("error");
          return;
        }

        setExtraction(result);

        const effectiveConfig = truncateAndScale(result, cfg);

        // Summarization
        setState("summarizing");
        setIsStreaming(true);

        const tldrResult = await summarize(
          result,
          effectiveConfig,
          (chunk) => setSummary((prev) => prev + chunk),
          signal,
        );

        setIsStreaming(false);

        // Compute session paths before transitioning to result state
        try {
          const sessionPaths = getSessionPaths(cfg.outputDir, result, tldrResult.summary);
          setCurrentSession(sessionPaths);
        } catch {
          // Non-fatal
        }

        setPendingResult(tldrResult);
        setState("result");
      } catch (err) {
        setIsStreaming(false);
        if (isAbortError(err, signal)) {
          if (initialInput) {
            clearScreen();
            exit();
            return;
          }
          setState("idle");
          setSummary("");
          setExtraction(undefined);
          return;
        }
        setError({ message: extractErrorMessage(err) });
        setState("error");
      } finally {
        abortRef.current = null;
      }
    },
    [clearScreen, exit, initialInput],
  );

  const processQueue = useCallback(
    async (inputs: string[], cfg: Config) => {
      setInputQueue(inputs);
      setQueueIndex(0);
      queueCancelledRef.current = false;
      setSummaryPinned(false);
      setPinnedSummaries([]);
      setChatMessages([]);
      setChatSaveEnabled(false);

      for (let i = 0; i < inputs.length; i++) {
        if (queueCancelledRef.current) break;
        const rawInput = inputs[i] ?? "";
        setQueueIndex(i);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const { signal } = controller;

        const isLast = i === inputs.length - 1;

        try {
          setState("extracting");
          setInput(rawInput);
          setSummary("");
          setExtraction(undefined);
          setPendingResult(undefined);

          const queueSettings = await loadSettings();
          const result = await extract(rawInput, signal, {
            fallbackToJina: queueSettings.fallbackToJina ?? true,
          });

          if (!result.content && !result.image) {
            if (!isLast) continue;
            setError({
              message: "Couldn't extract content from this input.",
              hint: result.partial
                ? "This content may be behind a paywall. Try pasting the text directly."
                : undefined,
            });
            setState("error");
            setInputQueue([]);
            setQueueIndex(0);
            return;
          }

          setExtraction(result);

          const effectiveConfig = truncateAndScale(result, cfg);

          setState("summarizing");
          setIsStreaming(true);

          const tldrResult = await summarize(
            result,
            effectiveConfig,
            (chunk) => setSummary((prev) => prev + chunk),
            signal,
          );

          setIsStreaming(false);

          if (isLast) {
            try {
              const sessionPaths = getSessionPaths(cfg.outputDir, result, tldrResult.summary);
              setCurrentSession(sessionPaths);
            } catch {
              // Non-fatal
            }
            setPendingResult(tldrResult);
            setState("result");
          } else {
            // Non-last item — auto-save and pin
            try {
              const sessionPaths = getSessionPaths(cfg.outputDir, result, tldrResult.summary);
              const saved = await saveSummary(sessionPaths, tldrResult.summary);
              await addEntry(tldrResult);
              await refreshHistory();

              setPinnedSummaries((prev) => [
                ...prev,
                {
                  id: String(Date.now()),
                  extraction: result,
                  summary: tldrResult.summary,
                  sessionDir: saved.sessionDir,
                },
              ]);
            } catch {
              setPinnedSummaries((prev) => [
                ...prev,
                {
                  id: String(Date.now()),
                  extraction: result,
                  summary: tldrResult.summary,
                  sessionDir: undefined,
                },
              ]);
            }
          }
        } catch (err) {
          setIsStreaming(false);
          if (isAbortError(err, signal)) {
            setState("idle");
            setSummary("");
            setExtraction(undefined);
            setInputQueue([]);
            setQueueIndex(0);
            return;
          }
          if (!isLast) continue;
          setError({ message: extractErrorMessage(err) });
          setState("error");
          setInputQueue([]);
          setQueueIndex(0);
          return;
        } finally {
          abortRef.current = null;
        }
      }
    },
    [refreshHistory],
  );

  // --- Event handlers ---

  const handleThemeChange = useCallback(async (newThemeConfig: ThemeConfig) => {
    setThemeConfig(newThemeConfig);
    setThemePalette(resolveTheme(newThemeConfig));
    const settings = await loadSettings();
    settings.theme = newThemeConfig;
    await saveSettings(settings);
  }, []);

  const handleChatSave = useCallback(
    async (messages: ChatMessage[]) => {
      if (!config || !extraction) return;
      let session = currentSession;
      if (pendingResult && session) {
        const saved = await saveSummary(session, pendingResult.summary);
        setCurrentSession(saved);
        session = saved;
        await addEntry(pendingResult);
        await refreshHistory();
        setPendingResult(undefined);
      }
      if (session) {
        await saveChat(session, messages);
        setChatSaveEnabled(true);
      }
    },
    [config, extraction, currentSession, pendingResult, refreshHistory],
  );

  const handleChatAutoSave = useCallback(
    async (messages: ChatMessage[]) => {
      if (chatSaveEnabled && currentSession) {
        await saveChat(currentSession, messages);
      }
    },
    [chatSaveEnabled, currentSession],
  );

  const handleConfigSave = useCallback(
    async (newConfig: Config) => {
      await saveConfig(newConfig);
      setConfig(newConfig);

      if (editProfile && configMode !== "edit") {
        exit();
      } else if (configMode === "edit") {
        setState("idle");
      } else if (initialInput) {
        processInput(initialInput, newConfig);
      } else {
        setState("idle");
      }
    },
    [initialInput, editProfile, configMode, processInput, exit],
  );

  const handleSlashCommand = useCallback(
    (command: string) => {
      const handler = SLASH_COMMANDS[command] as SlashCommandHandler | undefined;
      handler?.({
        setState,
        setConfigMode,
        setProfiles,
        audioProcess,
        exit,
        onUpdate,
      });
    },
    [audioProcess, exit, onUpdate],
  );

  const handleHistorySelect = useCallback((entry: TldrResult) => {
    setExtraction(entry.extraction);
    setSummary(entry.summary);
    setInput(entry.extraction.source);
    setCurrentSession(undefined);
    setPendingResult(undefined);
    setSummaryPinned(false);
    setPinnedSummaries([]);
    setState("result");
  }, []);

  const handleBatchResultSelect = useCallback((result: TldrResult) => {
    setExtraction(result.extraction);
    setSummary(result.summary);
    setInput(result.extraction.source);
    setCurrentSession(undefined);
    setPendingResult(undefined);
    setSummaryPinned(false);
    setPinnedSummaries([]);
    setState("result");
  }, []);

  const handleHistoryDelete = useCallback(
    async (entry: TldrResult) => {
      await removeEntry(entry.timestamp);
      await refreshHistory();
    },
    [refreshHistory],
  );

  const handleProfileSwitch = useCallback(
    async (name: string) => {
      await setActiveProfile(name);
      const cfg = await loadConfig(overrides);
      setConfig(cfg);
      const profileList = await listProfiles();
      setProfiles(profileList);
      setState("idle");
    },
    [overrides],
  );

  // --- Audio generation ---

  const handleAudioGenerate = useCallback(async () => {
    if (!config) throw new Error("Config not loaded");
    setAudioError(undefined);
    setIsGeneratingAudio(true);

    try {
      const speechText = cachedSpeechText ?? (await rewriteForSpeech(summary, config));
      setCachedSpeechText(speechText);
      try {
        const path = await generateAudio(
          speechText,
          config.voice,
          config.ttsSpeed,
          config.pitch,
          config.volume,
          undefined,
          config.ttsProvider,
          config.ttsModel,
        );
        setTempAudioPath(path);
        setAudioIsFallback(false);
        setIsGeneratingAudio(false);
        const proc = playAudio(path);
        setAudioProcess(proc);
        proc.on("exit", () => setAudioProcess(undefined));
      } catch (ttsErr) {
        setIsGeneratingAudio(false);
        if (config.ttsProvider === "openai") {
          setAudioError(ttsErr instanceof Error ? ttsErr.message : "OpenAI TTS failed");
        } else {
          setAudioIsFallback(true);
          const proc = speakFallback(speechText);
          if (proc) {
            setAudioProcess(proc);
            proc.on("exit", () => setAudioProcess(undefined));
          } else {
            setAudioError("No TTS available");
          }
        }
      }
    } catch (err) {
      setIsGeneratingAudio(false);
      setAudioError(err instanceof Error ? err.message : "Audio generation failed");
    }
  }, [config, summary, cachedSpeechText]);

  // --- Save handler ---

  const handleSave = useCallback(
    async (withAudio: boolean) => {
      if (!pendingResult || !currentSession) {
        if (withAudio) setIsSavingAudio(false);
        setPendingResult(undefined);
        return;
      }

      try {
        const saved = await saveSummary(currentSession, pendingResult.summary);
        setCurrentSession(saved);

        let audioSaved = false;
        if (withAudio) {
          try {
            if (tempAudioPath) {
              await saveAudioFile(saved, tempAudioPath);
              audioSaved = true;
            } else if (audioIsFallback) {
              setAudioError("System TTS has no MP3 file to save");
            } else if (config) {
              const speechText = cachedSpeechText ?? (await rewriteForSpeech(summary, config));
              const audioPath = await generateAudio(
                speechText,
                config.voice,
                config.ttsSpeed,
                config.pitch,
                config.volume,
                undefined,
                config.ttsProvider,
                config.ttsModel,
              );
              await saveAudioFile(saved, audioPath);
              audioSaved = true;
            }
          } catch (err) {
            setAudioError(err instanceof Error ? err.message : "Audio save failed");
          }
          setIsSavingAudio(false);
        }

        const queueSuffix = inputQueue.length > 1 ? ` (${inputQueue.length} summaries total)` : "";
        const toastMessage =
          withAudio && !audioSaved
            ? `Saved to ${saved.sessionDir} (audio failed)${queueSuffix}`
            : audioSaved
              ? `Saved with audio to ${saved.sessionDir}${queueSuffix}`
              : `Saved to ${saved.sessionDir}${queueSuffix}`;
        showToast(toastMessage);
      } catch {
        if (withAudio) setIsSavingAudio(false);
      }
      await addEntry(pendingResult);
      await refreshHistory();
      setPendingResult(undefined);
    },
    [
      pendingResult,
      currentSession,
      tempAudioPath,
      audioIsFallback,
      config,
      summary,
      cachedSpeechText,
      inputQueue.length,
      showToast,
      refreshHistory,
    ],
  );

  // --- Effects ---

  // Reset discard pending when leaving result state
  useEffect(() => {
    if (state !== "result") {
      setDiscardPending(false);
      if (discardTimerRef.current) {
        clearTimeout(discardTimerRef.current);
        discardTimerRef.current = null;
      }
    }
  }, [state]);

  // --- Key bindings ---

  // ESC to cancel during extraction/summarization
  useInput(
    (_ch, key) => {
      if (key.escape) {
        queueCancelledRef.current = true;
        abortRef.current?.abort();
      }
    },
    { isActive: state === "extracting" || state === "summarizing" },
  );

  // Key bindings for result and error states
  useInput(
    (ch, key) => {
      if (state === "result" && extraction) {
        if (ch === "c") {
          writeClipboard(summary);
          return;
        }
        if (ch === "a" && !audioProcess && !isGeneratingAudio) {
          if (!summaryPinned) {
            setPinnedSummaries((prev) => [
              ...prev,
              {
                id: String(Date.now()),
                extraction,
                summary,
                sessionDir: pendingResult ? undefined : currentSession?.sessionDir,
              },
            ]);
            setSummaryPinned(true);
          }
          handleAudioGenerate();
          return;
        }
        if (ch === "s" && !key.ctrl && audioProcess) {
          stopAudio(audioProcess);
          setAudioProcess(undefined);
          return;
        }
        if (ch === "t") {
          setState("chat");
          return;
        }
        if (ch === "r") {
          if (config) {
            setTempAudioPath(undefined);
            setAudioIsFallback(false);
            setCachedSpeechText(undefined);
            processInput(input, config);
          }
          return;
        }
        if ((key.return || ch === "w") && !isSavingAudio && pendingResult) {
          const withAudio = ch === "w";

          if (audioProcess) {
            stopAudio(audioProcess);
            setAudioProcess(undefined);
          }

          if (withAudio && !summaryPinned) {
            setPinnedSummaries((prev) => [
              ...prev,
              { id: String(Date.now()), extraction, summary, sessionDir: undefined },
            ]);
            setSummaryPinned(true);
          }
          if (withAudio) setIsSavingAudio(true);

          handleSave(withAudio);
          return;
        }
      }

      // Double-tap q to discard in result state; single q exits in error state
      if (ch === "q") {
        if (state === "error") {
          if (audioProcess) stopAudio(audioProcess);
          exit();
          return;
        }
        if (state === "result" && !pendingResult) {
          // Already saved — single tap exits (or returns to batch results)
          if (audioProcess) stopAudio(audioProcess);
          clearScreen();
          if (batchResultsProp) {
            setState("batch-results");
            return;
          }
          if (initialInput) {
            exit();
            return;
          }
          resetToIdle();
          return;
        }
        if (state === "result") {
          if (discardPending) {
            // Second press — discard and return to idle (or batch results)
            if (discardTimerRef.current) {
              clearTimeout(discardTimerRef.current);
              discardTimerRef.current = null;
            }
            setDiscardPending(false);
            if (audioProcess) stopAudio(audioProcess);
            clearScreen();
            if (batchResultsProp) {
              setState("batch-results");
              return;
            }
            if (initialInput) {
              exit();
              return;
            }
            resetToIdle();
          } else {
            // First press — start discard timer
            setDiscardPending(true);
            discardTimerRef.current = setTimeout(() => {
              setDiscardPending(false);
              discardTimerRef.current = null;
            }, DISCARD_TIMEOUT_MS);
          }
        }
      }
    },
    { isActive: state === "result" || state === "error" },
  );

  // --- Render ---

  if (!config && state !== "config") {
    return (
      <ThemeProvider palette={themePalette}>
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>Loading...</Text>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider palette={themePalette}>
      <Static items={pinnedSummaries}>
        {(item) => (
          <Box key={item.id}>
            <SummaryContent
              extraction={item.extraction}
              summary={item.summary}
              isStreaming={false}
              sessionDir={item.sessionDir}
            />
          </Box>
        )}
      </Static>
      <Box flexDirection="column" marginTop={1}>
        {state === "config" && (
          <ConfigSetup
            currentConfig={config}
            editProfile={configMode === "edit" || editProfile}
            themeConfig={themeConfig}
            onThemeChange={handleThemeChange}
            onSave={handleConfigSave}
            onCancel={() => {
              if (configMode === "edit") {
                setState("idle");
              } else if (
                config?.apiKey ||
                config?.provider === "claude-code" ||
                config?.provider === "codex" ||
                config?.provider === "ollama"
              ) {
                if (editProfile) {
                  exit();
                } else {
                  setState("idle");
                }
              } else {
                exit();
              }
            }}
          />
        )}
        {state === "idle" && (
          <InputPrompt
            history={history}
            toast={toast}
            onSubmit={(inputs) => {
              if (toast) clearToast();
              if (config) {
                if (inputs.length <= 1) {
                  processInput(inputs[0] ?? "", config);
                } else {
                  processQueue(inputs, config);
                }
              }
            }}
            onQuit={() => exit()}
            onSlashCommand={handleSlashCommand}
          />
        )}
        {(state === "extracting" || state === "summarizing") && (
          <ProcessingView
            phase={state}
            source={input}
            extraction={extraction}
            queuePosition={inputQueue.length > 1 ? queueIndex + 1 : undefined}
            queueTotal={inputQueue.length > 1 ? inputQueue.length : undefined}
          />
        )}
        {state === "result" && extraction && (
          <SummaryView
            extraction={extraction}
            summary={summary}
            isStreaming={isStreaming}
            isGeneratingAudio={isGeneratingAudio}
            isPlaying={!!audioProcess}
            audioError={audioError}
            sessionDir={pendingResult ? undefined : currentSession?.sessionDir}
            discardPending={discardPending}
            voiceLabel={config ? getVoiceDisplayName(config.voice, config.ttsProvider) : undefined}
            ttsSpeed={config?.ttsSpeed}
            isSavingAudio={isSavingAudio}
            toast={toast}
            isSaved={!pendingResult}
            audioIsFallback={audioIsFallback}
            summaryPinned={summaryPinned}
            quitLabel={batchResultsProp ? "back" : undefined}
          />
        )}
        {state === "chat" && config && (
          <ChatView
            config={config}
            summaryContent={summary}
            messages={chatMessages}
            onMessagesChange={setChatMessages}
            chatSaveEnabled={chatSaveEnabled}
            onSave={handleChatSave}
            onAutoSave={handleChatAutoSave}
            onExit={() => setState("result")}
          />
        )}
        {state === "history" && (
          <HistoryView
            entries={deduplicateBySource(history)}
            onSelect={handleHistorySelect}
            onDelete={handleHistoryDelete}
            onClose={() => setState("idle")}
          />
        )}
        {state === "profile" && (
          <ProfilePicker
            profiles={profiles}
            onSwitch={handleProfileSwitch}
            onClose={() => setState("idle")}
          />
        )}
        {state === "batch-results" && batchResultsProp && (
          <BatchResultsView
            results={batchResultsProp}
            onSelect={handleBatchResultSelect}
            onClose={() => exit()}
          />
        )}
        {state === "help" && <HelpView onClose={() => setState("idle")} />}
        {state === "error" && <ErrorView message={error.message} hint={error.hint} />}
      </Box>
    </ThemeProvider>
  );
}
