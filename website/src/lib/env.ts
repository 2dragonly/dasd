import { resolve } from "node:path";
import { cwd, env } from "node:process";

import { config } from "dotenv";
import { expand } from "dotenv-expand";

expand(config({ path: resolve(cwd(), "../.env") }));

declare global {
  interface ProcessEnv {
    NODE_ENV?: "production" | "development";
    readonly VERCEL_ENV?: "production" | "preview" | "development";
  }
}

const getEnv = <T extends string>(key: T) => env?.[key] as (typeof env)[T];

export const APP_PORT = getEnv("PORT") || "3000";
export const APP_URL = getEnv("APP_URL") || `localhost:${APP_PORT}`;
export const GITPOD_WORKSPACE_URL = getEnv("GITPOD_WORKSPACE_URL")?.replace("https://", `${APP_PORT}-`);
export const GITHUB_CODESPACE_URL = getEnv("CODESPACE_NAME") ? `${getEnv("CODESPACE_NAME")}-${APP_PORT}.app.github.dev` : undefined;
export const SITE_URL = GITPOD_WORKSPACE_URL || GITHUB_CODESPACE_URL || APP_URL;
export const NODE_ENV = getEnv("VERCEL_ENV") || getEnv("NODE_ENV") || "development";

export const IS_PRODUCTION_BUILD = NODE_ENV === "production";
export const IS_GITPOD_WORKSPACE = !!GITPOD_WORKSPACE_URL;
export const IS_GITHUB_CODESPACE = !!GITHUB_CODESPACE_URL;
export const IS_LOCALHOST = APP_URL.startsWith("localhost");
export const IS_HOSTED = IS_GITPOD_WORKSPACE || IS_GITHUB_CODESPACE || !IS_LOCALHOST;
