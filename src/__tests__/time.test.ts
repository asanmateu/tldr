import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatTimeAgo } from "../lib/time.js";

describe("formatTimeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than 60 seconds ago', () => {
    const now = Date.now();
    expect(formatTimeAgo(now)).toBe("just now");
    expect(formatTimeAgo(now - 30_000)).toBe("just now");
    expect(formatTimeAgo(now - 59_000)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 60_000)).toBe("1m ago");
    expect(formatTimeAgo(now - 5 * 60_000)).toBe("5m ago");
    expect(formatTimeAgo(now - 59 * 60_000)).toBe("59m ago");
  });

  it("returns hours ago", () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 60 * 60_000)).toBe("1h ago");
    expect(formatTimeAgo(now - 12 * 60 * 60_000)).toBe("12h ago");
    expect(formatTimeAgo(now - 23 * 60 * 60_000)).toBe("23h ago");
  });

  it("returns days ago", () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 24 * 60 * 60_000)).toBe("1d ago");
    expect(formatTimeAgo(now - 7 * 24 * 60 * 60_000)).toBe("7d ago");
  });
});
