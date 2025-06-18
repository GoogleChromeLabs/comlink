import { Worker } from "worker_threads";
import * as Comlink from "../../dist/esm/comlink.mjs";
import nodeEndpoint from "../../dist/esm/node-adapter.mjs";
import { expect } from "chai";

describe("node", () => {
  describe("Comlink across workers", function () {
    beforeEach(function () {
      this.worker = new Worker("./tests/node/worker.mjs");
    });

    afterEach(function () {
      this.worker.terminate();
    });

    it("can communicate", async function () {
      const proxy = Comlink.wrap(nodeEndpoint(this.worker));
      expect(await proxy(1, 3)).to.equal(4);
    });

    it("can tunnels a new endpoint with createEndpoint", async function () {
      const proxy = Comlink.wrap(nodeEndpoint(this.worker));
      const otherEp = await proxy[Comlink.createEndpoint]();
      const otherProxy = Comlink.wrap(otherEp);
      expect(await otherProxy(20, 1)).to.equal(21);
    });

    it("releaseProxy closes MessagePort created by createEndpoint", async function () {
      const proxy = Comlink.wrap(nodeEndpoint(this.worker));
      const otherEp = await proxy[Comlink.createEndpoint]();
      const otherProxy = Comlink.wrap(otherEp);
      expect(await otherProxy(20, 1)).to.equal(21);

      await new Promise((resolve) => {
        otherEp.close = resolve; // Resolve the promise when the MessagePort is closed.
        otherProxy[Comlink.releaseProxy](); // Release the proxy, which should close the MessagePort.
      });
    });
  });
});
