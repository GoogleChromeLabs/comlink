/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Protocol from "./protocol.js";
export { Endpoint } from "./protocol.js";

export const proxyMarker = Symbol("Comlink.proxy");
const throwSet = new WeakSet();

// prettier-ignore
type Promisify<T> = T extends { [proxyMarker]: boolean }
  ? Promise<Remote<T>>
  : T extends Promise<any>
    ? T
    : T extends (...args: infer R1) => infer R2
      ? (...args: R1) => Promisify<R2>
      : Promise<T>;

// prettier-ignore
export type Remote<T> =
  (
    T extends (...args: infer R1) => infer R2
      ? (...args: R1) => Promisify<R2>
      : { [K in keyof T]: Promisify<T[K]> }
  ) & (
    T extends { new (...args: infer R1): infer R2 }
      ? { new (...args: R1): Promise<Remote<R2>> }
      : unknown
  );

export interface TransferHandler {
  canHandle(obj: any): boolean;
  serialize(obj: any): [any, any[]];
  deserialize(obj: any): any;
}

export const transferHandlers = new Map<string, TransferHandler>([
  [
    "proxy",
    {
      canHandle: obj => obj && obj[proxyMarker],
      serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port1);
        return [port2, [port2]];
      },
      deserialize: (port: MessagePort) => {
        port.start();
        return wrap(port);
      }
    }
  ],
  [
    "throw",
    {
      canHandle: obj => throwSet.has(obj),
      serialize(obj) {
        const isError = obj instanceof Error;
        let serialized = obj;
        if (isError) {
          serialized = {
            isError,
            message: obj.message,
            stack: obj.stack
          };
        }
        return [serialized, []];
      },
      deserialize(obj) {
        if ((obj as any).isError) {
          throw Object.assign(new Error(), obj);
        }
        throw obj;
      }
    }
  ]
]);

export function expose(obj: any, ep: Protocol.Endpoint = self as any) {
  ep.addEventListener("message", (async (ev: MessageEvent) => {
    if (!ev || !ev.data) {
      return;
    }
    const { path, id, type } = ev.data as Protocol.Message;
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
      const rawValue = path.reduce((obj, prop) => obj[prop], obj);
      switch (type) {
        case Protocol.MessageType.GET:
          {
            returnValue = await rawValue;
          }
          break;
        case Protocol.MessageType.SET:
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case Protocol.MessageType.APPLY:
          {
            returnValue = await rawValue.apply(parent, argumentList);
          }
          break;
        case Protocol.MessageType.CONSTRUCT:
          {
            const value = await new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        default:
          console.warn("Unrecognized message", ev.data);
      }
    } catch (e) {
      returnValue = e;
      throwSet.add(e);
    }
    const [wireValue, transferables] = toWireValue(returnValue);
    ep.postMessage({ ...wireValue, id }, transferables);
  }) as any);
  if (ep.start) {
    ep.start();
  }
}

export function wrap<T>(ep: Protocol.Endpoint): Remote<T> {
  return createProxy<T>(ep) as any;
}

function createProxy<T>(ep: Protocol.Endpoint, path: string[] = []): Remote<T> {
  const proxy: Function = new Proxy(new Function(), {
    get(_target, prop) {
      if (prop === "then") {
        if (path.length === 0) {
          return { then: () => proxy };
        }
        const r = requestResponseMessage(ep, {
          type: Protocol.MessageType.GET,
          path
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, [...path, prop.toString()]);
    },
    set(_target, prop, value) {
      // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
      return requestResponseMessage(ep, {
        type: Protocol.MessageType.SET,
        path: [...path, prop.toString()],
        value: toWireValue(value)[0]
      }).then(fromWireValue) as any;
    },
    apply(_target, _thisArg, rawArgumentList) {
      // We just pretend that `bind()` didn’t happen.
      if (path[path.length - 1] === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(
        ep,
        {
          type: Protocol.MessageType.APPLY,
          path,
          argumentList
        },
        transferables
      ).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(
        ep,
        {
          type: Protocol.MessageType.CONSTRUCT,
          path,
          argumentList
        },
        transferables
      ).then(fromWireValue);
    }
  });
  return proxy as any;
}

function myFlat<T>(arr: (T | T[])[]): T[] {
  return Array.prototype.concat.apply([], arr);
}

function processArguments(argumentList: any[]): [Protocol.WireValue[], any[]] {
  const processed = argumentList.map(toWireValue);
  return [processed.map(v => v[0]), myFlat(processed.map(v => v[1]))];
}

const transferCache = new WeakMap<any, any[]>();
export function transfer(obj: any, transfers: any[]) {
  transferCache.set(obj, transfers);
  return obj;
}

export function proxy<T>(obj: T): T & { [proxyMarker]: true } {
  return Object.assign(obj, { [proxyMarker]: true }) as any;
}

export function windowEndpoint(w: Window, context = self): Protocol.Endpoint {
  return {
    postMessage: (msg: any, transferables: any[]) =>
      w.postMessage(msg, "*", transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context)
  };
}

function toWireValue(value: any): [Protocol.WireValue, any[]] {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: Protocol.WireValueType.HANDLER,
          name,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: Protocol.WireValueType.RAW,
      value
    },
    transferCache.get(value) || []
  ];
}

function fromWireValue(value: Protocol.WireValue): any {
  switch (value.type) {
    case Protocol.WireValueType.HANDLER:
      return transferHandlers.get(value.name)!.deserialize(value.value);
    case Protocol.WireValueType.RAW:
      return value.value;
  }
}

function requestResponseMessage(
  ep: Protocol.Endpoint,
  msg: Protocol.Message,
  transfers?: any[]
): Promise<Protocol.WireValue> {
  return new Promise(resolve => {
    const id = generateUUID();
    ep.addEventListener("message", function l(ev: MessageEvent) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l as any);
      resolve(ev.data);
    } as any);
    if (ep.start) {
      ep.start();
    }
    ep.postMessage({ id, ...msg }, transfers);
  });
}

function generateUUID(): string {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}
