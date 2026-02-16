import { describe, expect, it } from "vitest";
import { extract } from "../pipeline.js";

describe("pipeline integration", () => {
  it("handles raw text input directly", async () => {
    const text = "This is some raw text that should be passed through without extraction";
    const result = await extract(text);

    expect(result.content).toBe(text);
    expect(result.source).toBe("direct input");
    expect(result.wordCount).toBe(12);
  });

  it("dispatches YouTube URLs to the YouTube extractor", async () => {
    // Without a real video, the YouTube extractor throws a YouTubeError
    const error = await extract("https://www.youtube.com/watch?v=abc123def45").catch((e) => e);
    expect(error.name).toBe("YouTubeError");
  });

  it("dispatches Slack URLs to the Slack extractor", async () => {
    // Without SLACK_TOKEN, the Slack extractor throws a SlackError with NO_TOKEN
    const error = await extract(
      "https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456",
    ).catch((e) => e);
    expect(error.name).toBe("SlackError");
    expect(error.code).toBe("NO_TOKEN");
  });

  it("dispatches Notion URLs to the Notion extractor", async () => {
    // Without NOTION_TOKEN, the Notion extractor throws a NotionError with NO_TOKEN
    const error = await extract(
      "https://www.notion.so/My-Page-abcdef1234567890abcdef1234567890",
    ).catch((e) => e);
    expect(error.name).toBe("NotionError");
    expect(error.code).toBe("NO_TOKEN");
  });

  it("handles empty input gracefully", async () => {
    const result = await extract("");

    expect(result.content).toBe("");
    expect(result.wordCount).toBe(0);
  });
});
