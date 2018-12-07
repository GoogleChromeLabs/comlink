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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
else {factory([], self.Comlink={});}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TRANSFERABLE_TYPES = ["ArrayBuffer", "MessagePort", "OffscreenCanvas"]
        .filter(function (f) { return f in self; })
        .map(function (f) { return self[f]; });
    var uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    var proxyValueSymbol = Symbol("proxyValue");
    var throwSymbol = Symbol("throw");
    var proxyTransferHandler = {
        canHandle: function (obj) { return obj && obj[proxyValueSymbol]; },
        serialize: function (obj) {
            var _a = new MessageChannel(), port1 = _a.port1, port2 = _a.port2;
            expose(obj, port1);
            return port2;
        },
        deserialize: function (obj) {
            return proxy(obj);
        }
    };
    var throwTransferHandler = {
        canHandle: function (obj) { return obj && obj[throwSymbol]; },
        serialize: function (obj) {
            var message = obj && obj.message;
            var stack = obj && obj.stack;
            return Object.assign({}, obj, { message: message, stack: stack });
        },
        deserialize: function (obj) {
            throw Object.assign(Error(), obj);
        }
    };
    exports.transferHandlers = new Map([
        ["PROXY", proxyTransferHandler],
        ["THROW", throwTransferHandler]
    ]);
    var pingPongMessageCounter = 0;
    function proxy(endpoint, target) {
        if (isWindow(endpoint))
            endpoint = windowEndpoint(endpoint);
        if (!isEndpoint(endpoint))
            throw Error("endpoint does not have all of addEventListener, removeEventListener and postMessage defined");
        activateEndpoint(endpoint);
        return cbProxy(function (irequest) {
            var args = [];
            if (irequest.type === "APPLY" || irequest.type === "CONSTRUCT")
                args = irequest.argumentsList.map(wrapValue);
            var responsePromise = pingPongMessage(endpoint, Object.assign({}, irequest, { argumentsList: args }), transferableProperties(args));
            return responsePromise.then(function (response) {
                var result = response.data;
                return unwrapValue(result.value);
            });
        }, [], target);
    }
    exports.proxy = proxy;
    function proxyValue(obj) {
        obj[proxyValueSymbol] = true;
        return obj;
    }
    exports.proxyValue = proxyValue;
    function expose(rootObj, endpoint) {
        if (isWindow(endpoint))
            endpoint = windowEndpoint(endpoint);
        if (!isEndpoint(endpoint))
            throw Error("endpoint does not have all of addEventListener, removeEventListener and postMessage defined");
        activateEndpoint(endpoint);
        attachMessageHandler(endpoint, function (event) {
            if (!event.data.id || !event.data.callPath)
                return;
            var irequest = event.data;
            var thatPromise = irequest.callPath
                .slice(0, -1)
                .reduce(function (obj, propName) { return obj[propName]; }, rootObj);
            var objPromise = irequest.callPath.reduce(function (obj, propName) { return obj[propName]; }, rootObj);
            return Promise.all([thatPromise, objPromise])
                .then(function (_a) {
                var that = _a[0], obj = _a[1];
                var iresult = obj;
                var args = [];
                if (irequest.type === "APPLY" || irequest.type === "CONSTRUCT")
                    args = irequest.argumentsList.map(unwrapValue);
                if (irequest.type === "APPLY") {
                    try {
                        iresult = obj.apply(that, args);
                    }
                    catch (e) {
                        iresult = e;
                        iresult[throwSymbol] = true;
                    }
                }
                if (irequest.type === "CONSTRUCT") {
                    try {
                        iresult = new (obj.bind.apply(obj, [void 0].concat(args)))(); // eslint-disable-line new-cap
                        iresult = proxyValue(iresult);
                    }
                    catch (e) {
                        iresult = e;
                        iresult[throwSymbol] = true;
                    }
                }
                if (irequest.type === "SET") {
                    obj[irequest.property] = irequest.value;
                    // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
                    // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
                    iresult = true;
                }
                return iresult;
            })
                .then(function (iresult) {
                iresult = makeInvocationResult(iresult);
                iresult.id = irequest.id;
                return endpoint.postMessage(iresult, transferableProperties([iresult]));
            });
        });
    }
    exports.expose = expose;
    function wrapValue(arg) {
        // Is arg itself handled by a TransferHandler?
        for (var _i = 0, _a = Array.from(exports.transferHandlers); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], transferHandler = _b[1];
            if (transferHandler.canHandle(arg)) {
                return {
                    type: key,
                    value: transferHandler.serialize(arg)
                };
            }
        }
        // If not, traverse the entire object and find handled values.
        var wrappedChildren = [];
        for (var _c = 0, _d = iterateAllProperties(arg); _c < _d.length; _c++) {
            var item = _d[_c];
            for (var _e = 0, _f = Array.from(exports.transferHandlers); _e < _f.length; _e++) {
                var _g = _f[_e], key = _g[0], transferHandler = _g[1];
                if (transferHandler.canHandle(item.value)) {
                    wrappedChildren.push({
                        path: item.path,
                        wrappedValue: {
                            type: key,
                            value: transferHandler.serialize(item.value)
                        }
                    });
                }
            }
        }
        for (var _h = 0, wrappedChildren_1 = wrappedChildren; _h < wrappedChildren_1.length; _h++) {
            var wrappedChild = wrappedChildren_1[_h];
            var container = wrappedChild.path
                .slice(0, -1)
                .reduce(function (obj, key) { return obj[key]; }, arg);
            container[wrappedChild.path[wrappedChild.path.length - 1]] = null;
        }
        return {
            type: "RAW",
            value: arg,
            wrappedChildren: wrappedChildren
        };
    }
    function unwrapValue(arg) {
        if (exports.transferHandlers.has(arg.type)) {
            var transferHandler = exports.transferHandlers.get(arg.type);
            return transferHandler.deserialize(arg.value);
        }
        else if (isRawWrappedValue(arg)) {
            for (var _i = 0, _a = arg.wrappedChildren || []; _i < _a.length; _i++) {
                var wrappedChildValue = _a[_i];
                if (!exports.transferHandlers.has(wrappedChildValue.wrappedValue.type))
                    throw Error("Unknown value type \"" + arg.type + "\" at " + wrappedChildValue.path.join("."));
                var transferHandler = exports.transferHandlers.get(wrappedChildValue.wrappedValue.type);
                var newValue = transferHandler.deserialize(wrappedChildValue.wrappedValue.value);
                replaceValueInObjectAtPath(arg.value, wrappedChildValue.path, newValue);
            }
            return arg.value;
        }
        else {
            throw Error("Unknown value type \"" + arg.type + "\"");
        }
    }
    function replaceValueInObjectAtPath(obj, path, newVal) {
        var lastKey = path.slice(-1)[0];
        var lastObj = path
            .slice(0, -1)
            .reduce(function (obj, key) { return obj[key]; }, obj);
        lastObj[lastKey] = newVal;
    }
    function isRawWrappedValue(arg) {
        return arg.type === "RAW";
    }
    function windowEndpoint(w) {
        if (self.constructor.name !== "Window")
            throw Error("self is not a window");
        return {
            addEventListener: self.addEventListener.bind(self),
            removeEventListener: self.removeEventListener.bind(self),
            postMessage: function (msg, transfer) { return w.postMessage(msg, "*", transfer); }
        };
    }
    function isEndpoint(endpoint) {
        return ("addEventListener" in endpoint &&
            "removeEventListener" in endpoint &&
            "postMessage" in endpoint);
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
        endpoint.addEventListener("message", f);
    }
    function detachMessageHandler(endpoint, f) {
        // Same as above.
        endpoint.removeEventListener("message", f);
    }
    function isMessagePort(endpoint) {
        return endpoint.constructor.name === "MessagePort";
    }
    function isWindow(endpoint) {
        // TODO: This doesn’t work on cross-origin iframes.
        // return endpoint.constructor.name === 'Window';
        return ["window", "length", "location", "parent", "opener"].every(function (prop) { return prop in endpoint; });
    }
    /**
     * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
     * identified by a unique id that is attached to the payload.
     */
    function pingPongMessage(endpoint, msg, transferables) {
        var id = uid + "-" + pingPongMessageCounter++;
        return new Promise(function (resolve) {
            attachMessageHandler(endpoint, function handler(event) {
                if (event.data.id !== id)
                    return;
                detachMessageHandler(endpoint, handler);
                resolve(event);
            });
            // Copy msg and add `id` property
            msg = Object.assign({}, msg, { id: id });
            endpoint.postMessage(msg, transferables);
        });
    }
    function cbProxy(cb, callPath, target) {
        if (callPath === void 0) { callPath = []; }
        if (target === void 0) { target = function () { }; }
        return new Proxy(target, {
            construct: function (_target, argumentsList, proxy) {
                return cb({
                    type: "CONSTRUCT",
                    callPath: callPath,
                    argumentsList: argumentsList
                });
            },
            apply: function (_target, _thisArg, argumentsList) {
                // We use `bind` as an indicator to have a remote function bound locally.
                // The actual target for `bind()` is currently ignored.
                if (callPath[callPath.length - 1] === "bind")
                    return cbProxy(cb, callPath.slice(0, -1));
                return cb({
                    type: "APPLY",
                    callPath: callPath,
                    argumentsList: argumentsList
                });
            },
            get: function (_target, property, proxy) {
                if (property === "then" && callPath.length === 0) {
                    return { then: function () { return proxy; } };
                }
                else if (property === "then") {
                    var r = cb({
                        type: "GET",
                        callPath: callPath
                    });
                    return Promise.resolve(r).then.bind(r);
                }
                else {
                    return cbProxy(cb, callPath.concat(property), _target[property]);
                }
            },
            set: function (_target, property, value, _proxy) {
                return cb({
                    type: "SET",
                    callPath: callPath,
                    property: property,
                    value: value
                });
            }
        });
    }
    function isTransferable(thing) {
        return TRANSFERABLE_TYPES.some(function (type) { return thing instanceof type; });
    }
    function iterateAllProperties(value, path, visited, properties) {
        if (path === void 0) { path = []; }
        if (visited === void 0) { visited = null; }
        if (properties === void 0) { properties = null; }
        if (!value)
            return [];
        if (!visited)
            visited = new WeakSet();
        if (!properties)
            properties = [];
        if (visited.has(value))
            return [];
        if (typeof value === "string")
            return [];
        if (typeof value === "object")
            visited.add(value);
        if (ArrayBuffer.isView(value))
            return [];
        properties.push({ value: value, path: path });
        var keys = Object.keys(value);
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            iterateAllProperties(value[key], path.concat([key]), visited, properties);
        }
        return properties;
    }
    function transferableProperties(obj) {
        var r = [];
        for (var _i = 0, _a = iterateAllProperties(obj); _i < _a.length; _i++) {
            var prop = _a[_i];
            if (isTransferable(prop.value))
                r.push(prop.value);
        }
        return r;
    }
    function makeInvocationResult(obj) {
        for (var _i = 0, _a = Array.from(exports.transferHandlers); _i < _a.length; _i++) {
            var _b = _a[_i], type = _b[0], transferHandler = _b[1];
            if (transferHandler.canHandle(obj)) {
                var value = transferHandler.serialize(obj);
                return {
                    value: { type: type, value: value }
                };
            }
        }
        return {
            value: {
                type: "RAW",
                value: obj
            }
        };
    }
});
