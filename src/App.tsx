import type { ChildProcess } from "node:child_process";
import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatView } from "./components/ChatView.js";
import { ConfigSetup } from "./components/ConfigSetup.js";
import { ErrorView } from "./components/ErrorView.js";
import { HelpView } from "./components/HelpView.js";
import { HistoryView } from "./components/HistoryView.js";
import { InputPrompt } from "./components/InputPrompt.js";
import { ProcessingView } from "./components/ProcessingView.js";
import { ProfilePicker } from "./components/ProfilePicker.js";
import { SummaryView } from "./components/SummaryView.js";
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
import { addEntry, deduplicateBySource, getRecent, removeEntry } from "./lib/history.js";
import { isClaudeCodeAvailable } from "./lib/providers/claude-code.js";
import { isCodexAvailable } from "./lib/providers/codex.js";
import { getSessionPaths, saveAudioFile, saveSummary } from "./lib/session.js";
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
  Config,
  ConfigOverrides,
  ExtractionResult,
  SessionPaths,
  ThemeConfig,
  ThemePalette,
  TldrResult,
} from "./lib/types.js";
import { extract } from "./pipeline.js";

interface AppProps {
  initialInput?: string | undefined;
  showConfig?: boolean | undefined;
  editProfile?: boolean | undefined;
  overrides?: ConfigOverrides | undefined;
}

const MAX_INPUT_WORDS = 100_000;

export function App({ initialInput, showConfig, editProfile, overrides }: AppProps) {
  const { exit } = useApp();

  const [state, setState] = useState<AppState>(showConfig ? "config" : "idle");
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
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [tempAudioPath, setTempAudioPath] = useState<string | undefined>(undefined);
  const [cachedSpeechText, setCachedSpeechText] = useState<string | undefined>(undefined);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [profiles, setProfiles] = useState<{ name: string; active: boolean }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load config and history on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      setThemeConfig(settings.theme);
      setThemePalette(resolveTheme(settings.theme));

      let cfg = await loadConfig(overrides);
      const recent = await getRecent(100);
      setHistory(recent);

      // Graceful CLI fallback: if CLI provider selected but not available,
      // try API key, otherwise guide the user
      if (cfg.provider === "claude-code" && !isClaudeCodeAvailable()) {
        if (cfg.apiKey) {
          cfg = { ...cfg, provider: "anthropic" };
        } else {
          setConfig(cfg);
          setError({
            message: "Claude Code is not installed or not authenticated.",
            hint: 'Install it with: npm install -g @anthropic-ai/claude-code\nThen run "claude" to log in.\n\nOr run: tldr config set provider anthropic — and set ANTHROPIC_API_KEY.\nOr run: tldr config set provider openai — and set OPENAI_API_KEY.',
          });
          setState("error");
          return;
        }
      }

      if (cfg.provider === "codex" && !isCodexAvailable()) {
        setConfig(cfg);
        setError({
          message: "Codex CLI is not installed.",
          hint: "Install it with: npm install -g @openai/codex\n\nOr switch provider:\n  tldr config set provider openai — and set OPENAI_API_KEY.\n  tldr config set provider anthropic — and set ANTHROPIC_API_KEY.",
        });
        setState("error");
        return;
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

  const processInput = useCallback(async (rawInput: string, cfg: Config) => {
    const activeConfig = cfg;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // Extraction phase
      setState("extracting");
      setInput(rawInput);
      setSummary("");
      setExtraction(undefined);
      setPendingResult(undefined);

      const result = await extract(rawInput, signal);

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

      // Truncation for very long content (skip for images)
      let effectiveConfig = activeConfig;
      if (!result.image) {
        let content = result.content;
        const words = content.split(/\s+/);
        if (words.length > MAX_INPUT_WORDS) {
          content = words.slice(0, MAX_INPUT_WORDS).join(" ");
          result.content = content;
        }

        // Scale max_tokens for long content
        if (words.length > 10_000) {
          effectiveConfig = {
            ...activeConfig,
            maxTokens: Math.min(activeConfig.maxTokens * 2, 4096),
          };
        }
      }

      // Summarization phase
      setState("summarizing");
      setIsStreaming(true);

      const tldrResult = await summarize(
        result,
        effectiveConfig,
        (chunk) => setSummary((prev) => prev + chunk),
        signal,
      );

      setIsStreaming(false);

      // Compute session paths BEFORE transitioning to result state
      // so that currentSession.audioPath is available if user presses 'a' quickly
      try {
        const sessionPaths = getSessionPaths(activeConfig.outputDir, result, tldrResult.summary);
        setCurrentSession(sessionPaths);
      } catch {
        // Non-fatal
      }

      // Defer persistence — store result for saving on Enter
      setPendingResult(tldrResult);
      setState("result");
    } catch (err) {
      setIsStreaming(false);
      // Silently return to idle on abort (ESC pressed)
      if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        setState("idle");
        setSummary("");
        setExtraction(undefined);
        return;
      }
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError({ message });
      setState("error");
    } finally {
      abortRef.current = null;
    }
  }, []);

  const handleThemeChange = useCallback(async (newThemeConfig: ThemeConfig) => {
    setThemeConfig(newThemeConfig);
    setThemePalette(resolveTheme(newThemeConfig));
    const settings = await loadSettings();
    settings.theme = newThemeConfig;
    await saveSettings(settings);
  }, []);

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
      switch (command) {
        case "history":
          setState("history");
          break;
        case "setup":
          setConfigMode("setup");
          setState("config");
          break;
        case "config":
          setConfigMode("edit");
          setState("config");
          break;
        case "theme":
          setConfigMode("edit");
          setState("config");
          break;
        case "profile":
          (async () => {
            const profileList = await listProfiles();
            setProfiles(profileList);
            setState("profile");
          })();
          break;
        case "help":
          setState("help");
          break;
        case "quit":
          if (audioProcess) stopAudio(audioProcess);
          exit();
          break;
      }
    },
    [audioProcess, exit],
  );

  const handleHistorySelect = useCallback((entry: TldrResult) => {
    setExtraction(entry.extraction);
    setSummary(entry.summary);
    setInput(entry.extraction.source);
    setCurrentSession(undefined);
    setPendingResult(undefined);
    setState("result");
  }, []);

  const handleHistoryDelete = useCallback(async (entry: TldrResult) => {
    await removeEntry(entry.timestamp);
    const updated = await getRecent(100);
    setHistory(updated);
  }, []);

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

  // ESC to cancel during extraction/summarization
  useInput(
    (_ch, key) => {
      if (key.escape) {
        abortRef.current?.abort();
      }
    },
    { isActive: state === "extracting" || state === "summarizing" },
  );

  // Key bindings for result state
  useInput(
    (ch, key) => {
      if (state === "result" && extraction) {
        if (ch === "c") {
          writeClipboard(summary);
          return;
        }
        if (ch === "a" && !audioProcess && !isGeneratingAudio) {
          setAudioError(undefined);
          setIsGeneratingAudio(true);
          (async () => {
            try {
              if (!config) throw new Error("Config not loaded");
              const speechText = cachedSpeechText ?? (await rewriteForSpeech(summary, config));
              setCachedSpeechText(speechText);
              try {
                const path = await generateAudio(
                  speechText,
                  config.voice,
                  config.ttsSpeed,
                  config.pitch,
                  config.volume,
                );
                setTempAudioPath(path);
                setIsGeneratingAudio(false);
                const proc = playAudio(path);
                setAudioProcess(proc);
                proc.on("exit", () => setAudioProcess(undefined));
              } catch {
                // edge-tts failed — fall back to system TTS
                setIsGeneratingAudio(false);
                const proc = speakFallback(speechText);
                if (proc) {
                  setAudioProcess(proc);
                  proc.on("exit", () => setAudioProcess(undefined));
                } else {
                  setAudioError("No TTS available");
                }
              }
            } catch (err) {
              setIsGeneratingAudio(false);
              const msg = err instanceof Error ? err.message : "Audio generation failed";
              setAudioError(msg);
            }
          })();
          return;
        }
        if (ch === "s" && audioProcess) {
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
            setCachedSpeechText(undefined);
            processInput(input, config);
          }
          return;
        }
        if ((key.return || ch === "w") && !isSavingAudio) {
          const withAudio = key.return
            ? (config?.saveAudio ?? false)
            : !(config?.saveAudio ?? false);

          // Stop any playing audio
          if (audioProcess) {
            stopAudio(audioProcess);
            setAudioProcess(undefined);
          }

          if (pendingResult && currentSession) {
            (async () => {
              try {
                const saved = await saveSummary(currentSession, pendingResult.summary);
                setCurrentSession(saved);

                if (withAudio) {
                  setIsSavingAudio(true);
                  try {
                    if (tempAudioPath) {
                      await saveAudioFile(saved, tempAudioPath);
                    } else if (config) {
                      const speechText =
                        cachedSpeechText ?? (await rewriteForSpeech(summary, config));
                      const audioPath = await generateAudio(
                        speechText,
                        config.voice,
                        config.ttsSpeed,
                        config.pitch,
                        config.volume,
                      );
                      await saveAudioFile(saved, audioPath);
                    }
                  } catch {
                    // Audio failure is non-fatal — summary still saved
                  }
                  setIsSavingAudio(false);
                }

                // Show save toast
                setToast(`Saved to ${saved.sessionDir}`);
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => {
                  setToast(undefined);
                  toastTimerRef.current = null;
                }, 3000);
              } catch {
                // Non-fatal
              }
              await addEntry(pendingResult);
              const updated = await getRecent(100);
              setHistory(updated);

              setPendingResult(undefined);
              setState("idle");
              setSummary("");
              setExtraction(undefined);
              setInput("");
              setCurrentSession(undefined);
              setTempAudioPath(undefined);
              setCachedSpeechText(undefined);
            })();
          } else {
            setPendingResult(undefined);
            setState("idle");
            setSummary("");
            setExtraction(undefined);
            setInput("");
            setCurrentSession(undefined);
            setTempAudioPath(undefined);
            setCachedSpeechText(undefined);
          }
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
        if (state === "result") {
          if (discardPending) {
            // Second press — discard and return to idle
            if (discardTimerRef.current) {
              clearTimeout(discardTimerRef.current);
              discardTimerRef.current = null;
            }
            setDiscardPending(false);
            if (audioProcess) stopAudio(audioProcess);
            setPendingResult(undefined);
            setState("idle");
            setSummary("");
            setExtraction(undefined);
            setInput("");
            setCurrentSession(undefined);
            setTempAudioPath(undefined);
            setCachedSpeechText(undefined);
          } else {
            // First press — start discard timer
            setDiscardPending(true);
            discardTimerRef.current = setTimeout(() => {
              setDiscardPending(false);
              discardTimerRef.current = null;
            }, 2000);
          }
        }
      }
    },
    { isActive: state === "result" || state === "error" },
  );

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
            onSubmit={(value) => {
              if (toast) {
                setToast(undefined);
                if (toastTimerRef.current) {
                  clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = null;
                }
              }
              if (config) processInput(value, config);
            }}
            onQuit={() => exit()}
            onSlashCommand={handleSlashCommand}
          />
        )}
        {(state === "extracting" || state === "summarizing") && (
          <ProcessingView phase={state} source={input} extraction={extraction} />
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
            voiceLabel={config ? getVoiceDisplayName(config.voice) : undefined}
            ttsSpeed={config?.ttsSpeed}
            saveAudio={config?.saveAudio ?? false}
            isSavingAudio={isSavingAudio}
          />
        )}
        {state === "chat" && config && (
          <ChatView config={config} summaryContent={summary} onExit={() => setState("result")} />
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
        {state === "help" && <HelpView onClose={() => setState("idle")} />}
        {state === "error" && <ErrorView message={error.message} hint={error.hint} />}
      </Box>
    </ThemeProvider>
  );
}
