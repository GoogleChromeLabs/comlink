export declare function generateUID(bits?: number): string;
export declare function replaceProperty(object: any, path: string[], newVal: any): any;
interface InstancePathsFinderOptions {
    path: string[];
    channels: string[][];
}
export declare function findInstancePaths(object: any, constructor: Function, options?: InstancePathsFinderOptions): any;
export {};
