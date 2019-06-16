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

import {
  Endpoint,
  EventSource,
  Message,
  MessageType,
  PostMessageWithOrigin,
  WireValue,
  WireValueType
} from "./protocol.js";
export { Endpoint };

export const proxyMarker = Symbol("Comlink.proxy");
export const createEndpoint = Symbol("Comlink.endpoint");
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
  serialize(obj: any): [any, Transferable[]];
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

export function expose(obj: any, ep: Endpoint = self as any) {
  ep.addEventListener("message", (async (ev: MessageEvent) => {
    if (!ev || !ev.data) {
      return;
    }
    const { id, type, path } = {
      path: [] as string[],
      ...(ev.data as Message)
    };
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
      const rawValue = path.reduce((obj, prop) => obj[prop], obj);
      switch (type) {
        case MessageType.GET:
          {
            returnValue = await rawValue;
          }
          break;
        case MessageType.SET:
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case MessageType.APPLY:
          {
            returnValue = await rawValue.apply(parent, argumentList);
          }
          break;
        case MessageType.CONSTRUCT:
          {
            const value = await new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case MessageType.ENDPOINT:
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
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

export function wrap<T>(ep: Endpoint): Remote<T> {
  return createProxy<T>(ep) as any;
}

function createProxy<T>(
  ep: Endpoint,
  path: (string | number | symbol)[] = []
): Remote<T> {
  const proxy: Function = new Proxy(function() {}, {
    get(_target, prop) {
      if (prop === "then") {
        if (path.length === 0) {
          return { then: () => proxy };
        }
        const r = requestResponseMessage(ep, {
          type: MessageType.GET,
          path: path.map(p => p.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(
        ep,
        {
          type: MessageType.SET,
          path: [...path, prop].map(p => p.toString()),
          value
        },
        transferables
      ).then(fromWireValue) as any;
    },
    apply(_target, _thisArg, rawArgumentList) {
      const last = path[path.length - 1];
      if ((last as any) === createEndpoint) {
        return requestResponseMessage(ep, {
          type: MessageType.ENDPOINT
        }).then(fromWireValue);
      }
      // We just pretend that `bind()` didn’t happen.
      if (last === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(
        ep,
        {
          type: MessageType.APPLY,
          path: path.map(p => p.toString()),
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
          type: MessageType.CONSTRUCT,
          path: path.map(p => p.toString()),
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

function processArguments(argumentList: any[]): [WireValue[], Transferable[]] {
  const processed = argumentList.map(toWireValue);
  return [processed.map(v => v[0]), myFlat(processed.map(v => v[1]))];
}

const transferCache = new WeakMap<any, Transferable[]>();
export function transfer(obj: any, transfers: Transferable[]) {
  transferCache.set(obj, transfers);
  return obj;
}

export function proxy<T>(obj: T): T & { [proxyMarker]: true } {
  return Object.assign(obj, { [proxyMarker]: true }) as any;
}

export function windowEndpoint(
  w: PostMessageWithOrigin,
  context: EventSource = self
): Endpoint {
  return {
    postMessage: (msg: any, transferables: Transferable[]) =>
      w.postMessage(msg, "*", transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context)
  };
}

function toWireValue(value: any): [WireValue, Transferable[]] {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: WireValueType.HANDLER,
          name,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: WireValueType.RAW,
      value
    },
    transferCache.get(value) || []
  ];
}

function fromWireValue(value: WireValue): any {
  switch (value.type) {
    case WireValueType.HANDLER:
      return transferHandlers.get(value.name)!.deserialize(value.value);
    case WireValueType.RAW:
      return value.value;
  }
}

function requestResponseMessage(
  ep: Endpoint,
  msg: Message,
  transfers?: Transferable[]
): Promise<WireValue> {
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
