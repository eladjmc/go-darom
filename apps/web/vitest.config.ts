import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@go-darom/go-engine": path.resolve(rootDir, "../../packages/go-engine/src/index.ts"),
      "@go-darom/shared": path.resolve(rootDir, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    reporters: ["verbose"],
  },
});
