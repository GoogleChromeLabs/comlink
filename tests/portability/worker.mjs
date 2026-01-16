import { expose } from "../../dist/esm/comlink.mjs";

const api = {
  add(a, b) {
    return a + b;
  },
};

expose(api);
