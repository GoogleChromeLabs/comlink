/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EventSource {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: {}
  ): void;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: {}
  ): void;
}

export interface Endpoint extends EventSource {
  postMessage(message: any, transfer?: Transferable[]): void;
  start?: () => void;
}

export const enum WireValueType {
  RAW = -1,
  HANDLER = -2,
}

export interface RawWireValue {
  id?: number;
  type: WireValueType.RAW;
  value: {};
}

export interface HandlerWireValue {
  id?: number;
  type: WireValueType.HANDLER;
  name: string;
  value: unknown;
}

export type WireValue = RawWireValue | HandlerWireValue;

export type MessageID = number;
export type ProxyID = number;
export type ThreadID = number;

export const enum MessageType {
  READY = 0,
  EXCHANGETID = 1,
  MERGE = 2,
  GET = 3,
  SET = 4,
  APPLY = 5,
  CONSTRUCT = 6,
  ENDPOINT = 7,
  HEARTBEAT = 8,
  RELEASE = 9,
}

export interface PingMessage {
  id?: MessageType.READY;
  type: MessageType.READY;
}

export interface HeartBeatMessage {
  id?: MessageID;
  type: MessageType.HEARTBEAT;
  lock?: string;
}

export interface GetMessage {
  id?: MessageID;
  type: MessageType.GET;
  pid: ProxyID;
  path: string[];
}

export interface SetMessage {
  id?: MessageID;
  type: MessageType.SET;
  pid: ProxyID;
  path: string[];
  value: WireValue;
}

export interface ApplyMessage {
  id?: MessageID;
  type: MessageType.APPLY;
  pid: ProxyID;
  path: string[];
  argumentList: WireValue[];
}

export interface ConstructMessage {
  id?: MessageID;
  type: MessageType.CONSTRUCT;
  pid: ProxyID;
  path: string[];
  argumentList: WireValue[];
}

export interface EndpointMessage {
  id?: MessageID;
  type: MessageType.ENDPOINT;
  pid?: ProxyID;
}

export interface ReleaseMessage {
  id?: MessageID;
  type: MessageType.RELEASE;
  pid: ProxyID;
}

export interface ShareIdMessage {
  id?: MessageID;
  type: MessageType.EXCHANGETID;
  tid: ThreadID;
}

export interface MergeMessage {
  id?: MessageID;
  type: MessageType.MERGE;
  ep: MessagePort;
  tid: ThreadID;
}

export type Message =
  | PingMessage
  | MergeMessage
  | ShareIdMessage
  | GetMessage
  | SetMessage
  | ApplyMessage
  | ConstructMessage
  | EndpointMessage
  | HeartBeatMessage
  | ReleaseMessage;
