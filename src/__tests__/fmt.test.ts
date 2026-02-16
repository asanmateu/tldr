import { afterEach, describe, expect, it } from "vitest";
import {
  bold,
  brand,
  cyan,
  dim,
  error,
  green,
  initTheme,
  label,
  red,
  success,
  warn,
  yellow,
} from "../lib/fmt.js";
import type { ThemePalette } from "../lib/types.js";

describe("fmt", () => {
  describe("primitives (no theme)", () => {
    afterEach(() => {
      // Re-initialize to clear palette for subsequent groups
      initTheme(undefined as unknown as ThemePalette);
    });

    it("bold wraps with ANSI bold codes", () => {
      expect(bold("hello")).toBe("\x1b[1mhello\x1b[22m");
    });

    it("dim wraps with ANSI dim codes", () => {
      expect(dim("hello")).toBe("\x1b[2mhello\x1b[22m");
    });

    it("cyan wraps with ANSI cyan codes", () => {
      expect(cyan("hello")).toBe("\x1b[36mhello\x1b[39m");
    });

    it("green wraps with ANSI green codes", () => {
      expect(green("hello")).toBe("\x1b[32mhello\x1b[39m");
    });

    it("yellow wraps with ANSI yellow codes", () => {
      expect(yellow("hello")).toBe("\x1b[33mhello\x1b[39m");
    });

    it("red wraps with ANSI red codes", () => {
      expect(red("hello")).toBe("\x1b[31mhello\x1b[39m");
    });
  });

  describe("composites (no theme)", () => {
    afterEach(() => {
      initTheme(undefined as unknown as ThemePalette);
    });

    it("brand applies bold + cyan", () => {
      expect(brand("tldr")).toBe("\x1b[1m\x1b[36mtldr\x1b[39m\x1b[22m");
    });

    it("label applies bold", () => {
      expect(label("Key")).toBe(bold("Key"));
    });

    it("success applies green", () => {
      expect(success("ok")).toBe(green("ok"));
    });

    it("warn applies yellow", () => {
      expect(warn("caution")).toBe(yellow("caution"));
    });

    it("error applies red", () => {
      expect(error("fail")).toBe(red("fail"));
    });
  });

  it("handles empty strings", () => {
    expect(bold("")).toBe("\x1b[1m\x1b[22m");
    expect(cyan("")).toBe("\x1b[36m\x1b[39m");
  });

  it("composites nest correctly", () => {
    const result = brand("test");
    // bold(cyan("test")) = bold("\x1b[36mtest\x1b[39m") = "\x1b[1m\x1b[36mtest\x1b[39m\x1b[22m"
    expect(result).toContain("\x1b[1m");
    expect(result).toContain("\x1b[36m");
    expect(result).toContain("test");
  });

  describe("initTheme", () => {
    const testPalette: ThemePalette = {
      brand: "#ff6b6b",
      brandBorder: "#ff8882",
      brandAccent: "#ffd6c0",
      accent: "#00d4ff",
      success: "#69db7c",
      warning: "#ffd43b",
      error: "#e66767",
    };

    afterEach(() => {
      initTheme(undefined as unknown as ThemePalette);
    });

    it("cyan uses palette accent after initTheme", () => {
      initTheme(testPalette);
      const result = cyan("hello");

      // #00d4ff -> r=0, g=212, b=255
      expect(result).toBe("\x1b[38;2;0;212;255mhello\x1b[39m");
    });

    it("green uses palette success after initTheme", () => {
      initTheme(testPalette);
      const result = green("hello");

      // #69db7c -> r=105, g=219, b=124
      expect(result).toBe("\x1b[38;2;105;219;124mhello\x1b[39m");
    });

    it("yellow uses palette warning after initTheme", () => {
      initTheme(testPalette);
      const result = yellow("hello");

      // #ffd43b -> r=255, g=212, b=59
      expect(result).toBe("\x1b[38;2;255;212;59mhello\x1b[39m");
    });

    it("red uses palette error after initTheme", () => {
      initTheme(testPalette);
      const result = red("hello");

      // #e66767 -> r=230, g=103, b=103
      expect(result).toBe("\x1b[38;2;230;103;103mhello\x1b[39m");
    });

    it("brand uses palette accent after initTheme", () => {
      initTheme(testPalette);
      const result = brand("tldr");

      // bold(hex(accent, "tldr")) = bold("\x1b[38;2;0;212;255mtldr\x1b[39m")
      expect(result).toBe("\x1b[1m\x1b[38;2;0;212;255mtldr\x1b[39m\x1b[22m");
    });

    it("bold and dim are unaffected by theme", () => {
      initTheme(testPalette);

      expect(bold("hello")).toBe("\x1b[1mhello\x1b[22m");
      expect(dim("hello")).toBe("\x1b[2mhello\x1b[22m");
    });

    it("falls back to ANSI codes when palette is cleared", () => {
      initTheme(testPalette);
      expect(cyan("hello")).toContain("38;2;");

      initTheme(undefined as unknown as ThemePalette);
      expect(cyan("hello")).toBe("\x1b[36mhello\x1b[39m");
    });

    it("uses different colors for different palettes", () => {
      const oceanPalette: ThemePalette = {
        brand: "#74b9ff",
        brandBorder: "#81c8ff",
        brandAccent: "#a9d4ff",
        accent: "#00cec9",
        success: "#55efc4",
        warning: "#ffeaa7",
        error: "#fab1a0",
      };

      initTheme(testPalette);
      const coralCyan = cyan("x");

      initTheme(oceanPalette);
      const oceanCyan = cyan("x");

      expect(coralCyan).not.toBe(oceanCyan);
    });
  });
});
