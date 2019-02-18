/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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

export interface Endpoint {
  postMessage(message: any, transfer?: any[]): void;

  addEventListener(
    type: "message",
    listener: (this: MessagePort, ev: MessageEvent) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "message",
    listener: (this: MessagePort, ev: MessageEvent) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

// To avoid Promise<Promise<T>>
type Promisify<T> = Promise<Unpromisify<T>>;
type Unpromisify<P> = P extends Promise<infer T> ? T : P;

/**
 * Symbol that gets added to objects by `Comlink.proxy()`.
 */
export const proxyValueSymbol = Symbol("comlinkProxyValue");

/**
 * Object that was wrapped with `Comlink.proxy()`.
 */
export interface ProxyValue {
  [proxyValueSymbol]: true;
}

/**
 * Returns true if the given value has the proxy value symbol added to it.
 */
const isProxyValue = (value: any): value is ProxyValue =>
  !!value && value[proxyValueSymbol] === true;

// This needs to be its own type alias, otherwise it will not distribute over unions
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
type ProxyProperty<T> = T extends Function | ProxyValue
  ? ProxyResult<T>
  : Promisify<T>;
type UnproxyProperty<T> = T extends Function | ProxyValue
  ? ProxyInput<T>
  : Unpromisify<T>;

/**
 * `ProxiedObject<T>` is equivalent to `T`, except that all properties are now promises and
 * all functions now return promises, except if they were wrapped with `Comlink.proxyValue()`.
 * It effectively async-ifies an object.
 */
export type ProxiedObject<T> = { [P in keyof T]: ProxyProperty<T[P]> };
/**
 * Inverse of `ProxiedObject<T>`
 */
export type UnwrapProxiedObject<T> = { [P in keyof T]: UnproxyProperty<T[P]> };

/**
 * Proxies `T` if it is a ProxyValue, clones it otherwise.
 */
export type ProxyOrClone<T> = T extends ProxyValue ? ProxyResult<T> : T;
export type UnproxyOrClone<T> = T extends ProxiedObject<ProxyValue>
  ? ProxyInput<T>
  : T;

/**
 * The inverse of `ProxyResult<T>`.
 * Takes a `ProxyResult<T>` and returns its original input `T`.
 */
export type ProxyInput<R> = UnwrapProxiedObject<R> &
  (R extends (...args: infer Arguments) => infer R
    ? (
        ...args: { [I in keyof Arguments]: ProxyOrClone<Arguments[I]> }
      ) =>
        | UnproxyOrClone<Unpromisify<R>>
        | Promise<UnproxyOrClone<Unpromisify<R>>>
    : unknown);
/**
 * `ProxyResult<T>` is an augmentation of `ProxyObject<T>` that also handles raw functions
 * and classes correctly.
 */
export type ProxyResult<T> = ProxiedObject<T> &
  (T extends (...args: infer Arguments) => infer R
    ? (
        ...args: { [I in keyof Arguments]: UnproxyOrClone<Arguments[I]> }
      ) => Promisify<ProxyOrClone<R>>
    : unknown) &
  (T extends { new (...args: infer ArgumentsType): infer InstanceType }
    ? {
        new (
          ...args: {
            [I in keyof ArgumentsType]: UnproxyOrClone<ArgumentsType[I]>
          }
        ): Promisify<ProxiedObject<InstanceType>>;
      }
    : unknown);

export type Proxy = Function;
type CBProxyCallback = (bpcd: CBProxyCallbackDescriptor) => {}; // eslint-disable-line no-unused-vars
type Transferable = MessagePort | ArrayBuffer; // eslint-disable-line no-unused-vars
export type Exposable = Function | Object; // eslint-disable-line no-unused-vars

interface InvocationResult {
  id?: string;
  value: WrappedValue;
}

type WrappedValue = RawWrappedValue | HandledWrappedValue;

interface PropertyIteratorEntry {
  value: {};
  path: string[];
}

interface WrappedChildValue {
  path: string[];
  wrappedValue: HandledWrappedValue;
}

interface RawWrappedValue {
  type: "RAW";
  value: {};
  wrappedChildren?: WrappedChildValue[];
}

interface HandledWrappedValue {
  type: string;
  value: {};
}

type CBProxyCallbackDescriptor =
  | CBPCDGet
  | CBPCDApply
  | CBPCDConstruct
  | CBPCDSet; // eslint-disable-line no-unused-vars

interface CBPCDGet {
  type: "GET";
  callPath: PropertyKey[];
}

interface CBPCDApply {
  type: "APPLY";
  callPath: PropertyKey[];
  argumentsList: {}[];
}

interface CBPCDConstruct {
  type: "CONSTRUCT";
  callPath: PropertyKey[];
  argumentsList: {}[];
}

interface CBPCDSet {
  type: "SET";
  callPath: PropertyKey[];
  property: PropertyKey;
  value: {};
}

type InvocationRequest =
  | GetInvocationRequest
  | ApplyInvocationRequest
  | ConstructInvocationRequest
  | SetInvocationRequest;

interface GetInvocationRequest {
  id?: string;
  type: "GET";
  callPath: PropertyKey[];
}

interface ApplyInvocationRequest {
  id?: string;
  type: "APPLY";
  callPath: PropertyKey[];
  argumentsList: WrappedValue[];
}

interface ConstructInvocationRequest {
  id?: string;
  type: "CONSTRUCT";
  callPath: PropertyKey[];
  argumentsList: WrappedValue[];
}

interface SetInvocationRequest {
  id?: string;
  type: "SET";
  callPath: PropertyKey[];
  property: PropertyKey;
  value: WrappedValue;
}

export interface TransferHandler {
  canHandle: (obj: {}) => Boolean;
  serialize: (obj: {}) => {};
  deserialize: (obj: {}) => {};
}

const TRANSFERABLE_TYPES = ["ArrayBuffer", "MessagePort", "OffscreenCanvas"]
  .filter(f => f in self)
  .map(f => (self as any)[f]);
const uid: number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

const throwSymbol = Symbol("throw");
const proxyTransferHandler: TransferHandler = {
  canHandle: isProxyValue,
  serialize: (obj: {}): {} => {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return port2;
  },
  deserialize: (obj: {}): {} => {
    return proxy(obj as MessagePort);
  }
};

const throwTransferHandler = {
  canHandle: (obj: {}): Boolean => obj && (obj as any)[throwSymbol],
  serialize: (obj: any): {} => {
    const message = obj && obj.message;
    const stack = obj && obj.stack;
    return Object.assign({}, obj, { message, stack });
  },
  deserialize: (obj: {}): {} => {
    throw Object.assign(Error(), obj);
  }
};

export const transferHandlers: Map<string, TransferHandler> = new Map([
  ["PROXY", proxyTransferHandler],
  ["THROW", throwTransferHandler]
]);

let pingPongMessageCounter: number = 0;

export function proxy<T = any>(
  endpoint: Endpoint | Window,
  target?: any
): ProxyResult<T> {
  if (isWindow(endpoint)) endpoint = windowEndpoint(endpoint);
  if (!isEndpoint(endpoint))
    throw Error(
      "endpoint does not have all of addEventListener, removeEventListener and postMessage defined"
    );

  activateEndpoint(endpoint);
  return cbProxy(
    async irequest => {
      let args: WrappedValue[] = [];
      if (irequest.type === "APPLY" || irequest.type === "CONSTRUCT")
        args = irequest.argumentsList.map(wrapValue);
      const response = await pingPongMessage(
        endpoint as Endpoint,
        Object.assign({}, irequest, { argumentsList: args }),
        transferableProperties(args)
      );
      const result = response.data as InvocationResult;
      return unwrapValue(result.value);
    },
    [],
    target
  ) as ProxyResult<T>;
}

export function proxyValue<T>(obj: T): T & ProxyValue {
  const proxyVal = obj as T & ProxyValue;
  proxyVal[proxyValueSymbol] = true;
  return proxyVal;
}

export function expose(rootObj: Exposable, endpoint: Endpoint | Window): void {
  if (isWindow(endpoint)) endpoint = windowEndpoint(endpoint);
  if (!isEndpoint(endpoint))
    throw Error(
      "endpoint does not have all of addEventListener, removeEventListener and postMessage defined"
    );

  activateEndpoint(endpoint);
  attachMessageHandler(endpoint, async function(event: MessageEvent) {
    if (!event.data.id || !event.data.callPath) return;
    const irequest = event.data as InvocationRequest;
    let that = await irequest.callPath
      .slice(0, -1)
      .reduce((obj, propName) => obj[propName], rootObj as any);
    let obj = await irequest.callPath.reduce(
      (obj, propName) => obj[propName],
      rootObj as any
    );
    let iresult = obj;
    let args: {}[] = [];

    if (irequest.type === "APPLY" || irequest.type === "CONSTRUCT")
      args = irequest.argumentsList.map(unwrapValue);
    if (irequest.type === "APPLY") {
      try {
        iresult = await obj.apply(that, args);
      } catch (e) {
        iresult = e;
        iresult[throwSymbol] = true;
      }
    }
    if (irequest.type === "CONSTRUCT") {
      try {
        iresult = new obj(...args); // eslint-disable-line new-cap
        iresult = proxyValue(iresult);
      } catch (e) {
        iresult = e;
        iresult[throwSymbol] = true;
      }
    }
    if (irequest.type === "SET") {
      obj[irequest.property] = irequest.value;
      // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
      iresult = true;
    }

    iresult = makeInvocationResult(iresult);
    iresult.id = irequest.id;
    return (endpoint as Endpoint).postMessage(
      iresult,
      transferableProperties([iresult])
    );
  });
}

function wrapValue(arg: {}): WrappedValue {
  // Is arg itself handled by a TransferHandler?
  for (const [key, transferHandler] of transferHandlers) {
    if (transferHandler.canHandle(arg)) {
      return {
        type: key,

        value: transferHandler.serialize(arg)
      };
    }
  }

  // If not, traverse the entire object and find handled values.
  let wrappedChildren: WrappedChildValue[] = [];
  for (const item of iterateAllProperties(arg)) {
    for (const [key, transferHandler] of transferHandlers) {
      if (transferHandler.canHandle(item.value)) {
        wrappedChildren.push({
          path: item.path,
          wrappedValue: {
            type: key,
            value: transferHandler.serialize(item.value)
          }
        });
      }
    }
  }
  for (const wrappedChild of wrappedChildren) {
    const container = wrappedChild.path
      .slice(0, -1)
      .reduce((obj, key) => obj[key], arg as any);
    container[wrappedChild.path[wrappedChild.path.length - 1]] = null;
  }
  return {
    type: "RAW",
    value: arg,
    wrappedChildren
  };
}

function unwrapValue(arg: WrappedValue): {} {
  if (transferHandlers.has(arg.type)) {
    const transferHandler = transferHandlers.get(arg.type)!;
    return transferHandler.deserialize(arg.value);
  } else if (isRawWrappedValue(arg)) {
    for (const wrappedChildValue of arg.wrappedChildren || []) {
      if (!transferHandlers.has(wrappedChildValue.wrappedValue.type))
        throw Error(
          `Unknown value type "${arg.type}" at ${wrappedChildValue.path.join(
            "."
          )}`
        );
      const transferHandler = transferHandlers.get(
        wrappedChildValue.wrappedValue.type
      )!;
      const newValue = transferHandler.deserialize(
        wrappedChildValue.wrappedValue.value
      );
      replaceValueInObjectAtPath(arg.value, wrappedChildValue.path, newValue);
    }
    return arg.value;
  } else {
    throw Error(`Unknown value type "${arg.type}"`);
  }
}

function replaceValueInObjectAtPath(obj: {}, path: string[], newVal: {}) {
  const lastKey = path.slice(-1)[0];
  const lastObj = path
    .slice(0, -1)
    .reduce((obj: any, key: string) => obj[key], obj);
  lastObj[lastKey] = newVal;
}

function isRawWrappedValue(arg: WrappedValue): arg is RawWrappedValue {
  return arg.type === "RAW";
}

function windowEndpoint(w: Window): Endpoint {
  if (self.constructor.name !== "Window") throw Error("self is not a window");
  return {
    addEventListener: self.addEventListener.bind(
      self
    ) as Endpoint["addEventListener"],
    removeEventListener: self.removeEventListener.bind(
      self
    ) as Endpoint["removeEventListener"],
    postMessage: (msg, transfer) => w.postMessage(msg, "*", transfer)
  };
}

export function isEndpoint(endpoint: any): endpoint is Endpoint {
  return (
    "addEventListener" in endpoint &&
    "removeEventListener" in endpoint &&
    "postMessage" in endpoint
  );
}

function activateEndpoint(endpoint: Endpoint): void {
  if (isMessagePort(endpoint)) endpoint.start();
}

function attachMessageHandler(
  endpoint: Endpoint,
  f: (e: MessageEvent) => void
): void {
  // Checking all possible types of `endpoint` manually satisfies TypeScript’s
  // type checker. Not sure why the inference is failing here. Since it’s
  // unnecessary code I’m going to resort to `any` for now.
  // if(isWorker(endpoint))
  //   endpoint.addEventListener('message', f);
  // if(isMessagePort(endpoint))
  //   endpoint.addEventListener('message', f);
  // if(isOtherWindow(endpoint))
  //   endpoint.addEventListener('message', f);
  (endpoint as any).addEventListener("message", f);
}

function detachMessageHandler(
  endpoint: Endpoint,
  f: (e: MessageEvent) => void
): void {
  // Same as above.
  (<any>endpoint).removeEventListener("message", f);
}

function isMessagePort(endpoint: Endpoint): endpoint is MessagePort {
  return (
    typeof (endpoint as MessagePort).start === "function" &&
    typeof (endpoint as MessagePort).close === "function"
  );
}

function isWindow(endpoint: Endpoint | Window): endpoint is Window {
  // TODO: This doesn’t work on cross-origin iframes.
  // return endpoint.constructor.name === 'Window';
  return ["window", "length", "location", "parent", "opener"].every(
    prop => prop in endpoint
  );
}

/**
 * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
 * identified by a unique id that is attached to the payload.
 */
function pingPongMessage(
  endpoint: Endpoint,
  msg: Object,
  transferables: Transferable[]
): Promise<MessageEvent> {
  const id = `${uid}-${pingPongMessageCounter++}`;

  return new Promise(resolve => {
    attachMessageHandler(endpoint, function handler(event: MessageEvent) {
      if (event.data.id !== id) return;
      detachMessageHandler(endpoint, handler);
      resolve(event);
    });

    // Copy msg and add `id` property
    msg = Object.assign({}, msg, { id });
    endpoint.postMessage(msg, transferables);
  });
}

function cbProxy(
  cb: CBProxyCallback,
  callPath: PropertyKey[] = [],
  target = function() {}
): Proxy {
  return new Proxy(target, {
    construct(_target, argumentsList, proxy) {
      return cb({
        type: "CONSTRUCT",
        callPath,
        argumentsList
      });
    },
    apply(_target, _thisArg, argumentsList) {
      // We use `bind` as an indicator to have a remote function bound locally.
      // The actual target for `bind()` is currently ignored.
      if (callPath[callPath.length - 1] === "bind")
        return cbProxy(cb, callPath.slice(0, -1));
      return cb({
        type: "APPLY",
        callPath,
        argumentsList
      });
    },
    get(_target, property, proxy) {
      if (property === "then" && callPath.length === 0) {
        return { then: () => proxy };
      } else if (property === "then") {
        const r = cb({
          type: "GET",
          callPath
        });
        return Promise.resolve(r).then.bind(r);
      } else {
        return cbProxy(cb, callPath.concat(property), (<any>_target)[property]);
      }
    },
    set(_target, property, value, _proxy): boolean {
      return cb({
        type: "SET",
        callPath,
        property,
        value
      }) as boolean;
    }
  });
}

function isTransferable(thing: {}): thing is Transferable {
  return TRANSFERABLE_TYPES.some(type => thing instanceof type);
}

function* iterateAllProperties(
  value: {} | undefined,
  path: string[] = [],
  visited: WeakSet<{}> | null = null
): Iterable<PropertyIteratorEntry> {
  if (!value) return;
  if (!visited) visited = new WeakSet<{}>();
  if (visited.has(value)) return;
  if (typeof value === "string") return;
  if (typeof value === "object") visited.add(value);
  if (ArrayBuffer.isView(value)) return;
  yield { value, path };

  const keys = Object.keys(value);
  for (const key of keys)
    yield* iterateAllProperties((value as any)[key], [...path, key], visited);
}

function transferableProperties(obj: {}[] | undefined): Transferable[] {
  const r: Transferable[] = [];
  for (const prop of iterateAllProperties(obj)) {
    if (isTransferable(prop.value)) r.push(prop.value);
  }
  return r;
}

function makeInvocationResult(obj: {}): InvocationResult {
  for (const [type, transferHandler] of transferHandlers) {
    if (transferHandler.canHandle(obj)) {
      const value = transferHandler.serialize(obj);
      return {
        value: { type, value }
      };
    }
  }

  return {
    value: {
      type: "RAW",
      value: obj
    }
  };
}
