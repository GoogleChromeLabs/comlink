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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
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
export var transferHandlers = new Map([
    ["PROXY", proxyTransferHandler],
    ["THROW", throwTransferHandler]
]);
var pingPongMessageCounter = 0;
export function proxy(endpoint, target) {
    var _this = this;
    if (isWindow(endpoint))
        endpoint = windowEndpoint(endpoint);
    if (!isEndpoint(endpoint))
        throw Error("endpoint does not have all of addEventListener, removeEventListener and postMessage defined");
    activateEndpoint(endpoint);
    return cbProxy(function (irequest) { return __awaiter(_this, void 0, void 0, function () {
        var args, response, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    args = [];
                    if (irequest.type === "APPLY" || irequest.type === "CONSTRUCT")
                        args = irequest.argumentsList.map(wrapValue);
                    return [4 /*yield*/, pingPongMessage(endpoint, Object.assign({}, irequest, { argumentsList: args }), transferableProperties(args))];
                case 1:
                    response = _a.sent();
                    result = response.data;
                    return [2 /*return*/, unwrapValue(result.value)];
            }
        });
    }); }, [], target);
}
export function proxyValue(obj) {
    obj[proxyValueSymbol] = true;
    return obj;
}
export function expose(rootObj, endpoint) {
    if (isWindow(endpoint))
        endpoint = windowEndpoint(endpoint);
    if (!isEndpoint(endpoint))
        throw Error("endpoint does not have all of addEventListener, removeEventListener and postMessage defined");
    activateEndpoint(endpoint);
    attachMessageHandler(endpoint, function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var irequest, that, obj, iresult, args, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!event.data.id || !event.data.callPath)
                            return [2 /*return*/];
                        irequest = event.data;
                        return [4 /*yield*/, irequest.callPath
                                .slice(0, -1)
                                .reduce(function (obj, propName) { return obj[propName]; }, rootObj)];
                    case 1:
                        that = _a.sent();
                        return [4 /*yield*/, irequest.callPath.reduce(function (obj, propName) { return obj[propName]; }, rootObj)];
                    case 2:
                        obj = _a.sent();
                        iresult = obj;
                        args = [];
                        if (irequest.type === "APPLY" || irequest.type === "CONSTRUCT")
                            args = irequest.argumentsList.map(unwrapValue);
                        if (!(irequest.type === "APPLY")) return [3 /*break*/, 6];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, obj.apply(that, args)];
                    case 4:
                        iresult = _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        iresult = e_1;
                        iresult[throwSymbol] = true;
                        return [3 /*break*/, 6];
                    case 6:
                        if (irequest.type === "CONSTRUCT") {
                            try {
                                iresult = new (obj.bind.apply(obj, __spread([void 0], args)))(); // eslint-disable-line new-cap
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
                        iresult = makeInvocationResult(iresult);
                        iresult.id = irequest.id;
                        return [2 /*return*/, endpoint.postMessage(iresult, transferableProperties([iresult]))];
                }
            });
        });
    });
}
function wrapValue(arg) {
    var e_2, _a, e_3, _b, e_4, _c, e_5, _d;
    try {
        // Is arg itself handled by a TransferHandler?
        for (var transferHandlers_1 = __values(transferHandlers), transferHandlers_1_1 = transferHandlers_1.next(); !transferHandlers_1_1.done; transferHandlers_1_1 = transferHandlers_1.next()) {
            var _e = __read(transferHandlers_1_1.value, 2), key = _e[0], transferHandler = _e[1];
            if (transferHandler.canHandle(arg)) {
                return {
                    type: key,
                    value: transferHandler.serialize(arg)
                };
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (transferHandlers_1_1 && !transferHandlers_1_1.done && (_a = transferHandlers_1.return)) _a.call(transferHandlers_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    // If not, traverse the entire object and find handled values.
    var wrappedChildren = [];
    try {
        for (var _f = __values(iterateAllProperties(arg)), _g = _f.next(); !_g.done; _g = _f.next()) {
            var item = _g.value;
            try {
                for (var transferHandlers_2 = __values(transferHandlers), transferHandlers_2_1 = transferHandlers_2.next(); !transferHandlers_2_1.done; transferHandlers_2_1 = transferHandlers_2.next()) {
                    var _h = __read(transferHandlers_2_1.value, 2), key = _h[0], transferHandler = _h[1];
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
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (transferHandlers_2_1 && !transferHandlers_2_1.done && (_c = transferHandlers_2.return)) _c.call(transferHandlers_2);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_3) throw e_3.error; }
    }
    try {
        for (var wrappedChildren_1 = __values(wrappedChildren), wrappedChildren_1_1 = wrappedChildren_1.next(); !wrappedChildren_1_1.done; wrappedChildren_1_1 = wrappedChildren_1.next()) {
            var wrappedChild = wrappedChildren_1_1.value;
            var container = wrappedChild.path
                .slice(0, -1)
                .reduce(function (obj, key) { return obj[key]; }, arg);
            container[wrappedChild.path[wrappedChild.path.length - 1]] = null;
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (wrappedChildren_1_1 && !wrappedChildren_1_1.done && (_d = wrappedChildren_1.return)) _d.call(wrappedChildren_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    return {
        type: "RAW",
        value: arg,
        wrappedChildren: wrappedChildren
    };
}
function unwrapValue(arg) {
    var e_6, _a;
    if (transferHandlers.has(arg.type)) {
        var transferHandler = transferHandlers.get(arg.type);
        return transferHandler.deserialize(arg.value);
    }
    else if (isRawWrappedValue(arg)) {
        try {
            for (var _b = __values(arg.wrappedChildren || []), _c = _b.next(); !_c.done; _c = _b.next()) {
                var wrappedChildValue = _c.value;
                if (!transferHandlers.has(wrappedChildValue.wrappedValue.type))
                    throw Error("Unknown value type \"" + arg.type + "\" at " + wrappedChildValue.path.join("."));
                var transferHandler = transferHandlers.get(wrappedChildValue.wrappedValue.type);
                var newValue = transferHandler.deserialize(wrappedChildValue.wrappedValue.value);
                replaceValueInObjectAtPath(arg.value, wrappedChildValue.path, newValue);
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
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
function iterateAllProperties(value, path, visited) {
    var e_7, _a, keys, keys_1, keys_1_1, key, e_7_1;
    if (path === void 0) { path = []; }
    if (visited === void 0) { visited = null; }
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!value)
                    return [2 /*return*/];
                if (!visited)
                    visited = new WeakSet();
                if (visited.has(value))
                    return [2 /*return*/];
                if (typeof value === "string")
                    return [2 /*return*/];
                if (typeof value === "object")
                    visited.add(value);
                if (ArrayBuffer.isView(value))
                    return [2 /*return*/];
                return [4 /*yield*/, { value: value, path: path }];
            case 1:
                _b.sent();
                keys = Object.keys(value);
                _b.label = 2;
            case 2:
                _b.trys.push([2, 7, 8, 9]);
                keys_1 = __values(keys), keys_1_1 = keys_1.next();
                _b.label = 3;
            case 3:
                if (!!keys_1_1.done) return [3 /*break*/, 6];
                key = keys_1_1.value;
                return [5 /*yield**/, __values(iterateAllProperties(value[key], __spread(path, [key]), visited))];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                keys_1_1 = keys_1.next();
                return [3 /*break*/, 3];
            case 6: return [3 /*break*/, 9];
            case 7:
                e_7_1 = _b.sent();
                e_7 = { error: e_7_1 };
                return [3 /*break*/, 9];
            case 8:
                try {
                    if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
                }
                finally { if (e_7) throw e_7.error; }
                return [7 /*endfinally*/];
            case 9: return [2 /*return*/];
        }
    });
}
function transferableProperties(obj) {
    var e_8, _a;
    var r = [];
    try {
        for (var _b = __values(iterateAllProperties(obj)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var prop = _c.value;
            if (isTransferable(prop.value))
                r.push(prop.value);
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_8) throw e_8.error; }
    }
    return r;
}
function makeInvocationResult(obj) {
    var e_9, _a;
    try {
        for (var transferHandlers_3 = __values(transferHandlers), transferHandlers_3_1 = transferHandlers_3.next(); !transferHandlers_3_1.done; transferHandlers_3_1 = transferHandlers_3.next()) {
            var _b = __read(transferHandlers_3_1.value, 2), type = _b[0], transferHandler = _b[1];
            if (transferHandler.canHandle(obj)) {
                var value = transferHandler.serialize(obj);
                return {
                    value: { type: type, value: value }
                };
            }
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (transferHandlers_3_1 && !transferHandlers_3_1.done && (_a = transferHandlers_3.return)) _a.call(transferHandlers_3);
        }
        finally { if (e_9) throw e_9.error; }
    }
    return {
        value: {
            type: "RAW",
            value: obj
        }
    };
}
