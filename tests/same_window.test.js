import * as RPC from '/base/rpc.js';

class SampleClass {
  method() {
    return 4;
  }
}

describe('Tasklet in the same realm', function () {
  beforeEach(function () {
    const {port1, port2} = new MessageChannel();
    this.port1 = port1;
    this.port2 = port2;
  });

  it('can export an object', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker({value: 4}, this.port2);
    expect(await proxy.value).to.equal(4);
  });

  it('can export a function', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(_ => 4, this.port2);
    expect(await proxy()).to.equal(4);
  });

  it('can export a class in a object', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker(SampleClass, this.port2);
    const instance = await new proxy();
    expect(await instance.method()).to.equal(4);
  });

  it('can export a class in a object', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.invoker({SampleClass}, this.port2);
    const instance = await new proxy.SampleClass();
    expect(await instance.method()).to.equal(4);
  });
});
