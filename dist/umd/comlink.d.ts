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
    addEventListener(type: "message", listener: (this: MessagePort, ev: MessageEvent) => any, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: "message", listener: (this: MessagePort, ev: MessageEvent) => any, options?: boolean | AddEventListenerOptions): void;
}
declare type Promisify<T> = Promise<Unpromisify<T>>;
declare type Unpromisify<P> = P extends Promise<infer T> ? T : P;
/**
 * Symbol that gets added to objects by `Comlink.proxy()`.
 */
export declare const proxyValueSymbol: unique symbol;
/**
 * Object that was wrapped with `Comlink.proxy()`.
 */
export interface ProxyValue {
    [proxyValueSymbol]: true;
}
declare type ProxyProperty<T> = T extends Function | ProxyValue ? ProxyResult<T> : Promisify<T>;
declare type UnproxyProperty<T> = T extends Function | ProxyValue ? ProxyInput<T> : Unpromisify<T>;
/**
 * `ProxiedObject<T>` is equivalent to `T`, except that all properties are now promises and
 * all functions now return promises, except if they were wrapped with `Comlink.proxyValue()`.
 * It effectively async-ifies an object.
 */
export declare type ProxiedObject<T> = {
    [P in keyof T]: ProxyProperty<T[P]>;
};
/**
 * Inverse of `ProxiedObject<T>`
 */
export declare type UnwrapProxiedObject<T> = {
    [P in keyof T]: UnproxyProperty<T[P]>;
};
/**
 * Proxies `T` if it is a ProxyValue, clones it otherwise.
 */
export declare type ProxyOrClone<T> = T extends ProxyValue ? ProxyResult<T> : T;
export declare type UnproxyOrClone<T> = T extends ProxiedObject<ProxyValue> ? ProxyInput<T> : T;
/**
 * The inverse of `ProxyResult<T>`.
 * Takes a `ProxyResult<T>` and returns its original input `T`.
 */
export declare type ProxyInput<R> = UnwrapProxiedObject<R> & (R extends (...args: infer Arguments) => infer R ? (...args: {
    [I in keyof Arguments]: ProxyOrClone<Arguments[I]>;
}) => UnproxyOrClone<Unpromisify<R>> | Promise<UnproxyOrClone<Unpromisify<R>>> : unknown);
/**
 * `ProxyResult<T>` is an augmentation of `ProxyObject<T>` that also handles raw functions
 * and classes correctly.
 */
export declare type ProxyResult<T> = ProxiedObject<T> & (T extends (...args: infer Arguments) => infer R ? (...args: {
    [I in keyof Arguments]: UnproxyOrClone<Arguments[I]>;
}) => Promisify<ProxyOrClone<R>> : unknown) & (T extends {
    new (...args: infer ArgumentsType): infer InstanceType;
} ? {
    new (...args: {
        [I in keyof ArgumentsType]: UnproxyOrClone<ArgumentsType[I]>;
    }): Promisify<ProxiedObject<InstanceType>>;
} : unknown);
export declare type Proxy = Function;
export declare type Exposable = Function | Object;
export interface TransferHandler {
    canHandle: (obj: {}) => Boolean;
    serialize: (obj: {}) => {};
    deserialize: (obj: {}) => {};
}
export declare const transferHandlers: Map<string, TransferHandler>;
export declare function proxy<T = any>(endpoint: Endpoint | Window, target?: any): ProxyResult<T>;
export declare function proxyValue<T>(obj: T): T & ProxyValue;
export declare function expose(rootObj: Exposable, endpoint: Endpoint | Window): void;
export declare function isEndpoint(endpoint: any): endpoint is Endpoint;
export {};
