import { describe, expect, it, vi } from "vitest";

const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
}));

const { readClipboard, writeClipboard } = await import("../lib/clipboard.js");

describe("clipboard", () => {
  describe("readClipboard", () => {
    it("reads from clipboard on macOS", () => {
      vi.stubGlobal("process", { ...process, platform: "darwin" });
      mockExecSync.mockReturnValue("clipboard content\n");

      const result = readClipboard();

      expect(result).toBe("clipboard content");
      expect(mockExecSync).toHaveBeenCalledWith("pbpaste", { encoding: "utf-8" });

      vi.unstubAllGlobals();
    });

    it("reads from clipboard on Linux", () => {
      vi.stubGlobal("process", { ...process, platform: "linux" });
      mockExecSync.mockReturnValue("linux content\n");

      const result = readClipboard();

      expect(result).toBe("linux content");
      expect(mockExecSync).toHaveBeenCalledWith("xclip -selection clipboard -o", {
        encoding: "utf-8",
      });

      vi.unstubAllGlobals();
    });

    it("returns empty string on failure", () => {
      vi.stubGlobal("process", { ...process, platform: "darwin" });
      mockExecSync.mockImplementation(() => {
        throw new Error("command not found");
      });

      expect(readClipboard()).toBe("");

      vi.unstubAllGlobals();
    });
  });

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
