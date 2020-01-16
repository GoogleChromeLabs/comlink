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
  addMessageListener(listener: StringListener): void;
  send(msg: string): void;
}

function generateUID(): string {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}

interface PropertyIteratorEntry<T = unknown> {
  value: T;
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

function findAllTransferables(obj: {}): PropertyIteratorEntry<Transferable>[] {
  const transferables: PropertyIteratorEntry<Transferable>[] = [];
  for (const entry of iterateAllProperties(obj)) {
    if (isTransferable(entry.value)) {
      transferables.push(entry as any);
    }
  }
  return transferables;
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

const enum SerializedTransferableType {
  MessagePort,
  ArrayBuffer
}

interface SerializedTransferableArrayBuffer {
  type: SerializedTransferableType.ArrayBuffer;
  path: string[];
  value: string;
}

interface SerializedTransferableMessagePort {
  type: SerializedTransferableType.MessagePort;
  path: string[];
  value: string;
}

type SerializedTransferable =
  | SerializedTransferableMessagePort
  | SerializedTransferableArrayBuffer;
const messagePortMap = new Map<string, StringChannelEndpoint>();
function makeTransferable(
  v: unknown,
  ep: StringChannelEndpoint
): SerializedTransferable {
  if (v instanceof MessagePort) {
    const uid = generateUID();
    messagePortMap.set(uid, ep);
    const wrapped = wrap(ep, uid);
    v.addEventListener("message", ({ data }) => {
      wrapped.postMessage(
        data,
        findAllTransferables(data).map(v => v.value)
      );
    });
    v.start();
    wrapped.addEventListener("message", ({ data }) => {
      v.postMessage(
        data,
        findAllTransferables(data).map(v => v.value)
      );
    });

    return {
      type: SerializedTransferableType.MessagePort,
      path: [],
      value: uid
    };
  }
  throw Error("Not transferable");
}

function isTransferable(v: any): v is Transferable {
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
  transfer: SerializedTransferable[];
}

export function wrap(ep: StringChannelEndpoint, uid = "") {
  const { port1, port2 } = new MessageChannel();

  ep.addMessageListener(msg => {
    let payload: StringChannelPayload;
    payload = JSON.parse(msg);
    if (payload.uid !== uid) {
      return;
    }
    const transferables: Transferable[] = payload.transfer
      .map(transfer => {
        let replacement;
        switch (transfer.type) {
          case SerializedTransferableType.MessagePort:
            replacement = wrap(ep, transfer.value);
            break;
          default:
            throw Error("Unknown transferable");
        }
        replaceValueAtPath(payload.data, transfer.path, replacement);
        return replacement;
      })
      .filter(Boolean);
    port2.postMessage(payload.data, transferables);
  });

  port2.addEventListener("message", ({ data }) => {
    const transfer: SerializedTransferable[] = [];
    for (const { path } of findAllTransferables(data)) {
      const oldValue = replaceValueAtPath(data, path, null);
      const serializedTransferable = makeTransferable(oldValue, ep);
      serializedTransferable.path = path;
      transfer.push(serializedTransferable);
    }
    ep.send(JSON.stringify({ uid, data, transfer }));
  });
  port2.start();
  return port1;
}
