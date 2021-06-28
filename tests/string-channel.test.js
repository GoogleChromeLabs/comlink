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

import "/base/node_modules/web-streams-polyfill/dist/polyfill.es2018.js";
import { wrap } from "/base/dist/esm/string-channel.experimental.mjs";
import * as Comlink from "/base/dist/esm/comlink.mjs";

describe("StringChannel", function() {
  beforeEach(function() {
    let { readable: r1, writable: w1 } = new TransformStream();
    let { readable: r2, writable: w2 } = new TransformStream();

    this.ep1 = wrap({
      async addMessageListener(f) {
        let rs;
        [r2, rs] = r2.tee();
        const r = rs.getReader();
        while (true) {
          const { value, done } = await r.read();
          if (done) {
            return;
          }
          f(value);
        }
      },
      send(msg) {
        const w = w1.getWriter();
        w.write(msg);
        w.releaseLock();
      }
    });
    this.ep2 = wrap({
      async addMessageListener(f) {
        let rs;
        [r1, rs] = r1.tee();
        const r = rs.getReader();
        while (true) {
          const { value, done } = await r.read();
          if (done) {
            return;
          }
          f(value);
        }
      },
      send(msg) {
        const w = w2.getWriter();
        w.write(msg);
        w.releaseLock();
      }
    });
  });

  it("can communicate by just using strings", function(done) {
    const originalMessage = { a: 1, b: "hello" };
    this.ep2.addEventListener("message", ({ data }) => {
      expect(JSON.stringify(data)).to.equal(JSON.stringify(originalMessage));
      // Make sure it's a copy!
      expect(data).to.not.equal(originalMessage);
      done();
    });
    this.ep2.start();
    this.ep1.postMessage(originalMessage);
  });

  it("can transfer MessagePorts", function(done) {
    const originalMessage = { a: 1, b: "hello" };
    const mc = new MessageChannel();
    this.ep2.addEventListener("message", ({ data }) => {
      data.port.addEventListener("message", ({ data }) => {
        expect(JSON.stringify(data)).to.equal(JSON.stringify(originalMessage));
        done();
      });
      data.port.start();
    });
    this.ep2.start();
    this.ep1.postMessage({ port: mc.port2 }, [mc.port2]);
    mc.port1.postMessage(originalMessage);
  });

  it("can transfer ArrayBuffers", function(done) {
    const originalMessage = { a: 1, b: new Uint8Array([1, 2, 3]).buffer };
    this.ep2.addEventListener("message", ({ data }) => {
      expect([...new Uint8Array(data.b)]).to.deep.equal([1, 2, 3]);
      done();
    });
    this.ep2.start();
    this.ep1.postMessage(originalMessage);
  });

  it("can transfer TypedArrays", function(done) {
    const originalMessage = { a: 1, b: new Uint8Array([1, 2, 3]) };
    this.ep2.addEventListener("message", ({ data }) => {
      expect([...data.b]).to.deep.equal([1, 2, 3]);
      done();
    });
    this.ep2.start();
    this.ep1.postMessage(originalMessage);
  });

  it("can transfer and call Callbacks", async function() {
    const originalObj = { a: () => Promise.resolve(false) };
    Comlink.expose(originalObj, this.ep1);
    const remoteObj = Comlink.wrap(this.ep2);

    // This set action is asynchronous no way to await here
    remoteObj.a = Comlink.proxy(() => true);
    // Waiting for setter to actually activate
    await new Promise((resolve) => setTimeout(resolve, 0));
    const result = await originalObj.a();
    expect(result).to.be.true;
  });
});

function guardedIt(f) {
  return f() ? it : xit;
}
