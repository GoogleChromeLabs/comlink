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

import { test, expect } from "./helpers/testPageFixture.js";

test.describe("Comlink across iframes", () => {
  test.beforeEach(async ({ testPage, page }) => {
    await testPage.addComlinkImport();
    await page.evaluate(async () => {
      const ifr = document.createElement("iframe");
      window.testData = {
        ...window.testData,
        ifr,
      };
      ifr.sandbox.add("allow-scripts", "allow-same-origin");
      ifr.src = "/iframe.html";
      document.body.appendChild(ifr);
      await new Promise((resolve) => (ifr.onload = resolve));
    });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(async () => {
      const { ifr } = window.testData;
      ifr.remove();
    });
  });

  test("can communicate", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, ifr } = window.testData;
      const proxy = Comlink.wrap(
        Comlink.windowEndpoint(ifr.contentWindow)
      );
      return await proxy(1, 3);
    });
    expect(result).toEqual(4);
  });
});
