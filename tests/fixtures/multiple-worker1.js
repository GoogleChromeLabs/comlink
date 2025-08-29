/**
 * Test worker 1 - has its own state and identity
 */

importScripts("/base/dist/umd/comlink.js");

const worker1Object = {
  workerId: "worker1",
  counter: 0,

  getWorkerId() {
    return this.workerId;
  },

  getCounter() {
    return this.counter;
  },

  incrementCounter() {
    this.counter++;
    return this.counter;
  },

  setCounter(value) {
    this.counter = value;
    return this.counter;
  },
};

Comlink.expose(worker1Object);
