import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useTheme } from "../lib/ThemeContext.js";
import type { ExtractionResult } from "../lib/types.js";

interface ProcessingViewProps {
  phase: "extracting" | "summarizing";
  source: string;
  extraction?: ExtractionResult | undefined;
  queuePosition?: number | undefined;
  queueTotal?: number | undefined;
}

export function ProcessingView({
  phase,
  source,
  extraction,
  queuePosition,
  queueTotal,
}: ProcessingViewProps) {
  const theme = useTheme();
  const isImage = !!extraction?.image;

  const queuePrefix =
    queuePosition != null && queueTotal != null ? `(${queuePosition}/${queueTotal}) ` : "";

  const label =
    phase === "extracting"
      ? `${queuePrefix}Extracting from ${source}...`
      : isImage
        ? `${queuePrefix}Analyzing image...`
        : extraction
          ? `${queuePrefix}Summarizing ${extraction.wordCount.toLocaleString()} words...`
          : `${queuePrefix}Summarizing with Claude...`;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color={theme.accent}>
          <Spinner type="dots" />
        </Text>
        <Text> {label}</Text>
      </Box>
      {extraction && (
        <Box flexDirection="column" marginTop={1}>
          {extraction.title && <Text dimColor>Title: {extraction.title}</Text>}
          {extraction.author && <Text dimColor>Author: {extraction.author}</Text>}
          {isImage ? (
            <Text dimColor>Type: Image ({extraction.image?.mediaType.split("/")[1]})</Text>
          ) : (
            <Text dimColor>Words: {extraction.wordCount.toLocaleString()}</Text>
          )}
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {queueTotal != null && queueTotal > 1 ? "[Esc] cancel remaining" : "[Esc] cancel"}
        </Text>
      </Box>
    </Box>
  );
}
