// import { expose } from "https://unpkg.com/comlink@alpha/dist/esm/comlink.mjs";
import { expose } from "../../../dist/esm/comlink.mjs";

export const api = {
  add(a, b) {
    return a + b;
  },
};

expose(api);
