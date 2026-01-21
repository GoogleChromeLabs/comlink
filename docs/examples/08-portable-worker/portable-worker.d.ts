import type { Worker as NodeWorker } from "node:worker_threads";

type WorkerConstructorOptions = (ConstructorParameters<
  typeof globalThis.Worker
> &
  ConstructorParameters<typeof NodeWorker>)[1];

interface PortableWorkerConstructor {
  new (
    url: string | URL,
    workerOptions?: Omit<WorkerConstructorOptions, "type">
  ): Worker | NodeWorker;
}

export const PortableWorker: PortableWorkerConstructor;
