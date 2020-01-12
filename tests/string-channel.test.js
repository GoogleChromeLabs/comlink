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
    const ts = new TransformStream();
    this.readable = ts.readable;
    this.writable = ts.writable;
  });

  it("can communicate by just using strings", function(done) {
    const { readable, writable } = this;
    const ep1 = wrap({
      setMessageListener(f) {},
      send(msg) {
        const w = writable.getWriter();
        w.write(msg);
        w.releaseLock();
      }
    });
    const ep2 = wrap({
      async setMessageListener(f) {
        const r = readable.getReader();
        while (true) {
          const { value, done } = await r.read();
          if (done) {
            return;
          }
          f(value);
        }
      },
      send(msg) {}
    });
    const originalMessage = { a: 1, b: "hello" };
    ep2.addEventListener("message", ({ data }) => {
      expect(JSON.stringify(data)).to.equal(JSON.stringify(originalMessage));
      // Make sure it's a copy!
      expect(data).to.not.equal(originalMessage);
      done();
    });
    ep1.postMessage(originalMessage);
  });
});

function guardedIt(f) {
  return f() ? it : xit;
}
