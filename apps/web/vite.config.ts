import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { shouldBypassApiProxyForSpa } from "./src/dev/spa-proxy-bypass";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "../..");

/** Proxy API only; browser navigations to the same path get the SPA. */
function apiProxy(): ProxyOptions {
  return {
    target: "http://localhost:4000",
    bypass(req) {
      if (shouldBypassApiProxyForSpa(req.headers)) {
        return "/index.html";
      }
    },
  };
}

export default defineConfig({
  // Load VITE_* from monorepo root `.env` (same file the API uses)
  envDir: repoRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@go-darom/go-engine": path.resolve(rootDir, "../../packages/go-engine/src/index.ts"),
      "@go-darom/shared": path.resolve(rootDir, "../../packages/shared/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["goban-engine", "goban"],
  },
  server: {
    port: 5173,
    proxy: {
      "/health": apiProxy(),
      "/me": apiProxy(),
      "/members": apiProxy(),
      "/admin": apiProxy(),
      "/chat": apiProxy(),
      "/dms": apiProxy(),
      "/reports": apiProxy(),
      "/notifications": apiProxy(),
      "/invites": apiProxy(),
      "/games": apiProxy(),
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
    },
  },
});
