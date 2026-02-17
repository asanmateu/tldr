import { Box, Text, useInput } from "ink";
import { useTheme } from "../lib/ThemeContext.js";
import { SLASH_COMMANDS } from "../lib/commands.js";

interface HelpViewProps {
  onClose: () => void;
}

export function HelpView({ onClose }: HelpViewProps) {
  const theme = useTheme();

  useInput((_ch, key) => {
    if (key.return || key.escape) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.accent}>
        Help
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.brand}>
          Slash Commands
        </Text>
        {SLASH_COMMANDS.map((cmd) => (
          <Text key={cmd.name}>
            {"  "}
            <Text color={theme.accent}>/{cmd.name}</Text>
            {"  "}
            <Text dimColor>{cmd.description}</Text>
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.brand}>
          Result View Shortcuts
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>c</Text>
          {"  "}
          <Text dimColor>Copy summary to clipboard</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>a</Text>
          {"  "}
          <Text dimColor>Generate and play audio</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>s</Text>
          {"  "}
          <Text dimColor>Stop audio playback</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>t</Text>
          {"  "}
          <Text dimColor>Chat about the summary</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>r</Text>
          {"  "}
          <Text dimColor>Re-summarize the same input</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>Enter</Text>
          {"  "}
          <Text dimColor>Save & new summary</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>q</Text>
          {"  "}
          <Text dimColor>Discard (double-tap)</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.brand}>
          Chat Shortcuts
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>Esc</Text>
          {"  "}
          <Text dimColor>Back to summary</Text>
        </Text>
        <Text>
          {"  "}
          <Text color={theme.accent}>q</Text>
          {"  "}
          <Text dimColor>Back (when input is empty)</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>[Enter] or [Esc] to close</Text>
      </Box>
    </Box>
  );
}
