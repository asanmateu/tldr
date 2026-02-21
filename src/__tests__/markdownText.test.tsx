import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { classifyLine, renderInline } from "../components/MarkdownText.js";
import type { ThemePalette } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Stub theme for rendering tests
// ---------------------------------------------------------------------------

const theme: ThemePalette = {
  brand: "#ff6b6b",
  brandBorder: "#c0392b",
  brandAccent: "#e17055",
  accent: "#0984e3",
  success: "#00b894",
  warning: "#fdcb6e",
  error: "#d63031",
};

// ---------------------------------------------------------------------------
// Minimal ThemeProvider wrapper for ink render tests
// ---------------------------------------------------------------------------

// We import lazily so the test module can be set up without requiring
// the full component tree.
const { ThemeProvider } = await import("../lib/ThemeContext.js");
const { MarkdownText } = await import("../components/MarkdownText.js");

function renderMd(markdown: string, isStreaming = false) {
  return render(
    <ThemeProvider palette={theme}>
      <MarkdownText markdown={markdown} isStreaming={isStreaming} />
    </ThemeProvider>,
  );
}

// ---------------------------------------------------------------------------
// classifyLine
// ---------------------------------------------------------------------------

describe("classifyLine", () => {
  it("classifies H1 heading", () => {
    const result = classifyLine("# My Title");
    expect(result).toEqual({ type: "h1", content: "My Title" });
  });

  it("classifies H2 heading", () => {
    const result = classifyLine("## Section Name");
    expect(result).toEqual({ type: "h2", content: "Section Name" });
  });

  it("classifies bullet", () => {
    const result = classifyLine("- Some bullet point");
    expect(result).toEqual({ type: "bullet", content: "Some bullet point" });
  });

  it("classifies unchecked checkbox", () => {
    const result = classifyLine("- [ ] Do this task");
    expect(result).toEqual({ type: "checkbox-unchecked", content: "Do this task" });
  });

  it("classifies checked checkbox", () => {
    const result = classifyLine("- [x] Done task");
    expect(result).toEqual({ type: "checkbox-checked", content: "Done task" });
  });

  it("classifies checked checkbox case-insensitive", () => {
    const result = classifyLine("- [X] Done task");
    expect(result).toEqual({ type: "checkbox-checked", content: "Done task" });
  });

  it("classifies numbered list", () => {
    const result = classifyLine("3. Third item");
    expect(result).toEqual({ type: "numbered", content: "Third item", number: 3 });
  });

  it("classifies table row", () => {
    const result = classifyLine("| Name | Value |");
    expect(result).toEqual({ type: "table-row", content: "| Name | Value |" });
  });

  it("classifies table separator", () => {
    const result = classifyLine("|---|---|");
    expect(result).toEqual({ type: "table-separator", content: "|---|---|" });
  });

  it("classifies table separator with colons", () => {
    const result = classifyLine("| :--- | ---: |");
    expect(result).toEqual({ type: "table-separator", content: "| :--- | ---: |" });
  });

  it("classifies blank line", () => {
    const result = classifyLine("");
    expect(result).toEqual({ type: "blank", content: "" });
  });

  it("classifies whitespace-only as blank", () => {
    const result = classifyLine("   ");
    expect(result).toEqual({ type: "blank", content: "" });
  });

  it("classifies paragraph", () => {
    const result = classifyLine("Just some text.");
    expect(result).toEqual({ type: "paragraph", content: "Just some text." });
  });
});

// ---------------------------------------------------------------------------
// renderInline
// ---------------------------------------------------------------------------

describe("renderInline", () => {
  it("returns plain text when no bold markers", () => {
    const nodes = renderInline("plain text here");
    expect(nodes).toHaveLength(1);
  });

  it("splits on bold markers", () => {
    const nodes = renderInline("before **bold** after");
    expect(nodes).toHaveLength(3);
  });

  it("handles multiple bold segments", () => {
    const nodes = renderInline("**a** middle **b**");
    expect(nodes).toHaveLength(3);
  });

  it("handles bold at start of string", () => {
    const nodes = renderInline("**bold** rest");
    expect(nodes).toHaveLength(2);
  });

  it("handles bold at end of string", () => {
    const nodes = renderInline("start **bold**");
    expect(nodes).toHaveLength(2);
  });

  it("treats unclosed bold markers as plain text", () => {
    const nodes = renderInline("start **unclosed");
    // No bold match — single plain text node
    expect(nodes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// MarkdownText rendering
// ---------------------------------------------------------------------------

describe("MarkdownText", () => {
  it("renders empty string as null", () => {
    const { lastFrame } = renderMd("");
    expect(lastFrame()).toBe("");
  });

  it("renders H1 with text", () => {
    const { lastFrame } = renderMd("# Hello World");
    expect(lastFrame()).toContain("Hello World");
  });

  it("renders H2 with text", () => {
    const { lastFrame } = renderMd("## Key Points");
    expect(lastFrame()).toContain("Key Points");
  });

  it("renders bullets with styled marker", () => {
    const { lastFrame } = renderMd("- First item\n- Second item");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("●");
    expect(frame).toContain("First item");
    expect(frame).toContain("Second item");
  });

  it("renders unchecked checkboxes", () => {
    const { lastFrame } = renderMd("- [ ] Todo item");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("☐");
    expect(frame).toContain("Todo item");
  });

  it("renders checked checkboxes", () => {
    const { lastFrame } = renderMd("- [x] Done item");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("☑");
    expect(frame).toContain("Done item");
  });

  it("renders numbered lists", () => {
    const { lastFrame } = renderMd("1. First\n2. Second\n3. Third");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("1.");
    expect(frame).toContain("2.");
    expect(frame).toContain("3.");
    expect(frame).toContain("First");
    expect(frame).toContain("Third");
  });

  it("renders paragraphs with inline bold", () => {
    const { lastFrame } = renderMd("This has **bold** text");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("bold");
    expect(frame).toContain("text");
    expect(frame).not.toContain("**");
  });

  it("renders table headers and data", () => {
    const md = "| Name | Age |\n|---|---|\n| Alice | 30 |\n| Bob | 25 |";
    const { lastFrame } = renderMd(md);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Name");
    expect(frame).toContain("Age");
    expect(frame).toContain("Alice");
    expect(frame).toContain("30");
    expect(frame).toContain("─");
  });

  it("renders blank lines as spacers", () => {
    const { lastFrame } = renderMd("Line one\n\nLine two");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Line one");
    expect(frame).toContain("Line two");
  });
});

// ---------------------------------------------------------------------------
// Streaming safety
// ---------------------------------------------------------------------------

describe("streaming safety", () => {
  it("renders incomplete last line as plain text when streaming", () => {
    // No trailing \n means the last line is incomplete
    const { lastFrame } = renderMd("## Complete\npartial lin", true);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Complete");
    expect(frame).toContain("partial lin");
  });

  it("renders all lines styled when markdown ends with newline during streaming", () => {
    const { lastFrame } = renderMd("## Complete\n- bullet\n", true);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Complete");
    expect(frame).toContain("●");
    expect(frame).toContain("bullet");
  });

  it("handles empty input when streaming", () => {
    const { lastFrame } = renderMd("", true);
    expect(lastFrame()).toBe("");
  });

  it("renders single incomplete line as plain text when streaming", () => {
    const { lastFrame } = renderMd("## Half head", true);
    const frame = lastFrame() ?? "";
    // The only line is incomplete — should be plain text
    expect(frame).toContain("## Half head");
  });
});

// ---------------------------------------------------------------------------
// Full template integration
// ---------------------------------------------------------------------------

describe("full template integration", () => {
  it("renders a complete LLM summary without crashing", () => {
    const summary = `# Understanding Neural Networks

## TL;DR
Neural networks are computing systems inspired by **biological neural networks** in the brain.

## Key Points
- **Layers** — networks consist of input, hidden, and output layers
- **Weights** — connections between neurons have adjustable weights
- **Activation functions** — determine neuron output (ReLU, sigmoid)

## Why It Matters
Deep learning has **revolutionized** fields from computer vision to natural language processing.

## Action Items
- [ ] Study backpropagation algorithm
- [ ] Implement a simple neural network
- [x] Read introductory materials

## Comparison

| Architecture | Best For | Params |
|---|---|---|
| CNN | Images | ~25M |
| RNN | Sequences | ~10M |
| Transformer | Language | ~175B |

## Review Questions
1. What are the three main layer types?
2. How does backpropagation update weights?
3. When would you choose a CNN over a Transformer?`;

    const { lastFrame } = renderMd(summary);
    const frame = lastFrame() ?? "";

    // Headings
    expect(frame).toContain("Understanding Neural Networks");
    expect(frame).toContain("TL;DR");
    expect(frame).toContain("Key Points");

    // Bullets
    expect(frame).toContain("●");

    // Checkboxes
    expect(frame).toContain("☐");
    expect(frame).toContain("☑");

    // Table
    expect(frame).toContain("CNN");
    expect(frame).toContain("─");

    // Numbered list
    expect(frame).toContain("1.");
    expect(frame).toContain("2.");

    // Bold markers stripped
    expect(frame).not.toContain("**");
  });
});
