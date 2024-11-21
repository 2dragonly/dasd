import { type Env } from "hono";
import { createMiddleware } from "hono/factory";

import { isIP } from "is-ip";

declare module "hono" {
  interface ContextVariableMap {
    clientIp?: string;
  }
}

export function clientIp<TEnv extends Env = Env>() {
  return createMiddleware<TEnv>(async (c, next) => {
    const ipAddress = headerNames
      .flatMap((headerName) => {
        const value = c.req.header(headerName);
        if (headerName === "Forwarded") return parseForwardedHeader(value);
        if (!value?.includes(",")) return value;
        return value.split(",").map((ip) => ip.trim());
      })
      .find((ip) => ip && isIP(ip));

    c.set("clientIp", ipAddress);

    await next();
  });
}

/** This is the list of headers, in order of preference, that will be used to determine the client's IP address. */
const headerNames = Object.freeze([
  "X-Client-IP",
  "X-Forwarded-For",
  "HTTP-X-Forwarded-For",
  "Fly-Client-IP",
  "CF-Connecting-IP",
  "Fastly-Client-Ip",
  "True-Client-Ip",
  "X-Real-IP",
  "X-Cluster-Client-IP",
  "X-Forwarded",
  "Forwarded-For",
  "Forwarded",
  "DO-Connecting-IP" /** Digital ocean app platform */,
  "oxygen-buyer-ip" /** Shopify oxygen platform */,
] as const);

function parseForwardedHeader(value?: string) {
  if (value) {
    for (const part of value.split(";")) {
      if (part.startsWith("for=")) return part.slice(4);
    }
  }
}
