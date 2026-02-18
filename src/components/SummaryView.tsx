import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useTheme } from "../lib/ThemeContext.js";
import type { ExtractionResult } from "../lib/types.js";
import { SummaryContent } from "./SummaryContent.js";

interface SummaryViewProps {
  extraction: ExtractionResult;
  summary: string;
  isStreaming: boolean;
  isGeneratingAudio: boolean;
  isPlaying: boolean;
  audioError?: string | undefined;
  sessionDir?: string | undefined;
  discardPending?: boolean | undefined;
  voiceLabel?: string | undefined;
  ttsSpeed?: number | undefined;
  saveAudio: boolean;
  isSavingAudio: boolean;
  showAudioHint?: boolean | undefined;
  summaryPinned?: boolean | undefined;
}

export function SummaryView({
  extraction,
  summary,
  isStreaming,
  isGeneratingAudio,
  isPlaying,
  audioError,
  sessionDir,
  discardPending,
  voiceLabel,
  ttsSpeed,
  saveAudio,
  isSavingAudio,
  showAudioHint,
  summaryPinned,
}: SummaryViewProps) {
  const theme = useTheme();

  return (
    <Box flexDirection="column">
      {!summaryPinned && (
        <SummaryContent
          extraction={extraction}
          summary={summary}
          isStreaming={isStreaming}
          sessionDir={sessionDir}
        />
      )}
      <Box flexDirection="column" paddingX={1}>
        {audioError && (
          <Box>
            <Text color={theme.error}>Audio failed: {audioError}</Text>
          </Box>
        )}
        {discardPending && (
          <Box>
            <Text color={theme.warning}>[q] press again to discard</Text>
          </Box>
        )}
        {showAudioHint && !isGeneratingAudio && !isPlaying && !isSavingAudio && (
          <Box>
            <Text color={theme.accent}>Press [a] to listen to this summary</Text>
          </Box>
        )}
        <Box>
          {isSavingAudio ? (
            <Text>
              <Text color={theme.accent}>
                <Spinner type="dots" />
              </Text>
              <Text color={theme.warning}> Saving with audio...</Text>
            </Text>
          ) : isGeneratingAudio ? (
            <Text>
              <Text color={theme.accent}>
                <Spinner type="dots" />
              </Text>
              <Text color={theme.warning}> Generating audio...</Text>
            </Text>
          ) : isPlaying ? (
            <Text color={theme.success}>Playing audio... [s] stop</Text>
          ) : (
            <Text dimColor>
              {saveAudio
                ? "[Enter] save + audio · [w] save only"
                : "[Enter] save · [w] save + audio"}{" "}
              · [a] audio
              {voiceLabel ? ` (${voiceLabel}${ttsSpeed != null ? `, ${ttsSpeed}x` : ""})` : ""} ·
              [c] copy · [t] talk · [r] re-summarize · [q] discard
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
