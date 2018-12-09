interface EndpointEventHandlersEventMap {
    message: MessageEvent;
}
export interface Endpoint {
    postMessage(message: any, transfer?: any[]): void;
    addEventListener<K extends keyof EndpointEventHandlersEventMap>(type: K, listener: (this: Endpoint, ev: EndpointEventHandlersEventMap[K]) => void): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener<K extends keyof EndpointEventHandlersEventMap>(type: K, listener: (this: Endpoint, ev: EndpointEventHandlersEventMap[K]) => void): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}
export declare function validateEndpoint(endpoint: Endpoint | Window): Endpoint;
export declare function activateEndpoint(endpoint: Endpoint): void;
export {};
