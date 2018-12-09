import { Endpoint } from "./endpoint";
import { InvocationRequest, InvocationResult } from "./types";
import { transferableProperties } from "./transferables";

const uid: number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
let pingPongMessageCounter: number = 0;

interface MessageHandler {
  (e: MessageEvent): void;
}

export function attachMessageHandler(
  endpoint: Endpoint,
  handler: MessageHandler
): void {
  endpoint.addEventListener("message", handler);
}

function detachMessageHandler(
  endpoint: Endpoint,
  handler: MessageHandler
): void {
  endpoint.removeEventListener("message", handler);
}

/**
 * `pingPongMessage` sends a `postMessage` and waits for a reply. Replies are
 * identified by a unique id that is attached to the payload.
 */
export function pingPongMessage(
  endpoint: Endpoint,
  iRequest: InvocationRequest
): Promise<InvocationResult> {
  return new Promise(resolve => {
    attachMessageHandler(endpoint, function handler(event: MessageEvent) {
      if (event.data.id === id) {
        detachMessageHandler(endpoint, handler);
        resolve(event.data as InvocationResult);
      }
    });

    const id = `${uid}-${pingPongMessageCounter++}`;
    // Copy msg and add `id` property
    iRequest = Object.assign({}, iRequest, { id });
    let transferables: any[] =
      "argumentsList" in iRequest
        ? transferableProperties(iRequest.argumentsList)
        : [];
    endpoint.postMessage(iRequest, transferables);
  });
}
