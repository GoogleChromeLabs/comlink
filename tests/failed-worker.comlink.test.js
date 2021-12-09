/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Comlink from "/base/dist/esm/comlink.mjs";

describe("Comlink across failed workers", function () {
  const onerror = window.onerror;

  beforeEach(function () {
    this.worker = new Worker("/base/tests/fixtures/failed-worker.js");
    window.onerror = null;
  });

  afterEach(function () {
    this.worker.terminate();
    window.onerror = onerror;
  });

  it("can throw errors", async function () {
    const proxy = Comlink.wrap(this.worker);
    try {
      await proxy.method();
    } catch (error) {
      expect(error).to.be('Worker failed');
    }
  });
});
