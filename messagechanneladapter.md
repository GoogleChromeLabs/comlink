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

[examples]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples
[WebSocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
[RTCDataChannel]: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
[PresentationConnection]: https://developer.mozilla.org/en-US/docs/Web/API/PresentationConnection
