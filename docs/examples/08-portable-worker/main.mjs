// import { wrap } from "https://unpkg.com/comlink@alpha/dist/esm/comlink.mjs";
import { wrap } from "../../../dist/esm/comlink.mjs";
import { PortableWorker } from "./portable-worker.mjs";

const worker = new PortableWorker(import.meta.resolve("./worker.mjs"));
const api = wrap(worker);

// Single call
console.log(await api.add(6, 7));

// Interleaved calls
console.log(
  await Promise.all([api.add(4, 5), api.add(6, 7), api.add(100, -5)])
);
