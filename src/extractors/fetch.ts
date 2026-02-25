import { URL } from "node:url";

export interface FetchResult {
  body: string;
  contentType: string;
  url: string;
  status: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "SSRF"
      | "SCHEME"
      | "TIMEOUT"
      | "REDIRECT_LIMIT"
      | "NETWORK"
      | "BLOCKED"
      | "RATE_LIMITED",
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const DEFAULT_TIMEOUT = 10_000;
const MAX_REDIRECTS = 5;

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_RETRY_AFTER_MS = 30_000;

export interface SafeFetchOptions {
  timeout?: number;
  maxRedirects?: number;
  resolveHostname?: (hostname: string) => Promise<string>;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

async function defaultResolveHostname(hostname: string): Promise<string> {
  const dns = await import("node:dns/promises");
  const { address } = await dns.lookup(hostname);
  return address;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfterHeader(value: string | null): number | undefined {
  if (value === null) return undefined;

  // Try as numeric seconds first
  const seconds = Number(value);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    const ms = Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    return ms;
  }

  // Try as HTTP-date
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const ms = Math.max(0, date.getTime() - Date.now());
    return Math.min(ms, MAX_RETRY_AFTER_MS);
  }

  return undefined;
}

async function safeFetchOnce(
  inputUrl: string,
  options: SafeFetchOptions = {},
): Promise<FetchResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const resolveHostname = options.resolveHostname ?? defaultResolveHostname;

  let currentUrl = inputUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const parsed = new URL(currentUrl);

    if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
      throw new FetchError(
        `Blocked scheme: ${parsed.protocol} — only http: and https: are allowed`,
        "SCHEME",
      );
    }

    const ip = await resolveHostname(parsed.hostname);
    if (isPrivateIp(ip)) {
      throw new FetchError(`Blocked request to private IP: ${ip}`, "SSRF");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
        redirect: "manual",
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new FetchError(`Request timed out after ${timeout}ms`, "TIMEOUT");
      }
      throw new FetchError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        "NETWORK",
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new FetchError("Redirect without Location header", "NETWORK");
      }
      currentUrl = new URL(location, currentUrl).toString();
      if (redirectCount === maxRedirects) {
        throw new FetchError(`Too many redirects (>${maxRedirects})`, "REDIRECT_LIMIT");
      }
      continue;
    }

    if (response.status === 403) {
      throw new FetchError(
        "This site blocks automated access. Try pasting the article text directly.",
        "BLOCKED",
      );
    }

    if (response.status === 429) {
      const retryAfter = parseRetryAfterHeader(response.headers.get("retry-after"));
      throw new FetchError(
        "Rate limited. Wait a moment and try again.",
        "RATE_LIMITED",
        retryAfter,
      );
    }

    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    return {
      body,
      contentType,
      url: currentUrl,
      status: response.status,
    };
  }

  // Unreachable — the loop either returns or throws on redirect limit.
  // This satisfies TypeScript's control flow analysis.
  throw new FetchError(`Too many redirects (>${maxRedirects})`, "REDIRECT_LIMIT");
}

const NON_RETRYABLE_CODES = new Set<string>([
  "SSRF",
  "SCHEME",
  "BLOCKED",
  "REDIRECT_LIMIT",
  "TIMEOUT",
]);

export async function safeFetch(
  inputUrl: string,
  options: SafeFetchOptions = {},
): Promise<FetchResult> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await safeFetchOnce(inputUrl, options);

      // Retry on retryable 5xx status codes
      if (RETRYABLE_STATUSES.has(result.status) && attempt < maxRetries) {
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }

      return result;
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;

      // Don't retry non-retryable errors
      if (NON_RETRYABLE_CODES.has(error.code)) throw error;

      // Last attempt — rethrow
      if (attempt >= maxRetries) throw error;

      // Retry RATE_LIMITED and NETWORK errors
      const delay = error.retryAfter ?? BASE_DELAY_MS * 2 ** attempt;
      await sleep(delay);
    }
  }

  // Unreachable — satisfies TypeScript
  throw new FetchError("Retry attempts exhausted", "NETWORK");
}
