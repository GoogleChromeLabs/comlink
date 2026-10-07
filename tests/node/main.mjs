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

  describe("Comlink.expose", function () {
    beforeEach(function () {
      const { port1, port2 } = new MessageChannel();
      this.local = port1;
      this.remote = port2;
      this.local.start();
      this.remote.start();
      Comlink.expose({ ping: () => "pong" }, this.local);
    });

    it("answers an error when the arguments cannot be deserialized", async function () {
      const reply = new Promise((resolve) =>
        this.remote.addEventListener("message", (ev) => resolve(ev.data), {
          once: true,
        })
      );
      // Same shape as a call coming out of Comlink.wrap(), except the argument
      // was serialized with a transfer handler this endpoint never registered.
      this.remote.postMessage({
        id: "1",
        type: "APPLY",
        path: ["ping"],
        argumentList: [{ type: "HANDLER", name: "not-registered", value: 1 }],
      });

      const { type, name, value } = await reply;
      expect(type).to.equal("HANDLER");
      expect(name).to.equal("throw");
      expect(value.value.message).to.contain("not-registered");
    });
  });
});
