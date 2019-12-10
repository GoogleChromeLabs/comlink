import { Endpoint } from "./protocol";

interface PortLike {
  postMessage: (message: any) => void;

  onMessage: {
    addListener(callback: (msg: any) => void): void;
    removeListener(callback: (msg: any) => void): void;
  };
}

type EH = EventListenerOrEventListenerObject;

export default function webExtensionEndpoint(port: PortLike): Endpoint {
  const listeners = new WeakMap();
  return {
    postMessage: (message: any, transfer?: Transferable[]) => {
      port.postMessage(message);
    },

    addEventListener: (_: string, eh: EH) => {
      const l = (data: any) => {
        if ("handleEvent" in eh) {
          eh.handleEvent({ data } as MessageEvent);
        } else {
          eh({ data } as MessageEvent);
        }
      };

      port.onMessage.addListener(l);
      listeners.set(eh, l);
    },

    removeEventListener: (_: string, eh: EH) => {
      const l = listeners.get(eh);
      if (!l) {
        return;
      }
      port.onMessage.removeListener(l);
      listeners.delete(eh);
    }
  };
}
