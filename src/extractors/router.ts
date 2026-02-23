import { FILE_PATH_PATTERN, normalizeDraggedPath } from "../lib/paths.js";
import type { ClassifiedInput, InputType } from "../lib/types.js";

const URL_PATTERN = /^https?:\/\//i;

const PLATFORM_PATTERNS: Array<{ pattern: RegExp; type: InputType }> = [
  { pattern: /^https?:\/\/([^/]*\.)?slack\.com\//i, type: "url:slack" },
  { pattern: /^https?:\/\/([^/]*\.)?(youtube\.com|youtu\.be)\//i, type: "url:youtube" },
  { pattern: /^https?:\/\/([^/]*\.)?notion\.so\//i, type: "url:notion" },
  { pattern: /^https?:\/\/([^/]*\.)?arxiv\.org\//i, type: "url:arxiv" },
  { pattern: /^https?:\/\/(www\.)?github\.com\//i, type: "url:github" },
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
    const urlToken = trimmed.split(/\s/)[0] ?? trimmed;

    for (const { pattern, type } of PLATFORM_PATTERNS) {
      if (pattern.test(urlToken)) {
        if (type === "url:arxiv" && PDF_URL_PATTERN.test(urlToken)) {
          return { type: "url:pdf", value: urlToken };
        }
        return { type, value: urlToken };
      }
    }

    if (PDF_URL_PATTERN.test(urlToken)) {
      return { type: "url:pdf", value: urlToken };
    }

    if (IMAGE_URL_PATTERN.test(urlToken)) {
      return { type: "url:image", value: urlToken };
    }

    return { type: "url", value: urlToken };
  }

  // Extract the first path token from the raw input, respecting quotes and
  // backslash escapes, so that paths with spaces survive the split.
  const rawPathMatch = trimmed.match(/^(?:'[^']*'|"[^"]*"|(?:\\.|[^\s])*)/);
  const rawPathToken = rawPathMatch ? rawPathMatch[0] : trimmed;
  const normalizedPath = normalizeDraggedPath(rawPathToken);
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
