import { Box, Text } from "ink";
import type React from "react";
import { useTheme } from "../lib/ThemeContext.js";
import type { ThemePalette } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Line classification
// ---------------------------------------------------------------------------

type LineType =
  | "h1"
  | "h2"
  | "bullet"
  | "checkbox-unchecked"
  | "checkbox-checked"
  | "numbered"
  | "table-separator"
  | "table-row"
  | "blank"
  | "paragraph";

interface ClassifiedLine {
  type: LineType;
  content: string;
  number?: number; // for numbered lists
}

export function classifyLine(line: string): ClassifiedLine {
  if (/^\s*$/.test(line)) return { type: "blank", content: "" };
  if (/^# /.test(line)) return { type: "h1", content: line.slice(2).trim() };
  if (/^## /.test(line)) return { type: "h2", content: line.slice(3).trim() };
  if (/^- \[x\] /i.test(line))
    return { type: "checkbox-checked", content: line.replace(/^- \[x\] /i, "").trim() };
  if (/^- \[ \] /.test(line))
    return { type: "checkbox-unchecked", content: line.replace(/^- \[ \] /, "").trim() };
  if (/^- /.test(line)) return { type: "bullet", content: line.slice(2).trim() };
  if (/^\|[-\s|:]+\|$/.test(line)) return { type: "table-separator", content: line };

  const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
  if (numberedMatch) {
    const text = numberedMatch[2] ?? "";
    return { type: "numbered", content: text.trim(), number: Number(numberedMatch[1]) };
  }

  if (/^\|.+\|$/.test(line)) return { type: "table-row", content: line };

  return { type: "paragraph", content: line };
}

// ---------------------------------------------------------------------------
// Inline bold rendering — splits on **...** markers
// ---------------------------------------------------------------------------

export function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const idx = match.index;
    if (idx > lastIndex) {
      parts.push(<Text key={`t-${lastIndex}`}>{text.slice(lastIndex, idx)}</Text>);
    }
    parts.push(
      <Text key={`b-${idx}`} bold>
        {match[1]}
      </Text>,
    );
    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<Text key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Text>);
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

interface TableBlock {
  headers: string[];
  rows: string[][];
}

function collectTable(
  lines: ClassifiedLine[],
  startIndex: number,
): { table: TableBlock; consumed: number } {
  const first = lines[startIndex];
  const headers = first ? parseTableRow(first.content) : [];
  let i = startIndex + 1;

  // Skip separator
  if (i < lines.length && lines[i]?.type === "table-separator") i++;

  const rows: string[][] = [];
  while (i < lines.length && lines[i]?.type === "table-row") {
    const row = lines[i];
    if (row) rows.push(parseTableRow(row.content));
    i++;
  }

  return { table: { headers, rows }, consumed: i - startIndex };
}

function formatRow(cells: string[], colWidths: number[]): string {
  return cells.map((c, i) => c.padEnd(colWidths[i] ?? 0)).join("   ");
}

function RenderTable({ table, theme }: { table: TableBlock; theme: ThemePalette }) {
  const allRows = [table.headers, ...table.rows];
  const colCount = Math.max(...allRows.map((r) => r.length));
  const colWidths: number[] = [];

  for (let c = 0; c < colCount; c++) {
    colWidths.push(Math.max(...allRows.map((r) => (r[c] ?? "").length), 0));
  }

  const separator = colWidths.map((w) => "─".repeat(w)).join("───");

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text bold color={theme.accent}>
        {formatRow(table.headers, colWidths)}
      </Text>
      <Text dimColor>{separator}</Text>
      {table.rows.map((row) => (
        <Text key={row.join("|")}>{formatRow(row, colWidths)}</Text>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MarkdownTextProps {
  markdown: string;
  isStreaming?: boolean | undefined;
}

export function MarkdownText({ markdown, isStreaming }: MarkdownTextProps) {
  const theme = useTheme();

  if (!markdown) return null;

  const rawLines = markdown.split("\n");

  // When streaming, the last line may be incomplete — render it unstyled
  let lastIncomplete: string | undefined;
  if (isStreaming && !markdown.endsWith("\n") && rawLines.length > 0) {
    lastIncomplete = rawLines.pop();
  }

  const classified = rawLines.map(classifyLine);
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < classified.length) {
    const line = classified[i];
    if (!line) {
      i++;
      continue;
    }
    const key = `l-${i}`;

    switch (line.type) {
      case "h1":
        elements.push(
          <Box key={key} marginTop={elements.length > 0 ? 1 : 0}>
            <Text bold color={theme.brand}>
              {line.content}
            </Text>
          </Box>,
        );
        i++;
        break;

      case "h2":
        elements.push(
          <Box key={key} marginTop={1}>
            <Text bold color={theme.accent}>
              {line.content}
            </Text>
          </Box>,
        );
        i++;
        break;

      case "bullet":
        elements.push(
          <Box key={key} marginLeft={2}>
            <Text color={theme.accent}>● </Text>
            <Text>{renderInline(line.content)}</Text>
          </Box>,
        );
        i++;
        break;

      case "checkbox-unchecked":
        elements.push(
          <Box key={key} marginLeft={2}>
            <Text dimColor>☐ </Text>
            <Text>{renderInline(line.content)}</Text>
          </Box>,
        );
        i++;
        break;

      case "checkbox-checked":
        elements.push(
          <Box key={key} marginLeft={2}>
            <Text color={theme.success}>☑ </Text>
            <Text>{renderInline(line.content)}</Text>
          </Box>,
        );
        i++;
        break;

      case "numbered":
        elements.push(
          <Box key={key} marginLeft={2}>
            <Text color={theme.accent}>{line.number}. </Text>
            <Text>{renderInline(line.content)}</Text>
          </Box>,
        );
        i++;
        break;

      case "table-row": {
        const { table, consumed } = collectTable(classified, i);
        elements.push(<RenderTable key={key} table={table} theme={theme} />);
        i += consumed;
        break;
      }

      case "table-separator":
        // Standalone separator (shouldn't happen), skip it
        i++;
        break;

      case "blank":
        elements.push(
          <Box key={key}>
            <Text> </Text>
          </Box>,
        );
        i++;
        break;

      case "paragraph":
        elements.push(
          <Box key={key}>
            <Text>{renderInline(line.content)}</Text>
          </Box>,
        );
        i++;
        break;
    }
  }

  // Append incomplete streaming line as plain text
  if (lastIncomplete !== undefined && lastIncomplete.length > 0) {
    elements.push(
      <Box key="streaming-tail">
        <Text>{lastIncomplete}</Text>
      </Box>,
    );
  }

  return <Box flexDirection="column">{elements}</Box>;
}
