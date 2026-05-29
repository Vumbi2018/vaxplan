import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["server/__tests__/**/*.test.ts", "shared/__tests__/**/*.test.ts"],
    setupFiles: ["server/__tests__/setup.ts"],
    testTimeout: 180_000,
    hookTimeout: 300_000,
    pool: "forks",
    forks: { singleFork: true },
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
});
