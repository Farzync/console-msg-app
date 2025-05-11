// Import the build function from the esbuild module
const { build } = require("esbuild");

// Added global error handling for unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the bundling process with the following configuration:
build({
  // Main entry point for the server, usually where the main logic starts
  entryPoints: ["src/server/index.ts"],

  // Combine all dependency files into a single output file
  bundle: true,

  // Specify the target platform as Node.js (not the browser)
  platform: "node",

  // Target Node.js version 16, so esbuild knows which JavaScript features are supported
  target: ["node16"],

  // Location and name of the output file
  outfile: "dist/server.js",

  // Exit with an error code if an error occurs during the build process
}).catch(() => process.exit(1));
