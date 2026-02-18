import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchError, safeFetch } from "../extractors/fetch.js";

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
