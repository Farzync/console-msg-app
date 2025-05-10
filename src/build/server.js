// src/build/server.js
const { build } = require("esbuild");
build({
  entryPoints: ["src/server/index.ts"],
  bundle: true,
  platform: "node",
  target: ["node16"],
  outfile: "dist/server.js",
}).catch(() => process.exit(1));
