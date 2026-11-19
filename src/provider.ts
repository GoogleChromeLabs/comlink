/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Endpoint,
  ProxyID,
  Message,
  MessageType,
  WireValue,
  WireValueType,
  ThreadID,
  MergeMessage,
} from "./protocol";
import {
  fromWireValue,
  toWireValue,
  opch,
  ProxyMarked,
  transfer,
  isMessagePort,
  throwMarker,
  closeEndPoint,
  proxyMarker,
  threadId,
  tidEndPointMap,
} from "./common";

type ProviderResource = {
  proxyIdMap: Map<ProxyID, any>; // id, object
  callback: EventListenerOrEventListenerObject;
  timeout?: number;
  tid?: ThreadID;
};

const symbolOpchStr = opch.toString();
const symbolMap = new Map<string, Symbol>([
  [Symbol.asyncIterator.toString(), Symbol.asyncIterator],
]);
const isSharedWorker =
  typeof SharedWorkerGlobalScope !== "undefined" &&
  globalThis instanceof SharedWorkerGlobalScope;

export const objectMap = new WeakMap<
  any,
  { pid?: ProxyID; proxy: ProxyMarked; count: number }
>(); // object => pid, proxy
export const proxyMap = new WeakMap<ProxyMarked, { pid?: ProxyID; obj: any }>(); // proxy => pid, obj
export const providerResourceMap = new Map<Endpoint, ProviderResource>();

export function expose<T>(
  obj: T,
  ep: Endpoint = globalThis as any,
  allowedOrigins: (string | RegExp)[] = ["*"],
  timeout?: number
) {
  let resource = providerResourceMap.get(ep)!;
  if (!resource) {
    if (!isSharedWorker) {
      timeout = undefined;
    }

    resource = {
      proxyIdMap: new Map(),
      callback: async function callback(ev: MessageEvent) {
        if (!ev || !ev.data) {
          return;
        }

        if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
          console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
          return;
        }

        // console.log(`>> [${threadId}] ${JSON.stringify(ev.data)}`);
        const { id, type } = ev.data as Message;
        if (
          typeof id !== "number" ||
          typeof type !== "number" ||
          type <= WireValueType.RAW
        ) {
          return;
        }

        const path: string[] = ev.data.path ?? [];
        let pid: ProxyID = ev.data.pid ?? 0;
        if (pid === 0) {
          pid = resource.proxyIdMap.keys().next().value ?? 0;
        }

        const argumentList = await Promise.all(
          (ev.data.argumentList || []).map((val: any) => fromWireValue(ep, val))
        );
        let returnValue: any, parent: any;
        try {
          let lastpath: string, rawValue: any;
          if (path.length === 0) {
            parent = rawValue = resource.proxyIdMap.get(pid);
            lastpath = undefined as any;
          } else {
            parent = resource.proxyIdMap.get(pid);
            const walkResult = walk(parent, path);
            parent = walkResult.parent;
            rawValue = walkResult.value;
            lastpath = path[path.length - 1];
          }
          switch (type) {
            case MessageType.READY:
              {
                returnValue = undefined;
              }
              break;
            case MessageType.EXCHANGETID:
              {
                const tid = ev.data.tid;
                tidEndPointMap.set(tid, ep);
                resource.tid = tid;
                returnValue = {
                  tid: threadId,
                  timeout: timeout && Math.floor(timeout / 3),
                };
              }
              break;
            case MessageType.MERGE:
              {
                const { tid } = ev.data as MergeMessage;
                const targetEP = tidEndPointMap.get(tid)!;
                const { proxyIdMap } = providerResourceMap.get(targetEP)!;
                for (const [key, obj] of resource.proxyIdMap) {
                  if (!proxyIdMap.has(key)) {
                    proxyIdMap.set(key, obj);
                  }
                }
                returnValue = undefined;
              }
              break;
            case MessageType.GET:
              {
                returnValue = rawValue;
              }
              break;
            case MessageType.SET:
              {
                parent[lastpath] = await fromWireValue(ep, ev.data.value);
                returnValue = true;
              }
              break;
            case MessageType.APPLY:
              {
                const symbol = symbolMap.get(lastpath);
                if (symbol) {
                  switch (symbol) {
                    case Symbol.asyncIterator: {
                      if (Symbol.asyncIterator in parent) {
                        rawValue = parent[Symbol.asyncIterator];
                      } else {
                        rawValue = parent[Symbol.iterator];
                      }
                      returnValue = expose(
                        rawValue.apply(parent, argumentList),
                        ep
                      );
                      break;
                    }
                  }
                } else {
                  returnValue = rawValue.apply(parent, argumentList);
                }
              }
              break;
            case MessageType.CONSTRUCT:
              {
                const value = new rawValue(...argumentList);
                returnValue = proxy(value);
              }
              break;
            case MessageType.ENDPOINT:
              {
                const { port1, port2 } = new MessageChannel();
                expose(parent, port2);
                returnValue = transfer(port1, [port1]);
              }
              break;
            case MessageType.HEARTBEAT:
              {
                if (!timeout) {
                  returnValue = undefined;
                } else {
                  clearTimeout(resource.timeout);
                  if (ev.data.lock) {
                    navigator.locks.request(ev.data.lock, () => {
                      unexpose(ep);
                    });
                    resource.timeout = undefined;
                    returnValue = undefined;
                  } else {
                    resource.timeout = setTimeout(() => {
                      unexpose(ep);
                    }, timeout) as any;
                    returnValue = Math.floor(timeout / 3);
                  }
                }
              }
              break;
            case MessageType.RELEASE:
              {
                returnValue = undefined;
              }
              break;
            default:
              return;
          }
        } catch (value) {
          returnValue = { value, [throwMarker]: 0 };
        }
        Promise.resolve(returnValue)
          .catch((value) => {
            return { value, [throwMarker]: 0 };
          })
          .then(async (returnValue) => {
            const [wireValue, transferables] = await toWireValue(
              ep,
              returnValue
            );
            wireValue.id = id;
            //console.log(`[${threadId}] ${JSON.stringify(wireValue)} >>>>`);
            ep.postMessage(wireValue, transferables);

            switch (type) {
              case MessageType.RELEASE: {
                // detach after sending release response above.
                unexpose(ep, [parent]);
                break;
              }
              case MessageType.MERGE: {
                // detach and deactive after sending release response above.
                unexpose(ep);
                break;
              }
            }
          })
          .catch(async (error) => {
            // Send Serialization Error To Caller
            const [wireValue, transferables] = await toWireValue(ep, {
              value: new TypeError("Unserializable return value", {
                cause: error,
              }),
              [throwMarker]: 0,
            });
            wireValue.id = id;
            ep.postMessage(wireValue, transferables);
          });
      } as any,
    };

    providerResourceMap.set(ep, resource);
    ep.addEventListener("message", resource.callback);
    if (ep.start) {
      ep.start();
    }

    if (timeout) {
      resource.timeout = setTimeout(function () {
        unexpose(ep);
      }, timeout) as any;
    }

    if (!isMessagePort(ep)) {
      ep.postMessage({
        id: MessageType.READY,
        type: WireValueType.RAW,
      } as WireValue);
    }
  }

  const proxyObj = proxy(obj);
  const proxyData = registerProxy(proxyObj);
  const id = proxyData.pid!;
  resource.proxyIdMap.set(id, obj);
  objectMap.get(obj)!.count++;
  return proxyObj;
}

export function unexpose(ep: Endpoint = globalThis as any, objs?: any[]) {
  const resource = providerResourceMap.get(ep);
  if (!resource) {
    return;
  }

  const rproxyMap = resource.proxyIdMap;
  if (!objs) {
    objs = Array.from(rproxyMap.values());
  }

  for (const obj of objs) {
    const objData = objectMap.get(obj)!;
    const id = objData.pid!;
    if (!rproxyMap.has(id)) {
      continue;
    }

    rproxyMap.delete(id);
    objData.count--;
    if (objData.count === 0) {
      if (
        Symbol.asyncDispose in obj &&
        typeof obj[Symbol.asyncDispose] === "function"
      ) {
        obj[Symbol.asyncDispose]();
      } else if (
        Symbol.dispose in obj &&
        typeof obj[Symbol.dispose] === "function"
      ) {
        obj[Symbol.dispose]();
      }
    }
  }

  if (rproxyMap.size > 0) {
    return;
  }

  //console.warn(`[${threadId}] unexpose ${resource.tid}`);
  const { callback, timeout, tid } = resource;
  callback && ep.removeEventListener("message", callback);
  closeEndPoint(ep);
  providerResourceMap.delete(ep);
  tid && tidEndPointMap.delete(tid);
  typeof timeout !== "undefined" && clearTimeout(timeout);
}

function isAllowedOrigin(
  allowedOrigins: (string | RegExp)[],
  origin: string
): boolean {
  for (const allowedOrigin of allowedOrigins) {
    if (origin === allowedOrigin || allowedOrigin === "*") {
      return true;
    }
    if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
      return true;
    }
  }
  return false;
}

export function proxy<T = any>(obj: T): ProxyMarked<T> {
  if (proxyMap.has(obj)) {
    return obj as ProxyMarked<T>;
  }

  let objectData = objectMap.get(obj);
  if (!objectData) {
    objectData = { proxy: undefined, count: 0 };
    objectMap.set(obj, objectData);
  }
  if (!objectData.proxy) {
    objectData.proxy = isProxy(obj)
      ? obj
      : (new Proxy(obj as any, {}) as ProxyMarked<T>);
    proxyMap.set(objectData.proxy, { obj });
  }

  return objectData.proxy;
}

let proxyIdCounter = 1;
export function registerProxy(obj: ProxyMarked) {
  const proxyData = proxyMap.get(obj)!;
  if (typeof proxyData.pid !== "number") {
    proxyData.pid = proxyIdCounter++;
    objectMap.get(proxyData.obj)!.pid = proxyData.pid;
  }

  return proxyData;
}

export function isProxy<T>(obj: T): obj is ProxyMarked<T> {
  return (
    proxyMap.has(obj) ||
    (obj as ProxyMarked<T>)?.[proxyMarker] ||
    typeof obj === "function"
  );
}

export function walk(parent: any, path: string[]) {
  let isOpch = false;
  let value = parent;
  for (let i = 0, len = path.length; i < len; i++) {
    const prop = path[i];
    if (!isOpch && (value === null || value === undefined)) {
      // stop early
      break;
    }
    if (prop === symbolOpchStr) {
      isOpch = true;
      // continue chain
      continue;
    }

    parent = value;
    value = isOpch ? value?.[prop] : value[prop];
    if (isOpch && value !== undefined && value !== null) {
      isOpch = false;
    }
  }

  return {
    parent: parent,
    value: value,
  };
}
