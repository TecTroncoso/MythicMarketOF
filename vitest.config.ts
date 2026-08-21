import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.ts", "**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.config.ts", "lib/db/index.ts"],
    },
  },
});
