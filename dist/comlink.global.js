"use strict";
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

self.Comlink = (function () {
    const uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    let pingPongMessageCounter = 0;
    const TRANSFERABLE_TYPES = [ArrayBuffer, MessagePort];
    const proxyValueSymbol = Symbol('proxyValue');
    // Symbols are not transferable. For the case where a parameter needs to be
    // proxy’d, we need to set some sort of transferable, secret marker. This is it.
    const transferMarker = '__omg_so_secret';
    /* export */ function proxy(endpoint) {
        if (isWindow(endpoint))
            endpoint = windowEndpoint(endpoint);
        if (!isEndpoint(endpoint))
            throw Error('endpoint does not have all of addEventListener, removeEventListener and postMessage defined');
        activateEndpoint(endpoint);
        return batchingProxy(async (irequest) => {
            let args = [];
            if (irequest.type === 'APPLY' || irequest.type === 'CONSTRUCT') {
                args = irequest.argumentsList =
                    irequest.argumentsList.map(arg => {
                        if (!isProxyValue(arg))
                            return arg;
                        const { port1, port2 } = new MessageChannel();
                        expose(arg, port1);
                        return {
                            [transferMarker]: 'PROXY',
                            endpoint: port2,
                        };
                    });
            }
            const response = await pingPongMessage(endpoint, irequest, transferableProperties(args));
            const result = response.data;
            if (result.type === 'PROXY')
                return proxy(result.endpoint);
            return result.obj;
        });
    }
    /* export */ function proxyValue(obj) {
        obj[proxyValueSymbol] = true;
        return obj;
    }
    /* export */ function expose(rootObj, endpoint) {
        if (isWindow(endpoint))
            endpoint = windowEndpoint(endpoint);
        if (!isEndpoint(endpoint))
            throw Error('endpoint does not have all of addEventListener, removeEventListener and postMessage defined');
        activateEndpoint(endpoint);
        attachMessageHandler(endpoint, async function (event) {
            if (!event.data.id)
                return;
            const irequest = event.data;
            let that = await irequest.callPath.slice(0, -1).reduce((obj, propName) => obj[propName], rootObj);
            let obj = await irequest.callPath.reduce((obj, propName) => obj[propName], rootObj);
            const isAsyncGenerator = obj.constructor.name === 'AsyncGeneratorFunction';
            let iresult = obj;
            // If there is an arguments list, proxy-fy parameters as necessary
            if ('argumentsList' in irequest) {
                irequest.argumentsList =
                    irequest.argumentsList.map(arg => {
                        if (arg[transferMarker] === 'PROXY')
                            return proxy(arg.endpoint);
                        else
                            return arg;
                    });
            }
            if (irequest.type === 'APPLY')
                iresult = await obj.apply(that, irequest.argumentsList);
            if (isAsyncGenerator)
                iresult = proxyValue(iresult);
            if (irequest.type === 'CONSTRUCT')
                iresult = proxyValue(new obj(...(irequest.argumentsList || []))); // eslint-disable-line new-cap
            iresult = makeInvocationResult(iresult);
            iresult.id = irequest.id;
            return endpoint.postMessage(iresult, transferableProperties([iresult]));
        });
    }
    function windowEndpoint(w) {
        if (self.constructor.name !== 'Window')
            throw Error('self is not a window');
        return {
            addEventListener: self.addEventListener.bind(self),
            removeEventListener: self.removeEventListener.bind(self),
            postMessage: (msg, transfer) => w.postMessage(msg, '*', transfer),
        };
    }
    function isEndpoint(endpoint) {
        return 'addEventListener' in endpoint && 'removeEventListener' in endpoint && 'postMessage' in endpoint;
    }
    function activateEndpoint(endpoint) {
        if (isMessagePort(endpoint))
            endpoint.start();
    }
    function attachMessageHandler(endpoint, f) {
        // Checking all possible types of `endpoint` manually satisfies TypeScript’s
        // type checker. Not sure why the inference is failing here. Since it’s
        // unnecessary code I’m going to resort to `any` for now.
        // if(isWorker(endpoint))
        //   endpoint.addEventListener('message', f);
        // if(isMessagePort(endpoint))
        //   endpoint.addEventListener('message', f);
        // if(isOtherWindow(endpoint))
        //   endpoint.addEventListener('message', f);
        endpoint.addEventListener('message', f);
    }
    function detachMessageHandler(endpoint, f) {
        // Same as above.
        endpoint.removeEventListener('message', f);
    }
    function isMessagePort(endpoint) {
        return endpoint.constructor.name === 'MessagePort';
    }
    function isWindow(endpoint) {
        // TODO: This doesn’t work on cross-origin iframes.
        // return endpoint.constructor.name === 'Window';
        return ['window', 'length', 'location', 'parent', 'opener'].every(prop => prop in endpoint);
    }
    /**
     * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
     * identified by a unique id that is attached to the payload.
     */
    function pingPongMessage(endpoint, msg, transferables) {
        const id = `${uid}-${pingPongMessageCounter++}`;
        return new Promise(resolve => {
            attachMessageHandler(endpoint, function handler(event) {
                if (event.data.id !== id)
                    return;
                detachMessageHandler(endpoint, handler);
                resolve(event);
            });
            // Copy msg and add `id` property
            msg = Object.assign({}, msg, { id });
            endpoint.postMessage(msg, transferables);
        });
    }
    function asyncIteratorSupport() {
        return 'asyncIterator' in Symbol;
    }
    /**
     * `batchingProxy` creates a ES6 Proxy that batches `get`s until either
     * `construct` or `apply` is called. At that point the callback is invoked with
     * the accumulated call path.
     */
    function batchingProxy(cb) {
        let callPath = [];
        return new Proxy(function () { }, {
            construct(_target, argumentsList, proxy) {
                const r = cb({
                    type: 'CONSTRUCT',
                    callPath,
                    argumentsList,
                });
                callPath = [];
                return r;
            },
            apply(_target, _thisArg, argumentsList) {
                // We use `bind` as an indicator to have a remote function bound locally.
                // The actual target for `bind()` is currently ignored.
                if (callPath[callPath.length - 1] === 'bind') {
                    const localCallPath = callPath.slice();
                    callPath = [];
                    return (...args) => cb({
                        type: 'APPLY',
                        callPath: localCallPath.slice(0, -1),
                        argumentsList: args,
                    });
                }
                const r = cb({
                    type: 'APPLY',
                    callPath,
                    argumentsList,
                });
                callPath = [];
                return r;
            },
            get(_target, property, proxy) {
                if (property === 'then' && callPath.length === 0) {
                    return { then: () => proxy };
                }
                else if (asyncIteratorSupport() && property === Symbol.asyncIterator) {
                    // For now, only async generators use `Symbol.asyncIterator` and they
                    // return themselves, so we emulate that behavior here.
                    return () => proxy;
                }
                else if (property === 'then') {
                    const r = cb({
                        type: 'GET',
                        callPath,
                    });
                    callPath = [];
                    return Promise.resolve(r).then.bind(r);
                }
                else {
                    callPath.push(property);
                    return proxy;
                }
            },
        });
    }
    function isTransferable(thing) {
        return TRANSFERABLE_TYPES.some(type => thing instanceof type);
    }
    function* iterateAllProperties(obj) {
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
    function transferableProperties(obj) {
        const r = [];
        for (const prop of iterateAllProperties(obj)) {
            if (isTransferable(prop))
                r.push(prop);
        }
        return r;
    }
    function isProxyValue(obj) {
        return obj && obj[proxyValueSymbol];
    }
    function makeInvocationResult(obj) {
        // TODO We actually need to perform a structured clone tree
        // walk of the data as we want to allow:
        // return {foo: proxyValue(foo)};
        // We also don't want to directly mutate the data as:
        // class A {
        //   constructor() { this.b = {b: proxyValue(new B())} }
        //   method1() { return this.b; }
        //   method2() { this.b.foo; /* should work */ }
        // }
        if (isProxyValue(obj)) {
            const { port1, port2 } = new MessageChannel();
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
    return { proxy, proxyValue, expose };
})();
