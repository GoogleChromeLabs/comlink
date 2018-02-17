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
export declare type Proxy = Function;
export declare type Exposable = Function | Object;
export interface TransferHandler {
    canHandle: (obj: {}) => Boolean;
    serialize: (obj: {}) => {};
    deserialize: (obj: {}) => {};
}
export declare const Comlink: {
    proxy: (endpoint: Window | Endpoint) => Function;
    proxyValue: <T>(obj: T) => T;
    transferHandlers: Map<string, TransferHandler>;
    expose: (rootObj: Exposable, endpoint: Window | Endpoint) => void;
};
