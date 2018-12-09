import { InvocationResult, RawWrappedValue, WrappedValue } from "./types";
export declare function wrapValueIfPossible(value: {}): WrappedValue | void;
export declare function wrapValue(value: {}): WrappedValue;
export declare function isRawWrappedValue(arg: WrappedValue): arg is RawWrappedValue;
export declare function unwrapValue(value: WrappedValue): {};
export declare function makeInvocationResult(obj: {}, id?: string): InvocationResult;
