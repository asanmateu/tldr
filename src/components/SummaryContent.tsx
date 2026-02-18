import { Box, Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";
import type { ExtractionResult } from "../lib/types.js";

interface SummaryContentProps {
  extraction: ExtractionResult;
  summary: string;
  isStreaming: boolean;
  sessionDir?: string | undefined;
}

function estimateTimeSaved(wordCount: number): string {
  const readingWpm = 200;
  const minutesSaved = Math.round(wordCount / readingWpm);
  if (minutesSaved < 1) return "<1 min saved";
  return `~${minutesSaved} min saved`;
}

export function SummaryContent({
  extraction,
  summary,
  isStreaming,
  sessionDir,
}: SummaryContentProps) {
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
    </Box>
  );
}
