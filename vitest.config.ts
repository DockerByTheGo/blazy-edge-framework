import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "src", replacement: resolve(currentDir, "src") },
      { find: "@test", replacement: resolve(currentDir, "tests") },
      { find: "@better-standard-internal", replacement: resolve(currentDir, "../../../../../utils/better-standard-lib/src") },
      { find: "../../../../../blazy-edge/main-app/src", replacement: resolve(currentDir, "src") },
      { find: "bun", replacement: resolve(currentDir, "tests/mocks/bun.ts") },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/vitest.ts"],
  },
});
