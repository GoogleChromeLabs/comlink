import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

function config({ format, minify }) {
  const dir = `dist/${format}/`;
  return {
    input: "./src/comlink.ts",
    output: {
      name: "Comlink",
      file: `${dir}/comlink${minify ? ".min" : ""}.js`,
      format,
      sourcemap: true
    },
    plugins: [
      typescript({
        useTsconfigDeclarationDir: true,
        clean: true,
        typescript: require("typescript"),
        tsconfigOverride: {
          compilerOptions: {
            sourceMap: true,
            declarationDir: dir
          }
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

export default [
  { format: "esm", minify: false },
  { format: "esm", minify: true },
  { format: "umd", minify: false },
  { format: "umd", minify: true }
].map(config);
