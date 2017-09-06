import {Comlink} from '/base/comlink.js';

class SampleClass {
  constructor() {
    this._counter = 1;
  }

  get counter() {
    return this._counter;
  }

  method() {
    return 4;
  }

  increaseCounter(delta = 1) {
    this._counter += delta;
  }
}

describe('Comlink in the same realm', function () {
  beforeEach(function () {
    const {port1, port2} = new MessageChannel();
    this.port1 = port1;
    this.port2 = port2;
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
});
