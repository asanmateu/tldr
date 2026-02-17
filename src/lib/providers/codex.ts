import { execSync, spawn } from "node:child_process";
import type { Provider } from "../types.js";

export class CodexProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "TIMEOUT" | "UNKNOWN",
  ) {
    super(message);
    this.name = "CodexProviderError";
  }
}

const CODEX_TIMEOUT_MS = 120_000;

export function isCodexAvailable(): boolean {
  try {
    execSync("codex --version", { stdio: "pipe", timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

function runCodex(
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

    const child = spawn("codex", ["exec", "-", "--json", "--model", model], {
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
        reject(new CodexProviderError("Codex CLI timed out after 120s.", "TIMEOUT"));
      }
    }, CODEX_TIMEOUT_MS);

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
          new CodexProviderError(
            "Codex CLI not found. Install it with: npm install -g @openai/codex",
            "NOT_FOUND",
          ),
        );
      } else {
        reject(new CodexProviderError(`CLI error: ${err.message}`, "UNKNOWN"));
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      cleanup();
      if (settled) return;
      settled = true;
      if (code === 0) {
        // Try to parse JSON response, fall back to raw stdout
        try {
          const parsed = JSON.parse(stdout);
          resolve(typeof parsed.output === "string" ? parsed.output : stdout);
        } catch {
          resolve(stdout);
        }
      } else {
        reject(
          new CodexProviderError(
            `Codex CLI exited with code ${code}: ${stderr.slice(0, 200)}`,
            "UNKNOWN",
          ),
        );
      }
    });

    child.stdin.write(combinedPrompt);
    child.stdin.end();
  });
}

export const codexProvider: Provider = {
  async summarize(config, systemPrompt, userPrompt, onChunk, image?, signal?) {
    const effectivePrompt = image?.filePath
      ? `Please read the image at this path: ${image.filePath}\n\nThen follow these instructions:\n\n${userPrompt}`
      : userPrompt;
    const combinedPrompt = `${systemPrompt}\n\n---\n\n${effectivePrompt}`;
    return runCodex(combinedPrompt, config.model, onChunk, signal);
  },

  async rewrite(markdown, config, systemPrompt) {
    const combinedPrompt = `${systemPrompt}\n\n---\n\nRewrite this summary as an engaging audio script:\n\n${markdown}`;
    return runCodex(combinedPrompt, config.model);
  },

  async chat(config, systemPrompt, messages, onChunk) {
    const conversationParts = messages.map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
    );
    const combinedPrompt = `${systemPrompt}\n\n---\n\n${conversationParts.join("\n\n")}\n\nAssistant:`;
    return runCodex(combinedPrompt, config.model, onChunk);
  },
};
