import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      include: ["src/extractors/**", "src/lib/**"],
      exclude: [
        "src/lib/providers/**",
        "src/lib/ThemeContext.tsx",
        "src/extractors/notion.ts",
        "src/extractors/slack.ts",
        "src/extractors/youtube.ts",
      ],
      reporter: ["text", "text-summary", "cobertura"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 70,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
