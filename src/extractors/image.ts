import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ExtractionResult, ImageMediaType } from "../lib/types.js";

const EXTENSION_MAP: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function getMediaType(filename: string): ImageMediaType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MAP[ext] ?? "image/png";
}

export async function extractFromImage(source: string): Promise<ExtractionResult> {
  const isUrl = /^https?:\/\//i.test(source);

  if (isUrl) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    const filename = basename(new URL(source).pathname) || "image";
    const mediaType = getMediaType(filename);

    const tempPath = join(tmpdir(), `tldr-${Date.now()}-${filename}`);
    await writeFile(tempPath, buffer);

    return {
      content: "",
      wordCount: 0,
      source,
      title: filename,
      image: { base64, mediaType, filePath: tempPath },
    };
  }

  const absolutePath = resolve(source);
  const buffer = await readFile(absolutePath);
  const base64 = buffer.toString("base64");
  const filename = basename(absolutePath);
  const mediaType = getMediaType(filename);

  return {
    content: "",
    wordCount: 0,
    source,
    title: filename,
    image: { base64, mediaType, filePath: absolutePath },
  };
}
