import { describe, expect, it } from "vitest";
import {
  bold,
  brand,
  cyan,
  dim,
  error,
  green,
  label,
  red,
  success,
  warn,
  yellow,
} from "../lib/fmt.js";

describe("fmt", () => {
  describe("primitives", () => {
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

  describe("composites", () => {
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
});
