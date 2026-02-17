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
        lines: 60,
        functions: 65,
        branches: 55,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
