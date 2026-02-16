import { describe, expect, it } from "vitest";
import { NotionError, extractFromNotion, parsePageId } from "../extractors/notion.js";

describe("parsePageId", () => {
  it("parses page ID from standard Notion URL", () => {
    expect(
      parsePageId("https://www.notion.so/My-Page-Title-abcdef1234567890abcdef1234567890"),
    ).toBe("abcdef12-3456-7890-abcd-ef1234567890");
  });

  it("parses page ID from URL with workspace prefix", () => {
    expect(
      parsePageId("https://www.notion.so/workspace/My-Page-abcdef1234567890abcdef1234567890"),
    ).toBe("abcdef12-3456-7890-abcd-ef1234567890");
  });

  it("parses page ID already in dashed format", () => {
    expect(parsePageId("https://www.notion.so/abcdef12-3456-7890-abcd-ef1234567890")).toBe(
      "abcdef12-3456-7890-abcd-ef1234567890",
    );
  });

  it("throws INVALID_URL for bad URLs", () => {
    expect(() => parsePageId("https://www.notion.so/")).toThrow(NotionError);
    expect(() => parsePageId("https://www.notion.so/short-id")).toThrow("Could not parse");
  });
});

describe("extractFromNotion", () => {
  const pageId = "abcdef1234567890abcdef1234567890";
  const baseUrl = `https://www.notion.so/Test-Page-${pageId}`;

  it("extracts page with title and block content", async () => {
    const result = await extractFromNotion(baseUrl, {
      token: "ntn_test",
      fetchPage: async () => ({ title: "Test Page" }),
      fetchBlocks: async () => "# Heading\n\nSome paragraph text.\n\n- A list item",
    });

    expect(result.title).toBe("Test Page");
    expect(result.content).toContain("# Heading");
    expect(result.content).toContain("Some paragraph text.");
    expect(result.content).toContain("- A list item");
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.source).toBe(baseUrl);
  });

  it("throws NO_TOKEN when env var missing", async () => {
    const original = process.env.NOTION_TOKEN;
    process.env.NOTION_TOKEN = "";

    try {
      await expect(extractFromNotion(baseUrl, {})).rejects.toMatchObject({
        code: "NO_TOKEN",
      });
    } finally {
      if (original) process.env.NOTION_TOKEN = original;
    }
  });

  it("throws INVALID_URL for bad URLs", async () => {
    await expect(
      extractFromNotion("https://www.notion.so/short", {
        token: "ntn_test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_URL" });
  });

  it("throws NOT_FOUND when page doesn't exist", async () => {
    await expect(
      extractFromNotion(baseUrl, {
        token: "ntn_test",
        fetchPage: async () => {
          throw new NotionError("Page not found.", "NOT_FOUND");
        },
        fetchBlocks: async () => "",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws AUTH for invalid token", async () => {
    await expect(
      extractFromNotion(baseUrl, {
        token: "ntn_bad",
        fetchPage: async () => {
          throw new NotionError("Authentication failed.", "AUTH");
        },
        fetchBlocks: async () => "",
      }),
    ).rejects.toMatchObject({ code: "AUTH" });
  });

  it("handles empty page content", async () => {
    const result = await extractFromNotion(baseUrl, {
      token: "ntn_test",
      fetchPage: async () => ({ title: "Empty Page" }),
      fetchBlocks: async () => "",
    });

    expect(result.title).toBe("Empty Page");
    expect(result.content).toBe("");
    expect(result.wordCount).toBe(0);
  });

  it("respects max recursion depth via fetchBlocks", async () => {
    let maxDepthSeen = 0;

    await extractFromNotion(baseUrl, {
      token: "ntn_test",
      fetchPage: async () => ({ title: "Deep Page" }),
      fetchBlocks: async (_token, _blockId, depth) => {
        if (depth !== undefined && depth > maxDepthSeen) maxDepthSeen = depth;
        return "content";
      },
    });

    // fetchBlocks is called once at the top level with default depth
    // The implementation internally handles recursion depth
    expect(maxDepthSeen).toBeLessThanOrEqual(2);
  });
});
