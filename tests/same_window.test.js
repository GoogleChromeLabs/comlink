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
}

describe('Comlink in the same realm', function () {
  beforeEach(function () {
    const {port1, port2} = new MessageChannel();
    this.port1 = port1;
    this.port2 = port2;
  });

  it('catched invalid endpoints', async function () {
    expect(_ => Comlink.proxy({})).to.throw();
    expect(_ => Comlink.expose({}, {})).to.throw();
  });

  it('can work with objects', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({value: 4}, this.port2);
    expect(await proxy.value).to.equal(4);
  });

  it('can work functions on an object', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({f: _ => 4}, this.port2);
    expect(await proxy.f()).to.equal(4);
  });

  it('can work with functions', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(_ => 4, this.port2);
    expect(await proxy()).to.equal(4);
  });

  it('can work with parameterized functions', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose((a, b) => a+b, this.port2);
    expect(await proxy(1, 3)).to.equal(4);
  });

  it('can work with functions that return promises', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(_ => new Promise(resolve => setTimeout(_ => resolve(4), 100)), this.port2);
    expect(await proxy()).to.equal(4);
  });

  it('can work with classes', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.method()).to.equal(4);
  });

  it('can access a class in an object', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose({SampleClass}, this.port2);
    const instance = await new proxy.SampleClass();
    expect(await instance.method()).to.equal(4);
  });

  it('can work with class instance properties', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance._counter).to.equal(1);
  });

  it('can work with class instance methods', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it('can work with class instance methods multiple times', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    await instance.increaseCounter(5);
    expect(await instance.counter).to.equal(7);
  });

  it('can work with class instance methods that return promises', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.promiseFunc()).to.equal(4);
  });

  it('can work with class instance properties that are promises', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance._promise).to.equal(4);
  });

  it('can work with class instance getters that are promises', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.promise).to.equal(4);
  });

  it('can work with static class properties', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    expect(await proxy.SOME_NUMBER).to.equal(4);
  });

  it('can work with static class methods', async function () {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    expect(await proxy.ADD(1, 3)).to.equal(4);
  });

  it('can work with bound class instance methods', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    const method = instance.increaseCounter.bind(instance);
    await method();
    expect(await instance.counter).to.equal(2);
  });

  it('can work with class instance getters', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it('will transfer buffers', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(b => b.byteLength, this.port2);
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    expect(await proxy(buffer)).to.equal(3);
    expect(buffer.byteLength).to.equal(0);
  })

  it('will transfer deeply nested buffers', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(a => a.b.c.d.byteLength, this.port2);
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    expect(await proxy({b: {c: {d: buffer}}})).to.equal(3);
    expect(buffer.byteLength).to.equal(0);
  });

  it('will transfer a message port', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(a => a.postMessage('ohai'), this.port2);
    const {port1, port2} = new MessageChannel();
    await proxy(port2);
    return new Promise(resolve => {
      port1.onmessage = event => {
        expect(event.data).to.equal('ohai');
        resolve();
      };
    });
  });

  it('will proxy marked return values', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(_ => Comlink.proxyValue({
      counter: 0,
      inc() {
        this.counter += 1;
      },
    }), this.port2);
    const obj = await proxy();
    expect(await obj.counter).to.equal(0);
    await obj.inc();
    expect(await obj.counter).to.equal(1);
  });

  it('will proxy marked return values from class instance methods', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new proxy();
    const obj = await instance.proxyFunc();
    expect(await obj.counter).to.equal(0);
    await obj.inc();
    expect(await obj.counter).to.equal(1);
  });

  it('will proxy marked parameter values', async function() {
    const proxy = Comlink.proxy(this.port1);
    const local = {
      counter: 0,
      inc() {
        this.counter++;
      }
    };
    Comlink.expose(async function (f) {
      await f.inc();
    }, this.port2);
    expect(local.counter).to.equal(0);
    await proxy(Comlink.proxyValue(local));
    expect(await local.counter).to.equal(1);
  });

  it('will proxy marked parameter values, simple function', async function() {
    const proxy = Comlink.proxy(this.port1);
    Comlink.expose(async function (f) {
      await f();
    }, this.port2);
    // Weird code because Mocha
    await new Promise(async resolve => {
      proxy(Comlink.proxyValue(_ => resolve()));
    });
  });

  if (asyncGeneratorSupport())
    eval(`
      it('can work with async generators', async function() {
        const proxy = Comlink.proxy(this.port1);
        Comlink.expose(async function* () {
          yield 1;
          yield 2;
          yield 3;
          yield 4;
        }, this.port2);
        const it = await proxy();

        expect(await it.next()).to.deep.equal({value: 1, done: false});
        expect(await it.next()).to.deep.equal({value: 2, done: false});
        expect(await it.next()).to.deep.equal({value: 3, done: false});
        expect(await it.next()).to.deep.equal({value: 4, done: false});
        expect((await it.next()).done).to.equal(true);
      });

      it('can work with async generators that use the yield value', async function() {
        const proxy = Comlink.proxy(this.port1);
        Comlink.expose(async function* () {
          let str = yield;
          while(str !== '')
            str = yield str.length;
        }, this.port2);
        const it = await proxy();

        await it.next();
        expect(await it.next('1')).to.deep.equal({value: 1, done: false});
        expect(await it.next('22')).to.deep.equal({value: 2, done: false});
        expect(await it.next('333')).to.deep.equal({value: 3, done: false});
        expect((await it.next('')).done).to.equal(true);
      });

      it('can work with async generators that yield a promise', async function() {
        const proxy = Comlink.proxy(this.port1);
        Comlink.expose(async function* () {
          yield new Promise(resolve => setTimeout(_ => resolve(4), 100));
        }, this.port2);
        const it = await proxy();

        expect(await it.next()).to.deep.equal({value: 4, done: false});
        expect((await it.next()).done).to.equal(true);
      });
    `);

  if (asyncGeneratorSupport() && forAwaitSupport())
    eval(`
      it('can invoke an exported generator with for-await', async function() {
        const proxy = Comlink.proxy(this.port1);
        Comlink.expose(async function* () {
          yield 1;
          yield 2;
          yield 3;
          yield 4;
        }, this.port2);
        const it = await proxy();

        let counter = 1;
        for await(let i of it) {
          expect(i).to.equal(counter++);
        }
      });

      it('can invoke an exported generator with for-await without a temp variable', async function() {
        const proxy = Comlink.proxy(this.port1);
        Comlink.expose(async function* () {
          yield 1;
          yield 2;
          yield 3;
          yield 4;
        }, this.port2);

        let counter = 1;
        for await(let i of await proxy()) {
          expect(i).to.equal(counter++);
        }
      });
    `);
});
