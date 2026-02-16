import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetDocumentProxy = vi.fn();
const mockExtractText = vi.fn();
const mockReadFile = vi.fn();

vi.mock("unpdf", () => ({
  getDocumentProxy: (...args: unknown[]) => mockGetDocumentProxy(...args),
  extractText: (...args: unknown[]) => mockExtractText(...args),
}));

vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

const { extractFromPdf } = await import("../extractors/pdf.js");

describe("extractFromPdf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts text from a local PDF file", async () => {
    const fakeBuffer = Buffer.from("fake-pdf-data");
    mockReadFile.mockResolvedValue(fakeBuffer);

    const fakeProxy = { numPages: 3 };
    mockGetDocumentProxy.mockResolvedValue(fakeProxy);
    mockExtractText.mockResolvedValue({
      totalPages: 3,
      text: "This is the extracted PDF content with several words in it for testing.",
    });

    const result = await extractFromPdf("/tmp/test.pdf");

    expect(result.content).toBe(
      "This is the extracted PDF content with several words in it for testing.",
    );
    expect(result.title).toBe("PDF (3 pages)");
    expect(result.wordCount).toBe(13);
    expect(result.source).toBe("/tmp/test.pdf");
  });

  it("handles single-page PDFs", async () => {
    const fakeBuffer = Buffer.from("fake-pdf-data");
    mockReadFile.mockResolvedValue(fakeBuffer);

    const fakeProxy = { numPages: 1 };
    mockGetDocumentProxy.mockResolvedValue(fakeProxy);
    mockExtractText.mockResolvedValue({
      totalPages: 1,
      text: "Single page content.",
    });

    const result = await extractFromPdf("/tmp/single.pdf");

    expect(result.title).toBe("PDF (1 page)");
  });

  it("handles scanned PDFs with no extractable text", async () => {
    const fakeBuffer = Buffer.from("fake-pdf-data");
    mockReadFile.mockResolvedValue(fakeBuffer);

    const fakeProxy = { numPages: 2 };
    mockGetDocumentProxy.mockResolvedValue(fakeProxy);
    mockExtractText.mockResolvedValue({
      totalPages: 2,
      text: "",
    });

    const result = await extractFromPdf("/tmp/scanned.pdf");

    expect(result.content).toBe("");
    expect(result.wordCount).toBe(0);
  });
});
