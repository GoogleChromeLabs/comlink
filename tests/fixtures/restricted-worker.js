function onInit(event) {
  self.removeEventListener("message", onInit);

  importScripts("/base/dist/umd/comlink.js");

  Comlink.expose(
    {
      foo() {},
      mycounter: 1,
      myobj: {
        value: 0,
      },
      myclass: class {},
    },
    undefined,
    event.data
  );

  self.postMessage({});
}

self.addEventListener("message", onInit);
