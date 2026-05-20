import { build, context } from "esbuild";
import process from "node:process";

const extensions = [
  {
    entry: "Oxc Tools.novaextension/src/main.ts",
    outfile: "Oxc Tools.novaextension/Scripts/main.js",
  },
];

const watch = process.argv.includes("--watch");

const opts = (ext) => ({
  entryPoints: [ext.entry],
  outfile: ext.outfile,
  bundle: true,
  format: "cjs",
  platform: "neutral",
  target: ["es2020"],
  logLevel: "info",
  legalComments: "none",
});

if (watch) {
  const ctxs = await Promise.all(extensions.map((e) => context(opts(e))));
  await Promise.all(ctxs.map((c) => c.watch()));
  console.log("esbuild: watching…");
} else {
  await Promise.all(extensions.map((e) => build(opts(e))));
  console.log("esbuild: build complete");
}
