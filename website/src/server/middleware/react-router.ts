import { createRequestHandler } from "react-router";

import { type Context, type Env } from "hono";
import { createMiddleware } from "hono/factory";

import type { AppLoadContext, ServerBuild } from "react-router";

export interface MiddlewareOptions {
  build: ServerBuild;
  mode?: "development" | "production";
  getLoadContext?(c: Context): Promise<AppLoadContext> | AppLoadContext;
}

export function reactRouter<TEnv extends Env>({ build, mode, getLoadContext }: MiddlewareOptions) {
  const requestHandler = createRequestHandler(build, mode);
  return createMiddleware<TEnv>(async (c) => {
    const loadContext = getLoadContext?.(c);
    return await requestHandler(c.req.raw, loadContext instanceof Promise ? await loadContext : loadContext);
  });
}
