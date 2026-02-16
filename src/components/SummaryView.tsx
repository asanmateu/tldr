import { Box, Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";
import type { ExtractionResult } from "../lib/types.js";

interface SummaryViewProps {
  extraction: ExtractionResult;
  summary: string;
  isStreaming: boolean;
  isGeneratingAudio: boolean;
  isPlaying: boolean;
  audioError?: string | undefined;
  sessionDir?: string | undefined;
}

function estimateTimeSaved(wordCount: number): string {
  const readingWpm = 200;
  const minutesSaved = Math.round(wordCount / readingWpm);
  if (minutesSaved < 1) return "<1 min saved";
  return `~${minutesSaved} min saved`;
}

export function SummaryView({
  extraction,
  summary,
  isStreaming,
  isGeneratingAudio,
  isPlaying,
  audioError,
  sessionDir,
}: SummaryViewProps) {
  const theme = useTheme();
  const summaryWords = summary.split(/\s+/).filter(Boolean).length;
  const domain = extraction.source.replace(/^https?:\/\//, "").split("/")[0] ?? extraction.source;
  const isImage = !!extraction.image;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text dimColor>
          {isImage
            ? `${domain} · image (${extraction.image?.mediaType.split("/")[1]}) → ${summaryWords} words`
            : `${domain} · ${extraction.wordCount.toLocaleString()} → ${summaryWords} words · ${estimateTimeSaved(extraction.wordCount)}`}
        </Text>
      </Box>
      {sessionDir && (
        <Box>
          <Text color={theme.success}>Saved to {sessionDir}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text>{summary}</Text>
        {isStreaming && <Text color={theme.accent}>▊</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>─────────────────────────────────</Text>
      </Box>
      {audioError && (
        <Box>
          <Text color={theme.error}>Audio failed: {audioError}</Text>
        </Box>
      )}
      <Box>
        {isGeneratingAudio ? (
          <Text color={theme.warning}>Generating audio...</Text>
        ) : isPlaying ? (
          <Text color={theme.success}>Playing audio... [s] stop</Text>
        ) : (
          <Text dimColor>
            [Enter] save · [c] copy · [a] audio · [t] talk · [r] re-summarize · [q] discard
          </Text>
        )}
      </Box>
    </Box>
  );
}
