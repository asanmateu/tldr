import { describe, expect, it } from "vitest";
import { YouTubeError, extractFromYouTube, parseVideoId } from "../extractors/youtube.js";

describe("parseVideoId", () => {
  it("parses youtube.com/watch?v= URLs", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be/ URLs", () => {
    expect(parseVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/shorts/ URLs", () => {
    expect(parseVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses URLs with extra query params", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe("dQw4w9WgXcQ");
  });

  it("throws INVALID_URL for bad URLs", () => {
    expect(() => parseVideoId("https://example.com")).toThrow(YouTubeError);
    expect(() => parseVideoId("https://example.com")).toThrow("Could not parse");
  });
});

describe("extractFromYouTube", () => {
  const mockSegments = [
    { text: "Hello world", offset: 0, duration: 1000 },
    { text: "this is a test", offset: 1000, duration: 1500 },
    { text: "transcript content", offset: 2500, duration: 1200 },
  ];

  it("returns transcript as ExtractionResult with title and content", async () => {
    const result = await extractFromYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      fetchTranscript: async () => mockSegments,
      fetchTitle: async () => "Test Video Title",
    });

    expect(result.title).toBe("Test Video Title");
    expect(result.content).toBe("Hello world this is a test transcript content");
    expect(result.wordCount).toBe(8);
    expect(result.source).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("works when title fetch returns undefined", async () => {
    const result = await extractFromYouTube("https://youtu.be/dQw4w9WgXcQ", {
      fetchTranscript: async () => mockSegments,
      fetchTitle: async () => undefined,
    });

    expect(result.title).toBeUndefined();
    expect(result.content).toContain("Hello world");
  });

  it("throws NO_TRANSCRIPT when transcript is empty", async () => {
    await expect(
      extractFromYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        fetchTranscript: async () => [],
        fetchTitle: async () => undefined,
      }),
    ).rejects.toThrow(YouTubeError);

    await expect(
      extractFromYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        fetchTranscript: async () => [],
        fetchTitle: async () => undefined,
      }),
    ).rejects.toThrow("No transcript available");
  });

  it("throws NO_TRANSCRIPT when library throws unavailable error", async () => {
    await expect(
      extractFromYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        fetchTranscript: async () => {
          throw new YouTubeError(
            "No transcript available for this video. Try a video with captions enabled, or paste a transcript directly.",
            "NO_TRANSCRIPT",
          );
        },
        fetchTitle: async () => undefined,
      }),
    ).rejects.toMatchObject({ code: "NO_TRANSCRIPT" });
  });

  it("throws INVALID_URL for bad URLs", async () => {
    await expect(
      extractFromYouTube("https://example.com", {
        fetchTranscript: async () => mockSegments,
        fetchTitle: async () => undefined,
      }),
    ).rejects.toMatchObject({ code: "INVALID_URL" });
  });

  it("handles segments with varied whitespace", async () => {
    const result = await extractFromYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      fetchTranscript: async () => [
        { text: "  spaced  ", offset: 0, duration: 100 },
        { text: "text", offset: 100, duration: 100 },
      ],
      fetchTitle: async () => undefined,
    });

    expect(result.content).toBe("  spaced   text");
    expect(result.wordCount).toBe(2);
  });
});
