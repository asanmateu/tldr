import { execSync } from "node:child_process";
import type { ThemeConfig, ThemeName, ThemePalette } from "./types.js";

// 3 themes × 2 appearances = 6 palettes
export const PALETTES: Record<ThemeName, Record<"dark" | "light", ThemePalette>> = {
  coral: {
    dark: {
      brand: "#ff6b6b",
      brandBorder: "#ff8882",
      brandAccent: "#ffd6c0",
      accent: "#00d4ff",
      success: "#69db7c",
      warning: "#ffd43b",
      error: "#ff6b6b",
    },
    light: {
      brand: "#d63031",
      brandBorder: "#c0392b",
      brandAccent: "#e17055",
      accent: "#0984e3",
      success: "#00b894",
      warning: "#d68910",
      error: "#d63031",
    },
  },
  ocean: {
    dark: {
      brand: "#74b9ff",
      brandBorder: "#81c8ff",
      brandAccent: "#a9d4ff",
      accent: "#00cec9",
      success: "#55efc4",
      warning: "#ffeaa7",
      error: "#fab1a0",
    },
    light: {
      brand: "#0652dd",
      brandBorder: "#1e3799",
      brandAccent: "#4a69bd",
      accent: "#009688",
      success: "#00796b",
      warning: "#c77f00",
      error: "#c0392b",
    },
  },
  forest: {
    dark: {
      brand: "#a8e6cf",
      brandBorder: "#88d8a8",
      brandAccent: "#c3f0ca",
      accent: "#81ecec",
      success: "#b8e994",
      warning: "#f8c291",
      error: "#e66767",
    },
    light: {
      brand: "#27ae60",
      brandBorder: "#1e8449",
      brandAccent: "#52be80",
      accent: "#00838f",
      success: "#2e7d32",
      warning: "#c46210",
      error: "#c0392b",
    },
  },
};

const DEFAULT_THEME: ThemeConfig = { name: "coral", appearance: "auto" };

export function detectAppearance(): "dark" | "light" {
  if (process.platform !== "darwin") return "dark";
  try {
    const result = execSync("defaults read -g AppleInterfaceStyle", {
      encoding: "utf-8",
      timeout: 500,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return result === "Dark" ? "dark" : "light";
  } catch {
    // Command fails when light mode is active (no key set)
    return "light";
  }
}

export function resolveTheme(config?: ThemeConfig): ThemePalette {
  const { name, appearance } = config ?? DEFAULT_THEME;
  const resolved = appearance === "auto" ? detectAppearance() : appearance;
  return PALETTES[name]?.[resolved] ?? PALETTES.coral.dark;
}

export { DEFAULT_THEME };
