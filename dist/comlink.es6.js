export const Comlink = (function () {
    const uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    let pingPongMessageCounter = 0;
    const TRANSFERABLE_TYPES = [ArrayBuffer, MessagePort];
    const transferProxySymbol = Symbol('transferProxy');
    /* export */ function proxy(endpoint) {
        if (!isEndpoint(endpoint))
            throw Error('endpoint does not have all of addEventListener, removeEventListener and postMessage defined');
        activateEndpoint(endpoint);
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
    /* export */ function transferProxy(obj) {
        obj[transferProxySymbol] = true;
        return obj;
    }
    /* export */ function expose(rootObj, endpoint) {
        if (!isEndpoint(endpoint))
            throw Error('endpoint does not have all of addEventListener, removeEventListener and postMessage defined');
        activateEndpoint(endpoint);
        attachMessageHandler(endpoint, async function (event) {
            if (!event.data.id)
                return;
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
                    return postMessageOnEndpoint(endpoint, iresult, transferableProperties([iresult]));
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
    function isEndpoint(endpoint) {
        return 'addEventListener' in endpoint && 'removeEventListener' in endpoint && 'postMessage' in endpoint;
    }
    function activateEndpoint(endpoint) {
        if (isMessagePort(endpoint))
            endpoint.start();
    }
    function attachMessageHandler(endpoint, f) {
        endpoint.addEventListener('message', f);
    }
    function detachMessageHandler(endpoint, f) {
        endpoint.removeEventListener('message', f);
    }
    function isMessagePort(endpoint) {
        return endpoint.constructor.name === 'MessagePort';
    }
    function isWindow(endpoint) {
        return endpoint.constructor.name === 'Window';
    }
    function postMessageOnEndpoint(endpoint, message, transfer) {
        if (isWindow(endpoint))
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
            attachMessageHandler(endpoint, function handler(event) {
                if (event.data.id !== id)
                    return;
                detachMessageHandler(endpoint, handler);
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
        const r = [];
        for (const prop of iterateAllProperties(obj)) {
            if (isTransferable(prop))
                r.push(prop);
        }
        return r;
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
    return { proxy, transferProxy, expose };
})();
