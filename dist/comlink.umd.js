(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Comlink = (function () {
        const uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        let pingPongMessageCounter = 0;
        const TRANSFERABLE_TYPES = [ArrayBuffer, MessagePort];
        function postMessageOnEndpoint(endpoint, message, transfer) {
            if (endpoint instanceof Window)
                return endpoint.postMessage(message, '*', transfer);
            return endpoint.postMessage(message, transfer);
        }
        /**
         * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
         * identified by a unique id that is attached to the payload.
         */
        function pingPongMessage(endpoint, msg, transferables) {
            const id = `${uid}-${pingPongMessageCounter++}`;
            return new Promise(resolve => {
                endpoint.addEventListener('message', function handler(event) {
                    if (event.data.id !== id)
                        return;
                    endpoint.removeEventListener('message', handler);
                    resolve(event);
                });
                // Copy msg and add `id` property
                msg = Object.assign({}, msg, { id });
                postMessageOnEndpoint(endpoint, msg, transferables);
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
                        return (...args) => cb('APPLY', localCallPath.slice(0, -1), args);
                    }
                    const r = cb('APPLY', callPath, argumentsList);
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
                        const r = cb('GET', callPath);
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
            // FIXME: Can I make the type inference work somehow so I don‘t have to
            // `as Transferable[]`?
            return Array.from(iterateAllProperties(obj))
                .filter(val => isTransferable(val));
        }
        function proxy(endpoint) {
            if (endpoint instanceof MessagePort)
                endpoint.start();
            return batchingProxy(async (type, callPath, argumentsList) => {
                const response = await pingPongMessage(endpoint, {
                    type,
                    callPath,
                    argumentsList,
                }, transferableProperties(argumentsList));
                const result = response.data;
                if (result.type === 'PROXY')
                    return proxy(result.endpoint);
                return result.obj;
            });
        }
        const transferProxySymbol = Symbol('transferProxy');
        function transferProxy(obj) {
            obj[transferProxySymbol] = true;
            return obj;
        }
        function isTransferProxy(obj) {
            return obj && obj[transferProxySymbol];
        }
        function makeInvocationResult(obj) {
            // TODO We actually need to perform a structured clone tree
            // walk of the data as we want to allow:
            // return {foo: transferProxy(foo)};
            // We also don't want to directly mutate the data as:
            // class A {
            //   constructor() { this.b = {b: transferProxy(new B())} }
            //   method1() { return this.b; }
            //   method2() { this.b.foo; /* should work */ }
            // }
            if (isTransferProxy(obj)) {
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
        function expose(rootObj, endpoint) {
            if (endpoint instanceof MessagePort)
                endpoint.start();
            endpoint.addEventListener('message', async function (event) {
                const irequest = event.data;
                let obj = await irequest.callPath.reduce((obj, propName) => obj[propName], rootObj);
                switch (irequest.type) {
                    case 'APPLY': {
                        irequest.callPath.pop();
                        const that = await irequest.callPath.reduce((obj, propName) => obj[propName], rootObj);
                        const isAsyncGenerator = obj.constructor.name === 'AsyncGeneratorFunction';
                        obj = await obj.apply(that, irequest.argumentsList);
                        // If the function being called is an async generator, proxy the
                        // result.
                        if (isAsyncGenerator)
                            obj = transferProxy(obj);
                    } // fallthrough!
                    case 'GET': {
                        const iresult = makeInvocationResult(obj);
                        iresult.id = irequest.id;
                        return postMessageOnEndpoint(endpoint, iresult, transferableProperties(obj));
                    }
                    case 'CONSTRUCT': {
                        const instance = new obj(...(irequest.argumentsList || [])); // eslint-disable-line new-cap
                        const { port1, port2 } = new MessageChannel();
                        expose(instance, port1);
                        return postMessageOnEndpoint(endpoint, {
                            id: irequest.id,
                            type: 'PROXY',
                            endpoint: port2,
                        }, [port2]);
                    }
                }
            });
        }
        return { proxy, transferProxy, expose };
    })();
});
