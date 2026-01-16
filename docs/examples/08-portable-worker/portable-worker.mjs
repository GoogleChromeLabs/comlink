// import { wrap } from "https://unpkg.com/comlink@alpha/dist/esm/comlink.mjs";
import { wrap } from "../../../dist/esm/comlink.mjs";

function isCrossOrigin(url) {
  if (!globalThis.location) {
    return false;
  }
  const scriptOrigin = globalThis.location.origin;
  const workerOrigin = new URL(url, globalThis.location.href).origin;
  return scriptOrigin !== workerOrigin;
}

function constructPortableWebWorker(url, workerOptions) {
  const useTrampoline = isCrossOrigin(url);

  // We could use the trampoline unconditionally, but this would require adding
  // `blob:` to the CSP unnecessarily. So we avoid it when possible.
  if (useTrampoline) {
    // Needed until something like
    // https://github.com/lgarron/worker-execution-origin or
    // https://github.com/whatwg/html/issues/6911 is available in all browser.
    const trampolineSource = `import ${JSON.stringify(url.toString())};`;
    const blob = new Blob([trampolineSource], {
      type: "text/javascript",
    });

    url = URL.createObjectURL(blob);
  }

  const worker = new globalThis.Worker(url, {
    ...workerOptions,
    type: "module",
  });

  if (useTrampoline) {
    const originalTerminate = worker.terminate.bind(worker);
    Object.defineProperty(worker, "terminate", {
      get() {
        URL.revokeObjectURL(url);
        originalTerminate();
      },
    });
  }

  return worker;
}

function constructNodeStyleWorker(url, workerOptions) {
  // We could theoretically use dynamic import, but:
  //
  // - 1. There is no synchronous way to do this conditionally. We can't do it
  //      synchronously in a constructor, and while top-level `await` is
  //      well-supported in runtimes it's not as easy to use with bundlers.
  // 2.  `.getBuiltinModule(…)` signals more clearly that these are strictly
  //      runtime dependencies.
  const { Worker: NodeWorker } = globalThis.process.getBuiltinModule(
    "node:worker_threads"
  );

  // `import.meta.resolve(…)` is the recommended way to get the path to a
  // relative file to pass to the worker constructor. This returns a `file://…`
  // URL as a string, which `bun` and `deno` accept for the worker constructor
  // but `node` does not. We can detect this and convert it to a `URL` to allow
  // more concise, idiomatic code across all platforms.
  url =
    typeof url === "string" && url.startsWith("file://") ? new URL(url) : url;

  return new NodeWorker(url, workerOptions);
}

export function PortableWorker(url, workerOptions) {
  const hasWebWorkers = globalThis.Worker;
  const hasBuiltinModules = globalThis.process?.getBuiltinModule;

  if (hasWebWorkers && !hasBuiltinModules) {
    // Browsers
    return constructPortableWebWorker(url, workerOptions);
  }

  const webWorkersHaveUnref = globalThis.Worker?.prototype.unref;

  if (hasWebWorkers && hasBuiltinModules && webWorkersHaveUnref) {
    // `bun`
    return constructPortableWebWorker(url, workerOptions);
  } else {
    // `node` and `deno`
    return constructNodeStyleWorker(url, workerOptions);
  }
}
