import { resolve } from "node:path";
import { cwd, env } from "node:process";

import { reactRouter } from "@react-router/dev/vite";

import devServer, { defaultOptions } from "@hono/vite-dev-server";

import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import utwm from "unplugin-tailwindcss-mangle/vite";

import { config } from "dotenv";
import { expand } from "dotenv-expand";

expand(config({ path: resolve(cwd(), "../.env") }));

const port = parseInt(env?.PORT || "3000");

export default defineConfig({
  plugins: [
    devServer({
      injectClientScript: false,
      entry: "src/server/index.ts",
      exclude: [/^\/(src\/client)\/.+/, ...defaultOptions.exclude],
    }),
    reactRouter(),
    tsconfigPaths(),
    ...(env?.NODE_ENV !== "development" ? [utwm()] : []),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  build: {
    emptyOutDir: true,
    minify: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1024,
    copyPublicDir: false,
    rollupOptions: {
      output: { minifyInternalExports: true },
    },
  },
  esbuild: {
    format: "esm",
    logLevel: "info",
    minify: true,
    mangleCache: {},
  },
  server: {
    port,
    open: false,
  },
});
