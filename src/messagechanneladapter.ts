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
import {
  findInstancePaths,
  generateUID,
  parseMessage,
  replaceProperty,
  resolveValue
} from "./utils";
import { Message } from "./types";

interface StringMessageChannel extends EventTarget {
  send(data: string): void;
}

export function wrap(smc: StringMessageChannel, id?: string): MessagePort {
  const { port1, port2 } = new MessageChannel();
  hookup(port2, smc, id);
  return port1;
}

function handleMessageOnPort(
  message: any,
  id: string,
  smc: StringMessageChannel
) {
  const messagePortPaths = findInstancePaths(message, MessagePort);
  for (const messagePortPath of messagePortPaths) {
    const id = generateUID();
    const messagePort = replaceProperty(message, messagePortPath, id);
    hookup(messagePort, smc, id);
  }
  const payload = JSON.stringify({ id, message, messagePortPaths });
  smc.send(payload);
}

function handleMessageOnSmc(
  message: Message,
  smc: StringMessageChannel,
  port: MessagePort
) {
  const mcs = message.messagePortPaths.map(messagePortPath => {
    const id = resolveValue(message.message, messagePortPath);
    const port = wrap(smc, id);
    replaceProperty(message.message, messagePortPath, port);
    return port;
  });
  port.postMessage(message.message, mcs);
}

function hookup(
  port: MessagePort,
  smc: StringMessageChannel,
  id?: string
): void {
  port.onmessage = (event: MessageEvent) => {
    id = id || generateUID();
    handleMessageOnPort(event.data, id, smc);
  };

  smc.addEventListener(
    "message",
    (event: Event | MessageEvent): void => {
      if (!("data" in event)) {
        return;
      }
      let data = parseMessage(event.data);
      if (!data || (id && id !== data.id)) {
        return;
      }
      handleMessageOnSmc(data, smc, port);
    }
  );
}
