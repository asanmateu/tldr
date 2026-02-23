import { describe, expect, it, vi } from "vitest";

const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
}));

const { writeClipboard } = await import("../lib/clipboard.js");

describe("clipboard", () => {
  describe("writeClipboard", () => {
    it("writes to clipboard on macOS", () => {
      vi.stubGlobal("process", { ...process, platform: "darwin" });
      mockExecSync.mockReturnValue("");

      const success = writeClipboard("copy this");

      expect(success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith("pbcopy", {
        input: "copy this",
        encoding: "utf-8",
      });

      vi.unstubAllGlobals();
    });

    it("returns false on failure", () => {
      vi.stubGlobal("process", { ...process, platform: "darwin" });
      mockExecSync.mockImplementation(() => {
        throw new Error("command failed");
      });

      expect(writeClipboard("text")).toBe(false);

      vi.unstubAllGlobals();
    });
  });
});
