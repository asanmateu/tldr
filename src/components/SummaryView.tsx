import { Box, Text } from "ink";
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
          <Text color="green">Saved to {sessionDir}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text>{summary}</Text>
        {isStreaming && <Text color="cyan">▊</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>─────────────────────────────────</Text>
      </Box>
      {audioError && (
        <Box>
          <Text color="red">Audio failed: {audioError}</Text>
        </Box>
      )}
      <Box>
        {isGeneratingAudio ? (
          <Text color="yellow">Generating audio...</Text>
        ) : isPlaying ? (
          <Text color="green">Playing audio... [s] stop</Text>
        ) : (
          <Text dimColor>
            [Enter] new · [c] copy · [a] audio · [t] talk · [r] re-summarize · [q] quit
          </Text>
        )}
      </Box>
    </Box>
  );
}
