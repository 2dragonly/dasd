//@ts-check

import esbuild from "esbuild";

/** @param {import("@react-router/dev/config").Config} config */
function defineConfig(config) {
  return config;
}

export default defineConfig({
  appDirectory: "src/client",
  serverBuildFile: "react-router.js",
  serverModuleFormat: "esm",
  future: {
    unstable_optimizeDeps: true,
  },
  async buildEnd({ reactRouterConfig }) {
    await esbuild
      .build({
        alias: {
          "~": "./src",
        },
        outfile: `${reactRouterConfig.buildDirectory}/server/index.js`,
        entryPoints: ["src/server/index.ts"],
        external: [`${reactRouterConfig.buildDirectory}/server/*`],
        platform: "node",
        format: "esm",
        packages: "external",
        bundle: true,
        logLevel: "info",
        minify: true,
        mangleCache: {},
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  },
});
