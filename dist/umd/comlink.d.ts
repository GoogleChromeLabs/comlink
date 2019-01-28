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
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
}
declare type Promisify<T> = T extends Promise<any> ? T : Promise<T>;
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
/** Helper that omits all keys K from object T */
declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/**
 * `ProxiedObject<T>` is equivalent to `T`, except that all properties are now promises and
 * all functions now return promises, except if they were wrapped with `Comlink.proxyValue()`.
 * It effectively async-ifies an object.
 */
declare type ProxiedObject<T> = {
    [P in keyof T]: T[P] extends (...args: infer Arguments) => infer R ? (...args: Arguments) => Promisify<R> : (T[P] extends ProxyValue ? ProxiedObject<Omit<T[P], keyof ProxyValue>> : Promisify<T[P]>);
};
/**
 * ProxyResult<T> is an augmentation of ProxyObject<T> that also handles raw functions
 * and classes correctly.
 */
export declare type ProxyResult<T> = ProxiedObject<T> & (T extends (...args: infer Arguments) => infer R ? (...args: Arguments) => Promisify<R> : unknown) & (T extends {
    new (...args: infer ArgumentsType): infer InstanceType;
} ? {
    new (...args: ArgumentsType): Promisify<ProxiedObject<InstanceType>>;
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
export {};
