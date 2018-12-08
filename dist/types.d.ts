export interface Endpoint {
    postMessage(message: any, transfer?: any[]): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
}
declare type Promisify<T> = T extends Promise<any> ? T : Promise<T>;
declare type ProxiedObject<T> = {
    [P in keyof T]: T[P] extends (...args: infer Arguments) => infer R ? (...args: Arguments) => Promisify<R> : Promisify<T[P]>;
};
export declare type ProxyResult<T> = ProxiedObject<T> & (T extends (...args: infer Arguments) => infer R ? (...args: Arguments) => Promisify<R> : unknown) & (T extends {
    new (...args: infer ArgumentsType): infer InstanceType;
} ? {
    new (...args: ArgumentsType): Promisify<ProxiedObject<InstanceType>>;
} : unknown);
export declare type Proxy = Function;
export declare type CBProxyCallback = (bpcd: CBProxyCallbackDescriptor) => {};
export declare type Transferable = MessagePort | ArrayBuffer;
export declare type Exposable = Function | Object;
export interface InvocationResult {
    id?: string;
    value: WrappedValue;
}
export declare type WrappedValue = RawWrappedValue | HandledWrappedValue;
export interface PropertyIteratorEntry {
    value: {};
    path: string[];
}
export interface WrappedChildValue {
    path: string[];
    wrappedValue: HandledWrappedValue;
}
export interface RawWrappedValue {
    type: "RAW";
    value: {};
    wrappedChildren?: WrappedChildValue[];
}
interface HandledWrappedValue {
    type: string;
    value: {};
}
declare type CBProxyCallbackDescriptor = CBPCDGet | CBPCDApply | CBPCDConstruct | CBPCDSet;
interface CBPCDGet {
    type: "GET";
    callPath: PropertyKey[];
}
interface CBPCDApply {
    type: "APPLY";
    callPath: PropertyKey[];
    argumentsList: {}[];
}
interface CBPCDConstruct {
    type: "CONSTRUCT";
    callPath: PropertyKey[];
    argumentsList: {}[];
}
interface CBPCDSet {
    type: "SET";
    callPath: PropertyKey[];
    property: PropertyKey;
    value: {};
}
export declare type InvocationRequest = GetInvocationRequest | ApplyInvocationRequest | ConstructInvocationRequest | SetInvocationRequest;
interface GetInvocationRequest {
    id?: string;
    type: "GET";
    callPath: PropertyKey[];
}
interface ApplyInvocationRequest {
    id?: string;
    type: "APPLY";
    callPath: PropertyKey[];
    argumentsList: WrappedValue[];
}
interface ConstructInvocationRequest {
    id?: string;
    type: "CONSTRUCT";
    callPath: PropertyKey[];
    argumentsList: WrappedValue[];
}
interface SetInvocationRequest {
    id?: string;
    type: "SET";
    callPath: PropertyKey[];
    property: PropertyKey;
    value: WrappedValue;
}
export interface TransferHandler {
    canHandle: (obj: {}) => Boolean;
    serialize: (obj: {}) => {};
    deserialize: (obj: {}) => {};
}
export interface StringMessageChannel extends EventTarget {
    send(data: string): void;
}
export interface Message {
    id: string;
    msg: any;
    messageChannels: string[][];
}
export {};
