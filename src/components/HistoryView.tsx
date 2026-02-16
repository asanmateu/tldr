import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { useTheme } from "../lib/ThemeContext.js";
import { formatTimeAgo } from "../lib/time.js";
import type { TldrResult } from "../lib/types.js";

interface HistoryViewProps {
  entries: TldrResult[];
  onSelect: (entry: TldrResult) => void;
  onClose: () => void;
}

const VIEWPORT_SIZE = 15;

export function HistoryView({ entries, onSelect, onClose }: HistoryViewProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((ch, key) => {
    if (key.escape || ch === "q") {
      onClose();
      return;
    }

    if (key.return && entries.length > 0) {
      const entry = entries[selectedIndex];
      if (entry) onSelect(entry);
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => {
        const next = Math.max(0, i - 1);
        if (next < scrollOffset) setScrollOffset(next);
        return next;
      });
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((i) => {
        const next = Math.min(entries.length - 1, i + 1);
        if (next >= scrollOffset + VIEWPORT_SIZE) setScrollOffset(next - VIEWPORT_SIZE + 1);
        return next;
      });
    }
  });

  if (entries.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color={theme.accent}>
          History
        </Text>
        <Box marginTop={1}>
          <Text dimColor>No history yet. Summarize something first!</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>[Esc] to go back</Text>
        </Box>
      </Box>
    );
  }

  const visibleEntries = entries.slice(scrollOffset, scrollOffset + VIEWPORT_SIZE);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + VIEWPORT_SIZE < entries.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.accent}>
        History
      </Text>
      {hasMoreAbove && <Text dimColor>{"  \u2191 more"}</Text>}
      {visibleEntries.map((entry, i) => {
        const actualIndex = scrollOffset + i;
        const isSelected = actualIndex === selectedIndex;
        const label = entry.extraction.title || truncate(entry.extraction.source, 60);
        const time = formatTimeAgo(entry.timestamp);

        return (
          <Text key={entry.timestamp}>
            {isSelected ? (
              <Text color={theme.brand} bold>
                {">"} {label}
              </Text>
            ) : (
              <Text>
                {"  "}
                {label}
              </Text>
            )}
            <Text dimColor> {time}</Text>
          </Text>
        );
      })}
      {hasMoreBelow && <Text dimColor>{"  \u2193 more"}</Text>}
      <Box marginTop={1}>
        <Text dimColor>[Enter] select [Esc/q] back</Text>
      </Box>
    </Box>
  );
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}\u2026`;
}
