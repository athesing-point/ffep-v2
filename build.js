import { statSync, watch } from "node:fs";

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

function calculateReduction(originalSize, newSize) {
  const reduction = ((originalSize - newSize) / originalSize) * 100;
  return reduction.toFixed(2);
}

async function runBuild() {
  try {
    console.log(`🔧 Building for ${isProd ? "production" : "development"}...`);

    // Get original file size
    const originalStats = statSync("./src/ffep.js");
    const originalSize = originalStats.size;
    console.log(`📊 Original size: ${formatSize(originalSize)}`);

    const buildOptions = {
      entrypoints: ["./src/ffep.js"],
      outdir: "./dist",
      naming: {
        entry: "ffep.js",
      },
      minify: isProd,
      sourcemap: isProd ? "none" : "inline",
      target: "browser",
      format: "iife",
      define: {
        "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
      },
    };

    if (isWatch) {
      // Initial build
      await Bun.build(buildOptions);

      // Setup watch callback
      const reportStats = () => {
        try {
          const newStats = statSync("./dist/ffep.js");
          const reduction = calculateReduction(originalSize, newStats.size);
          const timestamp = new Date().toLocaleTimeString();
          console.log(`🟢 [${timestamp}] Build succeeded`);
          console.log(`📦 Bundle size: ${formatSize(newStats.size)} (${reduction}% reduction)`);
        } catch (error) {
          console.error("Failed to report stats:", error);
        }
      };

      // Report initial build stats
      reportStats();
      console.log("👀 Watching for changes in src directory...");

      // Watch for file changes using Node's fs.watch
      let debounceTimer;
      watch("./src", { recursive: true }, async (eventType, filename) => {
        if (filename && filename.endsWith(".js")) {
          // Debounce the build to prevent multiple rapid builds
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            console.log(`📝 File changed: ${filename}`);
            try {
              await Bun.build(buildOptions);
              reportStats();
            } catch (error) {
              console.error("🔴 Build failed:", error);
            }
          }, 100);
        }
      });
    } else {
      // One-time build
      await Bun.build(buildOptions);

      // Report bundle size and reduction
      const stats = statSync("./dist/ffep.js");
      const reduction = calculateReduction(originalSize, stats.size);
      console.log(`📦 Bundle size: ${formatSize(stats.size)} (${reduction}% reduction)`);
      console.log("✨ Build completed successfully!");
    }
  } catch (error) {
    console.error("🔴 Build failed:", error);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

runBuild();
