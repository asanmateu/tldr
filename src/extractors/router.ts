import { FILE_PATH_PATTERN, normalizeDraggedPath } from "../lib/paths.js";
import type { ClassifiedInput, InputType } from "../lib/types.js";

const URL_PATTERN = /^https?:\/\//i;

const PLATFORM_PATTERNS: Array<{ pattern: RegExp; type: InputType }> = [
  { pattern: /^https?:\/\/([^/]*\.)?slack\.com\//i, type: "url:slack" },
  { pattern: /^https?:\/\/([^/]*\.)?(youtube\.com|youtu\.be)\//i, type: "url:youtube" },
  { pattern: /^https?:\/\/([^/]*\.)?notion\.so\//i, type: "url:notion" },
  { pattern: /^https?:\/\/([^/]*\.)?arxiv\.org\//i, type: "url:arxiv" },
];

const PDF_URL_PATTERN = /\.pdf(\?.*)?$/i;
const IMAGE_URL_PATTERN = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;

function isPdfPath(value: string): boolean {
  return /\.pdf$/i.test(value);
}

function isImagePath(value: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(value);
}

export function classify(input: string): ClassifiedInput {
  const trimmed = input.trim();

  if (trimmed === "") {
    return { type: "text", value: trimmed };
  }

  if (URL_PATTERN.test(trimmed)) {
    for (const { pattern, type } of PLATFORM_PATTERNS) {
      if (pattern.test(trimmed)) {
        if (type === "url:arxiv" && PDF_URL_PATTERN.test(trimmed)) {
          return { type: "url:pdf", value: trimmed };
        }
        return { type, value: trimmed };
      }
    }

    if (PDF_URL_PATTERN.test(trimmed)) {
      return { type: "url:pdf", value: trimmed };
    }

    if (IMAGE_URL_PATTERN.test(trimmed)) {
      return { type: "url:image", value: trimmed };
    }

    return { type: "url", value: trimmed };
  }

  const normalizedPath = normalizeDraggedPath(trimmed);
  if (FILE_PATH_PATTERN.test(normalizedPath)) {
    if (isPdfPath(normalizedPath)) {
      return { type: "file:pdf", value: normalizedPath };
    }
    if (isImagePath(normalizedPath)) {
      return { type: "file:image", value: normalizedPath };
    }
    return { type: "file", value: normalizedPath };
  }

  return { type: "text", value: trimmed };
}
