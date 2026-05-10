import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      src: resolve(currentDir, "src"),
      "@test": resolve(currentDir, "tests"),
      "@better-standard-internal": resolve(currentDir, "../../../../../utils/better-standard-lib/src"),
      "../../../../../blazy-edge/main-app/src": resolve(currentDir, "src"),
      bun: resolve(currentDir, "tests/mocks/bun.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
