import type { ChildProcess } from "node:child_process";
import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { ChatView } from "./components/ChatView.js";
import { ConfigSetup } from "./components/ConfigSetup.js";
import { ErrorView } from "./components/ErrorView.js";
import { InputPrompt } from "./components/InputPrompt.js";
import { ProcessingView } from "./components/ProcessingView.js";
import { SummaryView } from "./components/SummaryView.js";
import { writeClipboard } from "./lib/clipboard.js";
import { loadConfig, saveConfig } from "./lib/config.js";
import { addEntry, getRecent } from "./lib/history.js";
import { isCliAvailable } from "./lib/providers/cli.js";
import { getSessionPaths, saveSummary } from "./lib/session.js";
import { rewriteForSpeech, summarize } from "./lib/summarizer.js";
import { generateAudio, playAudio, speakFallback, stopAudio, stripMarkdownForSpeech } from "./lib/tts.js";
import type {
  AppState,
  Config,
  ConfigOverrides,
  ExtractionResult,
  SessionPaths,
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

  // Load config and history on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    (async () => {
      let cfg = await loadConfig(overrides);
      const recent = await getRecent(10);
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

      if (!cfg.apiKey && cfg.provider !== "cli" && !showConfig) {
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
      setState("result");

      // Save session output
      try {
        const paths = getSessionPaths(activeConfig.outputDir, result, tldrResult.summary);
        const saved = await saveSummary(paths, tldrResult.summary);
        setCurrentSession(saved);
      } catch {
        // Non-fatal — session save failure shouldn't block the user
      }

      // Save to history
      await addEntry(tldrResult);
      const updated = await getRecent(10);
      setHistory(updated);
    } catch (err) {
      setIsStreaming(false);
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError({ message });
      setState("error");
    }
  }, []);

  const handleConfigSave = useCallback(
    async (newConfig: Config) => {
      await saveConfig(newConfig);
      setConfig(newConfig);

      if (editProfile) {
        exit();
      } else if (initialInput) {
        processInput(initialInput, newConfig);
      } else {
        setState("idle");
      }
    },
    [initialInput, editProfile, processInput, exit],
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
              const ttsMode = config?.ttsMode ?? "strip";
              let speechText: string;
              if (ttsMode === "rewrite" && config) {
                speechText = await rewriteForSpeech(summary, config);
              } else {
                speechText = stripMarkdownForSpeech(summary);
              }
              try {
                const path = await generateAudio(
                  speechText,
                  config?.voice ?? "en-US-JennyNeural",
                  config?.ttsSpeed,
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

      if (ch === "q" && state !== "config" && state !== "chat") {
        if (audioProcess) stopAudio(audioProcess);
        exit();
      }
    },
    { isActive: state === "result" || state === "error" },
  );

  if (!config && state !== "config") {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {state === "config" && (
        <ConfigSetup
          currentConfig={config}
          editProfile={editProfile}
          onSave={handleConfigSave}
          onCancel={() => {
            if (config?.apiKey || config?.provider === "cli") {
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
      {state === "error" && <ErrorView message={error.message} hint={error.hint} />}
    </Box>
  );
}
