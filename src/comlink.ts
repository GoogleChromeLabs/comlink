/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type { Endpoint } from "./protocol";
export type {
  ProxyMarked,
  UnProxyMarked,
  ProxyOrClone,
  UnproxyOrClone,
  Remote,
  Local,
  TransferHandler,
} from "./common";
export type { PoolOptions } from "./consumer-pool";
export {
  proxyMarker,
  proxyRemoteData,
  opch,
  transferHandlers,
  transfer,
} from "./common";
export { windowEndpoint } from "./window-adapter";
export { nodeEndpoint } from "./node-adapter";
export { expose, unexpose, proxy } from "./provider";
export { wrap } from "./consumer";
export { pool } from "./consumer-pool";
import "./transfer-handler";
