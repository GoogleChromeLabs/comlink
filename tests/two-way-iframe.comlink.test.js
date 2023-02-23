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

describe("Comlink across iframes", function () {
  let oldTruncateThreshold;

  beforeEach(function () {
    oldTruncateThreshold = chai.config.truncateThreshold;
    chai.config.truncateThreshold = 0;
    this.ifr = document.createElement("iframe");
    this.ifr.sandbox.add("allow-scripts", "allow-same-origin");
    this.ifr.src = "/base/tests/fixtures/two-way-iframe.html";
    document.body.appendChild(this.ifr);
    return new Promise((resolve) => (this.ifr.onload = resolve));
  });

  afterEach(function () {
    this.ifr.remove();
    chai.config.truncateThreshold = oldTruncateThreshold;
  });

  it("can communicate both ways", async function () {
    let notcalled = true;
    let error = "";
    window.addEventListener("unhandledrejection", (ev) => {
      notcalled = false;
      error = ev.reason;
    });
    const iframe = Comlink.windowEndpoint(this.ifr.contentWindow);
    const channel = new MessageChannel();
    let called = false;
    class NonCloneable {
      // this is key to get an error regarding port being non-cloneable
      // otherwise the test pass despite the code being completely wrong
      constructor(port) {
        this.port = port;
      }
      increment(a) {
        called = true;
        return ++a;
      }
    }
    Comlink.expose(new NonCloneable(channel.port1), iframe);
    const proxy = Comlink.wrap(iframe);
    expect(await proxy(1, 3)).to.equal(5);
    expect(await proxy(1, 3)).to.equal(5);
    // await new Promise((res) => res());
    expect(called).to.equal(true);
    expect(error).to.equal("");
    expect(notcalled).to.equal(true);
  });
});
