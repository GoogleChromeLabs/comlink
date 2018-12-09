import { InvocationRequest } from "./types";
declare type proxyObjectCallback = (iRequest: InvocationRequest) => {};
declare type Proxy = Function;
export declare function proxyObject(target: any, callback: proxyObjectCallback, callPath?: PropertyKey[]): Proxy;
export {};
