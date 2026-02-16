import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      include: ["src/extractors/**", "src/lib/**"],
      reporter: ["text", "text-summary", "cobertura"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 75,
        functions: 85,
        branches: 55,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
