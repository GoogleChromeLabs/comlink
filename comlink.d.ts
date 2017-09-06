export declare type Proxy = Function;
export declare type Endpoint = MessagePort | Worker | Window;
declare global  {
    interface SymbolConstructor {
        readonly asyncIterator: symbol;
    }
    interface ObjectConstructor {
        assign(...objects: Object[]): Object;
        values(o: any): string[];
    }
}
export declare function proxy(endpoint: Endpoint): Proxy;
export declare function transferProxy(obj: any): any;
export declare function expose(rootObj: any, endpoint: Endpoint): void;
export {};
