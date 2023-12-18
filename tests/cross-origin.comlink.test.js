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

test.describe("Comlink origin filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/empty.html");
    await page.addScriptTag({
      content: `
import * as Comlink from "./dist/comlink.mjs"      
window.testData = {
  Comlink,
};`,
      type: "module",
    });
  });

  test("rejects messages from unknown origin", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink } = window.testData;

      // expose on our window so comlink is listening to window postmessage
      const obj = { my: "value" };
      Comlink.expose(obj, self, [/^http:\/\/localhost(:[0-9]+)?\/?$/]);

      let handler;
      // juggle async timings to get the attack started
      const attackComplete = new Promise((resolve, reject) => {
        handler = (ev) => {
          if (ev.data === "ready" && ev.origin === "null") {
            // tell the iframe it can start the attack
            ifr.contentWindow.postMessage("start", "*");
          } else if (ev.data === "done") {
            // confirm the attack failed, the prototype was not updated
            resolve({
              fooUndefined: Object.prototype.foo === undefined,
              myValue: obj.my,
            });
          }
        };
        window.addEventListener("message", handler);
      });
      // create a sandboxed iframe for the attack
      const ifr = document.createElement("iframe");
      ifr.sandbox.add("allow-scripts");
      ifr.src = "/attack-iframe.html";
      document.body.appendChild(ifr);
      // wait for the iframe to load
      await new Promise((resolve) => (ifr.onload = resolve));
      // and wait for the attack to complete
      const result = await attackComplete;
      window.removeEventListener("message", handler);
      ifr.remove();
      return result;
    });
    expect(result).toEqual({
      fooUndefined: true,
      myValue: "value",
    });
  });

  test("accepts messages from matching origin", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink } = window.testData;

      // expose on our window so comlink is listening to window postmessage
      const obj = { my: "value" };
      Comlink.expose(obj, self, [/^http:\/\/localhost(:[0-9]+)?\/?$/]);

      let handler;
      // juggle async timings to get the attack started
      const attackComplete = new Promise((resolve, reject) => {
        handler = (ev) => {
          if (ev.data === "ready" && ev.origin === window.origin) {
            // tell the iframe it can start the attack
            ifr.contentWindow.postMessage("start", "*");
          } else if (ev.data === "done") {
            // confirm the attack succeeded, the prototype was updated
            resolve({
              fooDefined: Object.prototype.foo === "x",
              myValue: obj.my,
            });
          }
        };
        window.addEventListener("message", handler);
      });
      // create a sandboxed iframe for the attack, but with same origin
      const ifr = document.createElement("iframe");
      ifr.sandbox.add("allow-scripts", "allow-same-origin");
      ifr.src = "/attack-iframe.html";
      document.body.appendChild(ifr);
      // wait for the iframe to load
      await new Promise((resolve) => (ifr.onload = resolve));
      // and wait for the attack to complete
      const result = await attackComplete;
      window.removeEventListener("message", handler);
      ifr.remove();
      return result;
    });
    expect(result).toEqual({
      fooDefined: true,
      myValue: "value",
    });
  });
});
