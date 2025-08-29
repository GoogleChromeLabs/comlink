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

import * as Comlink from "/base/dist/esm/comlink.mjs";

describe("Comlink multiple workers isolation", function () {
  let workers = [];

  afterEach(function () {
    // Clean up all workers
    workers.forEach(worker => worker.terminate());
    workers = [];
  });

  it("ensures messages are not received by wrong workers", async function () {
    // Create two separate workers with different exposed objects
    const worker1 = new Worker("/base/tests/fixtures/multiple-worker1.js");
    const worker2 = new Worker("/base/tests/fixtures/multiple-worker2.js");
    workers.push(worker1, worker2);

    // Wait a bit for workers to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Wrap both workers
    const proxy1 = Comlink.wrap(worker1);
    const proxy2 = Comlink.wrap(worker2);

    // Test that each worker responds correctly to its own methods
    expect(await proxy1.getWorkerId()).to.equal("worker1");
    expect(await proxy2.getWorkerId()).to.equal("worker2");

    // Test that calling methods on one worker doesn't affect the other
    await proxy1.incrementCounter();
    await proxy1.incrementCounter();
    expect(await proxy1.getCounter()).to.equal(2);
    expect(await proxy2.getCounter()).to.equal(0); // Worker2's counter should be unaffected

    await proxy2.incrementCounter();
    expect(await proxy1.getCounter()).to.equal(2); // Worker1's counter should be unaffected
    expect(await proxy2.getCounter()).to.equal(1);
  });

  it("handles multiple exposed objects on same endpoint correctly", async function () {
    const worker = new Worker("/base/tests/fixtures/multiple-expose-worker.js");
    workers.push(worker);

    // Wait for worker to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    const proxy = Comlink.wrap(worker);

    // The worker exposes multiple objects, but only the last one should be active
    // (based on the implementation where last exposed object takes precedence)
    expect(await proxy.getType()).to.equal("object2");
    expect(await proxy.getValue()).to.equal(200);
  });

  it("prevents cross-worker message pollution", async function () {
    // Create multiple workers
    const worker1 = new Worker("/base/tests/fixtures/multiple-worker1.js");
    const worker2 = new Worker("/base/tests/fixtures/multiple-worker2.js");
    const worker3 = new Worker("/base/tests/fixtures/multiple-worker1.js"); // Same type as worker1
    workers.push(worker1, worker2, worker3);

    await new Promise(resolve => setTimeout(resolve, 100));

    const proxy1 = Comlink.wrap(worker1);
    const proxy2 = Comlink.wrap(worker2);
    const proxy3 = Comlink.wrap(worker3);

    // Verify each worker has correct identity
    expect(await proxy1.getWorkerId()).to.equal("worker1");
    expect(await proxy2.getWorkerId()).to.equal("worker2");
    expect(await proxy3.getWorkerId()).to.equal("worker1");

    // Perform operations that could potentially cross-contaminate if message isolation fails
    await Promise.all([
      proxy1.incrementCounter(),
      proxy2.incrementCounter(),
      proxy3.incrementCounter(),
    ]);

    await Promise.all([
      proxy1.incrementCounter(),
      proxy2.incrementCounter(),
    ]);

    // Verify each worker maintained its own state
    expect(await proxy1.getCounter()).to.equal(2);
    expect(await proxy2.getCounter()).to.equal(2);
    expect(await proxy3.getCounter()).to.equal(1);
  });

  it("handles rapid concurrent operations without message mixing", async function () {
    const worker1 = new Worker("/base/tests/fixtures/multiple-worker1.js");
    const worker2 = new Worker("/base/tests/fixtures/multiple-worker2.js");
    workers.push(worker1, worker2);

    await new Promise(resolve => setTimeout(resolve, 100));

    const proxy1 = Comlink.wrap(worker1);
    const proxy2 = Comlink.wrap(worker2);

    // Perform many rapid operations that could cause message mixing if not properly isolated
    const operations = [];
    for (let i = 0; i < 50; i++) {
      operations.push(proxy1.incrementCounter());
      operations.push(proxy2.incrementCounter());
    }

    await Promise.all(operations);

    // Each worker should have incremented exactly 50 times
    expect(await proxy1.getCounter()).to.equal(50);
    expect(await proxy2.getCounter()).to.equal(50);
  });

  it("maintains correct endpoint listeners after worker communication", async function () {
    const worker1 = new Worker("/base/tests/fixtures/multiple-worker1.js");
    const worker2 = new Worker("/base/tests/fixtures/multiple-worker2.js");
    workers.push(worker1, worker2);

    await new Promise(resolve => setTimeout(resolve, 100));

    const proxy1 = Comlink.wrap(worker1);
    const proxy2 = Comlink.wrap(worker2);

    // Create new endpoints to test endpoint isolation
    const endpoint1 = await proxy1[Comlink.createEndpoint]();
    const endpoint2 = await proxy2[Comlink.createEndpoint]();

    const endpointProxy1 = Comlink.wrap(endpoint1);
    const endpointProxy2 = Comlink.wrap(endpoint2);

    // Test that endpoints maintain proper isolation
    expect(await endpointProxy1.getWorkerId()).to.equal("worker1");
    expect(await endpointProxy2.getWorkerId()).to.equal("worker2");

    // Test operations through endpoints
    await endpointProxy1.incrementCounter();
    await endpointProxy2.incrementCounter();

    expect(await endpointProxy1.getCounter()).to.equal(1);
    expect(await endpointProxy2.getCounter()).to.equal(1);

    // Verify original proxies still work correctly
    expect(await proxy1.getCounter()).to.equal(1); // Same state as endpoint
    expect(await proxy2.getCounter()).to.equal(1); // Same state as endpoint

    // Clean up endpoints
    endpointProxy1[Comlink.releaseProxy]();
    endpointProxy2[Comlink.releaseProxy]();
  });
});
