/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProxyMarked,
  opch,
  Remote,
  UnProxyMarked,
  IRemoteController,
  proxyRemoteData,
  ProxyRemoteData,
} from "./common";
import { Endpoint, ProxyID } from "./protocol";
import { RemoteController } from "./remote-controller";

interface TypedFinalizationRegistry<TW extends WeakKey, T>
  extends FinalizationRegistry<T> {
  new (cleanupCallback: (heldValue: T) => void): TypedFinalizationRegistry<
    TW,
    T
  >;
  register(target: TW, heldValue: T, unregisterToken?: TW): void;
  unregister(unregisterToken: TW): boolean;
}

export const remoteFinalizers = !("FinalizationRegistry" in globalThis)
  ? undefined
  : new (FinalizationRegistry as TypedFinalizationRegistry<
      Remote,
      [IRemoteController, ProxyID]
    >)(([ep, pid]) => setTimeout(() => ep.unregister(pid)));
const controllerMap = new Map<Endpoint, RemoteController>();
const proxyTarget = function () {} as object;

function throwIfRemoteReleased(isReleased: boolean) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}

export function wrap<T extends ProxyMarked>(
  ep: Endpoint
): Remote<UnProxyMarked<T>> {
  const controller = getRemoteController(ep);
  return createRemote<UnProxyMarked<T>>(controller, 0);
}

export function getRemoteController(ep: Endpoint, isAutoCreate = true) {
  let controller = controllerMap.get(ep)!;
  if (isAutoCreate && !controller) {
    controller = new RemoteController(ep);
    controllerMap.set(ep, controller);
  }
  return controller;
}

export function createRemote<T>(
  controller: IRemoteController,
  pid: ProxyID,
  path: (string | number | symbol)[] = []
): Remote<T> {
  const data: ProxyRemoteData = {
    controller,
    pid,
    path,
  };
  let isProxyReleased = false;
  const proxy = new Proxy(proxyTarget, {
    get(_target, prop) {
      throwIfRemoteReleased(isProxyReleased);
      if (prop === Symbol.asyncDispose || prop === Symbol.dispose) {
        return async () => {
          if (remoteFinalizers) {
            remoteFinalizers.unregister(proxy);
          }
          try {
            await controller.unregister(pid);
          } finally {
            isProxyReleased = true;
          }
        };
      }
      if (prop === proxyRemoteData) {
        return data;
      }
      if (prop === "then") {
        if (path.length > 0 && path[path.length - 1] === opch) {
          path = path.slice(0, -1);
        }
        if (path.length === 0) {
          return { then: () => proxy };
        }

        const r = controller.get(pid, path);
        return r.then.bind(r);
      }
      return createRemote(controller, pid, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfRemoteReleased(isProxyReleased);
      // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯

      return controller.set(pid, [...path, prop], rawValue) as any;
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfRemoteReleased(isProxyReleased);
      const last = path[path.length - 1];
      // We just pretend that `bind()` didn’t happen.
      if (last === "bind") {
        return createRemote(controller, pid, path.slice(0, -1));
      }
      if (last === Symbol.asyncIterator) {
        let remoteIterator: Remote<AsyncIterator<any, any>> | undefined;
        const getIterator = async () => {
          if (!remoteIterator) {
            remoteIterator = await controller.apply(pid, path, []);
          }
          return remoteIterator!;
        };

        return {
          async next(args) {
            const obj = await getIterator();
            return obj.next(args);
          },
          async return(value?: any) {
            const obj = await getIterator();
            return obj.return[opch](value);
          },
          async throw(e?: any) {
            const obj = await getIterator();
            return obj.throw[opch](e);
          },
        } as AsyncIterator<any, any, any>;
      }

      return controller.apply(pid, path, rawArgumentList);
    },
    construct(_target, rawArgumentList) {
      throwIfRemoteReleased(isProxyReleased);
      return controller.construct(pid, path, rawArgumentList);
    },
  }) as Remote;

  controller.register(proxy, pid, path.length === 0);
  if (remoteFinalizers) {
    remoteFinalizers.register(proxy, [controller, pid], proxy);
  }
  return proxy as Remote<T>;
}
