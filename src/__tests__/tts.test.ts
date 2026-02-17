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

const { generateAudio, getVoiceDisplayName, playAudio, speakFallback, stopAudio } = await import(
  "../lib/tts.js"
);

describe("tts", () => {
  describe("getVoiceDisplayName", () => {
    it("returns short name for known voices", () => {
      expect(getVoiceDisplayName("en-US-JennyNeural")).toBe("Jenny");
      expect(getVoiceDisplayName("en-US-GuyNeural")).toBe("Guy");
      expect(getVoiceDisplayName("en-US-AriaNeural")).toBe("Aria");
      expect(getVoiceDisplayName("en-GB-SoniaNeural")).toBe("Sonia");
      expect(getVoiceDisplayName("en-AU-NatashaNeural")).toBe("Natasha");
    });

    it("returns raw ID for unknown voices", () => {
      expect(getVoiceDisplayName("de-DE-ConradNeural")).toBe("de-DE-ConradNeural");
      expect(getVoiceDisplayName("custom-voice")).toBe("custom-voice");
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
        undefined,
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

  describe("pitch and volume presets", () => {
    it("passes pitch for 'low' preset", async () => {
      await generateAudio("Hello", "en-US-JennyNeural", 1.0, "low");

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith(
        "Hello",
        "en-US-JennyNeural",
        expect.objectContaining({ pitch: "-5Hz" }),
      );
    });

    it("passes pitch for 'high' preset", async () => {
      await generateAudio("Hello", "en-US-JennyNeural", 1.0, "high");

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith(
        "Hello",
        "en-US-JennyNeural",
        expect.objectContaining({ pitch: "+5Hz" }),
      );
    });

    it("omits pitch for 'default' preset", async () => {
      await generateAudio("Hello", "en-US-JennyNeural", 1.0, "default");

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith("Hello", "en-US-JennyNeural", undefined);
    });

    it("passes volume for 'loud' preset", async () => {
      await generateAudio("Hello", "en-US-JennyNeural", 1.0, "default", "loud");

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith(
        "Hello",
        "en-US-JennyNeural",
        expect.objectContaining({ volume: "+20%" }),
      );
    });

    it("combines rate with pitch and volume presets", async () => {
      await generateAudio("Hello", "en-US-JennyNeural", 1.5, "low", "loud");

      expect(mockEdgeTTSConstructor).toHaveBeenCalledWith(
        "Hello",
        "en-US-JennyNeural",
        expect.objectContaining({ rate: "+50%", pitch: "-5Hz", volume: "+20%" }),
      );
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

  describe("speakFallback", () => {
    it("spawns say on macOS", () => {
      vi.stubGlobal("process", { ...process, platform: "darwin" });
      speakFallback("Hello world");

      expect(mockSpawn).toHaveBeenCalledWith("say", ["Hello world"], { stdio: "ignore" });
      vi.unstubAllGlobals();
    });

    it("spawns espeak on Linux", () => {
      vi.stubGlobal("process", { ...process, platform: "linux" });
      speakFallback("Hello world");

      expect(mockSpawn).toHaveBeenCalledWith("espeak", ["Hello world"], { stdio: "ignore" });
      vi.unstubAllGlobals();
    });

    it("returns undefined on unsupported platforms", () => {
      vi.stubGlobal("process", { ...process, platform: "win32" });
      const result = speakFallback("Hello world");

      expect(result).toBeUndefined();
      vi.unstubAllGlobals();
    });
  });

  describe("generateAudio timeout", () => {
    it("rejects when synthesis takes too long", async () => {
      mockSynthesize.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 60_000)), // simulates hang
      );

      let caughtError: Error | undefined;
      try {
        await Promise.race([
          generateAudio("Hello", "en-US-JennyNeural"),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("TTS synthesis timed out")), 50),
          ),
        ]);
      } catch (err) {
        caughtError = err as Error;
      }

      expect(caughtError?.message).toBe("TTS synthesis timed out");
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
