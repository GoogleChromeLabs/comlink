/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TransferHandler,
  Remote,
  throwMarker,
  transferHandlers,
  threadId,
  proxyRemoteData,
  tidEndPointMap,
  proxyMarker,
  ProxyMarked,
} from "./common";
import { createRemote, getRemoteController } from "./consumer";
import { RemoteController, remotePidMap } from "./remote-controller";
import {
  providerResourceMap,
  registerProxy,
  objectMap,
  expose,
  walk,
  proxyMap,
  proxy,
} from "./provider";
import { MergeMessage, MessageType, ProxyID, ThreadID } from "./protocol";

/**
 * Internal transfer handle to handle proxy object.
 */
type SeralizedRemoteValue = {
  pid: ProxyID;
  mp?: MessagePort;
  tid?: ThreadID;
  path: string[];
};
const remoteTransferHandler: TransferHandler<Remote, SeralizedRemoteValue> = {
  canHandle: (val): val is Remote => {
    return (
      remotePidMap.has(val as any) &&
      (val as Remote)[proxyRemoteData]?.controller instanceof RemoteController
    );
  },
  async serialize(obj, targetEp) {
    const pid = remotePidMap.get(obj)!;
    const data = obj[proxyRemoteData];
    const result: SeralizedRemoteValue = {
      pid: pid!,
      path: data.path.map((o) => o.toString()),
    };
    const controller = data.controller as RemoteController;
    if (
      controller?.tid != threadId &&
      controller !== getRemoteController(targetEp, false)
    ) {
      result.mp = await controller.createEndPoint(pid);
      result.tid = controller.tid;
    }
    const transferables = [];
    if (result.mp) {
      transferables.push(result.mp);
    }
    return [result, transferables];
  },
  async deserialize({ pid, mp, tid, path }: SeralizedRemoteValue, ep) {
    if (mp && tid) {
      ep = mp;
      const existingEp = tidEndPointMap.get(tid!);
      if (existingEp) {
        await new Promise<void>((res, rej) => {
          mp.start?.();
          mp.postMessage({
            id: -1,
            type: MessageType.MERGE,
            tid: threadId,
          } as MergeMessage);
          mp.onmessage = () => {
            res();
            mp.onmessage = null;
            mp.close();
          };
          mp.onmessageerror = rej;
        });
        ep = existingEp;
      } else {
        tidEndPointMap.set(tid!, ep);
      }

      const controller = getRemoteController(ep);
      const remote = createRemote(controller, pid, path);
      controller.tid = tid;
      return remote;
    } else {
      const resource = providerResourceMap.get(ep)!;
      if (pid === 0) {
        pid = resource.proxyIdMap.keys().next().value ?? 0;
      }
      const root = resource.proxyIdMap.get(pid);
      let d = walk(root, path).value;
      if (proxyMap.has(d)) {
        d = proxyMap.get(d)?.obj ?? d;
      }

      return d;
    }
  },
};

/**
 * Internal transfer handle to handle objects marked to proxy.
 */
const proxyTransferHandler: TransferHandler<object, number> = {
  canHandle: (val): val is ProxyMarked => {
    if (proxyMap.has(val)) {
      return true;
    }
    if ((val as ProxyMarked)?.[proxyMarker] || typeof val === "function") {
      proxy(val);
      return true;
    }

    return false;
  },
  async serialize(obj, ep) {
    const proxyData = registerProxy(obj);
    let resource = providerResourceMap.get(ep);
    if (!resource) {
      expose(proxyData.obj, ep);
      resource = providerResourceMap.get(ep)!;
    }

    if (!resource.proxyIdMap.has(proxyData.pid!)) {
      resource.proxyIdMap.set(proxyData.pid!, proxyData.obj);
      objectMap.get(proxyData.obj)!.count++;
    }
    return [proxyData.pid!, []];
  },
  async deserialize(pid, ep) {
    const controller = getRemoteController(ep);
    return controller.getRemote(pid) ?? createRemote(controller, pid);
  },
};

interface ThrownValue {
  [throwMarker]: unknown; // just needs to be present
  value: unknown;
}
type SerializedThrownValue =
  | { isError: true; value: Error }
  | { isError: false; value: unknown };

const isObject = (val: unknown): val is object =>
  (typeof val === "object" && val !== null) || typeof val === "function";

/**
 * Internal transfer handler to handle thrown exceptions.
 */
const throwTransferHandler: TransferHandler<
  ThrownValue,
  SerializedThrownValue
> = {
  canHandle: (value): value is ThrownValue =>
    isObject(value) && throwMarker in value,
  async serialize({ value }) {
    let serialized: SerializedThrownValue;
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack,
          cause: value.cause,
        },
      };
    } else {
      serialized = { isError: false, value };
    }
    return [serialized, []];
  },
  async deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(
        new Error(serialized.value.message),
        serialized.value
      );
    }
    throw serialized.value;
  },
};

/**
 * Allows customizing the serialization of certain values.
 */
transferHandlers.set("remote", remoteTransferHandler);
transferHandlers.set("proxy", proxyTransferHandler);
transferHandlers.set("throw", throwTransferHandler);
