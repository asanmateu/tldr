import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BROWSER_HEADERS,
  FetchError,
  parseRetryAfterHeader,
  safeFetch,
} from "../extractors/fetch.js";

describe("safeFetch", () => {
  const mockResolve = vi.fn<(hostname: string) => Promise<string>>();

  beforeEach(() => {
    mockResolve.mockResolvedValue("93.184.216.34");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><body>OK</body></html>", {
          headers: { "content-type": "text/html" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a URL and returns body, content type, final URL", async () => {
    const result = await safeFetch("https://example.com", {
      resolveHostname: mockResolve,
    });

    expect(result.body).toBe("<html><body>OK</body></html>");
    expect(result.contentType).toBe("text/html");
    expect(result.url).toBe("https://example.com");
    expect(result.status).toBe(200);
  });

  it("sends browser-like headers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("OK", { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);

    await safeFetch("https://example.com", { resolveHostname: mockResolve });

    const call = fetchMock.mock.calls[0];
    const headers = call?.[1]?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("Chrome");
    expect(headers.Accept).toContain("text/html");
    expect(headers["Accept-Language"]).toBe("en-US,en;q=0.9");
    expect(headers["Accept-Encoding"]).toBe("gzip, deflate, br");
    expect(headers["Cache-Control"]).toBe("no-cache");
  });

  describe("SSRF protection", () => {
    it.each([
      ["127.0.0.1", "loopback"],
      ["10.0.0.1", "class A private"],
      ["172.16.0.1", "class B private"],
      ["192.168.1.1", "class C private"],
      ["0.0.0.0", "unspecified"],
      ["::1", "IPv6 loopback"],
    ])("blocks %s (%s)", async (ip) => {
      mockResolve.mockResolvedValue(ip);

      await expect(
        safeFetch("https://example.com", { resolveHostname: mockResolve }),
      ).rejects.toThrow(FetchError);

      await expect(
        safeFetch("https://example.com", { resolveHostname: mockResolve }),
      ).rejects.toMatchObject({ code: "SSRF" });
    });
  });

  describe("scheme validation", () => {
    it("rejects file:// scheme", async () => {
      await expect(
        safeFetch("file:///etc/passwd", { resolveHostname: mockResolve }),
      ).rejects.toMatchObject({ code: "SCHEME" });
    });

    it("rejects data: scheme", async () => {
      await expect(
        safeFetch("data:text/html,<h1>Hi</h1>", { resolveHostname: mockResolve }),
      ).rejects.toMatchObject({ code: "SCHEME" });
    });

    it("rejects javascript: scheme", async () => {
      await expect(
        safeFetch("javascript:alert(1)", { resolveHostname: mockResolve }),
      ).rejects.toThrow();
    });
  });

  describe("redirects", () => {
    it("follows redirects up to the limit", async () => {
      const fetchMock = vi.fn();
      fetchMock
        .mockResolvedValueOnce(
          new Response(null, { status: 302, headers: { location: "https://example.com/step2" } }),
        )
        .mockResolvedValueOnce(new Response("Final", { headers: { "content-type": "text/html" } }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await safeFetch("https://example.com/step1", {
        resolveHostname: mockResolve,
      });

      expect(result.body).toBe("Final");
      expect(result.url).toBe("https://example.com/step2");
    });

    it("throws on too many redirects", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 302, headers: { location: "https://example.com/loop" } }),
        );
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        safeFetch("https://example.com", {
          resolveHostname: mockResolve,
          maxRedirects: 2,
        }),
      ).rejects.toMatchObject({ code: "REDIRECT_LIMIT" });
    });
  });

  it("passes through non-2xx status without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Not Found", {
          status: 404,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    const result = await safeFetch("https://example.com/missing", {
      resolveHostname: mockResolve,
    });

    expect(result.status).toBe(404);
    expect(result.body).toBe("Not Found");
  });

  describe("403 blocked", () => {
    it("throws BLOCKED on 403", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));

      await expect(
        safeFetch("https://example.com/blocked", {
          resolveHostname: mockResolve,
          maxRetries: 0,
        }),
      ).rejects.toMatchObject({
        code: "BLOCKED",
        message: expect.stringContaining("blocks automated access"),
      });
    });

    it("does not retry BLOCKED errors", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 }));
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        safeFetch("https://example.com/blocked", {
          resolveHostname: mockResolve,
          maxRetries: 2,
          sleep: sleepFn,
        }),
      ).rejects.toMatchObject({ code: "BLOCKED" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(sleepFn).not.toHaveBeenCalled();
    });
  });

  describe("429 rate limited", () => {
    it("throws RATE_LIMITED on 429", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("Too Many Requests", { status: 429 })),
      );

      await expect(
        safeFetch("https://example.com/limited", {
          resolveHostname: mockResolve,
          maxRetries: 0,
        }),
      ).rejects.toMatchObject({
        code: "RATE_LIMITED",
        message: expect.stringContaining("Rate limited"),
      });
    });

    it("includes retryAfter from Retry-After header", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": "5" },
          }),
        ),
      );

      const error = await safeFetch("https://example.com/limited", {
        resolveHostname: mockResolve,
        maxRetries: 0,
      }).catch((e) => e);

      expect(error).toBeInstanceOf(FetchError);
      expect(error.code).toBe("RATE_LIMITED");
      expect(error.retryAfter).toBe(5000);
    });

    it("retries RATE_LIMITED and respects retryAfter", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": "2" },
          }),
        )
        .mockResolvedValueOnce(new Response("OK", { headers: { "content-type": "text/html" } }));
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await safeFetch("https://example.com/limited", {
        resolveHostname: mockResolve,
        maxRetries: 2,
        sleep: sleepFn,
      });

      expect(result.body).toBe("OK");
      expect(sleepFn).toHaveBeenCalledWith(2000);
    });
  });

  describe("retry with backoff", () => {
    it("retries on 500 and succeeds", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response("Error", { status: 500, headers: { "content-type": "text/plain" } }),
        )
        .mockResolvedValueOnce(new Response("OK", { headers: { "content-type": "text/html" } }));
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await safeFetch("https://example.com", {
        resolveHostname: mockResolve,
        maxRetries: 2,
        sleep: sleepFn,
      });

      expect(result.body).toBe("OK");
      expect(sleepFn).toHaveBeenCalledTimes(1);
      expect(sleepFn).toHaveBeenCalledWith(1000); // BASE_DELAY_MS * 2^0
    });

    it("retries on network error and succeeds", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValueOnce(new Response("OK", { headers: { "content-type": "text/html" } }));
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await safeFetch("https://example.com", {
        resolveHostname: mockResolve,
        maxRetries: 2,
        sleep: sleepFn,
      });

      expect(result.body).toBe("OK");
      expect(sleepFn).toHaveBeenCalledTimes(1);
    });

    it("returns 5xx result after exhausting retries", async () => {
      const fetchMock = vi.fn().mockImplementation(
        () =>
          new Response("Server Error", {
            status: 502,
            headers: { "content-type": "text/plain" },
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await safeFetch("https://example.com", {
        resolveHostname: mockResolve,
        maxRetries: 2,
        sleep: sleepFn,
      });

      expect(result.status).toBe(502);
      expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it("maxRetries: 0 disables retries", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response("Error", { status: 500, headers: { "content-type": "text/plain" } }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await safeFetch("https://example.com", {
        resolveHostname: mockResolve,
        maxRetries: 0,
        sleep: sleepFn,
      });

      expect(result.status).toBe(500);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(sleepFn).not.toHaveBeenCalled();
    });

    it("uses exponential backoff delays", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response("Error", { status: 503, headers: { "content-type": "text/plain" } }),
        )
        .mockResolvedValueOnce(
          new Response("Error", { status: 503, headers: { "content-type": "text/plain" } }),
        )
        .mockResolvedValueOnce(new Response("OK", { headers: { "content-type": "text/html" } }));
      vi.stubGlobal("fetch", fetchMock);
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await safeFetch("https://example.com", {
        resolveHostname: mockResolve,
        maxRetries: 2,
        sleep: sleepFn,
      });

      expect(result.body).toBe("OK");
      expect(sleepFn).toHaveBeenCalledTimes(2);
      expect(sleepFn).toHaveBeenNthCalledWith(1, 1000); // 1000 * 2^0
      expect(sleepFn).toHaveBeenNthCalledWith(2, 2000); // 1000 * 2^1
    });
  });

  describe("timeout", () => {
    it("aborts requests that exceed timeout", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal?.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            }),
        ),
      );

      await expect(
        safeFetch("https://example.com", {
          resolveHostname: mockResolve,
          timeout: 50,
        }),
      ).rejects.toMatchObject({ code: "TIMEOUT" });
    });
  });
});

describe("parseRetryAfterHeader", () => {
  it("parses numeric seconds", () => {
    expect(parseRetryAfterHeader("5")).toBe(5000);
  });

  it("parses zero", () => {
    expect(parseRetryAfterHeader("0")).toBe(0);
  });

  it("caps at 30 seconds", () => {
    expect(parseRetryAfterHeader("120")).toBe(30000);
  });

  it("returns undefined for null", () => {
    expect(parseRetryAfterHeader(null)).toBeUndefined();
  });

  it("returns undefined for unparseable string", () => {
    expect(parseRetryAfterHeader("not-a-date-or-number")).toBeUndefined();
  });

  it("parses HTTP-date format", () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const result = parseRetryAfterHeader(future);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(30000);
  });
});

describe("BROWSER_HEADERS", () => {
  it("contains a Chrome-like User-Agent", () => {
    expect(BROWSER_HEADERS["User-Agent"]).toContain("Chrome");
    expect(BROWSER_HEADERS["User-Agent"]).toContain("Mozilla");
  });

  it("includes Accept header", () => {
    expect(BROWSER_HEADERS.Accept).toContain("text/html");
  });
});
