import typescript from "rollup-plugin-typescript2";
import compiler from "@ampproject/rollup-plugin-closure-compiler";

const inputs = {
  comlink: "./src/comlink.ts",
  messagechanneladapter: "./src/messagechanneladapter.ts"
};
const plugins = [
  typescript({
    useTsconfigDeclarationDir: true,
    clean: true,
    objectHashIgnoreUnknownHack: true
  }),
  compiler()
];
const umdOutputOptions = {
  dir: "dist/umd",
  format: "umd"
};
const esmOutputOptions = {
  dir: "dist",
  format: "esm"
};

export default [
  {
    input: inputs.comlink,
    plugins,
    output: {
      file: "comlink.js",
      ...esmOutputOptions
    }
  },
  {
    input: inputs.messagechanneladapter,
    plugins,
    output: {
      file: "messagechanneladapter.js",
      ...esmOutputOptions
    }
  },
  {
    input: inputs.comlink,
    plugins,
    output: {
      file: "comlink.js",
      name: "Comlink",
      ...umdOutputOptions
    }
  },
  {
    input: inputs.messagechanneladapter,
    plugins,
    output: {
      file: "messagechanneladapter.js",
      name: "messagechanneladapter",
      ...umdOutputOptions
    }
  }
];
