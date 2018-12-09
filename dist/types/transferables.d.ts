declare type Transferable = MessagePort | ArrayBuffer;
interface TransferHandler {
    canHandle: (obj: {}) => Boolean;
    serialize: (obj: {}) => {};
    deserialize: (obj: {}) => {};
}
export declare function transferableProperties(obj?: {}[]): Transferable[];
export declare const transferHandlers: Map<string, TransferHandler>;
export {};
