import * as Comlink from "/base/dist/esm/comlink.mjs";

describe("Comlink across workers with access control", function () {
  async function init(worker, options) {
    return new Promise(function (res) {
      const onMessage = () => {
        worker.removeEventListener("message", onMessage);
        res();
      };

      worker.addEventListener("message", onMessage);

      worker.postMessage(options);
    });
  }

  beforeEach(async function () {
    this.worker = new Worker("/base/tests/fixtures/restricted-worker.js");
    this.init = (options) => init(this.worker, options);
  });

  afterEach(function () {
    this.worker.terminate();
  });

  it("restricts access", async function () {
    await this.init({ spec: {} });

    const proxy = Comlink.wrap(this.worker);

    let error;
    try {
      await proxy.foo();
    } catch (err) {
      error = err;
    }

    expect(error.message).to.contain("undefined");
  });

  it("forbids calling non-functions", async function () {
    await this.init({ spec: { foo: "primitive" } });

    const proxy = Comlink.wrap(this.worker);

    let error;
    try {
      await proxy.foo();
    } catch (err) {
      error = err;
    }

    expect(error.message).to.contain("undefined");
  });

  it("forbids calling objects", async function () {
    await this.init({ spec: { foo: {} } });

    const proxy = Comlink.wrap(this.worker);

    let error;
    try {
      await proxy.foo();
    } catch (err) {
      error = err;
    }

    expect(error.message).to.contain("undefined");
  });

  it("allows invoking functions", async function () {
    await this.init({ spec: { foo: "function" } });

    const proxy = Comlink.wrap(this.worker);

    expect(await proxy.foo()).to.be.undefined;
  });

  it("can set fields", async function () {
    await this.init({});

    const proxy = Comlink.wrap(this.worker);

    expect(await proxy.mycounter).to.equal(1);

    await (proxy.mycounter = 10);

    expect(await proxy.mycounter).to.equal(10);
  });

  it("can set primitive fields", async function () {
    await this.init({ spec: { mycounter: "primitive" } });

    const proxy = Comlink.wrap(this.worker);

    expect(await proxy.mycounter).to.equal(1);

    await (proxy.mycounter = 10);

    expect(await proxy.mycounter).to.equal(10);
  });

  it("can set fields of primitive fields", async function () {
    await this.init({ spec: { myobj: "primitive" } });

    const proxy = Comlink.wrap(this.worker);

    expect(await proxy.myobj).to.deep.equal({ value: 0 });

    await (proxy.myobj.value = 10);

    expect(await proxy.myobj).to.deep.equal({ value: 10 });
  });

  it("can restrict setting fields", async function () {
    await this.init({ set: false });

    const proxy = Comlink.wrap(this.worker);

    expect(await proxy.mycounter).to.equal(1);

    await (proxy.mycounter = 10);

    expect(await proxy.mycounter).to.equal(1);
  });

  it("can forbid setting on non-primitives", async function () {
    await this.init({ spec: { mycounter: "function" } });

    const proxy = Comlink.wrap(this.worker);

    await (proxy.mycounter = 10);

    expect(await proxy.mycounter).to.equal(1);
  });

  it("can forbid setting on objects", async function () {
    await this.init({ spec: { myobj: { value: "primitive" } } });

    const proxy = Comlink.wrap(this.worker);

    await (proxy.myobj = 10);

    expect(await proxy.myobj).to.deep.equal({ value: 0 });
  });

  it("can forbid constructing instances", async function () {
    await this.init({ spec: { myclass: "function" } });

    const proxy = Comlink.wrap(this.worker);

    let error;

    try {
      await new proxy.myclass();
    } catch (err) {
      error = err;
    }

    expect(error.message).to.contain("constructor");
  });

  it("creates new endpoint with same settings", async function () {
    await this.init({ spec: { myobj: "primitive" } });

    const proxy = Comlink.wrap(this.worker);
    const clone = Comlink.wrap(await proxy[Comlink.createEndpoint]());

    expect(await clone.myobj).to.deep.equal({ value: 0 });
    expect(await clone.myclass).to.be.undefined;
    expect(await clone.foo).to.be.undefined;
    expect(await clone.mycounter).to.be.undefined;
  });
});
