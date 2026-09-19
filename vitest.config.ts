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
    // `.kilo/worktrees` holds Agent Manager worktree copies of this repo; their
    // test duplicates must not run as part of the main project suite.
    exclude: ["**/node_modules/**", ".kilo/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.config.ts", "lib/db/index.ts"],
    },
  },
});
