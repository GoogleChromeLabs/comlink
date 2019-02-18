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

import * as Comlink from "/base/dist/comlink.js";

class SampleClass {
  constructor() {
    this._counter = 1;
    this._promise = Promise.resolve(4);
  }

  static get SOME_NUMBER() {
    return 4;
  }

  static ADD(a, b) {
    return a + b;
  }

  get counter() {
    return this._counter;
  }

  set counter(value) {
    this._counter = value;
  }

  get promise() {
    return this._promise;
  }

  method() {
    return 4;
  }

  increaseCounter(delta = 1) {
    this._counter += delta;
  }

  promiseFunc() {
    return new Promise(resolve => setTimeout(_ => resolve(4), 100));
  }

  proxyFunc() {
    return Comlink.proxyValue({
      counter: 0,
      inc() {
        this.counter++;
      }
    });
  }

  throwsAnError() {
    throw Error("OMG");
  }
}

describe("Comlink in the same realm", function() {
  beforeEach(function() {
    const { port1, port2 } = new MessageChannel();
    this.port1 = port1;
    this.port2 = port2;
  });

  it("catched invalid endpoints", async function() {
    expect(_ => Comlink.proxy({})).to.throw();
    expect(_ => Comlink.expose({}, {})).to.throw();
  });

  it("can work with objects", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({ value: 4 }, this.port2);
    expect(await proxy.value).to.equal(4);
  });

  it("can work functions on an object", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({ f: _ => 4 }, this.port2);
    expect(await proxy.f()).to.equal(4);
  });

  it("can work with functions", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(_ => 4, this.port2);
    expect(await proxy()).to.equal(4);
  });

  it("can work with objects that have undefined properties", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({ x: undefined }, this.port2);
    expect(await proxy.x).to.be.undefined;
  });

  it("can keep the stack and message of thrown errors", async function() {
    let stack;
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(_ => {
      const error = Error("OMG");
      stack = error.stack;
      throw error;
    }, this.port2);
    try {
      await proxy();
      fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.equal("OMG");
      expect(err.stack).to.equal(stack);
    }
  });

  it("can rethrow non-error objects", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(_ => {
      throw { test: true };
    }, this.port2);
    try {
      await proxy();
      fail("Should have thrown");
    } catch (err) {
      expect(err.test).to.equal(true);
    }
  });

  it("can work with parameterized functions", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose((a, b) => a + b, this.port2);
    expect(await proxy(1, 3)).to.equal(4);
  });

  it("can work with functions that return promises", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(
      _ => new Promise(resolve => setTimeout(_ => resolve(4), 100)),
      this.port2
    );
    expect(await proxy()).to.equal(4);
  });

  it("can work with classes", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.method()).to.equal(4);
  });

  it("can access a class in an object", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({ SampleClass }, this.port2);
    const instance = await new proxy.SampleClass();
    expect(await instance.method()).to.equal(4);
  });

  it("can work with class instance properties", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance._counter).to.equal(1);
  });

  it("can set class instance properties", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance._counter).to.equal(1);
    await (instance._counter = 4);
    expect(await instance._counter).to.equal(4);
  });

  it("can work with class instance methods", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it("can handle throwing class instance methods", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    return instance
      .throwsAnError()
      .then(_ => Promise.reject())
      .catch(err => {});
  });

  it("can work with class instance methods multiple times", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    await instance.increaseCounter(5);
    expect(await instance.counter).to.equal(7);
  });

  it("can work with class instance methods that return promises", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.promiseFunc()).to.equal(4);
  });

  it("can work with class instance properties that are promises", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance._promise).to.equal(4);
  });

  it("can work with class instance getters that are promises", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.promise).to.equal(4);
  });

  it("can work with static class properties", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    expect(await proxy.SOME_NUMBER).to.equal(4);
  });

  it("can work with static class methods", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    expect(await proxy.ADD(1, 3)).to.equal(4);
  });

  it("can work with bound class instance methods", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    const method = instance.increaseCounter.bind(instance);
    await method();
    expect(await instance.counter).to.equal(2);
  });

  it("can work with class instance getters", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it("can work with class instance setters", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance._counter).to.equal(1);
    await (instance.counter = 4);
    expect(await instance._counter).to.equal(4);
  });

  const hasBroadcastChannel = _ => "BroadcastChannel" in self;
  guardedIt(hasBroadcastChannel)(
    "will work with BroadcastChannel",
    async function() {
      const b1 = new BroadcastChannel("comlink_bc_test");
      const b2 = new BroadcastChannel("comlink_bc_test");
      const proxy = Comlink.proxy(b1);
      Comlink.expose(b => 40 + b, b2);
      expect(await proxy(2)).to.equal(42);
    }
  );

  // Buffer transfers seem to have regressed in Safari 11.1, it’s fixed in 11.2.
  const isNotSafari11_1 = _ =>
    !/11\.1(\.[0-9]+)? Safari/.test(navigator.userAgent);
  guardedIt(isNotSafari11_1)("will transfer buffers", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(b => b.byteLength, this.port2);
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    expect(await proxy(buffer)).to.equal(3);
    expect(buffer.byteLength).to.equal(0);
  });

  guardedIt(isNotSafari11_1)(
    "will transfer deeply nested buffers",
    async function() {
      const proxy = Comlink.proxy(this.port1);
      Comlink.expose(a => a.b.c.d.byteLength, this.port2);
      const buffer = new Uint8Array([1, 2, 3]).buffer;
      expect(await proxy({ b: { c: { d: buffer } } })).to.equal(3);
      expect(buffer.byteLength).to.equal(0);
    }
  );

  it("will transfer a message port", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(a => a.postMessage("ohai"), this.port2);
    const { port1, port2 } = new MessageChannel();
    await proxy(port2);
    return new Promise(resolve => {
      port1.onmessage = event => {
        expect(event.data).to.equal("ohai");
        resolve();
      };
    });
  });

  it("will proxy marked return values", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(
      _ =>
        Comlink.proxyValue({
          counter: 0,
          inc() {
            this.counter += 1;
          }
        }),
      this.port2
    );
    const obj = await proxy();
    expect(await obj.counter).to.equal(0);
    await obj.inc();
    expect(await obj.counter).to.equal(1);
  });

  it("will proxy marked return values from class instance methods", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    const promise = instance.proxyFunc();
    expect(promise).to.be.instanceOf(Promise);
    const obj = await promise;
    expect(await obj.counter).to.equal(0);
    await obj.inc();
    expect(await obj.counter).to.equal(1);
  });

  it("will proxy marked parameter values", async function() {
    const proxy = Comlink.proxy(this.port1);
    const local = {
      counter: 0,
      inc() {
        this.counter++;
      }
    };
    Comlink.expose(async function(f) {
      await f.inc();
    }, this.port2);
    expect(local.counter).to.equal(0);
    await proxy(Comlink.proxyValue(local));
    expect(await local.counter).to.equal(1);
  });

  it("will proxy marked parameter values, simple function", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(async function(f) {
      await f();
    }, this.port2);
    // Weird code because Mocha
    await new Promise(async resolve => {
      proxy(Comlink.proxyValue(_ => resolve()));
    });
  });

  it("will proxy marked parameter that is a function with cloneable return value", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(async function(f) {
      const result = f();
      expect(result instanceof Promise).to.be.true;
      const obj = await result;
      expect(obj).to.haveOwnProperty("foo");
      expect(await obj.foo).to.equal(123);
    }, this.port2);
    await proxy(Comlink.proxyValue(() => ({ foo: 123 })));
  });

  it("will proxy marked parameter that is a function with proxied return value", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(async function(f) {
      const result = f();
      expect(result instanceof Promise).to.be.true;
      const obj = await result;
      expect(await obj.foo).to.equal(123);
    }, this.port2);
    await proxy(Comlink.proxyValue(() => Comlink.proxyValue({ foo: 123 })));
  });

  it("will proxy deeply nester values", async function() {
    const proxy = Comlink.proxy(this.port1);
    const obj = {
      a: {
        v: 4
      },
      b: Comlink.proxyValue({
        v: 4
      })
    };
    Comlink.expose(obj, this.port2);

    const a = await proxy.a;
    const b = await proxy.b;
    expect(await a.v).to.equal(4);
    expect(await b.v).to.equal(4);
    obj.a.v = 9;
    obj.b.v = 9;
    expect(await a.v).to.equal(4);
    expect(await b.v).to.equal(9);
  });

  it("will proxy values in an array", function(done) {
    const proxy = Comlink.proxy(this.port1);
    const obj = {
      async someFunc(v) {
        await v[0]();
      }
    };
    Comlink.expose(obj, this.port2);

    proxy.someFunc([Comlink.proxyValue(_ => done())]);
  });

  it("will handle undefined parameters", async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({ f: _ => 4 }, this.port2);
    expect(await proxy.f(undefined)).to.equal(4);
  });

  it("can handle destructuring on the proxy side", async function() {
    Comlink.expose(
      {
        a: 4,
        get b() {
          return 5;
        },
        c() {
          return 6;
        }
      },
      this.port2
    );
    const { a, b, c } = Comlink.proxy(this.port1);
    expect(await a).to.equal(4);
    expect(await b).to.equal(5);
    expect(await c()).to.equal(6);
  });

  it("can proxy with a given target", async function() {
    const proxy = Comlink.proxy(this.port1, { value: {} });
    Comlink.expose({ value: 4 }, this.port2);
    expect(await proxy.value).to.equal(4);
  });

  it("can call a method on a nested object when wrapped with proxyValue()", async function() {
    Comlink.expose(
      {
        prop: Comlink.proxyValue({
          method(p) {
            return p;
          }
        })
      },
      this.port2
    );
    const proxy = Comlink.proxy(this.port1);
    expect(await proxy.prop.method(123)).to.equal(123);
  });

  it("can retrieve a property on a nested object when wrapped with proxyValue()", async function() {
    Comlink.expose(
      {
        prop1: Comlink.proxyValue({
          prop2: 123
        })
      },
      this.port2
    );
    const proxy = Comlink.proxy(this.port1);
    expect(await proxy.prop1.prop2).to.equal(123);
  });
});

function guardedIt(f) {
  return f() ? it : xit;
}
