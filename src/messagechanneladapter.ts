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
import {Message, StringMessageChannel} from "./types";
import {findInstancePaths, generateUID, replaceProperty} from "./utils";

export function wrap(
  smc: StringMessageChannel,
  id: string | null = null
): MessagePort {
  const { port1, port2 } = new MessageChannel();
  hookup(port2, smc, id);
  return port1;
}

function hookup(
  internalPort: MessagePort,
  smc: StringMessageChannel,
  id: string | null = null
): void {
  internalPort.onmessage = (event: MessageEvent) => {
    if (!id) id = generateUID();
    const msg = event.data;
    const messagePorts = findInstancePaths(event.data, MessagePort);
    for (const messageChannel of messagePorts) {
      const id = generateUID();
      const channel = replaceProperty(msg, messageChannel, id);
      hookup(channel, smc, id);
    }
    const payload = JSON.stringify({ id, msg, messageChannels: messagePorts });
    smc.send(payload);
  };

  smc.addEventListener(
    "message",
    (event: Event): void => {
      let data = {} as Message;
      try {
        data = JSON.parse((event as MessageEvent).data) as Message;
      } catch (e) {
        return;
      }
      if (id && id !== data.id) return;
      const mcs = data.messageChannels.map(messageChannel => {
        const id = messageChannel.reduce((obj, key) => obj[key], data.msg);
        const port = wrap(smc, id);
        replaceProperty(data.msg, messageChannel, port);
        return port;
      });
      internalPort.postMessage(data.msg, mcs);
    }
  );
}