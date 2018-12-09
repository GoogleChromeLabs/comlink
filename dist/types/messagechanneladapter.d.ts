interface StringMessageChannel extends EventTarget {
    send(data: string): void;
}
export declare function wrap(smc: StringMessageChannel, id?: string): MessagePort;
export {};
