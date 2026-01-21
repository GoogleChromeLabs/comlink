import { Worker as NodeWorker } from "node:worker_threads";
import { wrap } from "../../../dist/esm/comlink.mjs";

const worker = new NodeWorker(new URL(import.meta.resolve("./worker.mjs")));

const api = wrap(worker);
console.log(await api.add(6, 7));
