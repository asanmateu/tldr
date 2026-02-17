import { execSync, spawn } from "node:child_process";
import type { ChatMessage, Config, ImageData, Provider } from "../types.js";

export class ClaudeCodeProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "TIMEOUT" | "UNKNOWN",
  ) {
    super(message);
    this.name = "ClaudeCodeProviderError";
  }
}

const CLI_TIMEOUT_MS = 120_000;

export function isClaudeCodeAvailable(): boolean {
  try {
    execSync("claude --version", { stdio: "pipe", timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

function runClaude(
  combinedPrompt: string,
  model: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const child = spawn("claude", ["-p", "--model", model], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const onAbort = () => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new DOMException("Aborted", "AbortError"));
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        cleanup();
        reject(new ClaudeCodeProviderError("Claude CLI timed out after 120s.", "TIMEOUT"));
      }
    }, CLI_TIMEOUT_MS);

    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (onChunk) onChunk(text);
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      cleanup();
      if (settled) return;
      settled = true;
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new ClaudeCodeProviderError(
            "Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code",
            "NOT_FOUND",
          ),
        );
      } else {
        reject(new ClaudeCodeProviderError(`CLI error: ${err.message}`, "UNKNOWN"));
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      cleanup();
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new ClaudeCodeProviderError(
            `Claude CLI exited with code ${code}: ${stderr.slice(0, 200)}`,
            "UNKNOWN",
          ),
        );
      }
    });

    child.stdin.write(combinedPrompt);
    child.stdin.end();
  });
}

export async function summarizeViaClaudeCode(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  image?: ImageData,
  signal?: AbortSignal,
): Promise<string> {
  const effectivePrompt = image?.filePath
    ? `Please read the image at this path: ${image.filePath}\n\nThen follow these instructions:\n\n${userPrompt}`
    : userPrompt;
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${effectivePrompt}`;
  return runClaude(combinedPrompt, config.model, onChunk, signal);
}

export async function rewriteViaClaudeCode(
  markdown: string,
  config: Config,
  systemPrompt: string,
): Promise<string> {
  const combinedPrompt = `${systemPrompt}\n\n---\n\nRewrite this summary as an engaging audio script:\n\n${markdown}`;
  return runClaude(combinedPrompt, config.model);
}

export async function chatViaClaudeCode(
  config: Config,
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<string> {
  const conversationParts = messages.map(
    (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
  );
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${conversationParts.join("\n\n")}\n\nAssistant:`;
  return runClaude(combinedPrompt, config.model, onChunk);
}

export const claudeCodeProvider: Provider = {
  summarize: summarizeViaClaudeCode,
  rewrite: rewriteViaClaudeCode,
  chat: chatViaClaudeCode,
};
