/**
 * Test worker that exposes multiple objects to test the "last exposed takes precedence" behavior
 */

importScripts("/base/dist/umd/comlink.js");

const object1 = {
  type: "object1",
  value: 100,

  getType() {
    return this.type;
  },

  getValue() {
    return this.value;
  },
};

const object2 = {
  type: "object2",
  value: 200,

  getType() {
    return this.type;
  },

  getValue() {
    return this.value;
  },
};

// Expose both objects - the second one should take precedence
Comlink.expose(object1);
Comlink.expose(object2);
