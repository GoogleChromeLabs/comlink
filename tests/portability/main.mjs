import { Worker as NodeWorker } from "node:worker_threads";
import { wrap } from "../../dist/esm/comlink.mjs";
import assert from "node:assert";

const worker = new NodeWorker(new URL(import.meta.resolve("./worker.mjs")));
const api = wrap(worker);

// Single call
assert.equal(await api.add(6, 7), 13);

// Interleaved calls
assert.deepEqual(
  await Promise.all([api.add(4, 5), api.add(6, 7), api.add(100, -5)]),
  [9, 13, 95]
);

// This tests passes if the process gets to this point without hanging and then
// exits successfully.
//
// If this test fails due to broken reference counting, it could exit early and
// the `assert(…)` calls are meaningless. So we provide a "successfully finished" message we can
// grep for, to make sure we reached here.
console.log("successfully finished");
