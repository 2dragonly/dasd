import { pathToFileURL } from "node:url";

import { type ServerBuild } from "react-router";

import { IS_PRODUCTION_BUILD } from "~/lib/env";

const viteDevServer = IS_PRODUCTION_BUILD
  ? undefined
  : await import("vite").then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
      }),
    );

export async function importDevBuild() {
  return viteDevServer!.ssrLoadModule("virtual:react-router/server-build" + "?t=" + Date.now()) as Promise<ServerBuild>;
}

export async function getServerBuild() {
  return await (IS_PRODUCTION_BUILD
    ? (import(/* @vite-ignore */ pathToFileURL("build/server/react-router.js").href) as unknown as Promise<ServerBuild>)
    : importDevBuild());
}
