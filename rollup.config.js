import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

function config({ format, minify, input, target = "esnext" }) {
  const dir = `dist/${format}/`;
  const minifierSuffix = minify ? ".min" : "";
  const ext = format === "esm" ? "mjs" : "js";

  const tsconfigOverride = {
    compilerOptions: {
      sourceMap: true,
      target
    },
    // Don’t ask. Without this, the typescript plugin is convinced
    // to create subfolders and misplace the .d.ts files.
    files: ["./src/comlink.ts", "./src/protocol.ts"]
  };

  if (target === "es5") {
    tsconfigOverride.compilerOptions.downlevelIteration = true;
  }

  return {
    input: `./src/${input}.ts`,
    output: {
      name: "Comlink",
      file:
        target === "esnext"
          ? `${dir}${input}${minifierSuffix}.${ext}`
          : `${dir}${input}.${target}${minifierSuffix}.${ext}`,
      format,
      sourcemap: true
    },
    plugins: [
      typescript({
        clean: true,
        typescript: require("typescript"),
        tsconfigOverride
      }),
      minify
        ? terser({
            sourcemap: true,
            compress: true,
            mangle: true
          })
        : undefined
    ].filter(Boolean)
  };
}

require("rimraf").sync("dist");

export default [
  { input: "comlink", format: "umd", minify: false, target: "es5" },
  { input: "comlink", format: "umd", minify: true, target: "es5" },
  { input: "comlink", format: "esm", minify: false },
  { input: "comlink", format: "esm", minify: true },
  { input: "comlink", format: "umd", minify: false },
  { input: "comlink", format: "umd", minify: true },
  { input: "node-adapter", format: "esm", minify: false },
  { input: "node-adapter", format: "esm", minify: true },
  { input: "node-adapter", format: "umd", minify: false },
  { input: "node-adapter", format: "umd", minify: true }
].map(config);
