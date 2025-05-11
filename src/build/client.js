// Import the build function from the esbuild module
const { build } = require("esbuild");

// Run the bundling process with the following configuration:
build({
  // Main entry point for the client, usually where the main logic starts
  entryPoints: ["src/client/index.ts"],

  // Combine all dependency files into a single output file
  bundle: true,

  // Specify the target platform as Node.js (not the browser)
  platform: "node",

  // Target Node.js version 16, so esbuild knows which JavaScript features are supported
  target: ["node16"],

  // Location and name of the output file
  outfile: "dist/client.js",

  // Exit with an error code if an error occurs during the build process
}).catch(() => process.exit(1));
