import { Box, Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";

interface SelectionItem {
  value: string;
  label: string;
  hint?: string;
}

interface SelectionListProps {
  title: string;
  items: SelectionItem[];
  selectedIndex: number;
  checkedValues?: Set<string>;
}

export function SelectionList({ title, items, selectedIndex, checkedValues }: SelectionListProps) {
  const theme = useTheme();

  return (
    <Box flexDirection="column">
      <Text>{title}</Text>
      {items.map((item, i) => {
        const cursor = i === selectedIndex;
        const prefix = checkedValues
          ? `${cursor ? ">" : " "} [${checkedValues.has(item.value) ? "x" : " "}]`
          : `${cursor ? ">" : " "}`;

        return (
          <Text key={item.value} {...(cursor ? { color: theme.accent } : {})}>
            {prefix} {item.label}
            {item.hint && <Text dimColor> ({item.hint})</Text>}
          </Text>
        );
      })}
    </Box>
  );
}
