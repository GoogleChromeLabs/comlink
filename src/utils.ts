import { Message } from "./types";

function generateRandomHex4(): string {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

export function resolveValue(object: any, path: PropertyKey[]): any {
  return path.reduce((object: any, key: PropertyKey) => object[key], object);
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
  path: string[];
  channels: string[][];
}

export function findInstancePaths(
  object: any,
  constructor: Function,
  options?: InstancePathsFinderOptions
): any {
  let { path = [], channels = [] } = options || {};
  if (object instanceof constructor) {
    channels.push([...path]);
  } else if (object instanceof Object) {
    for (const key of Object.keys(object)) {
      findInstancePaths(object[key], constructor, {
        path: [...path, key],
        channels
      });
    }
  }
  return channels;
}

export function parseMessage(data: string): Message | void {
  try {
    const message = JSON.parse(data);
    return "id" in message ? message : void 0;
  } catch (e) {}
}

interface FindAllPropertiesOptions {
  path: string[];
  visited?: WeakSet<{}>;
  properties?: any[];
}

interface PropertyIteratorEntry {
  value: {};
  path: string[];
}

export function findAllProperties(
  value?: {},
  options?: FindAllPropertiesOptions
): PropertyIteratorEntry[] {
  let { path = [], visited = new WeakSet<{}>(), properties = [] } =
    options || {};
  if (
    !value ||
    visited.has(value) ||
    typeof value === "string" ||
    ArrayBuffer.isView(value)
  ) {
    return [];
  }
  typeof value === "object" && visited.add(value);
  properties.push({ value, path });

  for (const key of Object.keys(value)) {
    findAllProperties((value as any)[key], {
      path: [...path, key],
      visited,
      properties
    });
  }
  return properties;
}
