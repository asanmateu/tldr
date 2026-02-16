import { Box, Text } from "ink";

export function Banner() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#ff8882">{"╭──────────────────────────────────╮"}</Text>
      <Box>
        <Text color="#ff8882">{"│"}</Text>
        <Text color="#ffd6c0">{" ✦ "}</Text>
        <Text color="#ff6b6b" bold>
          {"tl;dr"}
        </Text>
        <Text dimColor>{"                   v0.1.0 "}</Text>
        <Text color="#ff8882">{"│"}</Text>
      </Box>
      <Text color="#ff8882">{"╰──────────────────────────────────╯"}</Text>
      <Text dimColor>{"  less noise, more clarity."}</Text>
    </Box>
  );
}
