import { Endpoint } from "./endpoint";
declare type Promisify<T> = T extends Promise<any> ? T : Promise<T>;
declare type ProxiedObject<T> = {
    [P in keyof T]: T[P] extends (...args: infer Arguments) => infer R ? (...args: Arguments) => Promisify<R> : Promisify<T[P]>;
};
declare type ProxyResult<T> = ProxiedObject<T> & (T extends (...args: infer Arguments) => infer R ? (...args: Arguments) => Promisify<R> : unknown) & (T extends {
    new (...args: infer ArgumentsType): infer InstanceType;
} ? {
    new (...args: ArgumentsType): Promisify<ProxiedObject<InstanceType>>;
} : unknown);
export declare function proxy<T = any>(endpointOrWindow: Endpoint | Window, target?: any): ProxyResult<T>;
export declare function proxyValue<T>(obj: T): T;
declare type Exposable = Function | Object;
export declare function expose(rootObj: Exposable, endpointOrWindow: Endpoint | Window): void;
export {};
