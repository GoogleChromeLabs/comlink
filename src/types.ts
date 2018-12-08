export interface Endpoint {
    postMessage(message: any, transfer?: any[]): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: {}
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: {}
    ): void;
}

// To avoid Promise<Promise<T>>
type Promisify<T> = T extends Promise<any> ? T : Promise<T>;

// ProxiedObject<T> is equivalent to T, except that all properties are now promises and
// all functions now return promises. It effectively async-ifies an object.
type ProxiedObject<T> = {
    [P in keyof T]: T[P] extends (...args: infer Arguments) => infer R
        ? (...args: Arguments) => Promisify<R>
        : Promisify<T[P]>
};

// ProxyResult<T> is an augmentation of ProxyObject<T> that also handles raw functions
// and classes correctly.
export type ProxyResult<T> = ProxiedObject<T> &
    (T extends (...args: infer Arguments) => infer R
        ? (...args: Arguments) => Promisify<R>
        : unknown) &
    (T extends { new (...args: infer ArgumentsType): infer InstanceType }
        ? { new (...args: ArgumentsType): Promisify<ProxiedObject<InstanceType>> }
        : unknown);

export type Proxy = Function;
export type CBProxyCallback = (bpcd: CBProxyCallbackDescriptor) => {}; // eslint-disable-line no-unused-vars
export type Transferable = MessagePort | ArrayBuffer; // eslint-disable-line no-unused-vars
export type Exposable = Function | Object; // eslint-disable-line no-unused-vars

export interface InvocationResult {
    id?: string;
    value: WrappedValue;
}

export type WrappedValue = RawWrappedValue | HandledWrappedValue;

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

type CBProxyCallbackDescriptor =
    | CBPCDGet
    | CBPCDApply
    | CBPCDConstruct
    | CBPCDSet; // eslint-disable-line no-unused-vars

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

export type InvocationRequest =
    | GetInvocationRequest
    | ApplyInvocationRequest
    | ConstructInvocationRequest
    | SetInvocationRequest;

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