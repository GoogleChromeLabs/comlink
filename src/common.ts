/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Endpoint,
  WireValue,
  WireValueType,
  ThreadID,
  ProxyID,
} from "./protocol";

export const opch = Symbol("Comlink.optionalChaining");
export const proxyRemoteData = Symbol("Comlink.proxyRemoteData");
export const proxyMarker = Symbol("Comlink.proxy");

export const throwMarker = Symbol("Comlink.thrown");
export const threadId: ThreadID = crypto
  .getRandomValues(new Uint8Array(6))
  .reduce((p, v) => p * 256 + v, 0);

export const tidEndPointMap: Map<ThreadID, Endpoint> = new Map();

export type ProxyRemoteData = {
  controller: IRemoteController;
  pid: ProxyID;
  path: (string | number | symbol)[];
};

export interface IRemoteController {
  register(proxy: Remote, pid: ProxyID, isRoot: boolean): void;
  unregister(pid: ProxyID): Promise<boolean>;
  get(pid: ProxyID, path: (string | number | symbol)[]): Promise<any>;
  set(
    pid: ProxyID,
    path: (string | number | symbol)[],
    rawValue: any
  ): Promise<any>;
  apply(
    pid: ProxyID,
    path: (string | number | symbol)[],
    argArray: any[]
  ): Promise<any>;
  construct(
    pid: ProxyID,
    path: (string | number | symbol)[],
    argArray: any[]
  ): Promise<any>;
}

/**
 * Interface of values that were marked to be proxied with `comlink.proxy()`.
 * Can also be implemented by classes.
 */
export type ProxyMarked<T = any> = T & {
  [proxyMarker]: true;
};
export type UnProxyMarked<T> = T extends ProxyMarked<infer U> ? U : never;

/**
 * Takes a type and wraps it in a Promise, if it not already is one.
 * This is to avoid `Promise<Promise<T>>`.
 *
 * This is the inverse of `Unpromisify<T>`.
 */
type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;
/**
 * Takes a type that may be Promise and unwraps the Promise type.
 * If `P` is not a Promise, it returns `P`.
 *
 * This is the inverse of `Promisify<T>`.
 */
type Unpromisify<P> = P extends Promise<infer T> ? T : P;

/**
 * Expresses that a type can be either a sync or async.
 */
type MaybePromise<T> = Promise<T> | T;

/**
 * Proxies `T` if it is a `ProxyMarked`, clones it otherwise (as handled by structured cloning and transfer handlers).
 */
export type ProxyOrClone<T> = T extends ProxyMarked<infer U>
  ? Remote<U>
  : typeof proxyMarker extends keyof T
  ? Remote<Omit<T, typeof proxyMarker>>
  : T;
/**
 * Inverse of `ProxyOrClone<T>`.
 */
export type UnproxyOrClone<T> = T extends ProxyMethods<infer U>
  ? U extends Function
    ? U | T | ProxyMarked<Local<U>>
    : T | ProxyMarked<Local<T>>
  : T;

declare const remoteMarker: unique symbol;
/**
 * Additional special comlink methods available on each proxy returned by `Comlink.wrap()`.
 */
export interface ProxyMethods<T = any> {
  [Symbol.asyncDispose]: () => Promise<void>;
  [proxyRemoteData]: ProxyRemoteData;
  [remoteMarker]: T;
}

/**
 * Takes the raw type of a remote property and returns the type that is visible to the local thread on the proxy.
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions.
 * See https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type RemoteProperty<T> =
  // If the value is a method, comlink will proxy it automatically.
  // Objects are only proxied if they are marked to be proxied.
  // Otherwise, the property is converted to a Promise that resolves the cloned value.
  T extends ProxyMarked<infer U>
    ? Remote<U> & Promisify<Remote<U>>
    : typeof proxyMarker extends keyof T
    ? Remote<Omit<T, typeof proxyMarker>> &
        Promisify<Remote<Omit<T, typeof proxyMarker>>>
    : T extends Function
    ? Remote<T>
    : T extends object
    ? Remote<T> & Promisify<T>
    : Promisify<T>;

/**
 * Takes the raw type of a remote object in the other thread and returns the type as it is visible to the local thread
 * when proxied with `Comlink.proxy()`.
 *
 * This does not handle call signatures, which is handled by the more general `RemoteCall<T>` type.
 *
 * @template T The raw type of a remote object as seen in the other thread.
 */
type RemoteObject<T> = {
  [P in keyof T]-?: undefined extends T[P]
    ? RemoteProperty<T[P]> & {
        [opch]: RemoteProperty<Exclude<T[P], undefined>>;
      }
    : null extends T[P]
    ? RemoteProperty<T[P]> & {
        [opch]: RemoteProperty<Exclude<T[P], null>>;
      }
    : RemoteProperty<T[P]>;
} & (T extends { [Symbol.iterator](): Iterator<infer U> }
  ? { [Symbol.asyncIterator](): AsyncIterableIterator<U> }
  : T extends { [Symbol.asyncIterator](): AsyncIterableIterator<infer U> }
  ? { [Symbol.asyncIterator](): AsyncIterableIterator<U> }
  : {});

export type RemoteCall<T> = T extends {
  (...args: infer TArguments1): infer TReturn1;
  (...args: infer TArguments2): infer TReturn2;
  (...args: infer TArguments3): infer TReturn3;
}
  ? {
      (
        ...args: {
          [I in keyof TArguments1]: UnproxyOrClone<TArguments1[I]>;
        }
      ): Promisify<ProxyOrClone<Unpromisify<TReturn1>>>;
      (
        ...args: {
          [I in keyof TArguments2]: UnproxyOrClone<TArguments2[I]>;
        }
      ): Promisify<ProxyOrClone<Unpromisify<TReturn2>>>;
      (
        ...args: {
          [I in keyof TArguments3]: UnproxyOrClone<TArguments3[I]>;
        }
      ): Promisify<ProxyOrClone<Unpromisify<TReturn3>>>;
    }
  : unknown;

export type RemoteConstruct<T> = T extends {
  new (...args: infer TArguments1): infer TInstance1;
  new (...args: infer TArguments2): infer TInstance2;
  new (...args: infer TArguments3): infer TInstance3;
}
  ? {
      new (
        ...args: {
          [I in keyof TArguments1]: UnproxyOrClone<TArguments1[I]>;
        }
      ): Promisify<Remote<TInstance1>>;
      new (
        ...args: {
          [I in keyof TArguments2]: UnproxyOrClone<TArguments2[I]>;
        }
      ): Promisify<Remote<TInstance2>>;
      new (
        ...args: {
          [I in keyof TArguments3]: UnproxyOrClone<TArguments3[I]>;
        }
      ): Promisify<Remote<TInstance3>>;
    }
  : unknown;

/**
 * Takes the raw type of a remote object, function or class in the other thread and returns the type as it is visible to
 * the local thread from the proxy return value of `Comlink.wrap()` or `Comlink.proxy()`.
 */
export type Remote<T = any> =
  // Handle properties
  RemoteObject<T> &
    // Handle call signature (if present)
    RemoteCall<T> &
    // Handle construct signature (if present)
    // The return of construct signatures is always proxied (whether marked or not)
    RemoteConstruct<T> &
    // Include additional special comlink methods available on the proxy.
    ProxyMethods<T>;

/**
 * Takes the raw type of a property as a remote thread would see it through a proxy (e.g. when passed in as a function
 * argument) and returns the type that the local thread has to supply.
 *
 * This is the inverse of `RemoteProperty<T>`.
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions. See
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type LocalProperty<T> = T extends Function | ProxyMarked
  ? Local<T>
  : Unpromisify<T>;

/**
 * Takes the type of an object as a remote thread would see it through a proxy (e.g. when passed in as a function
 * argument) and returns the type that the local thread has to supply.
 *
 * This does not handle call signatures, which is handled by the more general `LocalCall<T>` type.
 *
 * This is the inverse of `RemoteObject<T>`.
 *
 * @template T The type of a proxied object.
 */
export type LocalObject<T> = { [P in keyof T]: LocalProperty<T[P]> };

// The raw function could either be sync or async, but is always proxied automatically
export type LocalCall<T> = T extends {
  (...args: infer TArguments1): infer TReturn1;
  (...args: infer TArguments2): infer TReturn2;
  (...args: infer TArguments3): infer TReturn3;
}
  ? {
      (
        ...args: {
          [I in keyof TArguments1]: ProxyOrClone<TArguments1[I]>;
        }
      ): MaybePromise<UnproxyOrClone<Unpromisify<TReturn1>>>;
      (
        ...args: {
          [I in keyof TArguments2]: ProxyOrClone<TArguments2[I]>;
        }
      ): MaybePromise<UnproxyOrClone<Unpromisify<TReturn2>>>;
      (
        ...args: {
          [I in keyof TArguments3]: ProxyOrClone<TArguments3[I]>;
        }
      ): MaybePromise<UnproxyOrClone<Unpromisify<TReturn3>>>;
    }
  : unknown;

// The raw constructor could either be sync or async, but is always proxied automatically
export type LocalConstruct<T> = T extends {
  new (...args: infer TArguments1): infer TInstance1;
  new (...args: infer TArguments2): infer TInstance2;
  new (...args: infer TArguments3): infer TInstance3;
}
  ? {
      new (
        ...args: {
          [I in keyof TArguments1]: ProxyOrClone<TArguments1[I]>;
        }
      ): MaybePromise<Local<Unpromisify<TInstance1>>>;
      new (
        ...args: {
          [I in keyof TArguments2]: ProxyOrClone<TArguments2[I]>;
        }
      ): MaybePromise<Local<Unpromisify<TInstance2>>>;
      new (
        ...args: {
          [I in keyof TArguments3]: ProxyOrClone<TArguments3[I]>;
        }
      ): MaybePromise<Local<Unpromisify<TInstance3>>>;
    }
  : unknown;

/**
 * Takes the raw type of a remote object, function or class as a remote thread would see it through a proxy (e.g. when
 * passed in as a function argument) and returns the type the local thread has to supply.
 *
 * This is the inverse of `Remote<T>`. It takes a `Remote<T>` and returns its original input `T`.
 */
export type Local<T> =
  // Omit the special proxy methods (they don't need to be supplied, comlink adds them)
  T extends ProxyMethods<infer U>
    ? U | Local<U>
    : LocalObject<T> & LocalCall<T> & LocalConstruct<T>;

/**
 * Customizes the serialization of certain values as determined by `canHandle()`.
 *
 * @template T The input type being handled by this transfer handler.
 * @template S The serialized type sent over the wire.
 */
export interface TransferHandler<T, S> {
  /**
   * Gets called for every value to determine whether this transfer handler
   * should serialize the value, which includes checking that it is of the right
   * type (but can perform checks beyond that as well).
   */
  canHandle(value: unknown): value is T;

  /**
   * Gets called with the value if `canHandle()` returned `true` to produce a
   * value that can be sent in a message, consisting of structured-cloneable
   * values and/or transferrable objects.
   */
  serialize(value: T, providerEp: Endpoint): Promise<[S, Transferable[]]>;

  /**
   * Gets called to deserialize an incoming value that was serialized in the
   * other thread with this transfer handler (known through the name it was
   * registered under).
   */
  deserialize(value: S, consumerEp: Endpoint): Promise<T>;
}

/**
 * Allows customizing the serialization of certain values.
 */
export const transferHandlers = new Map<
  string,
  TransferHandler<unknown, unknown>
>();

export function isMessagePort(endpoint: Endpoint): endpoint is MessagePort {
  return endpoint.constructor.name === "MessagePort";
}

export function closeEndPoint(endpoint: Endpoint) {
  if (isMessagePort(endpoint)) endpoint.close();
}

const transferCache = new WeakMap<any, Transferable[]>();
export function transfer<T>(obj: T, transfers: Transferable[]): T {
  transferCache.set(obj, transfers);
  return obj;
}

export async function toWireValue(
  ep: Endpoint,
  value: any
): Promise<[WireValue, Transferable[]]> {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = await handler.serialize(
        value,
        ep
      );
      return [
        {
          type: WireValueType.HANDLER,
          name,
          value: serializedValue,
        },
        transferables,
      ];
    }
  }
  return [
    {
      type: WireValueType.RAW,
      value,
    },
    transferCache.get(value) || [],
  ];
}

export async function fromWireValue<T = any>(
  ep: Endpoint,
  value: WireValue
): Promise<T> {
  switch (value.type) {
    case WireValueType.HANDLER: {
      const handler = transferHandlers.get(value.name)!;
      return (await handler.deserialize(value.value, ep)) as T;
    }
    case WireValueType.RAW:
      return value.value as T;
  }
}

/**
 * Takes the raw type of a remote property and returns the type that is visible to the local thread on the proxy.
 *
 * `Comlink.proxy()` always Promisify
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions.
 * See https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type RemotePoolProperty<T> = T extends ProxyMarked<infer U>
  ? Promisify<Remote<U>>
  : typeof proxyMarker extends keyof T
  ? Promisify<Remote<Omit<T, typeof proxyMarker>>>
  : T extends Function
  ? RemotePool<T>
  : T extends object
  ? RemotePool<T> & Promisify<T>
  : Promisify<T>;

/**
 * Takes the raw type of a remote object in the other thread and returns the type as it is visible to the local thread.
 * All property is marked as readonly.
 *
 * This does not handle call signatures, which is handled by `RemoteCall<T>` type.
 *
 * @template T The raw type of a remote object as seen in the other thread.
 */
type RemotePoolObject<T> = {
  readonly [P in keyof T]-?: undefined extends T[P]
    ? RemotePoolProperty<T[P]> & {
        [opch]: RemotePoolProperty<Exclude<Exclude<T[P], undefined>, null>>;
      }
    : null extends T[P]
    ? RemotePoolProperty<T[P]> & {
        [opch]: RemotePoolProperty<Exclude<Exclude<T[P], undefined>, null>>;
      }
    : RemotePoolProperty<T[P]>;
} & (T extends { [Symbol.iterator](): Iterator<infer U> }
  ? { [Symbol.asyncIterator](): AsyncIterableIterator<U> }
  : T extends { [Symbol.asyncIterator](): AsyncIterableIterator<infer U> }
  ? { [Symbol.asyncIterator](): AsyncIterableIterator<U> }
  : {});

/**
 * Takes the raw type of a remote object, function or class in the other thread and returns the type as it is visible to
 * the local thread from the proxy return value of `Comlink.pool()`.
 */
export type RemotePool<T = any> =
  // Handle properties
  RemotePoolObject<T> &
    // Handle call signature (if present)
    RemoteCall<T> &
    // Handle construct signature (if present)
    // The return of construct signatures is always proxied (whether marked or not)
    RemoteConstruct<T> &
    // Include additional special comlink methods available on the proxy.
    ProxyMethods<T>;
