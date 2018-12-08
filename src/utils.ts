function generateRandomHex4(): string {
    return Math
        .floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function resolveValue (object: any, path: string[]): any {
    return path.reduce((object: any, key: string) => object[key], object);
}

export function generateUID(bits = 128): string {
    return new Array(bits / 16)
        .fill(0)
        .map(generateRandomHex4)
        .join("");
}

export function replaceProperty(object: any, path: string[], newVal: any): any {
    const container = resolveValue(object, path.slice(0, -1));
    const key = path[path.length - 1];
    const oldVal = container[key];
    container[key] = newVal;
    return oldVal;
}

interface InstancePathsFinderOptions {
    path: string[],
    channels: string[][]
}

export function findInstancePaths(object: any, constructor: Function, options?: InstancePathsFinderOptions): any {
    let {path = [], channels = []} = options || {};
    if (object instanceof constructor) {
        channels.push([...path]);
    }
    else if (object instanceof Object) {
        for (const key of Object.keys(object)) {
            findInstancePaths(object[key], constructor, { path: [...path, key], channels});
        }
    }
    return channels;
}