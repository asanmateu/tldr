import type { ChildProcess } from "node:child_process";
import { describe, expect, it, vi } from "vitest";

const mockSpawn = vi.hoisted(() =>
  vi.fn().mockReturnValue({ killed: false, kill: vi.fn(), pid: 1234 }),
);

vi.mock("node:child_process", () => ({
  spawn: mockSpawn,
}));

const mockEdgeTTSConstructor = vi.fn();
const mockSynthesize = vi.fn().mockResolvedValue({
  audio: new Blob([new Uint8Array(100)], { type: "audio/mpeg" }),
  subtitle: [],
});

vi.mock("edge-tts-universal", () => ({
  EdgeTTS: class {
    constructor(...args: unknown[]) {
      mockEdgeTTSConstructor(...args);
      this.synthesize = mockSynthesize;
    }
    synthesize = mockSynthesize;
  },
}));

const mockWriteFile = vi.fn().mockResolvedValue(undefined);

const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock("node:fs/promises", () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  access: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(new Error("not found")),
  rename: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:os", () => ({
  homedir: () => "/mock-home",
}));

const { generateAudio, playAudio, stopAudio, stripMarkdownForSpeech } = await import(
  "../lib/tts.js"
);

describe("tts", () => {
  describe("stripMarkdownForSpeech", () => {
    it("removes heading markers and adds pause", () => {
      const result = stripMarkdownForSpeech("## TL;DR\nSome text");
      expect(result).toBe("TL;DR.\n\nSome text");
    });

    it("removes bold markers", () => {
      expect(stripMarkdownForSpeech("This is **bold** text")).toBe("This is bold text");
    });

    it("removes italic markers", () => {
      expect(stripMarkdownForSpeech("This is *italic* text")).toBe("This is italic text");
    });

    it("removes bold+italic markers", () => {
      expect(stripMarkdownForSpeech("This is ***bold italic*** text")).toBe(
        "This is bold italic text",
      );
    });

    it("converts unchecked checkboxes to 'To do:'", () => {
      expect(stripMarkdownForSpeech("- [ ] Buy groceries")).toBe("To do: Buy groceries.");
    });

    it("converts checked checkboxes to 'Done:'", () => {
      expect(stripMarkdownForSpeech("- [x] Buy groceries")).toBe("Done: Buy groceries.");
    });

    it("adds period to bullet items missing punctuation", () => {
      expect(stripMarkdownForSpeech("- First item\n- Second item")).toBe(
        "First item.\nSecond item.",
      );
    });

    it("does not add period to bullets ending with punctuation", () => {
      expect(stripMarkdownForSpeech("- Already has period.")).toBe("Already has period.");
    });

    it("removes horizontal rules", () => {
      expect(stripMarkdownForSpeech("Above\n---\nBelow")).toBe("Above\n\nBelow");
    });

    it("removes inline code backticks", () => {
      expect(stripMarkdownForSpeech("Use `console.log` here")).toBe("Use console.log here");
    });

    it("removes link syntax, keeps text", () => {
      expect(stripMarkdownForSpeech("Visit [Google](https://google.com) now")).toBe(
        "Visit Google now",
      );
    });

    it("collapses multiple newlines", () => {
      expect(stripMarkdownForSpeech("Line 1\n\n\n\nLine 2")).toBe("Line 1\n\nLine 2");
    });

    it("handles a full markdown summary", () => {
      const markdown = `## TL;DR
**Claude** is an AI assistant.

## Key Points
- **Speed** — very fast responses
- **Quality** — high accuracy
- [ ] Try it out

---

Visit [Anthropic](https://anthropic.com) for more.`;

      const result = stripMarkdownForSpeech(markdown);

      expect(result).not.toContain("##");
      expect(result).not.toContain("**");
      expect(result).not.toContain("---");
      expect(result).not.toContain("- [ ]");
      expect(result).not.toContain("[Anthropic](");
      expect(result).toContain("Claude");
      expect(result).toContain("To do:");
      expect(result).toContain("Anthropic");
    });

    it("converts em dashes to commas", () => {
      expect(stripMarkdownForSpeech("Speed — very fast")).toBe("Speed, very fast");
    });
  });

  describe("generateAudio", () => {
    it("generates audio file from text", async () => {
      const path = await generateAudio("Hello world", "en-US-JennyNeural");

      expect(mockSynthesize).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(path).toContain("audio.mp3");
    });

    it("passes speed as rate option when not 1.0", async () => {
      await generateAudio("Hello world", "en-US-JennyNeural", 1.5);

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith("Hello world", "en-US-JennyNeural", {
        rate: "+50%",
      });
    });

    it("does not pass rate option at default speed", async () => {
      await generateAudio("Hello world", "en-US-JennyNeural", 1.0);

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith(
        "Hello world",
        "en-US-JennyNeural",
        undefined,
      );
    });

    it("handles speed less than 1.0", async () => {
      await generateAudio("Hello world", "en-US-JennyNeural", 0.75);

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith("Hello world", "en-US-JennyNeural", {
        rate: "-25%",
      });
    });

    it("writes to custom outputPath when provided", async () => {
      const path = await generateAudio(
        "Hello world",
        "en-US-JennyNeural",
        undefined,
        "/custom/dir/audio.mp3",
      );

      expect(path).toBe("/custom/dir/audio.mp3");
      expect(mockMkdir).toHaveBeenCalledWith("/custom/dir", { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith("/custom/dir/audio.mp3", expect.anything());
    });

    it("falls back to default path when no outputPath", async () => {
      const path = await generateAudio("Hello world", "en-US-JennyNeural");

      expect(path).toContain("audio.mp3");
      expect(path).toContain(".tldr");
    });
  });

  describe("playAudio", () => {
    it("spawns afplay on macOS", () => {
      vi.stubGlobal("process", { ...process, platform: "darwin" });
      playAudio("/tmp/audio.mp3");

      expect(mockSpawn).toHaveBeenCalledWith("afplay", ["/tmp/audio.mp3"], { stdio: "ignore" });
      vi.unstubAllGlobals();
    });

    it("spawns mpv on Linux", () => {
      vi.stubGlobal("process", { ...process, platform: "linux" });
      playAudio("/tmp/audio.mp3");

      expect(mockSpawn).toHaveBeenCalledWith("mpv", ["--no-video", "/tmp/audio.mp3"], {
        stdio: "ignore",
      });
      vi.unstubAllGlobals();
    });
  });

  describe("stopAudio", () => {
    it("kills the process", () => {
      const killFn = vi.fn();
      const proc = { killed: false, kill: killFn } as unknown as ChildProcess;
      stopAudio(proc);

      expect(killFn).toHaveBeenCalled();
    });

    it("does nothing if already killed", () => {
      const killFn = vi.fn();
      const proc = { killed: true, kill: killFn } as unknown as ChildProcess;
      stopAudio(proc);

      expect(killFn).not.toHaveBeenCalled();
    });
  });
});
