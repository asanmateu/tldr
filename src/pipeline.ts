import { classify } from "./extractors/router.js";
import { expandHome } from "./lib/paths.js";
import type { ExtractionResult } from "./lib/types.js";

export async function extract(input: string): Promise<ExtractionResult> {
  const classified = classify(input);

  switch (classified.type) {
    case "url":
    case "url:arxiv": {
      const { extractFromUrl } = await import("./extractors/web.js");
      return extractFromUrl(classified.value);
    }
    case "url:pdf": {
      const { extractFromPdf } = await import("./extractors/pdf.js");
      return extractFromPdf(classified.value);
    }
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
      const content = await readFile(path, "utf-8");
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
