import { afterEach, describe, expect, it, vi } from "vitest";

// Mock execSync before importing theme module
const mockExecSync = vi.fn();
vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

const { detectAppearance, resolveTheme, DEFAULT_THEME } = await import("../lib/theme.js");

const PALETTE_KEYS = [
  "brand",
  "brandBorder",
  "brandAccent",
  "accent",
  "success",
  "warning",
  "error",
];

describe("theme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("DEFAULT_THEME", () => {
    it("defaults to coral with auto appearance", () => {
      expect(DEFAULT_THEME).toEqual({ name: "coral", appearance: "auto" });
    });
  });

  describe("detectAppearance", () => {
    it("returns dark on non-darwin platforms", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });

      expect(detectAppearance()).toBe("dark");

      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });

    it("returns dark when macOS reports Dark mode", () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      mockExecSync.mockReturnValue("Dark\n");

      expect(detectAppearance()).toBe("dark");

      Object.defineProperty(process, "platform", { value: process.platform, configurable: true });
    });

    it("returns light when macOS command fails (light mode)", () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      mockExecSync.mockImplementation(() => {
        throw new Error("defaults: key not found");
      });

      expect(detectAppearance()).toBe("light");

      Object.defineProperty(process, "platform", { value: process.platform, configurable: true });
    });
  });

  describe("resolveTheme", () => {
    it("returns a palette with all required keys", () => {
      const palette = resolveTheme({ name: "coral", appearance: "dark" });

      for (const key of PALETTE_KEYS) {
        expect(palette).toHaveProperty(key);
        expect(typeof palette[key as keyof typeof palette]).toBe("string");
      }
    });

    it("returns coral dark palette for explicit config", () => {
      const palette = resolveTheme({ name: "coral", appearance: "dark" });

      expect(palette.brand).toBe("#ff6b6b");
      expect(palette.brandBorder).toBe("#ff8882");
      expect(palette.brandAccent).toBe("#ffd6c0");
    });

    it("returns coral light palette", () => {
      const palette = resolveTheme({ name: "coral", appearance: "light" });

      expect(palette.brand).toBe("#d63031");
      expect(palette.accent).toBe("#0984e3");
    });

    it("returns ocean dark palette", () => {
      const palette = resolveTheme({ name: "ocean", appearance: "dark" });

      expect(palette.brand).toBe("#74b9ff");
      expect(palette.accent).toBe("#00cec9");
    });

    it("returns ocean light palette", () => {
      const palette = resolveTheme({ name: "ocean", appearance: "light" });

      expect(palette.brand).toBe("#0652dd");
    });

    it("returns forest dark palette", () => {
      const palette = resolveTheme({ name: "forest", appearance: "dark" });

      expect(palette.brand).toBe("#a8e6cf");
      expect(palette.accent).toBe("#81ecec");
    });

    it("returns forest light palette", () => {
      const palette = resolveTheme({ name: "forest", appearance: "light" });

      expect(palette.brand).toBe("#27ae60");
    });

    it("uses detectAppearance for auto mode", () => {
      // Force non-darwin to get deterministic "dark" from detectAppearance
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });

      const palette = resolveTheme({ name: "ocean", appearance: "auto" });

      // auto on linux -> dark -> ocean dark
      expect(palette.brand).toBe("#74b9ff");

      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });

    it("falls back to coral dark when config is undefined", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });

      const palette = resolveTheme(undefined);

      // Default: coral, auto -> dark on linux
      expect(palette.brand).toBe("#ff6b6b");

      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });

    it("all palettes have valid hex color values", () => {
      const themes = ["coral", "ocean", "forest"] as const;
      const appearances = ["dark", "light"] as const;
      const hexPattern = /^#[0-9a-f]{6}$/i;

      for (const name of themes) {
        for (const appearance of appearances) {
          const palette = resolveTheme({ name, appearance });
          for (const key of PALETTE_KEYS) {
            const value = palette[key as keyof typeof palette];
            expect(value, `${name}/${appearance}/${key}`).toMatch(hexPattern);
          }
        }
      }
    });

    it("dark and light palettes differ for each theme", () => {
      const themes = ["coral", "ocean", "forest"] as const;

      for (const name of themes) {
        const dark = resolveTheme({ name, appearance: "dark" });
        const light = resolveTheme({ name, appearance: "light" });

        // At least the brand color should differ between dark and light
        expect(dark.brand, `${name} dark vs light brand`).not.toBe(light.brand);
      }
    });
  });
});
