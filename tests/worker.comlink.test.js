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

import { test, expect } from "@playwright/test";

test.describe("Comlink across workers", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/empty.html");
    await page.addScriptTag({
      content: `
import * as Comlink from "./dist/comlink.mjs"      
window.testData = {
  Comlink,
  worker: new Worker("./worker.js", { type: 'module' }),
};`,
      type: "module",
    });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(async () => {
      const { worker } = window.testData;
      worker.terminate();
    });
  });

  test("can communicate", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, worker } = window.testData;
      const proxy = Comlink.wrap(worker);
      return await proxy(1, 3);
    });
    expect(result).toEqual(4);
  });

  test("can tunnels a new endpoint with createEndpoint", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, worker } = window.testData;
      const proxy = Comlink.wrap(worker);
      const otherEp = await proxy[Comlink.createEndpoint]();
      const otherProxy = Comlink.wrap(otherEp);
      return await otherProxy(20, 1);
    });
    expect(result).toEqual(21);
  });
});
