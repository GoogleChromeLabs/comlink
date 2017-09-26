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

export interface StringMessageChannel extends EventTarget {
  send(data: string): void;
}

interface Message {
  id: String;
  msg: {};
}

export const MessageChannelAdapter = (function() {
  const channelMap = new WeakMap<String, MessagePort>();

  /* export */ function wrap(smc: StringMessageChannel) {
    const {port1, port2} = new MessageChannel();
    let id: String | null = null;
    port2.addEventListener('message', (event: MessageEvent) => {
      if (!id) {
        id = generateUID();
        channelMap.set(id, port2);
      }
      const payload = JSON.stringify({
        id,
        msg: event.data,
      });
      smc.send(payload);
    });
    smc.addEventListener('message', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (!id) {
        id = data.id as String;
        channelMap.set(id, port2);
      }
      port2.postMessage(data.msg);
    });
    return port1;
  }

  function hex4(): String {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  const bits = 128;
  function generateUID(): String {
    return new Array(bits / 16).fill(0).map(_ => hex4()).join('');
  }

  return {wrap};
})();
