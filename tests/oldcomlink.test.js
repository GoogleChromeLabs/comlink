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

describe("Comlink across versions (4.3.0 with latest main)", function () {
  let oldTruncateThreshold;

  beforeEach(function () {
    oldTruncateThreshold = chai.config.truncateThreshold;
    chai.config.truncateThreshold = 0;
    this.ifr = document.createElement("iframe");
    this.ifr.sandbox.add("allow-scripts", "allow-same-origin");
    this.ifr.src = "/base/tests/fixtures/oldcomlink.html";
    document.body.appendChild(this.ifr);
    return new Promise((resolve) => (this.ifr.onload = resolve));
  });

  afterEach(function () {
    this.ifr.remove();
    chai.config.truncateThreshold = oldTruncateThreshold;
  });

  it("can expose, wrap and transfer", async function () {
    let notcalled = true;
    let error = "";
    window.addEventListener("unhandledrejection", (ev) => {
      notcalled = false;
      error = ev.reason;
    });

    let maybecalled = false;
    class Test {
      maybe() {
        maybecalled = true;
      }
    }
    const channel = new MessageChannel();
    Comlink.expose(new Test(), channel.port1);

    const iframe = Comlink.windowEndpoint(this.ifr.contentWindow);
    const proxy = Comlink.wrap(iframe);

    expect(await proxy.add(1, 3)).to.equal(4);
    await proxy.callme(Comlink.transfer(channel.port2, [channel.port2]));

    expect(maybecalled).to.equal(true);
    expect(error).to.equal("");
    expect(notcalled).to.equal(true);
  });

  it("works with custom handlers", async function () {
    const iframe = Comlink.windowEndpoint(this.ifr.contentWindow);
    const proxy = Comlink.wrap(iframe);

    Comlink.transferHandlers.set("pingpong", {
      canHandle: (obj) => obj === "ping" || obj === "pong",
      serialize: (obj) => [obj, []],
      deserialize: (obj) => obj,
    });

    expect(await proxy.pong("ping")).to.equal("pong");
  });
});
