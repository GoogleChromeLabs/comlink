interface EndpointEventHandlersEventMap {
  message: MessageEvent;
}

export interface Endpoint {
  postMessage(message: any, transfer?: any[]): void;

  addEventListener<K extends keyof EndpointEventHandlersEventMap>(
    type: K,
    listener: (this: Endpoint, ev: EndpointEventHandlersEventMap[K]) => void
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;

  removeEventListener<K extends keyof EndpointEventHandlersEventMap>(
    type: K,
    listener: (this: Endpoint, ev: EndpointEventHandlersEventMap[K]) => void
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;
}

function isMessagePort(endpoint: Endpoint): endpoint is MessagePort {
  return endpoint.constructor.name === "MessagePort";
}

function isWindow(endpoint: Endpoint | Window): endpoint is Window {
  // TODO: This doesn’t work on cross-origin iframes.
  // return endpoint.constructor.name === 'Window';
  return ["window", "length", "location", "parent", "opener"].every(
    prop => prop in endpoint
  );
}

function getWindowEndpoint(windowObj: Window): Endpoint {
  if (self.constructor.name !== "Window") {
    throw Error("self is not a window");
  }
  return {
    addEventListener: self.addEventListener.bind(self),
    removeEventListener: self.removeEventListener.bind(self),
    postMessage: (msg, transfer) => windowObj.postMessage(msg, "*", transfer)
  };
}

function isEndpoint(endpoint: any): endpoint is Endpoint {
  return (
    "addEventListener" in endpoint &&
    "removeEventListener" in endpoint &&
    "postMessage" in endpoint
  );
}

export function validateEndpoint(endpoint: Endpoint | Window): Endpoint {
  if (isWindow(endpoint)) {
    endpoint = getWindowEndpoint(endpoint);
  }
  if (!isEndpoint(endpoint)) {
    throw Error(
      "endpoint does not have all of addEventListener, removeEventListener and postMessage defined"
    );
  }
  return endpoint;
}

export function activateEndpoint(endpoint: Endpoint): void {
  if (isMessagePort(endpoint)) {
    endpoint.start();
  }
}
