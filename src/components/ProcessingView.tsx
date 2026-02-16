import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useTheme } from "../lib/ThemeContext.js";
import type { ExtractionResult } from "../lib/types.js";

interface ProcessingViewProps {
  phase: "extracting" | "summarizing";
  source: string;
  extraction?: ExtractionResult | undefined;
}

export function ProcessingView({ phase, source, extraction }: ProcessingViewProps) {
  const theme = useTheme();
  const isImage = !!extraction?.image;

  const label =
    phase === "extracting"
      ? `Extracting from ${source}...`
      : isImage
        ? "Analyzing image..."
        : extraction
          ? `Summarizing ${extraction.wordCount.toLocaleString()} words...`
          : "Summarizing with Claude...";

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
        <Text dimColor>[Esc] cancel</Text>
      </Box>
    </Box>
  );
}
