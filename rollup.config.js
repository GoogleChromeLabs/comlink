import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

function config({ format, minify }) {
  const dir = `dist/${format}/`;
  const minifierSuffix = minify ? ".min" : "";
  const ext = format === "esm" ? "mjs" : "js";
  return {
    input: "./src/comlink.ts",
    output: {
      name: "Comlink",
      file: `${dir}/comlink${minifierSuffix}.${ext}`,
      format,
      sourcemap: true
    },
    plugins: [
      typescript({
        clean: true,
        typescript: require("typescript"),
        tsconfigOverride: {
          compilerOptions: {
            sourceMap: true
          },
          // Don’t ask. Without this, the typescript plugin is convinced
          // to create subfolders and misplace the .d.ts files.
          files: ["./src/comlink.ts", "./src/protocol.ts"]
        }
      }),
      minify
        ? terser({
            sourcemap: true,
            compress: true,
            mangle: true
          })
        : []
    ].flat()
  };
}

require("rimraf").sync("dist");

export default [
  { format: "esm", minify: false },
  { format: "esm", minify: true },
  { format: "umd", minify: false },
  { format: "umd", minify: true }
].map(config);
