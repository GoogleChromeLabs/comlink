import { InvocationRequest } from "./types";
import { wrapValue } from "./wrapper";

type proxyObjectCallback = (iRequest: InvocationRequest) => {};
type Proxy = Function;

function isBind(callPath: PropertyKey[]): boolean {
  return callPath[callPath.length - 1] === "bind";
}

function isThen(property: PropertyKey): boolean {
  return property === "then";
}

export function proxyObject(
  target: any = () => {},
  callback: proxyObjectCallback,
  callPath: PropertyKey[] = []
): Proxy {
  return new Proxy(target, {
    construct(obj, argumentsList) {
      const iRequest: InvocationRequest = {
        type: "CONSTRUCT",
        callPath,
        argumentsList: argumentsList.map(wrapValue)
      };
      return callback(iRequest);
    },
    apply(obj, that, argumentsList) {
      // We use `bind` as an indicator to have a remote function bound locally.
      // The actual target for `bind()` is currently ignored.
      if (isBind(callPath)) {
        return proxyObject(() => {}, callback, callPath.slice(0, -1));
      }
      const iRequest: InvocationRequest = {
        type: "APPLY",
        callPath,
        argumentsList: argumentsList.map(wrapValue)
      };
      return callback(iRequest);
    },
    get(obj, property, proxy) {
      if (isThen(property) && callPath.length === 0) {
        return { then: () => proxy };
      }
      if (!isThen(property)) {
        return proxyObject(target[property], callback, [...callPath, property]);
      }
      const iRequest: InvocationRequest = {
        type: "GET",
        callPath
      };
      const result = callback(iRequest);
      return Promise.resolve(result).then.bind(result);
    },
    set(obj, property, value): boolean {
      const iRequest: InvocationRequest = {
        type: "SET",
        callPath,
        property,
        value
      };
      return callback(iRequest) as boolean;
    }
  });
}
