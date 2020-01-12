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
import { wrap } from "/base/dist/esm/string-channel.mjs";

describe("StringChannel", function() {
  beforeEach(function() {
    const ts1 = new TransformStream();
    const ts2 = new TransformStream();

    this.ep1 = wrap({
      async setMessageListener(f) {
        const r = ts2.readable.getReader();
        while (true) {
          const { value, done } = await r.read();
          if (done) {
            return;
          }
          f(value);
        }
      },
      send(msg) {
        const w = ts1.writable.getWriter();
        w.write(msg);
        w.releaseLock();
      }
    });
    this.ep2 = wrap({
      async setMessageListener(f) {
        const r = ts1.readable.getReader();
        while (true) {
          const { value, done } = await r.read();
          if (done) {
            return;
          }
          f(value);
        }
      },
      send(msg) {
        const w = ts2.writable.getWriter();
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
    this.ep1.postMessage(originalMessage);
  });
});

function guardedIt(f) {
  return f() ? it : xit;
}
