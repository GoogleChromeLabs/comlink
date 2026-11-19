export type { PoolOptions } from "./remote-pool-controller";
import { ProxyMarked, RemotePool, UnProxyMarked } from "./common";
import { createRemote } from "./consumer";
import { Endpoint } from "./protocol";
import { PoolOptions, RemotePoolController } from "./remote-pool-controller";

export function pool<T extends ProxyMarked>(
  spawn: () => Endpoint,
  options?: PoolOptions
): RemotePool<UnProxyMarked<T>> {
  const poolControler = new RemotePoolController(spawn, options);
  return createRemote<UnProxyMarked<T>>(poolControler, 0) as any;
}
