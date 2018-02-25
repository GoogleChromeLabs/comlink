# Comlink
Comlink’s goal is to make [WebWorkers][WebWorker] enjoyable. Instead of using `postMessage` to send messages back and forth, Comlink allows you to invoke functions, pass callbacks, add event listeners and create new instances of classes.

> Note: Comlink’s goal is to be a building-block for higher-level abstraction libraries. For example, take a look at [Clooney].

```js
// main.js
const MyClass = Comlink.proxy(new Worker('worker.js'));
// `instance` is an instance of `MyClass` that lives in the worker!
const instance = await new MyClass();
await instance.logSomething(); // logs “myValue = 42”
```

```js
// worker.js
const myValue = 42;
class MyClass {
  logSomething() {
    console.log(`myValue = ${myValue}`);
  }
}
Comlink.expose(MyClass, self);
```

## Browsers support & bundle size

![Chrome 56+](https://img.shields.io/badge/Chrome-56+-green.svg?style=flat-square)
![Edge 15+](https://img.shields.io/badge/Edge-15+-green.svg?style=flat-square)
![Firefox 52+](https://img.shields.io/badge/Firefox-52+-green.svg?style=flat-square)
![Opera 43+](https://img.shields.io/badge/Opera-43+-green.svg?style=flat-square)
![Safari 10.1+](https://img.shields.io/badge/Safari-10.1+-green.svg?style=flat-square)
![Samsung Internet 6.0+](https://img.shields.io/badge/Samsung_Internet-6.0+-green.svg?style=flat-square)

**Size**: ~3.9k, ~1.6k gzip’d

## Introduction
WebWorkers are a web API that allow you to run code in a separate thread. To communicate with another thread, WebWorkers offer the `postMessage` API. You can send messages in form of [transferable] JavaScript objects using `myWorker.postMessage(someObject)`, triggering a `message` event inside the worker.

Comlink turns this messaged-based API into a something more developer-friendly: Values from one thread can be used within the other thread (and vice versa) just like local values.

Comlink can be used with anything that offers `postMessage` like windows, iframes and ServiceWorkers.

## Download
You can download Comlink from the [dist folder][dist]. Alternatively, you can
install it via npm

```
$ npm install --save comlinkjs
```

or use a CDN like [delivrjs]:

```
https://cdn.jsdelivr.net/npm/comlinkjs@2.3.0/comlink.es6.min.js
```

## Examples

There’s a collection of examples in the [examples directory][examples].

## Module formats

The Comlink module is provided in 3 different formats:

* **“es6”**: This package uses the native ES6 module format. Import it as follows:

  ```js
  import {Comlink} from '../dist/comlink.es6.js';

  // ...
  ```

* **“global”**: This package adds `Comlink` to the global scope (i.e. `self`). Useful for workers or projects without a module loader.

* **“umd”**: This package uses [UMD] so it is compatible with AMD, CommonJS and requireJS.

## API

The Comlink module exports 3 functions:

### `Comlink.proxy(endpoint)`

> Returns the value that is exposed on the other side of `endpoint`.

`proxy` creates an ES6 proxy and sends all operations performed on that proxy through `endpoint`. `endpoint` can be a `Window`, a `Worker` or a `MessagePort`.* The other endpoint of the channel should be passed to `Comlink.expose`.

If you invoke function, all parameters will be structurally cloned or transferred if they are [transferable]. If you want to pass a function as a parameters (e.g. callbacks), make sure to use `proxyValue` (see below). Same applies to the return value of a function.

*) Technically it can be any object with `postMessage`, `addEventListener` and
`removeEventListener`.

### `Comlink.expose(obj, endpoint)`

> Exposes `obj` to `endpoint`. Use `Comlink.proxy` on the other end of `endpoint`.

`expose` is the counter-part to `proxy`. It listens for RPC messages on `endpoint` and applies the operations to `obj`. Return values of functions will be structurally cloned or transfered if they are [transferable].

### `Comlink.proxyValue(value)`

> Makes sure a parameter or return value is proxied, not copied.

By default, all parameters to a function are copied (structural clone):

```js
// main.js
const api = Comlink.proxy(new Worker('worker.js'));
const obj = {x: 0};
await api.setXto4(obj);
console.log(obj.x); // logs 0
```

The worker receives a copy of `obj`, so any mutation of `obj` done by the worker won’t affect the original object. If the value should _not_ be copied but instead be proxied, use `Comlink.proxyValue`:

```diff
- await api.setXto4(obj);
+ await api.setXto4(Comlink.proxyValue(obj));
```

`console.log(obj.x)` will now log 4.

Keep in mind that functions cannot be copied. Unless they are used in combination with `Comlink.proxyValue`, they will get discarded during copy.

[Clooney]: https://github.com/GoogleChromeLabs/clooney
[WebWorker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[UMD]: https://github.com/umdjs/umd
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
[MessagePort]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[examples]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples
[dist]: https://github.com/GoogleChromeLabs/comlink/tree/master/dist
[delivrjs]: https://cdn.jsdelivr.net/

---
License Apache-2.0
