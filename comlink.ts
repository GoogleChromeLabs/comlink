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
export type Proxy = Function;
type InvocationType = 'CONSTRUCT' | 'GET' | 'APPLY';
type InvocationResult = InvocationProxyResult | InvocationObjectResult;
type BatchingProxyCallback = (method: InvocationType, callPath: PropertyKey[], argumentsList?: {}[]) => {}; // eslint-disable-line no-unused-vars
type Transferable = MessagePort | ArrayBuffer; // eslint-disable-line no-unused-vars
type Exposable = Function | Object; // eslint-disable-line no-unused-vars


interface InvocationProxyResult {
  id?: string;
  type: 'PROXY';
  endpoint: Endpoint;
}

interface InvocationObjectResult {
  id?: string;
  type: 'OBJECT';
  obj: {};
}

interface InvocationRequest {
  id?: string;
  type: InvocationType;
  callPath: PropertyKey[];
  argumentsList?: {}[];
}

export const Comlink = (function() {
  const uid: number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  let pingPongMessageCounter: number = 0;
  const TRANSFERABLE_TYPES = [ArrayBuffer, MessagePort];
  const proxyValueSymbol = Symbol('proxyValue');

  /* export */ function proxy(endpoint: Endpoint | Window): Proxy {
    if (isWindow(endpoint))
      endpoint = windowEndpoint(endpoint);
    if (!isEndpoint(endpoint))
      throw Error('endpoint does not have all of addEventListener, removeEventListener and postMessage defined');
    activateEndpoint(endpoint);
    return batchingProxy(async (type, callPath, argumentsList) => {
      const response = await pingPongMessage(
        endpoint as Endpoint,
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

  /* export */ function proxyValue(obj: {}): {} {
    (obj as any)[proxyValueSymbol] = true;
    return obj;
  }

  /* export */ function expose(rootObj: Exposable, endpoint: Endpoint | Window): void {
    if (isWindow(endpoint))
      endpoint = windowEndpoint(endpoint);
    if (!isEndpoint(endpoint))
      throw Error('endpoint does not have all of addEventListener, removeEventListener and postMessage defined');
    activateEndpoint(endpoint);
    attachMessageHandler(endpoint, async function(event: MessageEvent) {
      if (!event.data.id)
        return;
      const irequest = event.data as InvocationRequest;
      let obj = await irequest.callPath.reduce((obj, propName) => obj[propName], rootObj as any);
      switch (irequest.type) {
        case 'APPLY': {
          irequest.callPath.pop();
          const that = await irequest.callPath.reduce((obj, propName) => obj[propName], rootObj as any) as {};
          const isAsyncGenerator = obj.constructor.name === 'AsyncGeneratorFunction';
          obj = await obj.apply(that, irequest.argumentsList);
          // If the function being called is an async generator, proxy the
          // result.
          if (isAsyncGenerator)
            obj = proxyValue(obj);
        } // fallthrough!
        case 'GET': {
          const iresult = makeInvocationResult(obj);
          iresult.id = irequest.id;
          return (endpoint as Endpoint).postMessage(iresult, transferableProperties([iresult]));
        }
        case 'CONSTRUCT': {
          const instance = new obj(...(irequest.argumentsList || [])); // eslint-disable-line new-cap
          const {port1, port2} = new MessageChannel();
          expose(instance, port1);
          return (endpoint as Endpoint).postMessage(
            {
              id: irequest.id,
              type: 'PROXY',
              endpoint: port2,
            },
            [port2]
          );
        }
      }
    });
  }

  function windowEndpoint(w: Window): Endpoint {
    if (self.constructor.name !== 'Window')
      throw Error('self is not a window');
    return {
      addEventListener: self.addEventListener.bind(self),
      removeEventListener: self.removeEventListener.bind(self),
      postMessage: (msg, transfer) => w.postMessage(msg, '*', transfer),
    };
  }

  function isEndpoint(endpoint: any): endpoint is Endpoint {
    return 'addEventListener' in endpoint && 'removeEventListener' in endpoint && 'postMessage' in endpoint;
  }

  function activateEndpoint(endpoint: Endpoint): void {
    if (isMessagePort(endpoint))
      endpoint.start();
  }

  function attachMessageHandler(endpoint: Endpoint, f: (e: MessageEvent) => void): void {
    // Checking all possible types of `endpoint` manually satisfies TypeScript’s
    // type checker. Not sure why the inference is failing here. Since it’s
    // unnecessary code I’m going to resort to `any` for now.
    // if(isWorker(endpoint))
    //   endpoint.addEventListener('message', f);
    // if(isMessagePort(endpoint))
    //   endpoint.addEventListener('message', f);
    // if(isOtherWindow(endpoint))
    //   endpoint.addEventListener('message', f);
    (<any>endpoint).addEventListener('message', f);
  }

  function detachMessageHandler(endpoint: Endpoint, f: (e: MessageEvent) => void): void {
    // Same as above.
    (<any>endpoint).removeEventListener('message', f);
  }

  function isMessagePort(endpoint: Endpoint): endpoint is MessagePort {
    return endpoint.constructor.name === 'MessagePort';
  }

  function isWindow(endpoint: Endpoint | Window): endpoint is Window {
    // TODO: This doesn’t work on cross-origin iframes.
    // Is `'window' in endpoint` ok?
    // return endpoint.constructor.name === 'Window';
    return 'window' in endpoint;
  }

  /**
   * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
   * identified by a unique id that is attached to the payload.
   */
  function pingPongMessage(endpoint: Endpoint, msg: Object, transferables: Transferable[]): Promise<MessageEvent> {
    const id = `${uid}-${pingPongMessageCounter++}`;

    return new Promise(resolve => {
      attachMessageHandler(endpoint, function handler(event: MessageEvent) {
        if (event.data.id !== id)
          return;
        detachMessageHandler(endpoint, handler);
        resolve(event);
      });

      // Copy msg and add `id` property
      msg = Object.assign({}, msg, {id});
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
  function batchingProxy(cb: BatchingProxyCallback): Proxy {
    let callPath: PropertyKey[] = [];
    return new Proxy(function() {}, {
      construct(_target, argumentsList, proxy) {
        const r = cb('CONSTRUCT', callPath, argumentsList);
        callPath = [];
        return r;
      },
      apply(_target, _thisArg, argumentsList) {
        // We use `bind` as an indicator to have a remote function bound locally.
        // The actual target for `bind()` is currently ignored.
        if (callPath[callPath.length - 1] === 'bind') {
          const localCallPath = callPath.slice();
          callPath = [];
          return (...args: {}[]) => cb('APPLY', localCallPath.slice(0, -1), args);
        }
        const r = cb('APPLY', callPath, argumentsList);
        callPath = [];
        return r;
      },
      get(_target, property, proxy) {
        if (property === 'then' && callPath.length === 0) {
          return {then: () => proxy};
        } else if (asyncIteratorSupport() && property === Symbol.asyncIterator) {
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

  function isTransferable(thing: {}): thing is Transferable {
    return TRANSFERABLE_TYPES.some(type => thing instanceof type);
  }

  function* iterateAllProperties(obj: {} | undefined): Iterable<{}> {
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

  function transferableProperties(obj: {}[] | undefined): Transferable[] {
    const r: Transferable[] = [];
    for (const prop of iterateAllProperties(obj)) {
      if (isTransferable(prop))
        r.push(prop);
    }
    return r;
  }

  function isproxyValue(obj: {}): Boolean {
    return obj && (obj as any)[proxyValueSymbol];
  }

  function makeInvocationResult(obj: {}): InvocationResult {
    // TODO We actually need to perform a structured clone tree
    // walk of the data as we want to allow:
    // return {foo: proxyValue(foo)};
    // We also don't want to directly mutate the data as:
    // class A {
    //   constructor() { this.b = {b: proxyValue(new B())} }
    //   method1() { return this.b; }
    //   method2() { this.b.foo; /* should work */ }
    // }
    if (isproxyValue(obj)) {
      const {port1, port2} = new MessageChannel();
      expose(obj, port1);
      return {
        type: 'PROXY',
        endpoint: port2,
      };
    }

    return {
      type: 'OBJECT',
      obj,
    };
  }

  return {proxy, proxyValue, expose};
})();
