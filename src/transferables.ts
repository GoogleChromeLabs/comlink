import { findAllProperties } from "./utils";
import { expose, proxy } from "./comlink";
import { proxyValueSymbol, throwSymbol } from "./symbols";

const TRANSFERABLE_TYPES = ["ArrayBuffer", "MessagePort", "OffscreenCanvas"]
  .filter(type => type in self)
  .map(type => (self as any)[type]);

type Transferable = MessagePort | ArrayBuffer;
interface TransferHandler {
  canHandle: (obj: {}) => Boolean;
  serialize: (obj: {}) => {};
  deserialize: (obj: {}) => {};
}

function isTransferable(thing: {}): thing is Transferable {
  return TRANSFERABLE_TYPES.some(type => thing instanceof type);
}

export function transferableProperties(obj?: {}[]): Transferable[] {
  const transferables: Transferable[] = [];
  for (const { value } of findAllProperties(obj)) {
    isTransferable(value) && transferables.push(value);
  }
  return transferables;
}

const proxyTransferHandler: TransferHandler = {
  canHandle: (obj: {}): Boolean => obj && (obj as any)[proxyValueSymbol],
  serialize: (obj: {}): {} => {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return port2;
  },
  deserialize: (obj: {}): {} => {
    return proxy(obj as MessagePort);
  }
};

const throwTransferHandler = {
  canHandle: (obj: {}): Boolean => obj && (obj as any)[throwSymbol],
  serialize: (obj: any): {} => {
    const message = obj && obj.message;
    const stack = obj && obj.stack;
    return Object.assign({}, obj, { message, stack });
  },
  deserialize: (obj: {}): {} => {
    throw Object.assign(Error(), obj);
  }
};

export const transferHandlers: Map<string, TransferHandler> = new Map([
  ["PROXY", proxyTransferHandler],
  ["THROW", throwTransferHandler]
]);
