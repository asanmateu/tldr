import { classifyLine } from "../components/MarkdownText.js";
import * as fmt from "./fmt.js";

/**
 * Replace **bold** markers with ANSI bold escapes.
 */
export function formatInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, (_match, content: string) => fmt.bold(content));
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function formatTable(
  classified: ReturnType<typeof classifyLine>[],
  startIndex: number,
): { output: string; consumed: number } {
  const first = classified[startIndex];
  const headers = first ? parseTableRow(first.content) : [];
  let i = startIndex + 1;

  // Skip separator
  if (i < classified.length && classified[i]?.type === "table-separator") i++;

  const rows: string[][] = [];
  while (i < classified.length && classified[i]?.type === "table-row") {
    const row = classified[i];
    if (row) rows.push(parseTableRow(row.content));
    i++;
  }

  // Compute column widths
  const allRows = [headers, ...rows];
  const colCount = Math.max(...allRows.map((r) => r.length));
  const colWidths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    colWidths.push(Math.max(...allRows.map((r) => (r[c] ?? "").length), 0));
  }

  const formatRow = (cells: string[]): string =>
    cells.map((c, ci) => c.padEnd(colWidths[ci] ?? 0)).join("   ");

  const lines: string[] = [];
  lines.push(`  ${fmt.bold(fmt.cyan(formatRow(headers)))}`);
  lines.push(`  ${fmt.dim(colWidths.map((w) => "─".repeat(w)).join("───"))}`);
  for (const row of rows) {
    lines.push(`  ${formatRow(row)}`);
  }

  return { output: lines.join("\n"), consumed: i - startIndex };
}

/**
 * Convert a markdown string to ANSI-formatted text for TTY output.
 */
export function formatMarkdown(markdown: string): string {
  if (!markdown) return "";

  const rawLines = markdown.split("\n");
  const classified = rawLines.map(classifyLine);
  const outputLines: string[] = [];
  let i = 0;

  while (i < classified.length) {
    const line = classified[i];
    if (!line) {
      i++;
      continue;
    }

    switch (line.type) {
      case "h1":
        if (outputLines.length > 0) outputLines.push("");
        outputLines.push(fmt.brand(line.content));
        i++;
        break;

      case "h2":
        outputLines.push("");
        outputLines.push(fmt.bold(fmt.cyan(line.content)));
        i++;
        break;

      case "bullet":
        outputLines.push(`  ${fmt.cyan("●")} ${formatInline(line.content)}`);
        i++;
        break;

      case "checkbox-unchecked":
        outputLines.push(`  ${fmt.dim("☐")} ${formatInline(line.content)}`);
        i++;
        break;

      case "checkbox-checked":
        outputLines.push(`  ${fmt.green("☑")} ${formatInline(line.content)}`);
        i++;
        break;

      case "numbered":
        outputLines.push(`  ${fmt.cyan(`${line.number}.`)} ${formatInline(line.content)}`);
        i++;
        break;

      case "table-row": {
        const { output, consumed } = formatTable(classified, i);
        outputLines.push(output);
        i += consumed;
        break;
      }

      case "table-separator":
        i++;
        break;

      case "blank":
        outputLines.push("");
        i++;
        break;

      case "paragraph":
        outputLines.push(formatInline(line.content));
        i++;
        break;
    }
  }

  return `${outputLines.join("\n")}\n`;
}
