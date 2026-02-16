import type { ExtractionResult } from "../lib/types.js";

export class NotionError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_TOKEN" | "INVALID_URL" | "NOT_FOUND" | "AUTH" | "NETWORK",
  ) {
    super(message);
    this.name = "NotionError";
  }
}

export interface NotionOptions {
  token?: string;
  fetchPage?: (token: string, pageId: string) => Promise<{ title: string }>;
  fetchBlocks?: (token: string, blockId: string, depth?: number) => Promise<string>;
}

const NOTION_ID_PATTERN =
  /([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*$/i;

export function parsePageId(url: string): string {
  const match = url.match(NOTION_ID_PATTERN);
  if (!match?.[1]) {
    throw new NotionError(`Could not parse Notion page ID from URL: ${url}`, "INVALID_URL");
  }

  const raw = match[1].replace(/-/g, "");
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

interface RichTextItem {
  plain_text: string;
}

interface BlockContent {
  rich_text?: RichTextItem[];
  language?: string;
  checked?: boolean;
  title?: string;
}

interface Block {
  type: string;
  id: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface ListResponse {
  results: Block[];
  has_more: boolean;
  next_cursor: string | null;
}

function extractRichText(items: RichTextItem[] | undefined): string {
  if (!items) return "";
  return items.map((item) => item.plain_text).join("");
}

function blockToText(block: Block): string {
  const content = block[block.type] as BlockContent | undefined;
  if (!content) return "";

  switch (block.type) {
    case "paragraph":
      return extractRichText(content.rich_text);
    case "heading_1":
      return `# ${extractRichText(content.rich_text)}`;
    case "heading_2":
      return `## ${extractRichText(content.rich_text)}`;
    case "heading_3":
      return `### ${extractRichText(content.rich_text)}`;
    case "bulleted_list_item":
      return `- ${extractRichText(content.rich_text)}`;
    case "numbered_list_item":
      return `1. ${extractRichText(content.rich_text)}`;
    case "to_do":
      return `- [${content.checked ? "x" : " "}] ${extractRichText(content.rich_text)}`;
    case "quote":
    case "callout":
    case "toggle":
      return `> ${extractRichText(content.rich_text)}`;
    case "code":
      return `\`\`\`${content.language ?? ""}\n${extractRichText(content.rich_text)}\n\`\`\``;
    case "divider":
      return "---";
    case "child_page":
      return `[Sub-page: ${content.title ?? "Untitled"}]`;
    case "child_database":
      return `[Sub-database: ${content.title ?? "Untitled"}]`;
    case "image":
      return "[image: embedded content]";
    case "video":
      return "[video: embedded content]";
    case "file":
      return "[file: embedded content]";
    case "audio":
      return "[audio: embedded content]";
    case "pdf":
      return "[pdf: embedded content]";
    case "embed":
      return "[embed: embedded content]";
    case "bookmark":
      return "[bookmark: embedded content]";
    default: {
      const text = extractRichText(content.rich_text);
      return text || "";
    }
  }
}

async function defaultFetchPage(token: string, pageId: string): Promise<{ title: string }> {
  const { Client } = await import("@notionhq/client");
  const client = new Client({ auth: token });

  try {
    const page = await client.pages.retrieve({ page_id: pageId });

    if (!("properties" in page)) {
      return { title: "Untitled" };
    }

    const titleProp = Object.values(page.properties).find((p) => "type" in p && p.type === "title");

    if (titleProp && "title" in titleProp && Array.isArray(titleProp.title)) {
      const title = titleProp.title.map((t: RichTextItem) => t.plain_text).join("");
      return { title: title || "Untitled" };
    }

    return { title: "Untitled" };
  } catch (error) {
    handleNotionApiError(error);
    throw error;
  }
}

async function defaultFetchBlocks(token: string, blockId: string, depth = 0): Promise<string> {
  if (depth > 2) return "";

  const { Client } = await import("@notionhq/client");
  const client = new Client({ auth: token });

  const blocks: Block[] = [];
  let cursor: string | undefined;

  try {
    do {
      const args: { block_id: string; start_cursor?: string; page_size: number } = {
        block_id: blockId,
        page_size: 100,
      };
      if (cursor) args.start_cursor = cursor;
      const response = (await client.blocks.children.list(args)) as unknown as ListResponse;

      blocks.push(...response.results);
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);
  } catch (error) {
    handleNotionApiError(error);
    throw error;
  }

  const lines: string[] = [];
  for (const block of blocks) {
    const text = blockToText(block);
    if (text) lines.push(text);

    if (block.has_children && depth < 2) {
      const childText = await defaultFetchBlocks(token, block.id, depth + 1);
      if (childText) lines.push(childText);
    }
  }

  return lines.join("\n\n");
}

function handleNotionApiError(error: unknown): never {
  if (error instanceof NotionError) throw error;

  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number }).status;

  if (status === 404 || message.includes("not_found") || message.includes("Could not find")) {
    throw new NotionError(
      "Page not found. Check the URL and ensure the integration has access.",
      "NOT_FOUND",
    );
  }
  if (
    status === 401 ||
    message.includes("unauthorized") ||
    message.includes("API token is invalid")
  ) {
    throw new NotionError("Authentication failed. Check your NOTION_TOKEN.", "AUTH");
  }
  throw new NotionError(`Notion API error: ${message}`, "NETWORK");
}

export async function extractFromNotion(
  url: string,
  options: NotionOptions = {},
): Promise<ExtractionResult> {
  const token = options.token ?? process.env.NOTION_TOKEN;
  if (!token) {
    throw new NotionError(
      "Set NOTION_TOKEN environment variable to extract Notion pages.",
      "NO_TOKEN",
    );
  }

  const pageId = parsePageId(url);
  const fetchPage = options.fetchPage ?? defaultFetchPage;
  const fetchBlocks = options.fetchBlocks ?? defaultFetchBlocks;

  const { title } = await fetchPage(token, pageId);
  const content = await fetchBlocks(token, pageId);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    title,
    content,
    wordCount,
    source: url,
  };
}
