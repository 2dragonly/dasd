//@ts-check

import type { Config } from "@react-router/dev/config";

import { vercelPreset } from "./vercel-preset";

function defineConfig(config: Config) {
  return config;
}

export default defineConfig({
  appDirectory: "src/client",
  serverBuildFile: "react-router.js",
  serverModuleFormat: "esm",
  future: {
    unstable_optimizeDeps: true,
  },
  async buildEnd({ buildManifest, reactRouterConfig, viteConfig }) {
    await vercelPreset({ options: { entryFile: "../server/index.ts", regions: "sin1" }, buildManifest, reactRouterConfig, viteConfig });
  },
});
