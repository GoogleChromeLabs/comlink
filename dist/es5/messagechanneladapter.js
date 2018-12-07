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
export function wrap(smc, id) {
    if (id === void 0) { id = null; }
    var _a = new MessageChannel(), port1 = _a.port1, port2 = _a.port2;
    hookup(port2, smc, id);
    return port1;
}
function hookup(internalPort, smc, id) {
    if (id === void 0) { id = null; }
    internalPort.onmessage = function (event) {
        var e_1, _a;
        if (!id)
            id = generateUID();
        var msg = event.data;
        var messageChannels = Array.from(findMessageChannels(event.data));
        try {
            for (var messageChannels_1 = __values(messageChannels), messageChannels_1_1 = messageChannels_1.next(); !messageChannels_1_1.done; messageChannels_1_1 = messageChannels_1.next()) {
                var messageChannel = messageChannels_1_1.value;
                var id_1 = generateUID();
                var channel = replaceProperty(msg, messageChannel, id_1);
                hookup(channel, smc, id_1);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (messageChannels_1_1 && !messageChannels_1_1.done && (_a = messageChannels_1.return)) _a.call(messageChannels_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var payload = JSON.stringify({ id: id, msg: msg, messageChannels: messageChannels });
        smc.send(payload);
    };
    smc.addEventListener("message", function (event) {
        var data = {};
        try {
            data = JSON.parse(event.data);
        }
        catch (e) {
            return;
        }
        if (id && id !== data.id)
            return;
        var mcs = data.messageChannels.map(function (messageChannel) {
            var id = messageChannel.reduce(function (obj, key) { return obj[key]; }, data.msg);
            var port = wrap(smc, id);
            replaceProperty(data.msg, messageChannel, port);
            return port;
        });
        internalPort.postMessage(data.msg, mcs);
    });
}
function replaceProperty(obj, path, newVal) {
    var e_2, _a;
    try {
        for (var _b = __values(path.slice(0, -1)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var key_1 = _c.value;
            obj = obj[key_1];
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var key = path[path.length - 1];
    var orig = obj[key];
    obj[key] = newVal;
    return orig;
}
function findMessageChannels(obj, path) {
    var e_3, _a, _b, _c, key, e_3_1;
    if (path === void 0) { path = []; }
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!obj)
                    return [2 /*return*/];
                if (typeof obj === "string")
                    return [2 /*return*/];
                if (!(obj instanceof MessagePort)) return [3 /*break*/, 2];
                return [4 /*yield*/, path.slice()];
            case 1:
                _d.sent();
                return [2 /*return*/];
            case 2:
                _d.trys.push([2, 7, 8, 9]);
                _b = __values(Object.keys(obj)), _c = _b.next();
                _d.label = 3;
            case 3:
                if (!!_c.done) return [3 /*break*/, 6];
                key = _c.value;
                path.push(key);
                return [5 /*yield**/, __values(findMessageChannels(obj[key], path))];
            case 4:
                _d.sent();
                path.pop();
                _d.label = 5;
            case 5:
                _c = _b.next();
                return [3 /*break*/, 3];
            case 6: return [3 /*break*/, 9];
            case 7:
                e_3_1 = _d.sent();
                e_3 = { error: e_3_1 };
                return [3 /*break*/, 9];
            case 8:
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
                return [7 /*endfinally*/];
            case 9: return [2 /*return*/];
        }
    });
}
function hex4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
var bits = 128;
function generateUID() {
    return new Array(bits / 16)
        .fill(0)
        .map(function (_) { return hex4(); })
        .join("");
}
