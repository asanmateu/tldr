import { URL } from "node:url";

export interface FetchResult {
  body: string;
  contentType: string;
  url: string;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly code: "SSRF" | "SCHEME" | "TIMEOUT" | "REDIRECT_LIMIT" | "NETWORK",
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
const USER_AGENT = "tldr/1.0";

interface SafeFetchOptions {
  timeout?: number;
  maxRedirects?: number;
  resolveHostname?: (hostname: string) => Promise<string>;
}

async function defaultResolveHostname(hostname: string): Promise<string> {
  const dns = await import("node:dns/promises");
  const { address } = await dns.lookup(hostname);
  return address;
}

export async function safeFetch(
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
        headers: { "User-Agent": USER_AGENT },
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

    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    return {
      body,
      contentType,
      url: currentUrl,
    };
  }

  // Unreachable — the loop either returns or throws on redirect limit.
  // This satisfies TypeScript's control flow analysis.
  throw new FetchError(`Too many redirects (>${maxRedirects})`, "REDIRECT_LIMIT");
}
