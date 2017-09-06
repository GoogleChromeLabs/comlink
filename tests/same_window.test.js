import * as RPC from '/base/rpc.js';

class SampleClass {
  constructor() {
    this.counter = 1;
  }
  method() {
    return 4;
  }

  increaseCounter() {
    this.counter++;
  }
}

describe('Comlink in the same realm', function () {
  beforeEach(function () {
    const {port1, port2} = new MessageChannel();
    this.port1 = port1;
    this.port2 = port2;
  });

  it('can work with objects', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker({value: 4}, this.port2);
    expect(await proxy.value).to.equal(4);
  });

  it('can work functions on an object', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker({f: _ => 4}, this.port2);
    expect(await proxy.f()).to.equal(4);
  });

  it('can work with functions', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(_ => 4, this.port2);
    expect(await proxy()).to.equal(4);
  });

  it('can work with classes', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.method()).to.equal(4);
  });

  it('can access a class in an object', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker({SampleClass}, this.port2);
    const instance = await new proxy.SampleClass();
    expect(await instance.method()).to.equal(4);
  });

  it('can work with class instance properties', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
  });

  it('can work with class instance methods', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it('can work with bound class instance methods', async function() {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.counter).to.equal(1);
    const method = instance.increaseCounter.bind(instance);
    await method();
    expect(await instance.counter).to.equal(2);
  });
});
