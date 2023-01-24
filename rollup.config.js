import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace";

function config({ format, minify, input, ext = "js" }) {
  const dir = `dist/${format}`;
  const minifierSuffix = minify ? ".min" : "";
  const workerThreadsImport = 'await import("worker_threads")';
  return {
    input: `./src/${input}.ts`,
    output: {
      name: "Comlink",
      file: `${dir}/${input}${minifierSuffix}.${ext}`,
      format,
      sourcemap: true,
      inlineDynamicImports: true,
    },
    external: ["worker_threads"],
    plugins: [
      replace({
        include: ["src/comlink.ts"],
        delimiters: ["", ""],
        preventAssignment: true,
        values: {
          [workerThreadsImport]:
            (format === "esm"
              ? "undefined;//"
              : 'require("worker_threads");//') + workerThreadsImport,
        },
      }),
      typescript({
        clean: true,
        typescript: require("typescript"),
        tsconfigOverride: {
          compilerOptions: {
            sourceMap: true,
          },
          // Don’t ask. Without this, the typescript plugin is convinced
          // to create subfolders and misplace the .d.ts files.
          files: ["./src/comlink.ts", "./src/protocol.ts"],
        },
      }),
      minify
        ? terser({
            compress: true,
            mangle: true,
          })
        : undefined,
    ].filter(Boolean),
  };
}

require("rimraf").sync("dist");

export default [
  { input: "comlink", format: "esm", minify: false, ext: "mjs" },
  { input: "comlink", format: "esm", minify: true, ext: "mjs" },
  { input: "comlink", format: "esm", minify: false },
  { input: "comlink", format: "esm", minify: true },
  { input: "comlink", format: "umd", minify: false },
  { input: "comlink", format: "umd", minify: true },
  { input: "node-adapter", format: "esm", minify: false, ext: "mjs" },
  { input: "node-adapter", format: "esm", minify: true, ext: "mjs" },
  { input: "node-adapter", format: "umd", minify: false },
  { input: "node-adapter", format: "umd", minify: true },
].map(config);
