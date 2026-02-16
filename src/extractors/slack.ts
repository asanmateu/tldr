import type { ExtractionResult } from "../lib/types.js";

export class SlackError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_TOKEN" | "INVALID_URL" | "NOT_FOUND" | "AUTH" | "NETWORK",
  ) {
    super(message);
    this.name = "SlackError";
  }
}

interface SlackMessage {
  user?: string | undefined;
  text?: string | undefined;
  ts?: string | undefined;
}

export interface SlackOptions {
  token?: string;
  fetchReplies?: (token: string, channel: string, ts: string) => Promise<SlackMessage[]>;
  fetchUserName?: (token: string, userId: string) => Promise<string>;
}

type SlackErrorCode = "NO_TOKEN" | "INVALID_URL" | "NOT_FOUND" | "AUTH" | "NETWORK";

function classifySlackError(message: string): SlackErrorCode {
  if (message.includes("channel_not_found") || message.includes("thread_not_found")) {
    return "NOT_FOUND";
  }
  if (
    message.includes("invalid_auth") ||
    message.includes("not_authed") ||
    message.includes("token_revoked")
  ) {
    return "AUTH";
  }
  return "NETWORK";
}

function buildSlackError(message: string): SlackError {
  const code = classifySlackError(message);
  const prefix =
    code === "NOT_FOUND"
      ? "Thread not found"
      : code === "AUTH"
        ? "Authentication failed"
        : "Slack API error";
  return new SlackError(`${prefix}: ${message}`, code);
}

const SLACK_URL_PATTERN = /slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)/i;

export function parseSlackUrl(url: string): { channelId: string; messageTs: string } {
  const match = url.match(SLACK_URL_PATTERN);
  if (!match?.[1] || !match[2]) {
    throw new SlackError(
      `Could not parse Slack channel and timestamp from URL: ${url}`,
      "INVALID_URL",
    );
  }

  const channelId = match[1];
  const raw = match[2];
  const messageTs = `${raw.slice(0, 10)}.${raw.slice(10)}`;

  return { channelId, messageTs };
}

async function defaultFetchReplies(
  token: string,
  channel: string,
  ts: string,
): Promise<SlackMessage[]> {
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(token);

  try {
    const result = await client.conversations.replies({
      channel,
      ts,
      limit: 200,
    });

    if (!result.ok) {
      throw buildSlackError(result.error ?? "Unknown error");
    }

    return (result.messages ?? []).map((m) => ({
      user: m.user ?? undefined,
      text: m.text ?? undefined,
      ts: m.ts ?? undefined,
    }));
  } catch (error) {
    if (error instanceof SlackError) throw error;
    throw buildSlackError(error instanceof Error ? error.message : String(error));
  }
}

async function defaultFetchUserName(token: string, userId: string): Promise<string> {
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(token);

  try {
    const result = await client.users.info({ user: userId });
    return (
      result.user?.profile?.display_name || result.user?.real_name || result.user?.name || userId
    );
  } catch {
    return userId;
  }
}

export async function extractFromSlack(
  url: string,
  options: SlackOptions = {},
): Promise<ExtractionResult> {
  const token = options.token ?? process.env.SLACK_TOKEN;
  if (!token) {
    throw new SlackError(
      "Set SLACK_TOKEN environment variable to extract Slack threads.",
      "NO_TOKEN",
    );
  }

  const { channelId, messageTs } = parseSlackUrl(url);
  const fetchReplies = options.fetchReplies ?? defaultFetchReplies;
  const fetchUserName = options.fetchUserName ?? defaultFetchUserName;

  const messages = await fetchReplies(token, channelId, messageTs);

  if (messages.length === 0) {
    throw new SlackError("Thread not found or empty.", "NOT_FOUND");
  }

  const userNameCache = new Map<string, string>();

  async function resolveUserName(userId: string): Promise<string> {
    const cached = userNameCache.get(userId);
    if (cached) return cached;
    const name = await fetchUserName(token as string, userId);
    userNameCache.set(userId, name);
    return name;
  }

  const formatted: string[] = [];
  for (const msg of messages) {
    const author = msg.user ? await resolveUserName(msg.user) : "Unknown";
    formatted.push(`[${author}]: ${msg.text ?? ""}`);
  }

  const content = formatted.join("\n\n");
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const isThread = messages.length > 1;
  const title = isThread ? `Slack Thread (${messages.length} messages)` : "Slack Message";

  return {
    title,
    content,
    wordCount,
    source: url,
  };
}
