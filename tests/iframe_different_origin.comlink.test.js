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

function createIFrame(path) {
  const ifr = document.createElement("iframe");

  ifr.sandbox.add("allow-scripts", "allow-same-origin");
  ifr.src = path;

  document.body.appendChild(ifr);

  return new Promise((resolve) => (ifr.onload = () => resolve(ifr)));
}

describe("Comlink across iframes with different origin", function () {
  beforeEach(function () {
    this.targetOrigin = location.origin.replace("localhost", "127.0.0.1");
  });

  afterEach(function () {
    this.ifr?.remove();
  });

  it("runs under different origins", function () {
    expect(this.targetOrigin).not.to.equal(location.origin);
  });

  it("can communicate with same policies", async function () {
    this.ifr = await createIFrame(
      this.targetOrigin + "/base/tests/fixtures/iframe_allow_localhost.html"
    );

    const proxy = Comlink.wrap(
      Comlink.windowEndpoint(this.ifr.contentWindow, self, this.targetOrigin)
    );
    expect(await proxy(1, 3)).to.equal(4);
  });

  it("can't communicate with remote restricting policies", async function () {
    this.ifr = await createIFrame(
      this.targetOrigin + "/base/tests/fixtures/iframe_disallow_localhost.html"
    );

    const proxy = Comlink.wrap(
      Comlink.windowEndpoint(this.ifr.contentWindow, self, this.targetOrigin)
    );

    let result = true;

    return new Promise((resolve) => {
      proxy(1, 3).then(() => (result = false));

      setTimeout(() => {
        expect(result).to.equal(true);
        resolve();
      }, 1000);
    });
  });

  it("can't communicate with local restricting policies", async function () {
    this.ifr = await createIFrame(
      this.targetOrigin + "/base/tests/fixtures/iframe_allow_localhost.html"
    );

    const proxy = Comlink.wrap(
      Comlink.windowEndpoint(this.ifr.contentWindow, self, "https://surma.dev")
    );

    let result = true;

    return new Promise((resolve) => {
      proxy(1, 3).then(() => (result = false));

      setTimeout(() => {
        expect(result).to.equal(true);
        resolve();
      }, 1000);
    });
  });

  it("can't communicate with restricting policies", async function () {
    this.ifr = await createIFrame(
      this.targetOrigin + "/base/tests/fixtures/iframe_disallow_localhost.html"
    );

    const proxy = Comlink.wrap(
      Comlink.windowEndpoint(this.ifr.contentWindow, self, "https://surma.dev")
    );

    let result = true;

    return new Promise((resolve) => {
      proxy(1, 3).then(() => (result = false));

      setTimeout(() => {
        expect(result).to.equal(true);
        resolve();
      }, 1000);
    });
  });
});
