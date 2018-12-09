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
import { transferableProperties } from "./transferables";
import { proxyValueSymbol } from "./symbols";
import { unwrapValue, wrapValue } from "./wrapper";
import { activateEndpoint, Endpoint, validateEndpoint } from "./endpoint";
import { attachMessageHandler, pingPongMessage } from "./messaging";
import { processInvocationRequest } from "./invocation";
import { proxyObject } from "./proxy";

// To avoid Promise<Promise<T>>
type Promisify<T> = T extends Promise<any> ? T : Promise<T>;

// ProxiedObject<T> is equivalent to T, except that all properties are now promises and
// all functions now return promises. It effectively async-ifies an object.
type ProxiedObject<T> = {
  [P in keyof T]: T[P] extends (...args: infer Arguments) => infer R
    ? (...args: Arguments) => Promisify<R>
    : Promisify<T[P]>
};

// ProxyResult<T> is an augmentation of ProxyObject<T> that also handles raw functions
// and classes correctly.
type ProxyResult<T> = ProxiedObject<T> &
  (T extends (...args: infer Arguments) => infer R
    ? (...args: Arguments) => Promisify<R>
    : unknown) &
  (T extends { new (...args: infer ArgumentsType): infer InstanceType }
    ? { new (...args: ArgumentsType): Promisify<ProxiedObject<InstanceType>> }
    : unknown);

export function proxy<T = any>(
  endpointOrWindow: Endpoint | Window,
  target?: any
): ProxyResult<T> {
  const endpoint = validateEndpoint(endpointOrWindow);
  activateEndpoint(endpoint);
  return proxyObject(target, iRequest => {
    return pingPongMessage(endpoint, iRequest).then(iResponse => {
      return unwrapValue(iResponse.value);
    });
  }) as ProxyResult<T>;
}

export function proxyValue<T>(obj: T): T {
  (obj as any)[proxyValueSymbol] = true;
  return obj;
}

type Exposable = Function | Object; // eslint-disable-line no-unused-vars

export function expose(
  rootObj: Exposable,
  endpointOrWindow: Endpoint | Window
): void {
  const endpoint = validateEndpoint(endpointOrWindow);
  activateEndpoint(endpoint);
  attachMessageHandler(endpoint, function(event: MessageEvent) {
    if ("id" in event.data && "callPath" in event.data) {
      processInvocationRequest(rootObj, event.data).then(iResult => {
        endpoint.postMessage(iResult, transferableProperties([iResult]));
      });
    }
  });
}
