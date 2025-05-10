// src/build/client.js
const { build } = require("esbuild");
build({
  entryPoints: ["src/client/index.ts"],
  bundle: true,
  platform: "node",
  target: ["node16"],
  outfile: "dist/client.js",
}).catch(() => process.exit(1));
