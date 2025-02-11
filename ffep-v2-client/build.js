const esbuild = require("esbuild");
const isProd = process.env.NODE_ENV === "production";

async function build() {
  try {
    const result = await esbuild.build({
      entryPoints: ["src/ffep.js"],
      bundle: true,
      minify: isProd,
      sourcemap: !isProd,
      target: ["chrome58", "firefox57", "safari11", "edge16"],
      outfile: `dist/ffep${isProd ? ".min" : ""}.js`,
      format: "iife",
      globalName: "FFEP",
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      },
    });

    console.log(`Build ${isProd ? "production" : "development"} completed successfully!`);
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
