# Tasklets polyfill
This polyfill strives to implement a proposed Tasklet API as best as possible using the technologies currently available on the web.

## Usage
`tasklet-polyfill.js` and `tasklet-worker-scope.js` need to be place in the _same_ directory. Then include `tasklet-polyfill.js` and start using the Tasklet API:

```js
// my-tasklet.js
tasklets.export(class GreatClass {
  constructor() {
    this._state = 42;
  }

  uselessMethod(number) {
    return `This is a string containing the number ${number + this._state}`;
  }}
});

tasklets.export(function abc() {
  return 'The alphabet!';
});

tasklets.export(function takesABuffer(buf) {
  return new Uint8Array(buf).map(b => b + 1).join(' ');
});
```

```html
<script src="/path/to/tasklet-polyfill.js"></script>
<script>
  (async function() {
    const myTasklet = await tasklets.addModule('/example/my-tasklet.js');
    console.log(await myTasklet.abc());

    const buffer = new Uint8Array([1, 2, 3]).buffer;
    console.log(await myTasklet.takesABuffer(buffer));

    const remoteClass = await new myTasklet.GreatClass();
    console.log(await remoteClass.uselessMethod(4));
  })();
</script>
```

(This is taken from the `example` folder).

## Bugs, flaws, open feature requests

- Even the `new` operator needs `await`!

```js
const tasklet = await tasklets.addModule('/my-tasklet.js');
const instance = await new tasklet.MyClass();
// ...
```

- `tasklet.addModule()` only takes _absolute_ paths for now
- Because no browser has support for native ES6 modules in workers, we had to improvise a bit:

```js
// my-tasklet.js:

class MyClass{ /* ... */ }
export MyClass;
export {
  a: 4,
  b: 5
} as MyObj;

// becomes

tasklets.export(MyClass);
tasklets.export({a: 4, b: 5}, 'MyObj');
```

- No support for iterators or async iterators
- When using object as a return value, it will be structurally cloned by default. To proxy the returned object instead, wrap the return value in `transferProxy()`:

```js
// my-tasklet.js:
const someObj = {
  property: 4,
  func: _ => 5,
};

// When invoking this function, the return value will be structurally cloned.
// That means, all functions and the prototype chain will _not_ be transferred.
tasklets.export(function withoutProxy() {
  return someObj;
});

// When invoking this function, a new proxy will be synthesized and the value
// is held in the worker. Every access operation is async (i.e. needs `await`).
tasklets.export(function withProxy() {
  return transferProxy(someObj);
});
```

For more examples, read through the tests!



