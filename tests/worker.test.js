describe('Comlink across workers', function () {
  beforeEach(function () {
    this.worker = new Worker('/base/tests/fixtures/worker.js');
  });

  afterEach(function () {
    this.worker.terminate();
  })

  it('can communicate', async function () {
    const proxy = Comlink.proxy(this.worker);
    expect (await proxy(1, 3)).to.equal(4);
  });
});
