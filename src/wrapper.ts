import {
  InvocationResult,
  RawWrappedValue,
  WrappedChildValue,
  WrappedValue
} from "./types";
import { transferHandlers } from "./transferables";
import { findAllProperties, replaceProperty } from "./utils";

export function wrapValueIfPossible(value: {}): WrappedValue | void {
  for (const [key, transferHandler] of Array.from(transferHandlers)) {
    if (transferHandler.canHandle(value)) {
      return {
        type: key,
        value: transferHandler.serialize(value)
      };
    }
  }
}

function unwrapIfPossible(value: WrappedValue): {} | void {
  if (transferHandlers.has(value.type)) {
    const transferHandler = transferHandlers.get(value.type)!;
    return transferHandler.deserialize(value.value);
  }
}

export function wrapValue(value: {}): WrappedValue {
  // Is value itself handled by a TransferHandler?
  const wrappedValue = wrapValueIfPossible(value);
  if (wrappedValue) {
    return wrappedValue;
  }

  // If not, traverse the entire object and find handled values.
  let wrappedChildren: WrappedChildValue[] = [];
  for (const item of findAllProperties(value)) {
    const wrappedValue = wrapValueIfPossible(item.value);
    if (wrappedValue) {
      replaceProperty(value, item.path, null);
      wrappedChildren.push({
        path: item.path,
        wrappedValue
      });
    }
  }
  return {
    type: "RAW",
    value,
    wrappedChildren
  };
}

export function isRawWrappedValue(arg: WrappedValue): arg is RawWrappedValue {
  return arg.type === "RAW";
}

export function unwrapValue(value: WrappedValue): {} {
  const unwrappedValue = unwrapIfPossible(value);
  if (unwrappedValue) {
    return unwrappedValue;
  }
  if (!isRawWrappedValue(value)) {
    throw Error(`Unknown value type "${value.type}"`);
  }
  for (const wrappedChildValue of value.wrappedChildren || []) {
    const unwrappedValue = unwrapIfPossible(wrappedChildValue.wrappedValue);
    if (!unwrappedValue) {
      throw Error(
        `Unknown value type "${value.type}" at ${wrappedChildValue.path.join(
          "."
        )}`
      );
    }
    replaceProperty(value.value, wrappedChildValue.path, unwrappedValue);
  }
  return value.value;
}

export function makeInvocationResult(obj: {}, id?: string): InvocationResult {
  const wrappedValue = wrapValueIfPossible(obj);
  if (wrappedValue) {
    return { id, value: wrappedValue };
  }

  return {
    id,
    value: {
      type: "RAW",
      value: obj
    }
  };
}
