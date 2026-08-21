import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    ignores: [
        ".next/**",
        "node_modules/**",
        "out/**",
        "build/**",
        "dist/**",
        ".atl/**",
        "*.config.js",
        "*.config.cjs",
        "*.config.mjs",
        "package-lock.json",
        ".env",
        ".env.*",
        "!.env.example",
        "coverage/**",
        "next-env.d.ts",
    ],
}, {
    extends: [...next],
}]);
