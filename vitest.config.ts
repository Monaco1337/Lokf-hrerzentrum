import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
