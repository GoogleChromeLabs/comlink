# Comlink
A tiny RPC library that works on windows, iframes, WebWorkers and
ServiceWorkers.

**TL;DR: With Comlink you can work on objects from another JavaScript realm
(like a Worker or an iframe) as if it was a local object. Just use `await`
whenever the remote value is involed.**

```
$ npm install --save comlinkjs
```

Comlink allows you to expose an arbitrary JavaScript value (objects, classes,
functions, etc) to the endpoint of an communications channel. Anything that
works with `postMessage` can be used as a communication channel. On the other
end of that channel you can use Comlink to synthesize an ES6 proxy. Every action
performed on that proxy object will be serialized using a simple (and naïve) RPC
protocol and be applied to the exposed value on the other side.

**Size**: ~2.5k, ~1.1k gzip’d.


## Example

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
  necessary hackery, the module exports a `Comlink` object.
  Import it as follows:

  ```js
  import {Comlink} from '../dist/comlink.es6.js';

  // ...
  ```

* **“global”**: This package adds a `Comlink` namespace on `self`. Useful
  for workers or projects without a module loader.
* **“umd”**: This package uses [UMD] so it is compatible with AMD, CommonJS and
  requireJS.

These packages can be mixed and matched. A worker using `global` can work
with a window using `es6`. For the sake of network conservation, I do recommend
sticking to one format, though.

## API

The Comlink module exports 4 functions:

### `proxy(endpoint)`

`proxy` creates an ES6 proxy and sends all operations through the channel behind
`endpoint`. The other end of the channel should be passed to `expose`.

### `expose(rootObj, endpoint)`

`expose` listens for RPC messages on `endpoint` and applies the operations to
`rootObj`. The return value will be structurally cloned and sent back. Values
that implement the [`Transferable`][transferable] interface will be transferred.

### `proxyValue(value)`

If structurally cloning a return value is undesired, wrapping the value in a
`proxyValue` call will cause `expose` to send back a
[`MessagePort`][MessagePort] instead of the actual value. The `MessagePort` will
be hooked up to a new proxy on the other end.

### `windowEndpoint(window)`

If a window is to be used as an endpoint, the value must be wrapped by
`windowEndpoint` so that messages will be dispatched correctly.

```js
const ifr = document.querySelector('iframe');
Comlink.proxy(Comlink.windowEndpoint(ifr.contentWindow));
```


[UMD]: https://github.com/umdjs/umd
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
[MessagePort]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort

---
License Apache-2.0
