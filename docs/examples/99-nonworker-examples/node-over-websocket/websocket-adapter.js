const { MessageChannel, MessagePort } = require("worker_threads");
globalThis.MessageChannel = MessageChannel;
globalThis.MessagePort = MessagePort;
const { wrap } = require("../../../../dist/umd/string-channel.experimental.js");
const nodeEndpoint = require("../../../../dist/umd/node-adapter.js");

module.exports = {
  websocketEndpoint(ws) {
    return nodeEndpoint(
      wrap({
        addMessageListener(f) {
          ws.addEventListener("message", ev => f(ev.data));
        },
        send(msg) {
          ws.send(msg);
        }
      })
    );
  }
};
