import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { useTheme } from "../lib/ThemeContext.js";

interface ProfilePickerProps {
  profiles: { name: string; active: boolean; builtIn?: boolean; description?: string }[];
  onSwitch: (name: string) => void;
  onClose: () => void;
}

export function ProfilePicker({ profiles, onSwitch, onClose }: ProfilePickerProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(
      0,
      profiles.findIndex((p) => p.active),
    ),
  );

  useInput((ch, key) => {
    if (key.escape || ch === "q") {
      onClose();
      return;
    }

    if (key.return && profiles.length > 0) {
      const selected = profiles[selectedIndex];
      if (selected) onSwitch(selected.name);
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(profiles.length - 1, i + 1));
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.accent}>
        Presets
      </Text>
      <Box marginTop={1} flexDirection="column">
        {profiles.map((profile, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Text key={profile.name}>
              {isSelected ? (
                <Text color={theme.brand} bold>
                  {">"} {profile.name}
                </Text>
              ) : (
                <Text>
                  {"  "}
                  {profile.name}
                </Text>
              )}
              {profile.builtIn && <Text dimColor> (built-in)</Text>}
              {profile.active && <Text color={theme.success}> (active)</Text>}
              {isSelected && profile.description && <Text dimColor> — {profile.description}</Text>}
            </Text>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Enter] switch · [Esc/q] back</Text>
      </Box>
    </Box>
  );
}
