import * as RPC from '../rpc.js';

describe('Tasklet in the same realm', function () {
  beforeEach(function () {
    const {port1, port2} = new MessageChannel();
    this.port1 = port1;
    this.port2 = port2;
  });

  it('can get a simple value', async function () {
    const proxy = RPC.proxy(this.port1);
    RPC.exportObject(this.port2, {value: 4});
    expect(await proxy.value).to.equal(4);
  });
});
