const URL = require("url");
const Express = require("express");
const WebSocket = require("ws");
const http = require("http");
const { join } = require("path");

const { MessageChannel, MessagePort } = require("worker_threads");
globalThis.MessageChannel = MessageChannel;
globalThis.MessagePort = MessagePort;

const Comlink = require("../../../../dist/umd/comlink.js");

const app = Express();
app.use("/dist/", Express.static("../../../../dist/"));
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "./index.html"));
});

const api = {
  counter: 0,
  increase(delta = 1) {
    this.counter += delta;
    console.log(`Counter set to ${this.counter}`);
  }
};

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });
wss.on("connection", ws => {
  Comlink.expose(api, websocketEndpoint(ws));
});

server.listen("8080");

const { wrap } = require("../../../../dist/umd/string-channel.experimental.js");
const nodeEndpoint = require("../../../../dist/umd/node-adapter.js");

function websocketEndpoint(ws) {
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
