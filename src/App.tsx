import type { ChildProcess } from "node:child_process";
import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { ChatView } from "./components/ChatView.js";
import { ConfigSetup } from "./components/ConfigSetup.js";
import { ErrorView } from "./components/ErrorView.js";
import { HelpView } from "./components/HelpView.js";
import { HistoryView } from "./components/HistoryView.js";
import { InputPrompt } from "./components/InputPrompt.js";
import { ProcessingView } from "./components/ProcessingView.js";
import { SummaryView } from "./components/SummaryView.js";
import { ThemeProvider } from "./lib/ThemeContext.js";
import { writeClipboard } from "./lib/clipboard.js";
import { loadConfig, loadSettings, saveConfig, saveSettings } from "./lib/config.js";
import { addEntry, deduplicateBySource, getRecent } from "./lib/history.js";
import { isCliAvailable } from "./lib/providers/cli.js";
import { getSessionPaths, saveSummary } from "./lib/session.js";
import { rewriteForSpeech, summarize } from "./lib/summarizer.js";
import { resolveTheme } from "./lib/theme.js";
import { generateAudio, playAudio, speakFallback, stopAudio } from "./lib/tts.js";
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
      if (cfg.provider === "cli" && !isCliAvailable()) {
        if (cfg.apiKey) {
          cfg = { ...cfg, provider: "api" };
        } else {
          setConfig(cfg);
          setError({
            message: "Claude Code is not installed or not authenticated.",
            hint: 'Install it with: npm install -g @anthropic-ai/claude-code\nThen run "claude" to log in.\n\nOr run: tldr config set provider api — and set ANTHROPIC_API_KEY.',
          });
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

  const processInput = useCallback(async (rawInput: string, cfg: Config) => {
    const activeConfig = cfg;
    try {
      // Extraction phase
      setState("extracting");
      setInput(rawInput);
      setSummary("");
      setExtraction(undefined);

      const result = await extract(rawInput);

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

      const tldrResult = await summarize(result, effectiveConfig, (chunk) =>
        setSummary((prev) => prev + chunk),
      );

      setIsStreaming(false);

      // Compute session paths BEFORE transitioning to result state
      // so that currentSession.audioPath is available if user presses 'a' quickly
      let sessionPaths: SessionPaths | undefined;
      try {
        sessionPaths = getSessionPaths(activeConfig.outputDir, result, tldrResult.summary);
        setCurrentSession(sessionPaths);
      } catch {
        // Non-fatal
      }

      setState("result");

      // Persist summary to disk async
      if (sessionPaths) {
        try {
          const saved = await saveSummary(sessionPaths, tldrResult.summary);
          setCurrentSession(saved);
        } catch {
          // Non-fatal — session save failure shouldn't block the user
        }
      }

      // Save to history
      await addEntry(tldrResult);
      const updated = await getRecent(100);
      setHistory(updated);
    } catch (err) {
      setIsStreaming(false);
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError({ message });
      setState("error");
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
    setState("result");
  }, []);

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
              const speechText = await rewriteForSpeech(summary, config);
              try {
                const path = await generateAudio(
                  speechText,
                  config.voice,
                  config.ttsSpeed,
                  config.pitch,
                  config.volume,
                  currentSession?.audioPath,
                );
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
          if (config) processInput(input, config);
          return;
        }
        if (key.return) {
          setState("idle");
          setSummary("");
          setExtraction(undefined);
          setInput("");
          setCurrentSession(undefined);
          return;
        }
      }

      if (
        ch === "q" &&
        state !== "config" &&
        state !== "chat" &&
        state !== "help" &&
        state !== "history"
      ) {
        if (audioProcess) stopAudio(audioProcess);
        exit();
      }
    },
    { isActive: state === "result" || state === "error" },
  );

  if (!config && state !== "config") {
    return (
      <ThemeProvider palette={themePalette}>
        <Box paddingX={1}>
          <Text dimColor>Loading...</Text>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider palette={themePalette}>
      <Box flexDirection="column">
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
              } else if (config?.apiKey || config?.provider === "cli") {
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
            onSubmit={(value) => {
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
            sessionDir={currentSession?.sessionDir}
          />
        )}
        {state === "chat" && config && (
          <ChatView config={config} summaryContent={summary} onExit={() => setState("result")} />
        )}
        {state === "history" && (
          <HistoryView
            entries={deduplicateBySource(history)}
            onSelect={handleHistorySelect}
            onClose={() => setState("idle")}
          />
        )}
        {state === "help" && <HelpView onClose={() => setState("idle")} />}
        {state === "error" && <ErrorView message={error.message} hint={error.hint} />}
      </Box>
    </ThemeProvider>
  );
}
