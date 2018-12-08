import typescript from "rollup-plugin-typescript2";
import compiler from "@ampproject/rollup-plugin-closure-compiler";

const input = {
  comlink: "./src/comlink.ts",
  messagechanneladapter: "./src/messagechanneladapter.ts"
};
const plugins = [
  typescript({
    useTsconfigDeclarationDir: true,
    objectHashIgnoreUnknownHack: true
  }),
  compiler()
];
const umdOutputOptions = {
  name: "Comlink",
  format: "umd"
};

export default [
  {
    input,
    plugins,
    experimentalCodeSplitting: true,
    output: {
      dir: "dist",
      format: "esm"
    }
  },
  {
    input: input.comlink,
    plugins,
    output: {
      dir: "dist/umd",
      file: "comlink.js",
      ...umdOutputOptions
    }
  },
  {
    input: input.messagechanneladapter,
    plugins,
    output: {
      dir: "dist/umd",
      file: "messagechanneladapter.js",
      ...umdOutputOptions
    }
  }
];
