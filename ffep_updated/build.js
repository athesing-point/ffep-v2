const esbuild = require("esbuild");
const cssModulesPlugin = require("esbuild-css-modules-plugin");

const isProduction = process.env.NODE_ENV === "production";
const watch = process.argv.includes("--watch");
const serve = process.argv.includes("--serve");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/init.js"],
  bundle: true,
  minify: isProduction,
  sourcemap: !isProduction,
  target: ["es2018"],
  outfile: "dist/ffep.min.js",
  format: "iife", // Immediately invoked function expression for browser use
  plugins: [cssModulesPlugin()],
  loader: {
    ".css": "css", // Handle CSS files
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
};

async function build() {
  try {
    if (serve) {
      // Start development server
      const ctx = await esbuild.context(buildOptions);
      await ctx.serve({
        servedir: "dist",
        port: 3000,
      });
      console.log("Development server running on http://localhost:3000");
    } else if (watch) {
      // Watch mode
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log("Watching for changes...");
    } else {
      // Single build
      await esbuild.build(buildOptions);
      console.log("Build complete");
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
