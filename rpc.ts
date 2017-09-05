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
const uid: number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
let pingPongMessageCounter: number = 0;

export type Proxy = Function;
export type Endpoint = MessagePort | Worker | Window;

interface InvocationProxyResult {
  type: "PROXY";
  endpoint: Endpoint;
}

interface InvocationObjectResult {
  type: "OBJECT";
  obj: any;
}

type InvocationResult = InvocationProxyResult | InvocationObjectResult;

declare global {
  interface SymbolConstructor {
    readonly asyncIterator: symbol;
  }

  interface ObjectConstructor {
    assign(... objects: Object[]): Object;
    values(o: any): string[];
  }
}

/**
 * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
 * identified by a unique id that is attached to the payload.
 */
function pingPongMessage(endpoint: Endpoint, msg: Object, transferables: any[]): Promise<MessageEvent> {
  const id = `${uid}-${pingPongMessageCounter++}`;

  return new Promise(resolve => {
    endpoint.addEventListener('message', function handler(event: MessageEvent) {
      if (event.data.id !== id)
        return;
      endpoint.removeEventListener('message', handler);
      resolve(event);
    });

    // Copy msg and add `id` property
    msg = Object.assign({}, msg, {id});
    if (endpoint instanceof Window)
      endpoint.postMessage(msg, '*', transferables);
    else
      endpoint.postMessage(msg, transferables);
  });
}

function asyncIteratorSupport(): Boolean {
  return 'asyncIterator' in Symbol;
}

/**
 * `batchingProxy` creates a ES6 Proxy that batches `get`s until either
 * `construct` or `apply` is called. At that point the callback is invoked with
 * the accumulated call path.
 */
type BatchingProxyCallback = (method: string, callPath: PropertyKey[], argumentsList?: any[]) => any;

function batchingProxy(cb: BatchingProxyCallback): Proxy {
  let callPath: PropertyKey[] = [];
  return new Proxy(function() {}, {
    construct(_target, argumentsList, proxy) {
      const r = cb('CONSTRUCT', callPath, argumentsList);
      callPath = [];
      return r;
    },
    apply(_target, _thisArg, argumentsList) {
      const r = cb('APPLY', callPath, argumentsList);
      callPath = [];
      return r;
    },
    get(_target, property, proxy) {
      // `await tasklets.addModule(...)` will try to get the `then` property
      // of the return value of `addModule(...)` and then invoke it as a
      // function. This works. Sorry.
      /*if (property === 'then' && callPath.length === 0) {
        return {then: _ => proxy};
      } else*/ if (asyncIteratorSupport() && property === Symbol.asyncIterator) {
        // For now, only async generators use `Symbol.asyncIterator` and they
        // return themselves, so we emulate that behavior here.
        return () => proxy;
      } else if (property === 'then') {
        const r = cb('GET', callPath);
        callPath = [];
        return Promise.resolve(r).then.bind(r);
      } else {
        callPath.push(property);
        return proxy;
      }
    },
  });
}

export const TRANSFERABLE_TYPES = [ArrayBuffer, MessagePort];
function isTransferable(thing: any): Boolean {
  return TRANSFERABLE_TYPES.some(type => thing instanceof type);
}

function* iterateAllProperties(obj: any): Iterable<any> {
  if (!obj)
    return;
  if (typeof obj === 'string')
    return;
  yield obj;
  let vals = Object.values(obj);
  if (Array.isArray(obj))
    vals = obj;

  for (const val of vals)
    yield* iterateAllProperties(val);
}

function transferableProperties(obj: any): any[] {
  return Array.from(iterateAllProperties(obj))
    .filter(val => isTransferable(val));
}

// function hydrateTransferProxies(obj) {
//   // TODO This needs to be a tree-walk, when the worker performs a tree walk.
//   const transferProxyPort = obj && obj['__transfer_proxy_port'];
//   if (transferProxyPort)
//     return batchingProxy(resolveFunction(transferProxyPort));

//   return obj;
// }

// function resolveFunction(port) {
//   port.start();
//   return ;
// }

export function proxy(endpoint: Endpoint): Proxy {
  if(endpoint instanceof MessagePort)
    endpoint.start();
  return batchingProxy(async (type, callPath, argumentsList) => {
    const response = await pingPongMessage(
      endpoint,
      {
        type,
        callPath,
        argumentsList,
      },
      transferableProperties(argumentsList)
    );
    const result = response.data as InvocationResult;
    if (result.type === 'PROXY')
      return proxy(result.endpoint);
    return result.obj;
  });
}

