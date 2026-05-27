import { build as viteBuild } from "vite";
import { build as esbuildBuild } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

async function main() {
  console.log("[build] Building client with Vite…");
  await viteBuild({ configFile: path.join(projectRoot, "vite.config.ts") });

  console.log("[build] Bundling server with esbuild → dist/index.cjs");
  await esbuildBuild({
    entryPoints: [path.join(projectRoot, "server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: path.join(projectRoot, "dist/index.cjs"),
    sourcemap: true,
    packages: "external",
    external: ["./vite", "../vite.config"],
    logLevel: "info",
  });

  console.log("[build] Done.");
}

main().catch((err) => {
  console.error("[build] Failed:", err);
  process.exit(1);
});
