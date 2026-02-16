import { createContext, useContext } from "react";
import type { ThemePalette } from "./types.js";

const ThemeContext = createContext<ThemePalette | null>(null);

export function ThemeProvider({
  palette,
  children,
}: { palette: ThemePalette; children: React.ReactNode }) {
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemePalette {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
