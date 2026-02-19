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
  isSavingAudio: boolean;
  toast?: string | undefined;
  isSaved?: boolean | undefined;
  audioIsFallback?: boolean | undefined;
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
  isSavingAudio,
  toast,
  isSaved,
  audioIsFallback,
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
        {discardPending && (
          <Box>
            <Text color={theme.warning}>[q] press again to discard</Text>
          </Box>
        )}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.brandBorder}
          paddingX={1}
        >
          <Text bold color={theme.accent}>
            Audio
          </Text>
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
            <Text color={theme.success}>
              ♪ Playing ({voiceLabel}
              {ttsSpeed != null ? `, ${ttsSpeed}x` : ""}){"  "}
              <Text dimColor>[s] stop</Text>
            </Text>
          ) : (
            <>
              {audioError && <Text color={theme.error}>Audio failed: {audioError}</Text>}
              <Text dimColor>
                Your summary was rewritten as a spoken{"\n"}
                script tailored to your profile.
              </Text>
              <Text>
                <Text color={theme.accent}>[a]</Text>
                <Text dimColor> {audioError ? "retry" : "listen"}</Text>
                {!isSaved && !audioIsFallback && (
                  <>
                    <Text dimColor> · </Text>
                    <Text color={theme.accent}>[w]</Text>
                    <Text dimColor> save + audio</Text>
                  </>
                )}
              </Text>
            </>
          )}
        </Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.brandBorder}
          paddingX={1}
        >
          <Text bold color={theme.accent}>
            Chat
          </Text>
          <Text dimColor>
            Ask follow-up questions about this{"\n"}
            summary with your AI provider.
          </Text>
          <Text>
            <Text color={theme.accent}>[t]</Text>
            <Text dimColor> start chatting</Text>
          </Text>
        </Box>
        {toast && (
          <Box>
            <Text color={theme.success}>{toast}</Text>
          </Box>
        )}
        <Box>
          {isSaved ? (
            <Text dimColor>
              <Text color={theme.success}>Saved</Text> · [c] copy · [r] re-summarize · [q] exit
            </Text>
          ) : (
            <Text dimColor>[Enter] save · [c] copy · [r] re-summarize · [q] discard</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
