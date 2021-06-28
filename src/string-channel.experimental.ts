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
  yield { value, path };

  // Emit these objects, but don’t traverse them.
  if (ArrayBuffer.isView(value)) return;
  if (value instanceof ArrayBuffer) return;

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

function padLeft(str: string, pad: string, length: number): string {
  return (pad.repeat(length) + str).slice(-length);
}

function hexEncode(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(v => padLeft(v.toString(16), "0", 2))
    .join("");
}

function hexDecode(s: string): ArrayBuffer {
  return new Uint8Array(
    s
      .split(/(..)/)
      .filter(Boolean)
      .map(v => parseInt(v, 16))
  ).buffer;
}

function addMessageListener(
  target: EventTarget,
  listener: (ev: MessageEvent) => void
) {
  if ("on" in target) {
    return (target as any).on("message", (data: any) =>
      listener({ data } as any)
    );
  }
  target.addEventListener("message", listener as any);
}

const enum SerializedTransferableType {
  MessagePort,
  TypedArray
}

const enum TypedArrayType {
  Raw,
  Int8,
  Uint8,
  Uint8Clamped,
  Int16,
  Uint16,
  Int32,
  Uint32,
  Float32,
  Float64,
  BigInt64,
  BigUint64
}

interface SerializedTransferableTypedArray {
  type: SerializedTransferableType.TypedArray;
  subtype: TypedArrayType;
  path: string[];
  value: string;
}

function getTypedArrayType(v: ArrayBuffer | ArrayBufferView): TypedArrayType {
  if (!ArrayBuffer.isView(v)) {
    return TypedArrayType.Raw;
  }
  if (v instanceof Int8Array) {
    return TypedArrayType.Int8;
  }
  if (v instanceof Uint8Array) {
    return TypedArrayType.Uint8;
  }
  if (v instanceof Uint8ClampedArray) {
    return TypedArrayType.Uint8Clamped;
  }
  if (v instanceof Int16Array) {
    return TypedArrayType.Int16;
  }
  if (v instanceof Uint16Array) {
    return TypedArrayType.Uint16;
  }
  if (v instanceof Int32Array) {
    return TypedArrayType.Int32;
  }
  if (v instanceof Uint32Array) {
    return TypedArrayType.Uint32;
  }
  if (v instanceof Float32Array) {
    return TypedArrayType.Float32;
  }
  if (v instanceof Float64Array) {
    return TypedArrayType.Float64;
  }
  if (v instanceof BigInt64Array) {
    return TypedArrayType.BigInt64;
  }
  if (v instanceof BigUint64Array) {
    return TypedArrayType.BigUint64;
  }
  throw Error("Unknown ArrayBufferView type");
}

function getTypedViewConstructor(
  type: TypedArrayType
): (v: ArrayBuffer) => ArrayBufferView | ArrayBuffer {
  switch (type) {
    case TypedArrayType.Raw:
      return v => v;
    case TypedArrayType.Int8:
      return v => new Int8Array(v);
    case TypedArrayType.Uint8:
      return v => new Uint8Array(v);
    case TypedArrayType.Uint8Clamped:
      return v => new Uint8ClampedArray(v);
    case TypedArrayType.Int16:
      return v => new Int16Array(v);
    case TypedArrayType.Uint16:
      return v => new Uint16Array(v);
    case TypedArrayType.Int32:
      return v => new Int32Array(v);
    case TypedArrayType.Uint32:
      return v => new Uint32Array(v);
    case TypedArrayType.Float32:
      return v => new Float32Array(v);
    case TypedArrayType.Float64:
      return v => new Float64Array(v);
    case TypedArrayType.BigInt64:
      return v => new BigInt64Array(v);
    case TypedArrayType.BigUint64:
      return v => new BigUint64Array(v);
  }
}

interface SerializedTransferableMessagePort {
  type: SerializedTransferableType.MessagePort;
  path: string[];
  value: string;
}

type SerializedTransferable =
  | SerializedTransferableMessagePort
  | SerializedTransferableTypedArray;
const messagePortMap = new Map<string, StringChannelEndpoint>();
function makeTransferable(
  v: unknown,
  ep: StringChannelEndpoint
): SerializedTransferable {
  if (v instanceof MessagePort) {
    const uid = generateUID();
    messagePortMap.set(uid, ep);
    const wrapped = wrap(ep, uid);
    addMessageListener(v, ({ data }) => {
      wrapped.postMessage(
        data,
        findAllTransferables(data).map(v => v.value)
      );
    });
    v.start();
    addMessageListener(wrapped, ({ data }) => {
      v.postMessage(
        data,
        findAllTransferables(data).map(v => v.value)
      );
    });
    wrapped.start();

    return {
      type: SerializedTransferableType.MessagePort,
      path: [],
      value: uid
    };
  } else if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    const buffer = (v as any).buffer || v;
    return {
      type: SerializedTransferableType.TypedArray,
      subtype: getTypedArrayType(v),
      path: [],
      value: hexEncode(buffer)
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

function deserializeTransferable(
  transfer: SerializedTransferable,
  ep: StringChannelEndpoint
): [any, Transferable] {
  switch (transfer.type) {
    case SerializedTransferableType.MessagePort:
      const port = wrap(ep, transfer.value);
      return [port, port];
    case SerializedTransferableType.TypedArray:
      const constructor = getTypedViewConstructor(transfer.subtype);
      const buffer = hexDecode(transfer.value);
      return [constructor(buffer), buffer];
    default:
      throw Error("Unknown transferable");
  }
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
        const [replacement, transferable] = deserializeTransferable(
          transfer,
          ep
        );
        replaceValueAtPath(payload.data, transfer.path, replacement);
        return transferable;
      })
      .filter(Boolean);
    port2.postMessage(payload.data, transferables);
  });

  addMessageListener(port2, ({ data }) => {
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
