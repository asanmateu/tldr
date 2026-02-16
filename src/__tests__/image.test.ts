import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const mockReadFile = vi.mocked(readFile);

const { extractFromImage } = await import("../extractors/image.js");

describe("extractFromImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("local files", () => {
    it("reads a local PNG file and returns base64 + metadata", async () => {
      const fakeBuffer = Buffer.from("fake-png-data");
      mockReadFile.mockResolvedValue(fakeBuffer);

      const result = await extractFromImage("./screenshot.png");

      expect(result.content).toBe("");
      expect(result.wordCount).toBe(0);
      expect(result.source).toBe("./screenshot.png");
      expect(result.title).toBe("screenshot.png");
      expect(result.image).toBeDefined();
      expect(result.image?.base64).toBe(fakeBuffer.toString("base64"));
      expect(result.image?.mediaType).toBe("image/png");
      expect(result.image?.filePath).toBe(resolve("./screenshot.png"));
    });

    it("detects JPEG media type", async () => {
      mockReadFile.mockResolvedValue(Buffer.from("jpeg-data"));

      const result = await extractFromImage("/photos/image.jpg");

      expect(result.image?.mediaType).toBe("image/jpeg");
    });

    it("detects JPEG media type for .jpeg extension", async () => {
      mockReadFile.mockResolvedValue(Buffer.from("jpeg-data"));

      const result = await extractFromImage("/photos/image.jpeg");

      expect(result.image?.mediaType).toBe("image/jpeg");
    });

    it("detects GIF media type", async () => {
      mockReadFile.mockResolvedValue(Buffer.from("gif-data"));

      const result = await extractFromImage("/images/animation.gif");

      expect(result.image?.mediaType).toBe("image/gif");
    });

    it("detects WebP media type", async () => {
      mockReadFile.mockResolvedValue(Buffer.from("webp-data"));

      const result = await extractFromImage("/images/photo.webp");

      expect(result.image?.mediaType).toBe("image/webp");
    });
  });

  describe("URL images", () => {
    it("fetches a URL image and returns base64 + metadata", async () => {
      const fakeBuffer = Buffer.from("remote-png-data");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeBuffer.buffer),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await extractFromImage("https://example.com/chart.png");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/chart.png");
      expect(result.content).toBe("");
      expect(result.wordCount).toBe(0);
      expect(result.source).toBe("https://example.com/chart.png");
      expect(result.title).toBe("chart.png");
      expect(result.image).toBeDefined();
      expect(result.image?.mediaType).toBe("image/png");
      expect(result.image?.filePath).toContain("tldr-");

      vi.unstubAllGlobals();
    });

    it("throws on fetch failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(extractFromImage("https://example.com/missing.png")).rejects.toThrow(
        "Failed to fetch image: 404 Not Found",
      );

      vi.unstubAllGlobals();
    });
  });
});
