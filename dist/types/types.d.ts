export interface InvocationResult {
    id?: string;
    value: WrappedValue;
}
export declare type WrappedValue = RawWrappedValue | HandledWrappedValue;
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
export declare type InvocationRequest = GetInvocationRequest | ApplyInvocationRequest | ConstructInvocationRequest | SetInvocationRequest;
interface GetInvocationRequest {
    id?: string;
    type: "GET";
    callPath: PropertyKey[];
}
export interface ApplyInvocationRequest {
    id?: string;
    type: "APPLY";
    callPath: PropertyKey[];
    argumentsList: WrappedValue[];
}
export interface ConstructInvocationRequest {
    id?: string;
    type: "CONSTRUCT";
    callPath: PropertyKey[];
    argumentsList: WrappedValue[];
}
export interface SetInvocationRequest {
    id?: string;
    type: "SET";
    callPath: PropertyKey[];
    property: PropertyKey;
    value: WrappedValue;
}
export interface Message {
    id: string;
    message: any;
    messagePortPaths: string[][];
}
export {};
