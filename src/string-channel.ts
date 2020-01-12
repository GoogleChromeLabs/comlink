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

function generateUID(): string {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}

interface PropertyIteratorEntry {
  value: unknown;
  path: string[];
}

function* iterateAllProperties(
  value: {} | undefined,
  path: string[] = [],
  visited: WeakSet<{}> = new WeakSet<{}>()
): Iterable<PropertyIteratorEntry> {
  if (value === undefined) return;
  if (visited.has(value)) return;
  if (typeof value === "string") return;
  if (typeof value === "object") visited.add(value);
  if (ArrayBuffer.isView(value)) return;
  // This one is not necessary to catch as `Object.keys(value)`
  // will be an empty array.
  // if (value instanceof ArrayBuffer) return;
  yield { value, path };

  const keys = Object.keys(value);
  for (const key of keys) {
    yield* iterateAllProperties((value as any)[key], [...path, key], visited);
  }
}

function replaceValueAtPath(value: any, path: string[], newValue: any): {} {
  const lastProp = path[path.length - 1];
  for (const prop of path.slice(0, -1)) {
    value = value[prop];
  }
  const oldValue = value[lastProp];
  value[lastProp] = newValue;
  return oldValue;
}

type MessageEventListener = (ev: MessageEvent) => any;

const enum SerializableTransferableType {
  MessagePort,
  ArrayBuffer
}

interface SerializableTransferableArrayBuffer {
  type: SerializableTransferableType.ArrayBuffer;
  path: string[];
  value: string;
}

interface SerializableTransferableMessagePort {
  type: SerializableTransferableType.MessagePort;
  path: string[];
  value: string;
}

type SerializableTransferable =
  | SerializableTransferableMessagePort
  | SerializableTransferableArrayBuffer;
const messagePortMap = new Map<string, StringChannelEndpoint>();
function makeTransferable(
  v: unknown,
  ep: StringChannelEndpoint
): SerializableTransferable {
  if (v instanceof MessagePort) {
    const uid = generateUID();
    messagePortMap.set(uid, ep);
    const wrapped = wrap(ep, uid);
    v.addEventListener("message", ({ data }) => {
      console.log("a>", data);
      wrapped.postMessage(data);
    });
    v.start();
    wrapped.addEventListener("message", ({ data }) => {
      console.log("b>", data);
      v.postMessage(data);
    });

    return {
      type: SerializableTransferableType.MessagePort,
      path: [],
      value: uid
    };
  }
  throw Error("Not transferable");
}

function isTransferable(v: any): boolean {
  if (v instanceof MessagePort) {
    return true;
  }
  if (v instanceof ArrayBuffer) {
    return true;
  }
  if (ArrayBuffer.isView(v)) {
    return true;
  }
  return false;
}

interface StringChannelPayload {
  uid: string;
  data: any;
  transfer: SerializableTransferable[];
}

export function wrap(ep: StringChannelEndpoint, uid = "") {
  const { port1, port2 } = new MessageChannel();

  ep.setMessageListener(msg => {
    let payload: StringChannelPayload;
    payload = JSON.parse(msg);
    console.log("1a>", msg, uid);
    if (payload.uid !== uid) {
      return;
    }
    console.log("1b>", msg, uid);
    payload.transfer.forEach(transfer => {
      switch (transfer.type) {
        case SerializableTransferableType.MessagePort:
          const wrapped = wrap(ep, transfer.value);
          replaceValueAtPath(payload.data, transfer.path, wrapped);
          break;
        default:
          throw Error("Unknown transferable");
      }
    });
    console.log("2>", payload);
    port2.postMessage(payload.data);
  });

  port2.addEventListener("message", ({ data }) => {
    const transfer = [];
    for (const { value, path } of iterateAllProperties(data)) {
      if (!isTransferable(value)) {
        continue;
      }
      const oldValue = replaceValueAtPath(data, path, null);
      const serializableTransferable = makeTransferable(oldValue, ep);
      serializableTransferable.path = path;
      transfer.push(serializableTransferable);
    }
    console.log("Sending", { uid, data });
    ep.send(JSON.stringify({ uid, data, transfer }));
  });
  port2.start();
  return port1;
}
