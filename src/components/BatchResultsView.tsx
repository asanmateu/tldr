import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { BatchResult } from "../batch.js";
import { useTheme } from "../lib/ThemeContext.js";
import type { TldrResult } from "../lib/types.js";

interface BatchResultsViewProps {
  results: BatchResult[];
  onSelect: (result: TldrResult) => void;
  onClose: () => void;
}

const VIEWPORT_SIZE = 15;

export function BatchResultsView({ results, onSelect, onClose }: BatchResultsViewProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const succeeded = results.filter((r) => r.result).length;
  const failed = results.filter((r) => r.error).length;

  useInput((ch, key) => {
    if (key.escape || ch === "q") {
      onClose();
      return;
    }

    if (key.return && results.length > 0) {
      const item = results[selectedIndex];
      if (item?.result) onSelect(item.result);
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
        const next = Math.min(results.length - 1, i + 1);
        if (next >= scrollOffset + VIEWPORT_SIZE) setScrollOffset(next - VIEWPORT_SIZE + 1);
        return next;
      });
    }
  });

  const visibleResults = results.slice(scrollOffset, scrollOffset + VIEWPORT_SIZE);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + VIEWPORT_SIZE < results.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold color={theme.accent}>
          Batch Results
        </Text>
        <Text dimColor>
          {" "}
          {succeeded} succeeded, {failed} failed
        </Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {hasMoreAbove && <Text dimColor>{"  \u2191 more"}</Text>}
        {visibleResults.map((item, i) => {
          const actualIndex = scrollOffset + i;
          const isSelected = actualIndex === selectedIndex;
          const label = item.result?.extraction.title ?? truncate(item.input, 60);
          const status = item.error ? (
            <Text color={theme.error}>{"✗"}</Text>
          ) : (
            <Text color={theme.success}>{"✓"}</Text>
          );

          return (
            <Box key={`${item.input}-${actualIndex}`} flexDirection="column">
              <Text>
                {isSelected ? (
                  <Text color={theme.brand} bold>
                    {">"} {status} {label}
                  </Text>
                ) : (
                  <Text>
                    {"  "}
                    {status} {label}
                  </Text>
                )}
              </Text>
              {isSelected && item.error && (
                <Box marginLeft={4}>
                  <Text color={theme.error}>{item.error}</Text>
                </Box>
              )}
            </Box>
          );
        })}
        {hasMoreBelow && <Text dimColor>{"  \u2193 more"}</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Enter] view summary · [Esc/q] exit</Text>
      </Box>
    </Box>
  );
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}\u2026`;
}
