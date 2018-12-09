import { Message } from "./types";
export declare function resolveValue(object: any, path: PropertyKey[]): any;
export declare function generateUID(bits?: number): string;
export declare function replaceProperty(object: any, path: string[], newVal: any): any;
interface InstancePathsFinderOptions {
    path: string[];
    channels: string[][];
}
export declare function findInstancePaths(object: any, constructor: Function, options?: InstancePathsFinderOptions): any;
export declare function parseMessage(data: string): Message | void;
interface FindAllPropertiesOptions {
    path: string[];
    visited?: WeakSet<{}>;
    properties?: any[];
}
interface PropertyIteratorEntry {
    value: {};
    path: string[];
}
export declare function findAllProperties(value?: {}, options?: FindAllPropertiesOptions): PropertyIteratorEntry[];
export {};
