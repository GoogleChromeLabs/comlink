import { Endpoint } from "./endpoint";
import { InvocationRequest, InvocationResult } from "./types";
interface MessageHandler {
    (e: MessageEvent): void;
}
export declare function attachMessageHandler(endpoint: Endpoint, handler: MessageHandler): void;
/**
 * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
 * identified by a unique id that is attached to the payload.
 */
export declare function pingPongMessage(endpoint: Endpoint, iRequest: InvocationRequest): Promise<InvocationResult>;
export {};
