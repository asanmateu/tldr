import { describe, expect, it } from "vitest";
import {
  STYLE_TEMPLATES,
  TONE_INSTRUCTIONS,
  TRAIT_RULES,
  buildSystemPrompt,
  buildUserPrompt,
} from "../lib/prompts.js";
import type { CognitiveTrait, ResolvedConfig } from "../lib/types.js";

function makeTestConfig(overrides?: Partial<ResolvedConfig>): ResolvedConfig {
  return {
    apiKey: "sk-ant-test-key",
    baseUrl: undefined,
    maxTokens: 1024,
    profileName: "default",
    cognitiveTraits: [],
    tone: "casual",
    summaryStyle: "quick",
    model: "claude-haiku-4-5-20251001",
    customInstructions: undefined,
    voice: "en-US-JennyNeural",
    ttsSpeed: 1.0,
    pitch: "default",
    volume: "normal",
    provider: "claude-code",
    outputDir: "/tmp/tldr-output",
    ttsProvider: "edge-tts" as const,
    ttsModel: "tts-1",
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("starts with learning-focused summarization assistant role", () => {
    const prompt = buildSystemPrompt(makeTestConfig());
    expect(prompt).toMatch(/^You are a learning-focused summarization assistant/);
  });

  it("always includes base formatting rules", () => {
    const prompt = buildSystemPrompt(makeTestConfig({ cognitiveTraits: [] }));
    expect(prompt).toContain("Base Formatting Rules");
    expect(prompt).toContain("scannability");
  });

  it("always includes visual structure rules", () => {
    const prompt = buildSystemPrompt(makeTestConfig());
    expect(prompt).toContain("Visual Structure");
    expect(prompt).toContain("markdown table");
  });

  it("includes no accessibility section when traits are empty", () => {
    const prompt = buildSystemPrompt(makeTestConfig({ cognitiveTraits: [] }));
    expect(prompt).not.toContain("Reading Accessibility Rules");
  });

  describe("cognitive traits", () => {
    it.each([
      ["dyslexia", "Short sentences"],
      ["adhd", "Most important info first"],
      ["autism", "Literal/precise language"],
      ["esl", "Simple vocabulary (common 3000 words)"],
      ["visual-thinker", "Hierarchical structure"],
    ] as const)("includes rules for %s trait", (trait, expectedPhrase) => {
      const prompt = buildSystemPrompt(
        makeTestConfig({ cognitiveTraits: [trait as CognitiveTrait] }),
      );
      expect(prompt).toContain(expectedPhrase);
      expect(prompt).toContain("Reading Accessibility Rules");
    });

    it("stacks multiple trait rules", () => {
      const prompt = buildSystemPrompt(
        makeTestConfig({ cognitiveTraits: ["dyslexia", "adhd", "autism"] }),
      );

      expect(prompt).toContain(TRAIT_RULES.dyslexia);
      expect(prompt).toContain(TRAIT_RULES.adhd);
      expect(prompt).toContain(TRAIT_RULES.autism);
    });
  });

  describe("tone", () => {
    it.each(["casual", "professional", "academic", "eli5"] as const)(
      "includes %s tone instructions",
      (tone) => {
        const prompt = buildSystemPrompt(makeTestConfig({ tone }));
        expect(prompt).toContain(TONE_INSTRUCTIONS[tone]);
      },
    );
  });

  describe("summary style", () => {
    it.each(["quick", "standard", "detailed", "study-notes"] as const)(
      "includes %s style template",
      (summaryStyle) => {
        const prompt = buildSystemPrompt(makeTestConfig({ summaryStyle }));
        expect(prompt).toContain(STYLE_TEMPLATES[summaryStyle]);
      },
    );

    it("quick style includes TL;DR and Key Points sections", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ summaryStyle: "quick" }));
      expect(prompt).toContain("## TL;DR");
      expect(prompt).toContain("## Key Points");
      expect(prompt).toContain("## Action Items");
    });

    it("quick style includes Why It Matters", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ summaryStyle: "quick" }));
      expect(prompt).toContain("## Why It Matters");
    });

    it("standard style includes Connections", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ summaryStyle: "standard" }));
      expect(prompt).toContain("## Key Points");
      expect(prompt).toContain("## Why It Matters");
      expect(prompt).toContain("## Connections");
    });

    it("detailed style includes Analogy", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ summaryStyle: "detailed" }));
      expect(prompt).toContain("## Analogy");
    });

    it("study-notes style includes Review Questions and Visual Map", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ summaryStyle: "study-notes" }));
      expect(prompt).toContain("## Review Questions");
      expect(prompt).toContain("## Core Concepts");
      expect(prompt).toContain("## Visual Map");
    });
  });

  describe("custom instructions", () => {
    it("appends custom instructions when non-empty", () => {
      const prompt = buildSystemPrompt(
        makeTestConfig({ customInstructions: "Always include a fun fact." }),
      );
      expect(prompt).toContain("Additional Instructions");
      expect(prompt).toContain("Always include a fun fact.");
    });

    it("omits custom instructions section when empty", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ customInstructions: undefined }));
      expect(prompt).not.toContain("Additional Instructions");
    });

    it("omits custom instructions section when empty string", () => {
      const prompt = buildSystemPrompt(makeTestConfig({ customInstructions: "" }));
      expect(prompt).not.toContain("Additional Instructions");
    });
  });

  it("produces different prompts for different configurations", () => {
    const casual = buildSystemPrompt(
      makeTestConfig({ tone: "casual", cognitiveTraits: ["dyslexia"] }),
    );
    const professional = buildSystemPrompt(
      makeTestConfig({ tone: "professional", cognitiveTraits: ["autism"] }),
    );

    expect(casual).not.toBe(professional);
    expect(casual).toContain("conversational");
    expect(professional).toContain("formal tone");
  });
});

describe("buildUserPrompt", () => {
  it("builds a standard text prompt with metadata", () => {
    const prompt = buildUserPrompt("Some article text", {
      title: "My Article",
      author: "Jane",
      source: "https://example.com",
    });

    expect(prompt).toContain("Title: My Article");
    expect(prompt).toContain("Author: Jane");
    expect(prompt).toContain("Source: https://example.com");
    expect(prompt).toContain("Content to summarize:");
    expect(prompt).toContain("Some article text");
  });

  it("builds a standard prompt without metadata", () => {
    const prompt = buildUserPrompt("Some text", {});

    expect(prompt).toContain("Content to summarize:");
    expect(prompt).toContain("Some text");
    expect(prompt).not.toContain("Title:");
  });

  it("builds an image prompt when isImage is true", () => {
    const prompt = buildUserPrompt("", { source: "./screenshot.png" }, { isImage: true });

    expect(prompt).toContain("Summarize the content of this image");
    expect(prompt).not.toContain("Content to summarize:");
  });

  it("builds a text prompt when isImage is false", () => {
    const prompt = buildUserPrompt("Some text", { source: "test" }, { isImage: false });

    expect(prompt).toContain("Content to summarize:");
    expect(prompt).not.toContain("Summarize the content of this image");
  });

  it("builds a text prompt when options are not provided", () => {
    const prompt = buildUserPrompt("Some text", { source: "test" });

    expect(prompt).toContain("Content to summarize:");
    expect(prompt).not.toContain("Summarize the content of this image");
  });
});
