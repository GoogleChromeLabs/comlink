import {
  ApplyInvocationRequest,
  ConstructInvocationRequest,
  InvocationRequest,
  InvocationResult,
  SetInvocationRequest
} from "./types";
import { resolveValue } from "./utils";
import { makeInvocationResult, unwrapValue } from "./wrapper";
import { throwSymbol } from "./symbols";
import { proxyValue } from "./comlink";

function applyHandler(
  that: any,
  obj: any,
  iRequest: ApplyInvocationRequest
): any {
  const args = iRequest.argumentsList.map(unwrapValue);
  return obj.apply(that, args);
}

function constructHandler(
  that: any,
  obj: any,
  iRequest: ConstructInvocationRequest
): any {
  const args = iRequest.argumentsList.map(unwrapValue);
  const constructed = new obj(...args);
  return proxyValue(constructed);
}

function setHandler(
  that: any,
  obj: any,
  iRequest: SetInvocationRequest
): boolean {
  obj[iRequest.property] = iRequest.value;
  // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
  // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
  return true;
}

function throwHandler(error: any): any {
  error[throwSymbol] = true;
  return error;
}

export function processInvocationRequest(
  rootObj: any,
  iRequest: InvocationRequest
): Promise<InvocationResult> {
  let thatPromise = resolveValue(rootObj, iRequest.callPath.slice(0, -1));
  let objPromise = resolveValue(rootObj, iRequest.callPath);

  return Promise.all([thatPromise, objPromise])
    .then(([that, obj]) => {
      switch (iRequest.type) {
        case "CONSTRUCT":
          return constructHandler(that, obj, iRequest);
        case "APPLY":
          return applyHandler(that, obj, iRequest);
        case "GET":
          return obj;
        case "SET":
          return setHandler(that, obj, iRequest);
      }
    })
    .catch(error => throwHandler(error))
    .then(result => makeInvocationResult(result, iRequest.id));
}
