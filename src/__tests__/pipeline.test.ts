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

  it("throws friendly error for non-existent file paths", async () => {
    const error = await extract("/nonexistent/path/to/file.txt").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("File not found: /nonexistent/path/to/file.txt");
  });

  it("throws friendly error for directory paths", async () => {
    const error = await extract("/tmp").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Path is a directory, not a file: /tmp");
  });

  it("throws friendly error for slash-command-like input via CLI", async () => {
    const error = await extract("/clear").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("File not found: /clear");
  });

  it("throws AbortError when signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await extract("some text", controller.signal).catch((e) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("AbortError");
  });
});
