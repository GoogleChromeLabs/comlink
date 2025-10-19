/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Endpoint } from "./protocol";

export interface NodeEndpoint {
  postMessage(message: any, transfer?: any[]): void;
  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: {}
  ): void;
  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: {}
  ): void;
  start?: () => void;
}

export function nodeEndpoint(nep: NodeEndpoint): Endpoint {
  const listeners = new WeakMap();
  return {
    postMessage: nep.postMessage.bind(nep),
    addEventListener: (type, eh) => {
      const l = (data: any) => {
        if ("handleEvent" in eh) {
          eh.handleEvent({ data } as MessageEvent);
        } else {
          eh({ data } as MessageEvent);
        }
      };
      nep.on(type, l);
      listeners.set(eh, l);
    },
    removeEventListener: (type, eh) => {
      const l = listeners.get(eh);
      if (!l) {
        return;
      }
      nep.off(type, l);
      listeners.delete(eh);
    },
    start: nep.start?.bind(nep),
  };
}
