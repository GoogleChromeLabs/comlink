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

export interface PostMessageWithOrigin {
  postMessage(
    message: any,
    targetOrigin: string,
    transfer?: Transferable[]
  ): void;
}

export interface Endpoint extends EventSource {
  postMessage(message: any, transfer?: Transferable[]): void;

  start?: () => void;
}

export const enum WireValueType {
  RAW,
  PROXY,
  THROW,
  HANDLER,
}

export interface RawWireValue {
  id?: string;
  type: WireValueType.RAW;
  wireType?: true;
  value: {};
}

export interface HandlerWireValue {
  id?: string;
  type: WireValueType.HANDLER;
  wireType?: true;
  name: string;
  value: unknown;
}

export type WireValue = RawWireValue | HandlerWireValue;

export type MessageID = string;

export const enum MessageType {
  GET,
  SET,
  APPLY,
  CONSTRUCT,
  ENDPOINT,
  RELEASE,
}

interface BaseMessage {
  id?: MessageID;
  wireType?: undefined;
}

export interface GetMessage extends BaseMessage {
  type: MessageType.GET;
  path: string[];
}

export interface SetMessage extends BaseMessage {
  type: MessageType.SET;
  path: string[];
  value: WireValue;
}

export interface ApplyMessage extends BaseMessage {
  type: MessageType.APPLY;
  path: string[];
  argumentList: WireValue[];
}

export interface ConstructMessage extends BaseMessage {
  type: MessageType.CONSTRUCT;
  path: string[];
  argumentList: WireValue[];
}

export interface EndpointMessage extends BaseMessage {
  type: MessageType.ENDPOINT;
}

export interface ReleaseMessage extends BaseMessage {
  type: MessageType.RELEASE;
}

export type Message =
  | GetMessage
  | SetMessage
  | ApplyMessage
  | ConstructMessage
  | EndpointMessage
  | ReleaseMessage;
