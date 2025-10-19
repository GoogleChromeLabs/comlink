import { IRemoteController, Remote } from "./common";
import { remoteFinalizers, getRemoteController } from "./consumer";
import { Endpoint, ProxyID, WireValue } from "./protocol";

export type PoolOptions = {
  min?: number;
  max?: number;
  idleTimeout?: number;
  maxQueue?: number;
};

type PoolConfig = {
  spawn: () => Endpoint;
  min: number;
  max: number;
  idleTimeout: number;
  maxQueue?: number;
};
type TaskType = "set" | "get" | "apply" | "construct";
type Task = {
  executor: (value?: any) => void;
  type: TaskType;
  pid: ProxyID;
  path: (string | number | symbol)[];
  args?: any;
};

export class RemotePoolController implements IRemoteController {
  protected taskQueue: Task[] = [];
  protected idleWorkers = new Map<IRemoteController, number>();
  protected workers = new Set<IRemoteController>();
  protected rootProxy?: WeakRef<Remote>;
  protected idleTimeoutId?: number;
  protected proxyCount: number;
  protected config: PoolConfig;

  constructor(spawn: () => Endpoint, options?: PoolOptions) {
    const min = options?.min || 1;
    this.config = {
      spawn: spawn,
      min: min,
      max: Math.max(min, options?.max || navigator.hardwareConcurrency),
      idleTimeout: Math.max(0, options?.idleTimeout || 30_000),
      maxQueue: options?.maxQueue,
    };
    this.proxyCount = 0;
    for (let i = 0; i < this.config.min; i++) {
      this.spawnWorker();
    }
  }

  public async unregister(pid: ProxyID) {
    this.proxyCount--;
    if (this.proxyCount === 0) {
      const unregisterPromises: Promise<boolean>[] = [];
      for (const worker of this.workers) {
        const prom = worker.unregister(pid);
        unregisterPromises.push(prom);
        this.idleWorkers.delete(worker);
        this.workers.delete(worker);
      }
      await Promise.all(unregisterPromises);
    }

    return this.workers.size == 0;
  }
  public register(proxy: Remote, pid: ProxyID, isRoot: boolean) {
    if (isRoot) {
      this.rootProxy = new WeakRef(proxy);
      for (const worker of this.workers) {
        worker.register(proxy, pid, isRoot);
      }
    }

    this.proxyCount++;
  }
  public get(pid: ProxyID, path: (string | number | symbol)[]) {
    return this.requestResponse("get", pid, path);
  }
  public set(
    _pid: ProxyID,
    _path: (string | number | symbol)[],
    _rawValue: WireValue
  ): Promise<boolean> {
    throw new Error("pool don't support set");
  }
  public apply(
    pid: ProxyID,
    path: (string | number | symbol)[],
    argArray: any[]
  ) {
    return this.requestResponse("apply", pid, path, argArray);
  }
  public construct(
    pid: ProxyID,
    path: (string | number | symbol)[],
    argArray: any[]
  ) {
    return this.requestResponse("construct", pid, path, argArray);
  }

  protected async requestResponse(
    type: TaskType,
    pid: ProxyID,
    path: (string | number | symbol)[],
    args?: any
  ): Promise<WireValue> {
    if (
      typeof this.config.maxQueue === "number" &&
      this.taskQueue.length >= this.config.maxQueue
    ) {
      throw new Error("max queue reached");
    }

    return new Promise((resolve) => {
      this.taskQueue.push({
        executor: resolve,
        type: type,
        pid: pid,
        path: path,
        args: args,
      });
      this.runTask();
    });
  }

  protected runTask() {
    if (this.taskQueue.length <= 0) {
      return;
    }
    if (this.idleWorkers.size <= 0) {
      if (this.config.max <= this.workers.size) {
        return;
      }

      this.spawnWorker();
    }

    const [worker] = this.idleWorkers.entries().next().value!;
    this.idleWorkers.delete(worker);
    const job = this.taskQueue.shift()!;

    this.scheduleIdleTimer();
    worker[job.type](job.pid, job.path, job.args)
      .then((val: any) => {
        job.executor(val);
      })
      .finally(() => {
        const requireSchedule = this.idleWorkers.size === 0;
        this.idleWorkers.set(worker, Date.now() + this.config.idleTimeout);
        if (this.taskQueue.length > 0) {
          this.runTask();
        } else if (requireSchedule) {
          this.scheduleIdleTimer();
        }
      });
  }

  protected scheduleIdleTimer() {
    clearTimeout(this.idleTimeoutId);
    if (this.workers.size <= this.config.min) {
      return;
    }
    if (this.idleWorkers.size === 0) {
      return;
    }

    const timeoutAt = Math.max(
      0,
      this.idleWorkers.entries().next().value![1] - Date.now()
    );
    this.idleTimeoutId = setTimeout(() => {
      const now = Date.now();
      for (const [worker, expireAt] of this.idleWorkers) {
        if (expireAt > now) {
          break;
        }
        if (this.workers.size <= this.config.min) {
          break;
        }

        this.releaseWorker(worker);
      }

      this.scheduleIdleTimer();
    }, timeoutAt) as any;
  }

  protected releaseWorker(worker: IRemoteController) {
    const rootProxy = this.rootProxy?.deref();
    if (rootProxy && remoteFinalizers) {
      remoteFinalizers.unregister(rootProxy);
    }
    worker.unregister(0);
    this.workers.delete(worker);
    this.idleWorkers.delete(worker);
    //console.log(`release worker ${this.workers.size}`);
  }
  protected spawnWorker() {
    const ep = this.config.spawn();
    const worker = getRemoteController(ep)!;
    const proxy = this.rootProxy?.deref();
    if (proxy) {
      worker.register(proxy, 0, true);
    }

    this.workers.add(worker);
    this.idleWorkers.set(worker, Date.now() + this.config.idleTimeout);
    //console.log(`spawn worker ${this.workers.size}`);
  }
}
