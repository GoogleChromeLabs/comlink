import {
  IRemoteController,
  Remote,
  closeEndPoint,
  toWireValue,
  threadId,
  fromWireValue,
  isMessagePort,
  tidEndPointMap,
} from "./common";
import {
  WireValue,
  Message,
  ThreadID,
  ProxyID,
  Endpoint,
  MessageType,
} from "./protocol";

export const remotePidMap = new WeakMap<Remote, ProxyID>();
const hasLockApi = () =>
  navigator &&
  "locks" in navigator &&
  typeof navigator.locks?.request === "function";

export class RemoteController implements IRemoteController {
  protected messageIdSequence = 1;
  protected pendingListeners = new Map<number, (value: WireValue) => void>();
  protected isReady = false;
  protected queue?: [Message, Transferable[]?][] = [];
  protected heartBeat?: number;
  public tid?: ThreadID;
  protected pidRemoteMap = new Map<
    ProxyID,
    { remote: WeakRef<Remote>; count: number }
  >();

  constructor(protected ep: Endpoint) {
    this.handler = this.handler.bind(this);
    this.initialize();
  }

  public getRemote(pid: ProxyID): Remote | undefined {
    return this.pidRemoteMap.get(pid)?.remote?.deref();
  }
  public async unregister(pid: ProxyID) {
    const counterData = this.pidRemoteMap.get(pid);
    if (counterData) {
      counterData.count--;
      if (counterData.count === 0) {
        this.pidRemoteMap.delete(pid);

        try {
          await this.requestResponse({
            type: MessageType.RELEASE,
            pid: pid,
          });
        } catch {
        } finally {
          if (this.pidRemoteMap.size === 0) {
            this.ep.removeEventListener("message", this.handler as any);
            closeEndPoint(this.ep);
            this.heartBeat ?? clearTimeout(this.heartBeat);
            this.pendingListeners.clear();
            this.queue = undefined;
            this.tid && tidEndPointMap.delete(this.tid);
          }
        }
      }
    }

    return this.pidRemoteMap.size === 0;
  }
  public register(proxy: Remote, pid: ProxyID, isRoot: boolean) {
    remotePidMap.set(proxy, pid);
    if (!this.pidRemoteMap.has(pid)) {
      this.pidRemoteMap.set(pid, { remote: new WeakRef(proxy), count: 0 });
    }
    const remoteData = this.pidRemoteMap.get(pid)!;
    if (isRoot && !remoteData.remote.deref()) {
      remoteData.remote = new WeakRef(proxy);
    }
    remoteData.count++;
  }
  public get(pid: ProxyID, path: (string | number | symbol)[]) {
    return this.requestResponse({
      type: MessageType.GET,
      pid: pid,
      path: path.map((p) => p.toString()),
    });
  }
  public async set(
    pid: ProxyID,
    path: (string | number | symbol)[],
    rawValue: any
  ) {
    if (rawValue instanceof Promise) {
      rawValue = await rawValue;
    }

    const [value, transferables] = await toWireValue(this.ep, rawValue);
    return await this.requestResponse(
      {
        type: MessageType.SET,
        pid: pid,
        path: path.map((p) => p.toString()),
        value,
      },
      transferables
    );
  }
  public async apply(
    pid: ProxyID,
    path: (string | number | symbol)[],
    argArray: any[]
  ) {
    const [argumentList, transferables] = await this.processArguments(
      this.ep,
      argArray
    );
    return this.requestResponse(
      {
        type: MessageType.APPLY,
        pid: pid,
        path: path.map((p) => p.toString()),
        argumentList,
      },
      transferables
    );
  }
  public async construct(
    pid: ProxyID,
    path: (string | number | symbol)[],
    argArray: any[]
  ) {
    const [argumentList, transferables] = await this.processArguments(
      this.ep,
      argArray
    );
    return this.requestResponse(
      {
        type: MessageType.CONSTRUCT,
        pid: pid,
        path: path.map((p) => p.toString()),
        argumentList,
      },
      transferables
    );
  }
  public createEndPoint(pid: ProxyID) {
    return this.requestResponse<MessagePort>({
      type: MessageType.ENDPOINT,
      pid: pid,
    });
  }
  protected requestResponse<T = any>(
    msg: Message,
    transfers?: Transferable[]
  ): Promise<T> {
    return new Promise<WireValue>((resolve) => {
      msg.id = this.messageIdSequence++;
      //console.log(`[${threadId}] ${JSON.stringify(msg)} >>`);
      if (this.isReady) {
        this.ep.postMessage(msg, transfers);
      } else {
        this.queue?.push([msg, transfers]);
      }

      this.pendingListeners.set(msg.id, resolve);
    }).then((wireValue) => fromWireValue(this.ep, wireValue));
  }
  protected async processArguments(
    ep: Endpoint,
    argumentList: any[]
  ): Promise<[WireValue[], Transferable[]]> {
    const processed = await Promise.all(
      argumentList.map((val) => toWireValue(ep, val))
    );
    const mapped = processed.reduce(
      (mapped, arg) => {
        mapped[0].push(arg[0]);
        if (Array.isArray(arg[1])) {
          mapped[1].push(...arg[1]);
        }

        return mapped;
      },
      [[], []] as [WireValue[], Transferable[]]
    );
    return mapped;
  }
  protected initialize() {
    this.ep.addEventListener("message", this.handler as any);
    if (this.ep.start) {
      this.ep.start();
    }

    this.isReady = isMessagePort(this.ep);
    if (this.isReady) {
      this.queue = undefined;
    } else {
      this.pendingListeners.set(MessageType.READY, (async () => {
        this.isReady = true;
        const queue = this.queue;
        this.queue = undefined;
        if (queue) {
          for (const q of queue) {
            this.ep.postMessage(q[0], q[1]);
          }
        }
      }) as any);
      this.ep.postMessage({ id: MessageType.READY, type: MessageType.READY });
    }

    this.sendTID();
  }

  protected async handler(ev: MessageEvent<WireValue>) {
    const data = ev.data;
    if (
      !data ||
      typeof data.id !== "number" ||
      data.type >= MessageType.READY
    ) {
      return;
    }
    //console.log(`>>>> [${threadId}] ${JSON.stringify(ev.data)}`);
    const resolver = this.pendingListeners.get(data.id);
    if (!resolver) {
      return;
    }

    try {
      resolver(data);
    } finally {
      this.pendingListeners.delete(data.id);
    }
  }

  protected async sendTID() {
    const resp = await this.requestResponse<{
      tid: ThreadID;
      timeout?: number;
    }>({
      type: MessageType.EXCHANGETID,
      tid: threadId,
    });
    this.tid = resp.tid;
    tidEndPointMap.set(resp.tid, this.ep);

    if (resp.timeout) {
      if (hasLockApi()) {
        const lockId = `Comlink.id:${Date.now()}:${
          Math.random() * Number.MAX_SAFE_INTEGER
        }`;
        navigator.locks.request(
          lockId,
          { mode: "exclusive" },
          () => new Promise(() => {})
        );
        this.requestResponse({
          type: MessageType.HEARTBEAT,
          lock: lockId,
        });
      } else {
        this.sendHeartBeat(resp.timeout);
      }
    }
  }
  protected sendHeartBeat(timeout: number) {
    if (typeof timeout !== "number" || timeout <= 0) {
      return;
    }

    this.heartBeat ?? clearTimeout(this.heartBeat);
    this.heartBeat = setTimeout(() => {
      this.requestResponse({
        type: MessageType.HEARTBEAT,
      }).then((val: number) => this.sendHeartBeat(val));
    }, timeout) as any;
  }
}
