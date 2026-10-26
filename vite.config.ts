import vinext from "vinext";
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";

export default defineConfig(async () => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: { __LQADWA_BUILD__: JSON.stringify({ commit: execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(), tree:execFileSync("git",["rev-parse","HEAD^{tree}"],{encoding:"utf8"}).trim(), dirty:execFileSync("git",["status","--porcelain"],{encoding:"utf8"}).trim().length>0 }) },
    server: { host: "127.0.0.1" },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        remoteBindings: false,
        persistState: { path: ".wrangler/state" },
      }),
    ],
  };
});
