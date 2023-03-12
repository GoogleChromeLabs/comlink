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

// comlink 4.3.0
import * as Comlink from "/base/node_modules/comlink/dist/esm/comlink.mjs";

describe("Comlink across versions (4.3.0 to latest main)", function () {
  let oldTruncateThreshold;
  let notcalled;
  let error;
  let iframePort;

  function unhandledrejectionCallback(ev) {
    notcalled = false;
    error = ev.reason;
  }

  function assertNoUnhandledRejection() {
    expect(error).to.equal("");
    expect(notcalled).to.equal(true);
  }

  beforeEach(function () {
    notcalled = true;
    error = "";
    window.addEventListener("unhandledrejection", unhandledrejectionCallback);

    oldTruncateThreshold = chai.config.truncateThreshold;
    chai.config.truncateThreshold = 0;
    this.ifr = document.createElement("iframe");
    this.ifr.sandbox.add("allow-scripts", "allow-same-origin");
    this.ifr.src = "/base/tests/fixtures/v430comlink.html";
    document.body.appendChild(this.ifr);
    return new Promise((resolve) => (this.ifr.onload = resolve)).then(() => {
      const iframeChannel = new MessageChannel();
      iframePort = iframeChannel.port1;
      this.ifr.contentWindow.postMessage(iframeChannel.port2, "*", [
        iframeChannel.port2,
      ]);
    });
  });

  afterEach(function () {
    window.removeEventListener(
      "unhandledrejection",
      unhandledrejectionCallback
    );
    this.ifr.remove();
    chai.config.truncateThreshold = oldTruncateThreshold;
  });

  it("can send a proxy and call a function", async function () {
    const iframe = iframePort;
    const latest = Comlink.wrap(iframe);

    expect(await latest.acceptProxy(Comlink.proxy(() => 3))).to.equal(4);

    assertNoUnhandledRejection();
  });

  it("can send port that get wrapped and transfer by argument", async function () {
    const iframe = iframePort;
    const latest = Comlink.wrap(iframe);
    let maybecalled = false;
    class Test {
      maybe() {
        maybecalled = true;
      }
    }
    const channel = new MessageChannel();
    Comlink.expose(new Test(), channel.port1);

    await latest.callme(
      Comlink.transfer({ foo: channel.port2 }, [channel.port2])
    );

    expect(maybecalled).to.equal(true);

    assertNoUnhandledRejection();
  });

  it("can send port that get wrapped and transfer by a setter", async function () {
    // Verify that it also works with a setter
    const iframe = iframePort;
    const latest = Comlink.wrap(iframe);
    const channel2 = new MessageChannel();
    let risecalled = false;
    Comlink.expose(
      {
        rise() {
          risecalled = true;
        },
      },
      channel2.port1
    );

    latest.iwannabeaport = Comlink.transfer(channel2.port2, [channel2.port2]);
    await latest.wrapWannaBeAndCall();

    expect(risecalled).to.equal(true);

    assertNoUnhandledRejection();
  });

  it("works with custom handlers", async function () {
    const iframe = iframePort;
    const proxy = Comlink.wrap(iframe);

    Comlink.transferHandlers.set("pingpong", {
      canHandle: (obj) => obj === "ping" || obj === "pong",
      serialize: (obj) => [obj, []],
      deserialize: (obj) => obj,
    });

    expect(await proxy.pong("ping")).to.equal("pong");

    assertNoUnhandledRejection();
  });
});
