import { Worker as NodeWorker } from "node:worker_threads";
import { wrap } from "../../dist/esm/comlink.mjs";
import assert from "node:assert";

// This is neeeded to call `.unref()` on the timer for `deno` (so that we can
// test only that the worker is the one hanging the process).
import { setTimeout } from "node:timers";

const worker = new NodeWorker(new URL(import.meta.resolve("./worker.mjs")));
const api = wrap(worker, undefined, { refCount: false });

let reachedEnd = false;

const timeout = setTimeout(() => {
  assert.ok(reachedEnd);
  // This tests passes if the process hangs and gets caught by this (unreffed) timeout.
  //
  // We provide a "successfully timed out" message we can grep for, to make sure we reached here.
  console.log("successfully timed out");

  // This should exit the process successfully…
  worker.unref();
  // … but `deno` seems to need at least 4 more tries on some systems. 🤷
  // https://github.com/denoland/deno/issues/31871
  if ("Deno" in globalThis) {
    for (let i = 0; i < 4; i++) {
      worker.unref();
    }
  }
}, 100);
timeout.unref();

// Single call
assert.equal(await api.add(6, 7), 13);

// Parallelized calls
assert.deepEqual(
  await Promise.all([api.add(4, 5), api.add(6, 7), api.add(100, -5)]),
  [9, 13, 95]
);

reachedEnd = true;
