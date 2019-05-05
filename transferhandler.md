# TransferHandler

Some types are neither transferable not structurally cloneable and can therefore not be `postMessage`’d. To remedy this, a `TransferHandler` offers a hook into the serialization and deserialization process to allow these types to be used with Comlink. `TransferHandler`s must fulfill the following interface:

- `canHandle(obj)`: Should `true` if this `TransferHandler` is capable of (de)serializing the given object.
- `serialize(obj)`: Serializes `obj` to something structurally cloneable.
- `deserialize(obj)`: The inverse of `serialize`.

## Example

One example would be that using an instance of a class as a parameter to a remote function will invoke the function with a simple JSON object. The prototype gets lost when the instance gets structurally cloned. Let’s say the class `ComplexNumber` is used for some calculations. To make sure instances of `ComplexNumber` are handled correctly, the following `TransferHandler` can be used:

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
Comlink.transferHandlers.set("COMPLEX", complexNumberTransferHandler);
```

The string can be arbitrary but must be unique across all `TransferHandler`s.

**Note:** The `TransferHandler` must be registered on _both_ sides of the Comlink channel.

To see a more generic example see the [EventListener example] or the [Classes example].

[eventlistener example]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples/eventlistener
[classes example]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples/classes
