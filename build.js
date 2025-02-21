import { build } from "esbuild";
import { statSync } from "node:fs";

const isWatch = process.argv.includes("--watch");
const isProd = process.env.NODE_ENV === "production" || !isWatch;

function formatSize(bytes) {
  const units = ["B", "KB", "MB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function runBuild() {
  try {
    console.log(`🔧 Building for ${isProd ? "production" : "development"}...`);

    const result = await build({
      entrypoints: ["./src/ffep.js"],
      outdir: "./dist",
      naming: {
        entry: "ffep.min.js",
      },
      minify: isProd,
      sourcemap: isProd ? "none" : "inline",
      target: "browser",
      format: "iife",
      globalName: "FFEP",
      define: {
        "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
      },
      watch: isWatch
        ? {
            onRebuild(error) {
              if (error) {
                console.error("🔴 Build failed:", error);
              } else {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`🟢 [${timestamp}] Build succeeded`);
              }
            },
            ignore: ["**/dist/**", "**/node_modules/**"],
          }
        : false,
    });

    // Report bundle size
    const stats = statSync("./dist/ffep.min.js");
    console.log(`📦 Bundle size: ${formatSize(stats.size)}`);

    console.log("✨ Build completed successfully!");

    if (isWatch) {
      console.log("👀 Watching for changes in src directory (ignoring dist)...");
    }
  } catch (error) {
    console.error("🔴 Build failed:", error);
    process.exit(1);
  }
}

runBuild();
