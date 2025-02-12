import { build } from "bun";

const isWatch = process.argv.includes("--watch");

async function runBuild() {
  try {
    const result = await build({
      entrypoints: ["./src/ffep.js"],
      outdir: "./dist",
      naming: {
        entry: "ffep.min.js",
      },
      minify: true,
      sourcemap: "none",
      target: "browser",
      format: "iife",
      globalName: "FFEP",
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      },
      watch: isWatch
        ? {
            onRebuild(error) {
              if (error) {
                console.error("Build failed:", error);
              } else {
                console.log("Build succeeded");
              }
            },
          }
        : false,
    });

    console.log("Build completed successfully!");

    if (isWatch) {
      console.log("Watching for changes...");
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

runBuild();
