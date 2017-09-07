describe('Comlink across iframes', function () {
  beforeEach(function () {
    this.ifr = document.createElement('iframe')
    this.ifr.src = '/base/tests/fixtures/iframe.html';
    document.body.appendChild(this.ifr);
    return new Promise(resolve => this.ifr.onload = resolve);
  });

  afterEach(function () {
    this.ifr.remove();
  })

  it('can communicate', async function () {
    const proxy = Comlink.proxy(Comlink.windowEndpoint(this.ifr.contentWindow));
    expect (await proxy(1, 3)).to.equal(4);
  });
});
