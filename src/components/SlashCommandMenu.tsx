import { Box, Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";
import type { SlashCommand } from "../lib/commands.js";

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
}

export function SlashCommandMenu({ commands, selectedIndex }: SlashCommandMenuProps) {
  const theme = useTheme();

  if (commands.length === 0) return null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.brandBorder} paddingX={1}>
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text {...(isSelected ? { color: theme.accent } : {})} bold={isSelected}>
              {isSelected ? "> " : "  "}
              <Text color={isSelected ? theme.accent : theme.brand}>/{cmd.name}</Text>
              {"  "}
              <Text dimColor>{cmd.description}</Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
