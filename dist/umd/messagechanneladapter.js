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
    function wrap(smc, id) {
        if (id === void 0) { id = null; }
        var _a = new MessageChannel(), port1 = _a.port1, port2 = _a.port2;
        hookup(port2, smc, id);
        return port1;
    }
    exports.wrap = wrap;
    function hookup(internalPort, smc, id) {
        if (id === void 0) { id = null; }
        internalPort.onmessage = function (event) {
            if (!id)
                id = generateUID();
            var msg = event.data;
            var messageChannels = Array.from(findMessageChannels(event.data));
            for (var _i = 0, messageChannels_1 = messageChannels; _i < messageChannels_1.length; _i++) {
                var messageChannel = messageChannels_1[_i];
                var id_1 = generateUID();
                var channel = replaceProperty(msg, messageChannel, id_1);
                hookup(channel, smc, id_1);
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
        for (var _i = 0, _a = path.slice(0, -1); _i < _a.length; _i++) {
            var key_1 = _a[_i];
            obj = obj[key_1];
        }
        var key = path[path.length - 1];
        var orig = obj[key];
        obj[key] = newVal;
        return orig;
    }
    function findMessageChannels(obj, path, channels) {
        if (path === void 0) { path = []; }
        if (channels === void 0) { channels = []; }
        if (!obj)
            return [];
        if (typeof obj === "string")
            return [];
        if (obj instanceof MessagePort) {
            channels.push(path.slice());
        }
        else {
            for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
                var key = _a[_i];
                path.push(key);
                findMessageChannels(obj[key], path, channels);
                path.pop();
            }
        }
        return channels;
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
});
