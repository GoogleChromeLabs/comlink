# Comlink
A tiny RPC library that works on windows, iframes, WebWorkers and
ServiceWorkers.

**With Comlink you can work on values from another JavaScript realm
(like a Worker or an iframe) as if it was a local value. Just use `await`
whenever using the remote value.**

Anything that works with `postMessage` can be used as a communication channel.

## Usage

You can download Comlink from the [dist folder][dist]. Alternatively, you can
install it via npm

```
$ npm install --save comlinkjs
```

or use a CDN like [delivrjs]:

```
https://cdn.jsdelivr.net/npm/comlinkjs@2.3.0/comlink.es6.min.js
```

**Size**: ~4.0k, ~1.6k gzip’d.

## Example

There’s more examples in the [examples directory][examples].

```html
<-- index.html -->
<!doctype html>
<script src="../../dist/comlink.global.js"></script>
<script>
  const worker = new Worker('worker.js');
  // WebWorkers use `postMessage` and therefore work with Comlink.
  const api = Comlink.proxy(worker);

  async function init() {
    // Note the usage of `await`:
    const app = await new api.App();

    alert(`Counter: ${await app.count}`);
    await app.inc();
    alert(`Counter: ${await app.count}`);
  };

  init();
</script>
```

```js
// worker.js
importScripts('../dist/comlink.global.js');

class App {
  constructor() {
    this._counter = 0;
  }

  get count() {
    return this._counter;
  }

  inc() {
    this._counter++;
  }
}

Comlink.expose({App}, self);
```

## Module formats

The Comlink module is provided in 3 different formats:

* **“es6”**: This package uses the native ES6 module format. Due to some
  necessary hackery, the module exports a `Comlink` object. Import it as
  follows:

  ```js
  import {Comlink} from '../dist/comlink.es6.js';

  // ...
  ```

* **“global”**: This package adds a `Comlink` namespace on `self`. Useful for
  workers or projects without a module loader.
* **“umd”**: This package uses [UMD] so it is compatible with AMD, CommonJS
  and requireJS.

These packages can be mixed and matched. A worker using `global` can be
connected to a window using `es6`. For the sake of network conservation, I do
recommend sticking to one format, though.

## API

The Comlink module exports 3 functions:

### `Comlink.proxy(endpoint)`

`proxy` creates an ES6 proxy and sends all operations performed on that proxy
through the channel behind `endpoint`. `endpoint` can be a `Window`, a `Worker`
or a `MessagePort`.* The other endpoint of the channel should be passed to
`expose`.

Note that all parameters for a function or method invocations will be
structurally cloned or transferred if they are [transferable]. If you want to
pass use functions as parameters (e.g. callbacks), make sure to wrap them with
`proxyValue` (see below).

*) Technically it can be any object with `postMessage`, `addEventListener` and
`removeEventListener`.

### `Comlink.expose(rootObj, endpoint)`

`expose` is the counter-part to `proxy`. It listens for RPC messages on
`endpoint` and applies the operations to `rootObj`. Return values of functions
will be structurally cloned or transfered if they are [transferable]. The same
restrictions as for `proxy` apply.

### `Comlink.proxyValue(value)`

If structurally cloning a value is undesired (either for a function parameter or
a function’s return value), wrapping the value in a `proxyValue` call will proxy
that value instead. This is necessary for callback functions being passed
around:

```js
// main.js
const worker = new Worker('worker.js');
const doStuff = Comlink.proxy(worker);
await doStuff(result => console.log(result));
```

```js
// worker.js
Comlink.expose(async function (f) {
  const result = /* omg so expensive */;
  /* f is a proxy, as if created by proxy(). So we need to use `await. */
  await f(result);
}, self);
```

# TransferHandler

Some types are neither transferable not structurally cloneable and can therefore
not be `postMessage`’d. To remedy this, a `TransferHandler` offers a hook into the
serialization and deserialization process to allow these types to be used with
Comlink. `TransferHandler`s must fulfill the following interface:

- `canHandle(obj)`: Should `true` if this `TransferHandler` is capable of
  (de)serializing the given object.
- `serialize(obj)`: Serializes `obj` to something structurally cloneable.
- `deserialize(obj)`: The inverse of `serialize`.

## Example

One example would be that using an instance of a class as a parameter to a remote
function will invoke the function with a simple JSON object. The prototype gets
lost when the instance gets structurally cloned. Let’s say the class
`ComplexNumber` is used for some calculations. To make sure instances
of `ComplexNumber` are handled correctly, the following `TransferHandler` can be
used:

```js
const complexNumberTransferHandler = {
  canHandle(obj) {
    return obj instanceof ComplexNumber;
  },
  serialize(obj) {
    return {re: obj.re, im: obj.im};
  }
  deserialize(obj) {
    return new ComplexNumber(obj.re, obj.im);
  }
};
```

This new `TransferHandler` can be registered with Comlink like this:

```js
Comlink.transferHandlers.set('COMPLEX', complexNumberTransferHandler);
```

The string can be arbitrary but must be unique across all `TransferHandler`s.

**Note:** The `TransferHandler` must be registered on _both_ sides of the
Comlink channel.

To see a more generic example see the [EventListener example] or the
[Classes example].

# MessageChannelAdapter

`MessageChannelAdapter` is a small utility function that turns string-based
communication channels – like a [WebSocket], [RTCDataChannel] or
[PresentationConnection] – into a Comlink-compatible `postMessage`-based API
that can transfer `MessagePorts`.

## Usage

See the [examples], specifically WebRTC and Presentation API.

## API

### `MessageChannelAdapter.wrap(endpoint)`

`wrap` returns a `MessagePort` that serializes messages using `JSON.stringify`
and handles transferred `MessagePort`s automatically. `endpoint` is expected to
have `send` and `addEventListener`.

[UMD]: https://github.com/umdjs/umd
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
[MessagePort]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[examples]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples
[dist]: https://github.com/GoogleChromeLabs/comlink/tree/master/dist
[delivrjs]: https://cdn.jsdelivr.net/
[WebSocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
[RTCDataChannel]: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
[PresentationConnection]: https://developer.mozilla.org/en-US/docs/Web/API/PresentationConnection
[EventListener example]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples/eventlistener
[Classes example]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples/classes

---
License Apache-2.0
