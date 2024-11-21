import { cp, mkdir, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { exit } from "node:process";

import type { BuildManifest, Config as ReactRouterConfig } from "@react-router/dev/config";
import type { ResolvedConfig } from "vite";
import { nodeFileTrace } from "@vercel/nft";
import esbuild from "esbuild";

export type VercelPresetOptions = {
  regions: string | string[];
  copyParentModules?: string[];
  entryFile?: string;
};

export const vercelPreset = async ({
  options,
  buildManifest,
  reactRouterConfig,
  viteConfig,
}: {
  options: VercelPresetOptions;
  buildManifest?: BuildManifest;
  reactRouterConfig: ReactRouterConfig;
  viteConfig: ResolvedConfig;
}) => {
  const root = viteConfig.root;
  const appDirectory = reactRouterConfig.appDirectory || "";
  const serverBuildFile = reactRouterConfig.serverBuildFile || "";
  const buildDirectory = reactRouterConfig.buildDirectory || "";

  console.log("Asddddddd");
  const clientPath = join(buildDirectory, "client");
  console.log("Asddddddd");
  const serverPath = join(buildDirectory, "server");
  const ssrExternal = viteConfig.ssr.external;
  const serverBundles = buildManifest?.serverBundles ?? {
    site: { id: "site", file: relative(root, join(serverPath, serverBuildFile)) },
  };

  console.log("Building for Vercel Serverless...");

  const vercelOutput = await prepareVercelOutput(root);

  await copyStaticFiles(clientPath, vercelOutput);
  await writeVercelConfigJson(viteConfig.build.assetsDir, buildManifest, join(vercelOutput, "config.json"));

  for (const { id, file } of Object.values(serverBundles)) {
    const bundlePath = join(root, file);
    const buildPath = dirname(bundlePath);
    const bundleFile = await buildEntry(appDirectory, options.entryFile ?? "server.ts", buildPath, bundlePath, id, join(root, "package.json"), ssrExternal);

    await prepareFunctionFiles(root, vercelOutput, buildPath, serverBuildFile, bundleFile, id, options);
  }
};

const prepareVercelOutput = async (root: string) => {
  const vercelRoot = join(root, ".vercel");
  const vercelOutput = join(vercelRoot, "output");

  await rm(vercelRoot, { recursive: true, force: true });
  await mkdir(vercelOutput, { recursive: true });

  return vercelOutput;
};

const prepareFunctionFiles = async (
  root: string,
  vercelOutput: string,
  buildPath: string,
  serverBuildFile: string,
  bundleFile: string,
  functionName: string,
  { regions, copyParentModules = [] }: VercelPresetOptions,
) => {
  const funcDir = join(vercelOutput, "functions", `${functionName}.func`);
  await mkdir(funcDir, { recursive: true });

  const traced = await nodeFileTrace([bundleFile], { base: root });
  const copyFile = async (src: string, dest: string) => {
    const real = await realpath(src);
    if (copyParentModules.some((mod) => real.endsWith(mod))) {
      const parentDir = dirname(real);
      for (const file of await readdir(parentDir)) {
        if (!file.startsWith(".")) await cp(join(parentDir, file), join(dest, file), { recursive: true });
      }
    } else {
      await cp(real, dest, { recursive: true });
    }
  };

  for (const file of Array.from(traced.fileList).filter((f) => join(root, f) !== bundleFile)) {
    await copyFile(join(root, file), join(funcDir, relative(root, file)));
  }

  await writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify(
      {
        handler: "index.mjs",
        runtime: "nodejs20.x",
        launcherType: "Nodejs",
        supportsResponseStreaming: true,
        regions: Array.isArray(regions) ? regions : [regions],
      },
      null,
      2,
    ),
  );

  await cp(bundleFile, join(funcDir, "index.mjs"));
  for (const file of (await readdir(buildPath)).filter((f) => ![basename(bundleFile), serverBuildFile].includes(f))) {
    await cp(join(buildPath, file), join(funcDir, file), { recursive: true });
  }
};

const copyStaticFiles = async (src: string, dest: string) => {
  console.log("Copying static assets...");
  const staticDir = join(dest, "static");
  await mkdir(staticDir, { recursive: true });
  await cp(src, staticDir, { recursive: true, force: true });
  await rm(join(staticDir, ".vite"), { recursive: true, force: true });
};

const getServerRoutes = (manifest: BuildManifest | undefined) => {
  if (!manifest?.routeIdToServerBundleId) return [{ path: "", bundleId: "site" }];

  const routes = Object.entries(manifest.routes)
    .filter(([id]) => id !== "root")
    .map(([id, { path, parentId }]) => ({
      id,
      path: `/${[...(parentId ? getRoutePaths(manifest.routes, parentId) : []), path].join("/")}`,
    }));

  const bundleToPaths: Record<string, string[]> = {};
  for (const [routeId, bundleId] of Object.entries(manifest.routeIdToServerBundleId)) {
    bundleToPaths[bundleId] = bundleToPaths[bundleId] ?? [];
    bundleToPaths[bundleId].push(routes.find((r) => r.id === routeId)?.path ?? "");
  }

  const uniquePaths: Record<string, { path: string; bundleId: string }> = {};
  for (const [bundleId, paths] of Object.entries(bundleToPaths)) {
    for (const path of paths.sort((a, b) => a.length - b.length)) {
      if (!Object.values(uniquePaths).some(({ path: p, bundleId: b }) => b === bundleId && path.startsWith(p))) {
        uniquePaths[path] = { path, bundleId };
      }
    }
  }

  return Object.values(uniquePaths).map(({ path, bundleId }) => ({ path: path.replace(/\/$/, ""), bundleId }));
};

const getRoutePaths = (routes: BuildManifest["routes"], parentId: string): string[] => {
  if (!parentId) return [];
  const parentRoute = routes[parentId];
  return [...getRoutePaths(routes, parentRoute?.parentId || ""), parentRoute?.path || ""];
};

const writeVercelConfigJson = async (assetsDir: string, manifest: BuildManifest | undefined, output: string) => {
  console.log("Writing Vercel config...");
  const config = {
    version: 3,
    routes: [
      { src: `^/${assetsDir}/(.*)$`, continue: true },
      { handle: "filesystem" },
      ...getServerRoutes(manifest).map(({ path, bundleId }) => ({
        src: path ? `^${path}.*` : "/(.*)",
        dest: `_${bundleId}`,
      })),
    ],
  };
  await writeFile(output, JSON.stringify(config, null, 2), "utf8");
};

export type SsrExternal = ResolvedConfig["ssr"]["external"];

const getPackageDependencies = (dependencies: Record<string, string>, ssrExternal: SsrExternal) =>
  Array.isArray(ssrExternal)
    ? Object.fromEntries(Object.entries(dependencies).filter(([key]) => !key.startsWith("@react-router") && ssrExternal.includes(key)))
    : {};

const writePackageJson = async (pkg: Record<string, any>, outputFile: string, dependencies: Record<string, string>) => {
  const distPkg = {
    name: pkg.name,
    type: pkg.type,
    scripts: { postinstall: pkg.scripts?.postinstall ?? "" },
    dependencies,
  };
  await writeFile(outputFile, JSON.stringify(distPkg, null, 2), "utf8");
};

export const buildEntry = async (
  appPath: string,
  entryFile: string,
  buildPath: string,
  buildFile: string,
  serverBundleId: string,
  packageFile: string,
  ssrExternal: SsrExternal,
): Promise<string> => {
  console.log(`Building server bundle for ${serverBundleId}...`);

  const pkg = JSON.parse(await readFile(packageFile, "utf8"));
  const dependencies = getPackageDependencies(pkg.dependencies ?? {}, ssrExternal);

  await writePackageJson(pkg, join(buildPath, "package.json"), dependencies);

  const bundleFile = join(buildPath, "index.js");

  try {
    await esbuild.build({
      outfile: bundleFile,
      entryPoints: [join(appPath, entryFile)],
      alias: { "virtual:react-router/server-build": buildFile },
      define: { "process.env.NODE_ENV": "'production'" },
      banner: { js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);" },
      platform: "node",
      target: "node20",
      format: "esm",
      external: ["vite", ...Object.keys(dependencies)],
      bundle: true,
      charset: "utf8",
      legalComments: "none",
      minify: true,
    });
  } catch (error) {
    console.error("Build failed:", error);
    exit(1);
  }

  return bundleFile;
};
