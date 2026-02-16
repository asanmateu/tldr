import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";
import { readClipboard } from "../lib/clipboard.js";
import type { TldrResult } from "../lib/types.js";
import { Banner } from "./Banner.js";

interface InputPromptProps {
  history: TldrResult[];
  onSubmit: (input: string) => void;
  onQuit: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function InputPrompt({ history, onSubmit, onQuit }: InputPromptProps) {
  const [input, setInput] = useState("");
  const [clipboardHint, setClipboardHint] = useState<string | undefined>(undefined);
  const [historyIndex, setHistoryIndex] = useState(-1);

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

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
      }
    },
    [onSubmit],
  );

  useInput((ch, key) => {
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
      <Box>
        <Text color="cyan" bold>
          tldr{" "}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Paste a URL, file path, or text..."
        />
      </Box>
      {clipboardHint && !input && <Text dimColor>Clipboard: {clipboardHint}</Text>}
      {history.slice(0, 3).map((entry) => (
        <Text key={entry.timestamp} dimColor>
          {formatTimeAgo(entry.timestamp)} · {entry.extraction.source}
        </Text>
      ))}
    </Box>
  );
}
