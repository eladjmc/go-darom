import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/poc/**/*.test.ts"],
    reporters: ["verbose"],
    testTimeout: 30000,
  },
});
