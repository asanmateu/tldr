import { readFile } from "node:fs/promises";
import { expandHome } from "../lib/paths.js";
import type { ExtractionResult } from "../lib/types.js";

export async function extractFromPdf(source: string): Promise<ExtractionResult> {
  let buffer: ArrayBuffer;

  if (/^https?:\/\//i.test(source)) {
    const { safeFetch } = await import("./fetch.js");
    const result = await safeFetch(source);
    buffer = new TextEncoder().encode(result.body).buffer as ArrayBuffer;
  } else {
    const path = expandHome(source);
    const fileBuffer = await readFile(path);
    buffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;
  }

  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    title: `PDF (${totalPages} page${totalPages === 1 ? "" : "s"})`,
    content: text,
    wordCount,
    source,
  };
}
