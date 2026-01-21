/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Endpoint } from "./protocol";
import { nodeEndpoint as comlinkNodeEndpoint, NodeEndpoint } from "./comlink";

let warned = false;

export default function nodeEndpoint(rawEndpoint: NodeEndpoint): Endpoint {
  if (warned) {
    console.warn(
      "It is no longer necessary to call `nodeAdapter(…)` unless you want to call the `.addEventListener(…)` / `.removeEventListener(…)` API yourself. If you need this, `nodeEndpoint(…)` is now exported from the main `comlink` module — import from there to avoid duplicated code and avoid this warning."
    );
    warned = true;
  }
  return comlinkNodeEndpoint(rawEndpoint);
}
