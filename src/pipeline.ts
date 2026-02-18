import { classify } from "./extractors/router.js";
import { expandHome } from "./lib/paths.js";
import type { ExtractionResult } from "./lib/types.js";

export async function extract(input: string, signal?: AbortSignal): Promise<ExtractionResult> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const classified = classify(input);

  switch (classified.type) {
    case "url":
    case "url:arxiv": {
      const { extractFromUrl } = await import("./extractors/web.js");
      return extractFromUrl(classified.value);
    }
    case "url:pdf":
    case "file:pdf": {
      const { extractFromPdf } = await import("./extractors/pdf.js");
      return extractFromPdf(classified.value);
    }
    case "url:image":
    case "file:image": {
      const { extractFromImage } = await import("./extractors/image.js");
      return extractFromImage(classified.value);
    }
    case "file": {
      const { readFile } = await import("node:fs/promises");
      const path = expandHome(classified.value);
      let content: string;
      try {
        content = await readFile(path, "utf-8");
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          throw new Error(`File not found: ${classified.value}`);
        }
        if (code === "EISDIR") {
          throw new Error(`Path is a directory, not a file: ${classified.value}`);
        }
        if (code === "EACCES") {
          throw new Error(`Permission denied: ${classified.value}`);
        }
        throw err;
      }
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      return {
        content,
        wordCount,
        source: classified.value,
      };
    }
    case "url:youtube": {
      const { extractFromYouTube } = await import("./extractors/youtube.js");
      return extractFromYouTube(classified.value);
    }
    case "url:slack": {
      const { extractFromSlack } = await import("./extractors/slack.js");
      return extractFromSlack(classified.value);
    }
    case "url:notion": {
      const { extractFromNotion } = await import("./extractors/notion.js");
      return extractFromNotion(classified.value);
    }
    case "url:github": {
      const { extractFromGitHub } = await import("./extractors/github.js");
      return extractFromGitHub(classified.value);
    }
    case "text": {
      const wordCount = classified.value.split(/\s+/).filter(Boolean).length;
      return {
        content: classified.value,
        wordCount,
        source: "direct input",
      };
    }
  }
}
