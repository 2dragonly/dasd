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

export default defineConfig(({ isSsrBuild, command }) => ({
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
  ssr: {
    noExternal: command === "build" ? true : undefined,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  build: {
    target: "ES2022",
    emptyOutDir: true,
    minify: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1024,
    copyPublicDir: false,
    rollupOptions: {
      external: [/node:.*/, "stream", "crypto", "fsevents"],
      output: {
        minifyInternalExports: true,
        manualChunks(id) {
          if (id.includes("node_modules")) {
            const parts = id.split("node_modules/")[1].split("/");
            return parts[0] === ".pnpm" ? parts[1].split("@")[0] : parts[0];
          }
        },
      },
      ...(isSsrBuild && {
        input: "src/server/index.ts",
      }),
    },
  },
  esbuild: {
    format: "esm",
    logLevel: "info",
    minify: true,
    mangleCache: {},
  },
  optimizeDeps: {
    esbuildOptions: {
      minify: true,
      treeShaking: true,
    },
  },
  server: {
    port,
    open: false,
  },
}));