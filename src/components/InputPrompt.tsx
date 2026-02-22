import { basename } from "node:path";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUpdateCheck } from "../hooks/useUpdateCheck.js";
import { useTheme } from "../lib/ThemeContext.js";
import { readClipboard } from "../lib/clipboard.js";
import { SLASH_COMMANDS, matchCommands, parseCommand } from "../lib/commands.js";
import { looksLikeFilePath, normalizeDraggedPath } from "../lib/paths.js";
import type { TldrResult } from "../lib/types.js";
import { Banner } from "./Banner.js";
import { SlashCommandMenu } from "./SlashCommandMenu.js";
import { UpdateNotice } from "./UpdateNotice.js";

interface InputPromptProps {
  history: TldrResult[];
  toast?: string | undefined;
  onSubmit: (input: string) => void;
  onQuit: () => void;
  onSlashCommand: (command: string) => void;
}

export function InputPrompt({
  history,
  toast,
  onSubmit,
  onQuit,
  onSlashCommand,
}: InputPromptProps) {
  const theme = useTheme();
  const updateInfo = useUpdateCheck();
  const [input, setInput] = useState("");
  const [clipboardHint, setClipboardHint] = useState<string | undefined>(undefined);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [commandError, setCommandError] = useState<string | undefined>(undefined);

  const filteredCommands = useMemo(() => matchCommands(input), [input]);
  const slashMenuVisible =
    input.startsWith("/") && !looksLikeFilePath(input) && filteredCommands.length > 0;

  const fileHint = useMemo(() => {
    if (!input) return undefined;
    if (!looksLikeFilePath(input)) return undefined;
    const normalized = normalizeDraggedPath(input);
    const name = basename(normalized);
    if (/\.pdf$/i.test(normalized)) return { name, type: "PDF document" };
    if (/\.(jpe?g|png|gif|webp)$/i.test(normalized)) return { name, type: "image" };
    return { name, type: "document" };
  }, [input]);

  useEffect(() => {
    const clip = readClipboard();
    if (/^https?:\/\//i.test(clip)) {
      try {
        const domain = new URL(clip).hostname;
        setClipboardHint(domain);
      } catch {
        // ignore invalid URLs
      }
    }
  }, []);

  // Reset menu index when filtered commands change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on command count change
  useEffect(() => {
    setSlashMenuIndex(0);
  }, [filteredCommands.length]);

  const handleChange = useCallback(
    (value: string) => {
      setInput(value);
      setHistoryIndex(-1);
      if (commandError) setCommandError(undefined);
    },
    [commandError],
  );

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      // File paths start with / but are not slash commands
      if (looksLikeFilePath(trimmed)) {
        onSubmit(normalizeDraggedPath(trimmed));
        setInput("");
        return;
      }

      // Check if it's a slash command
      if (trimmed.startsWith("/")) {
        if (slashMenuVisible) {
          const selected = filteredCommands[slashMenuIndex];
          if (selected) {
            setInput("");
            onSlashCommand(selected.name);
            return;
          }
        }
        const parsed = parseCommand(trimmed);
        if (parsed) {
          const isKnown = SLASH_COMMANDS.some((cmd) => cmd.name === parsed.command);
          if (isKnown) {
            setInput("");
            onSlashCommand(parsed.command);
            return;
          }
          setCommandError(`Unknown command: /${parsed.command}. Type / to see available commands.`);
          return;
        }
        return;
      }

      onSubmit(trimmed);
    },
    [onSubmit, onSlashCommand, slashMenuVisible, filteredCommands, slashMenuIndex],
  );

  useInput((ch, key) => {
    if (slashMenuVisible) {
      if (key.upArrow) {
        setSlashMenuIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSlashMenuIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
        return;
      }
      if (key.tab) {
        const selected = filteredCommands[slashMenuIndex];
        if (selected) {
          setInput(`/${selected.name}`);
        }
        return;
      }
      if (key.escape) {
        setInput("");
        return;
      }
      return;
    }

    if (ch === "q" && !input) {
      onQuit();
      return;
    }

    if (key.upArrow && history.length > 0) {
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      if (entry) setInput(entry.extraction.source);
      return;
    }

    if (key.downArrow && historyIndex > -1) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (newIndex === -1) {
        setInput("");
      } else {
        const entry = history[newIndex];
        if (entry) setInput(entry.extraction.source);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner />
      {updateInfo && <UpdateNotice update={updateInfo} />}
      {toast && (
        <Box>
          <Text color={theme.success}>{toast}</Text>
        </Box>
      )}
      <Box>
        <Text color={theme.brand} bold>
          {">"}{" "}
        </Text>
        <TextInput
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Paste a URL, file path, or text... (/ for commands)"
        />
      </Box>
      {slashMenuVisible && (
        <SlashCommandMenu commands={filteredCommands} selectedIndex={slashMenuIndex} />
      )}
      {commandError && !slashMenuVisible && <Text color={theme.error}>{commandError}</Text>}
      {!slashMenuVisible && !commandError && fileHint && input && (
        <Text>
          <Text color={theme.accent}>{fileHint.name}</Text>
          <Text dimColor>{` — ${fileHint.type}`}</Text>
        </Text>
      )}
      {!slashMenuVisible && !commandError && !fileHint && clipboardHint && !input && (
        <Text dimColor>Clipboard: {clipboardHint}</Text>
      )}
    </Box>
  );
}
