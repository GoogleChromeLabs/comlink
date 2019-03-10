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

export type PromisifyValue<T> = T extends Promise<any> ? T : Promise<T>;

export type PromisifyFunction<T> = T extends (...args: infer R1) => infer R2
  ? (...args: R1) => Promise<R2>
  : unknown;

export type PromisifyConstructor<T> = T extends {
  new (...args: infer R1): infer R2;
}
  ? { new (...args: R1): Promisify<R2> }
  : unknown;

export type PromisifyObject<T> = T extends {}
  ? { [P in keyof T]: PromisifyValue<T[P]> }
  : unknown;

export type Remote<T> = PromisifyFunction<T> &
  PromisifyObject<T> &
  PromisifyConstructor<T>;
export type Promisify<T> = Remote<T>;

export function expose(obj: any, ep: Protocol.Endpoint = self as any) {
  ep.addEventListener("message", (async (ev: MessageEvent) => {
    if (!ev || !ev.data) {
      return;
    }
    const {path,id,type} = ev.data as Protocol.Message;
    let returnValue, returnWireValue;
    try {
      const parent = path
        .slice(0, -1)
        .reduce((obj, prop) => obj[prop], obj);
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
            returnValue = await rawValue.apply(
              parent,
              ev.data.argumentList.map(fromWireValue)
            );
          }
          break;
        case Protocol.MessageType.CONSTRUCT:
          {
            const value = await new rawValue(...ev.data.argumentList);
            const { port1, port2 } = new MessageChannel();
            port1.start();
            port2.start();
            expose(value, port2);
            returnValue = port1;
            transfer(port1, [port1]);
            returnWireValue = {
              type: Protocol.WireValueType.PROXY,
              endpoint: port1
            };
          }
          break;
        default:
          console.warn("Unrecognized message", ev.data);
      }
    } catch (e) {
      const isError = e instanceof Error;
      returnWireValue = {
        type: Protocol.WireValueType.THROW,
        isError,
        value: isError ? { message: e.message, stack: e.stack } : e
      };
    }
    returnWireValue = returnWireValue || toWireValue(returnValue);
    ep.postMessage({...returnWireValue, id}, getTransferables([returnValue]));
  }) as any);
}

export function wrap<T>(ep: Protocol.Endpoint): Remote<T> {
  return createProxy<T>(ep) as any;
}

function createProxy<T>(ep: Protocol.Endpoint, path: string[] = []): Remote<T> {
  const proxy = new Proxy(new Function(), {
    get(_target, prop) {
      if (typeof prop === "symbol") {
        throw Error("Can’t access symbol properties with Comlink");
      }
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
        value: toWireValue(value)
      })
        .then(fromWireValue)
        .then(() => true) as any;
    },
    apply(_target, _thisArg, argumentList) {
      // We just pretend that `bind()` didn’t happen.
      if (path[path.length - 1] === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      return requestResponseMessage(
        ep,
        {
          type: Protocol.MessageType.APPLY,
          path,
          argumentList: argumentList.map(toWireValue)
        },
        getTransferables(argumentList)
      ).then(fromWireValue);
    },
    construct(_target, argumentList) {
      return requestResponseMessage(
        ep,
        {
          type: Protocol.MessageType.CONSTRUCT,
          path,
          argumentList: argumentList.map(toWireValue)
        },
        getTransferables(argumentList)
      ).then(fromWireValue);
    }
  });
  return proxy as any;
}

function getTransferables(v: any[]): any[] {
  // FIXME: Don’t use flatMap
  return (v as any).flatMap((v: any) => transferCache.get(v) || []);
}

const transferCache = new WeakMap<any, any[]>();
export function transfer(obj: any, transfers: any[]) {
  transferCache.set(obj, transfers);
  return obj;
}

export const proxyMarker = Symbol("Comlink.proxy");
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

function toWireValue(value: any): Protocol.WireValue {
  if (value && value[proxyMarker]) {
    // TODO: Create `startedMessageChannel()`.
    const { port1, port2 } = new MessageChannel();
    port1.start();
    port2.start();
    expose(value, port1);
    if (!transferCache.has(value)) {
      transferCache.set(value, []);
    }
    transferCache.get(value)!.push(port2);
    return {
      type: Protocol.WireValueType.PROXY,
      endpoint: port2
    };
  }
  return {
    type: Protocol.WireValueType.RAW,
    value
  };
}

function fromWireValue(value: Protocol.WireValue): any {
  switch (value.type) {
    case Protocol.WireValueType.RAW:
      return value.value;
    case Protocol.WireValueType.PROXY:
      (value.endpoint as any).start();
      return wrap(value.endpoint);
    case Protocol.WireValueType.THROW:
      let base = {};
      if (value.isError) {
        base = new Error();
      }
      throw Object.assign(base, value.value);
  }
}

function requestResponseMessage(
  ep: Protocol.Endpoint,
  msg: Protocol.Message,
  transfers?: any[]
): Promise<Protocol.WireValue> {
  return new Promise(resolve => {
    const id = generateUUID();
    ep.postMessage({ id, ...msg }, transfers);
    ep.addEventListener("message", function l(ev: MessageEvent) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l as any);
      resolve(ev.data);
    } as any);
  });
}

function generateUUID(): string {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}
