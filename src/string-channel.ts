/**
 * Copyright 2019 Google Inc. All Rights Reserved.
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

export type StringListener = (msg: string) => void;
export interface StringChannelEndpoint {
  setMessageListener(listener: StringListener): void;
  send(msg: string): void;
}

export function wrap(ep: StringChannelEndpoint) {
  const listeners = new Set<EventListener>();

  ep.setMessageListener(msg => {
    try {
      const data = JSON.parse(msg);
      const event = new MessageEvent("message", { data });
      listeners.forEach(listener => {
        listener(event);
      });
    } catch (e) {
      console.error(`Received malformed message: ${e}`);
    }
  });

  return {
    postMessage(data: any, transfer?: Transferable[]): void {
      ep.send(JSON.stringify(data));
    },
    addEventListener(name: string, listener: EventListener): void {
      if (name !== "message") {
        // Quietly ignore event listeners for other events
        return;
      }
      listeners.add(listener);
    },
    removeEventListener(name: string, listener: EventListener): void {
      if (name !== "message") {
        // Quietly ignore event listeners for other events
        return;
      }
      listeners.delete(listener);
    }
  };
}
