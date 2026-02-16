import { describe, expect, it } from "vitest";
import { SlackError, extractFromSlack, parseSlackUrl } from "../extractors/slack.js";

describe("parseSlackUrl", () => {
  it("parses channel ID and timestamp from Slack URL", () => {
    const result = parseSlackUrl("https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456");
    expect(result.channelId).toBe("C01234ABCDE");
    expect(result.messageTs).toBe("1234567890.123456");
  });

  it("throws INVALID_URL for malformed URLs", () => {
    expect(() => parseSlackUrl("https://slack.com/something")).toThrow(SlackError);
    expect(() => parseSlackUrl("https://slack.com/something")).toThrow("Could not parse");
  });

  it("throws INVALID_URL for non-Slack URLs", () => {
    expect(() => parseSlackUrl("https://example.com")).toThrow(SlackError);
  });
});

describe("extractFromSlack", () => {
  const mockMessages = [
    { user: "U001", text: "Hey team, check this out", ts: "1234567890.123456" },
    { user: "U002", text: "Looks great!", ts: "1234567891.000000" },
    { user: "U001", text: "Thanks!", ts: "1234567892.000000" },
  ];

  const userNames: Record<string, string> = {
    U001: "Alice",
    U002: "Bob",
  };

  it("formats thread messages with resolved author names", async () => {
    const result = await extractFromSlack(
      "https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456",
      {
        token: "xoxb-test-token",
        fetchReplies: async () => mockMessages,
        fetchUserName: async (_token, userId) => userNames[userId] ?? userId,
      },
    );

    expect(result.title).toBe("Slack Thread (3 messages)");
    expect(result.content).toContain("[Alice]: Hey team, check this out");
    expect(result.content).toContain("[Bob]: Looks great!");
    expect(result.content).toContain("[Alice]: Thanks!");
  });

  it("returns single message title when not a thread", async () => {
    const result = await extractFromSlack(
      "https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456",
      {
        token: "xoxb-test-token",
        fetchReplies: async () => [mockMessages[0] as (typeof mockMessages)[0]],
        fetchUserName: async (_token, userId) => userNames[userId] ?? userId,
      },
    );

    expect(result.title).toBe("Slack Message");
  });

  it("throws NO_TOKEN when env var missing", async () => {
    const original = process.env.SLACK_TOKEN;
    process.env.SLACK_TOKEN = "";

    try {
      await expect(
        extractFromSlack("https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456", {}),
      ).rejects.toMatchObject({ code: "NO_TOKEN" });
    } finally {
      if (original) process.env.SLACK_TOKEN = original;
    }
  });

  it("throws INVALID_URL for malformed URLs", async () => {
    await expect(
      extractFromSlack("https://slack.com/bad-url", {
        token: "xoxb-test-token",
      }),
    ).rejects.toMatchObject({ code: "INVALID_URL" });
  });

  it("throws NOT_FOUND when thread is empty", async () => {
    await expect(
      extractFromSlack("https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456", {
        token: "xoxb-test-token",
        fetchReplies: async () => [],
        fetchUserName: async () => "user",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for API channel_not_found error", async () => {
    await expect(
      extractFromSlack("https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456", {
        token: "xoxb-test-token",
        fetchReplies: async () => {
          throw new SlackError("Thread not found: channel_not_found", "NOT_FOUND");
        },
        fetchUserName: async () => "user",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws AUTH for invalid token", async () => {
    await expect(
      extractFromSlack("https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456", {
        token: "xoxb-bad-token",
        fetchReplies: async () => {
          throw new SlackError("Authentication failed: invalid_auth", "AUTH");
        },
        fetchUserName: async () => "user",
      }),
    ).rejects.toMatchObject({ code: "AUTH" });
  });

  it("caches user name lookups", async () => {
    let lookupCount = 0;

    await extractFromSlack("https://myteam.slack.com/archives/C01234ABCDE/p1234567890123456", {
      token: "xoxb-test-token",
      fetchReplies: async () => mockMessages,
      fetchUserName: async (_token, userId) => {
        lookupCount++;
        return userNames[userId] ?? userId;
      },
    });

    // U001 appears twice, U002 once — but U001 should only be looked up once
    expect(lookupCount).toBe(2);
  });
});
