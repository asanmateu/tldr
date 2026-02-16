import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => tempDir,
  };
});

const {
  compareSemver,
  isHomebrew,
  getUpdateCommand,
  fetchLatestVersion,
  readCache,
  writeCache,
  checkForUpdate,
} = await import("../lib/updateCheck.js");

describe("compareSemver", () => {
  it("returns 0 for equal versions", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns negative when a < b", () => {
    expect(compareSemver("0.8.0", "0.9.0")).toBeLessThan(0);
  });

  it("returns positive when a > b", () => {
    expect(compareSemver("1.0.0", "0.9.0")).toBeGreaterThan(0);
  });

  it("strips v prefix", () => {
    expect(compareSemver("v1.2.3", "1.2.3")).toBe(0);
    expect(compareSemver("1.2.3", "v1.2.3")).toBe(0);
  });

  it("compares major versions", () => {
    expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
  });

  it("compares minor versions", () => {
    expect(compareSemver("1.1.0", "1.0.9")).toBeGreaterThan(0);
  });

  it("compares patch versions", () => {
    expect(compareSemver("1.0.2", "1.0.1")).toBeGreaterThan(0);
  });
});

describe("isHomebrew", () => {
  const originalExecPath = process.execPath;

  afterEach(() => {
    Object.defineProperty(process, "execPath", { value: originalExecPath, writable: true });
  });

  it("returns true for Cellar path", () => {
    Object.defineProperty(process, "execPath", {
      value: "/opt/homebrew/Cellar/tldr-cli/0.8.0/bin/tldr",
      writable: true,
    });
    expect(isHomebrew()).toBe(true);
  });

  it("returns true for homebrew path", () => {
    Object.defineProperty(process, "execPath", {
      value: "/opt/homebrew/bin/tldr",
      writable: true,
    });
    expect(isHomebrew()).toBe(true);
  });

  it("returns false for standard path", () => {
    Object.defineProperty(process, "execPath", {
      value: "/usr/local/bin/tldr",
      writable: true,
    });
    expect(isHomebrew()).toBe(false);
  });
});

describe("getUpdateCommand", () => {
  const originalExecPath = process.execPath;

  afterEach(() => {
    Object.defineProperty(process, "execPath", { value: originalExecPath, writable: true });
  });

  it("returns brew command for Homebrew installs", () => {
    Object.defineProperty(process, "execPath", {
      value: "/opt/homebrew/Cellar/tldr-cli/0.8.0/bin/tldr",
      writable: true,
    });
    expect(getUpdateCommand()).toBe("brew upgrade tldr-cli");
  });

  it("returns GitHub URL for non-Homebrew installs", () => {
    Object.defineProperty(process, "execPath", {
      value: "/usr/local/bin/tldr",
      writable: true,
    });
    expect(getUpdateCommand()).toContain("github.com");
  });
});

describe("fetchLatestVersion", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns version on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v0.9.0" }),
    });
    expect(await fetchLatestVersion()).toBe("0.9.0");
  });

  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    expect(await fetchLatestVersion()).toBeNull();
  });

  it("returns null on non-200 status", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    expect(await fetchLatestVersion()).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ no_tag: true }),
    });
    expect(await fetchLatestVersion()).toBeNull();
  });

  it("returns null on timeout", async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    expect(await fetchLatestVersion()).toBeNull();
  });
});

describe("cache", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tldr-update-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns null when no cache exists", async () => {
    expect(await readCache()).toBeNull();
  });

  it("writes and reads cache", async () => {
    const cache = { latestVersion: "0.9.0", checkedAt: Date.now() };
    await writeCache(cache);
    const result = await readCache();
    expect(result).toEqual(cache);
  });

  it("returns null for corrupt cache", async () => {
    await mkdir(join(tempDir, ".tldr"), { recursive: true });
    await writeFile(join(tempDir, ".tldr", "update-check.json"), "not json", "utf-8");
    expect(await readCache()).toBeNull();
  });

  it("returns null for cache missing required fields", async () => {
    await mkdir(join(tempDir, ".tldr"), { recursive: true });
    await writeFile(
      join(tempDir, ".tldr", "update-check.json"),
      JSON.stringify({ foo: "bar" }),
      "utf-8",
    );
    expect(await readCache()).toBeNull();
  });
});

describe("checkForUpdate", () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tldr-update-"));
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns result when newer version available", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v0.9.0" }),
    });
    const result = await checkForUpdate("0.8.0");
    expect(result).not.toBeNull();
    expect(result?.updateAvailable).toBe(true);
    expect(result?.latestVersion).toBe("0.9.0");
    expect(result?.currentVersion).toBe("0.8.0");
  });

  it("returns null when same version", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v0.8.0" }),
    });
    expect(await checkForUpdate("0.8.0")).toBeNull();
  });

  it("returns null when remote is older", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v0.7.0" }),
    });
    expect(await checkForUpdate("0.8.0")).toBeNull();
  });

  it("returns null on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    expect(await checkForUpdate("0.8.0")).toBeNull();
  });

  it("uses fresh cache instead of fetching", async () => {
    const cache = { latestVersion: "0.9.0", checkedAt: Date.now() };
    await writeCache(cache);

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const result = await checkForUpdate("0.8.0");
    expect(result?.latestVersion).toBe("0.9.0");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("re-fetches when cache is stale", async () => {
    const staleTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    await writeCache({ latestVersion: "0.8.5", checkedAt: staleTime });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v0.9.0" }),
    });

    const result = await checkForUpdate("0.8.0");
    expect(result?.latestVersion).toBe("0.9.0");
    expect(global.fetch).toHaveBeenCalled();
  });
});
