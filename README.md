# Comlink

Comlink makes [WebWorkers][webworker] enjoyable. Comlink is a **tiny library (1.1kB)**, that removes the mental barrier of thinking about `postMessage` and hides the fact that you are working with workers.

At a more abstract level it is an RPC implementation for `postMessage` and [ES6 Proxies][es6 proxy].

```
$ npm install --save comlink
```

![Comlink in action](https://user-images.githubusercontent.com/234957/54164510-cdab2d80-4454-11e9-92d0-7356aa6c5746.png)

## Browsers support & bundle size

![Chrome 56+](https://img.shields.io/badge/Chrome-56+-green.svg?style=flat-square)
![Edge 15+](https://img.shields.io/badge/Edge-15+-green.svg?style=flat-square)
![Firefox 52+](https://img.shields.io/badge/Firefox-52+-green.svg?style=flat-square)
![Opera 43+](https://img.shields.io/badge/Opera-43+-green.svg?style=flat-square)
![Safari 10.1+](https://img.shields.io/badge/Safari-10.1+-green.svg?style=flat-square)
![Samsung Internet 6.0+](https://img.shields.io/badge/Samsung_Internet-6.0+-green.svg?style=flat-square)

Browsers without [ES6 Proxy] support can use the [proxy-polyfill].

**Size**: ~2.5k, ~1.2k gzip’d, ~1.1k brotli’d

## Introduction

On mobile phones, and especially on low-end mobile phones, it is important to keep the main thread as idle as possible so it can respond to user interactions quickly and provide a jank-free experience. **The UI thread ought to be for UI work only**. WebWorkers are a web API that allow you to run code in a separate thread. To communicate with another thread, WebWorkers offer the `postMessage` API. You can send JavaScript objects as messages using `myWorker.postMessage(someObject)`, triggering a `message` event inside the worker.

Comlink turns this messaged-based API into a something more developer-friendly by providing an RPC implementation: Values from one thread can be used within the other thread (and vice versa) just like local values.

## API

### `Comlink.wrap(endpoint)` and `Comlink.expose(value, endpoint?)`

Comlink’s goal is to make _exposed_ values from one thread available in the other. `expose` exposes `value` on `endpoint`, where `endpoint` is a [`postMessage`-like interface][endpoint].

`wrap` wraps the _other_ end of the message channel and returns a proxy. The proxy will have all properties and functions of the exposed value, but access and invocations are inherintly asynchronous. This means that a function that returns a number will now return _a promise_ for a number. **As a rule of thumb: If you are using the proxy, put `await` in front of it.** Exceptions will be caught and re-thrown on the other side.

### `Comlink.transfer(value, transferables)` and `Comlink.proxy(value)`

By default, every function parameter, return value and object property value is copied, in the sense of [structured cloning]. Structured cloning can be thought of as deep copying, but has some limitations. See [this table][structured clone table] for details.

If you want a value to be transferred rather than copied — provided the value is or contains a [`Transferable`][transferable] — you can wrap the value in a `transfer()` call and provide a list of transferable values:

```js
const data = new Uint8Array([1, 2, 3, 4, 5]);
await myProxy.someFunction(Comlink.transfer(data, [data.buffer]));
```

Lastly, you can use `Comlink.proxy(value)`. When using this Comlink will neither copy nor transfer the value, but instead send a proxy. Both threads now work on the same value. This is useful for callbacks, for example, as functions are neither structured cloneable nor transferable.

```js
myProxy.onready = Comlink.proxy(data => {
  /* ... */
});
```

### Transfer handlers and event listeners

It is common that you want to use Comlink to add an event listener, where the event source is on another thread:

```js
button.addEventListener("click", myProxy.onClick.bind(myProxy));
```

While this won’t throw immediately, `onClick` will never actually be called. This is because [`Event`][event] is neither structured cloneable nor transferable. As a workaround, Comlink offers transfer handlers.

Each function parameter and return value is given to _all_ registered transfer handlers. If one of the event handler signals that it can process the value by returning `true` from `canHandle()`, it is now responsible for serializing the value to structured cloneable data and for deserializing the value. A transfer handler has be set up on _both sides_ of the message channel. Here’s an example transfer handler for events:

```js
Comlink.transferHandlers.set("EVENT", {
  canHandle: obj => obj instanceof Event,
  serialize: ev => {
    return [{
      target: {
        id: ev.target.id
        classList: [...ev.target.classList]
      }
    }, []];
  },
  deserialize: obj => obj,
});
```

Note that this particular transfer handler won’t create an actual `Event`, but just an object that has the `event.target.id` and `event.target.classList` property. Often, this enough. If not, the transfer handler can be easily augmented to provide all necessary data.

### `Comlink.createEndpoint`

Every proxy created by Comlink has the `[createEndpoint]` method.
Calling it will return a new `MessagePort`, that has been hooked up to the same object as the proxy that `[createEndpoint]` has been called on.

```js
const port = myProxy[Comlink.createEndpoint]();
const newProxy = Comlink.wrap(port);
```

## Node

Comlink works with Node’s [`worker_threads`][worker_threads] module. Take a look at the example in the `docs` folder.

[webworker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[umd]: https://github.com/umdjs/umd
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
[messageport]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[examples]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples
[dist]: https://github.com/GoogleChromeLabs/comlink/tree/master/dist
[delivrjs]: https://cdn.jsdelivr.net/
[es6 proxy]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
[proxy-polyfill]: https://github.com/GoogleChrome/proxy-polyfill
[endpoint]: src/protocol.ts
[structured cloning]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[structured clone table]: structured-clone-table.md
[event]: https://developer.mozilla.org/en-US/docs/Web/API/Event
[worker_threads]: https://nodejs.org/api/worker_threads.html

---

License Apache-2.0
