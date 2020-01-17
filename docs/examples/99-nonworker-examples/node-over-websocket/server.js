const { MessageChannel, MessagePort } = require("worker_threads");
globalThis.MessageChannel = MessageChannel;
globalThis.MessagePort = MessagePort;
const Comlink = require("../../../../dist/umd/comlink.js");
const { wrap } = require("../../../../dist/umd/string-channel.experimental.js");
const nodeEndpoint = require("../../../../dist/umd/node-adapter.js");
const { join } = require("path");
const url = require("url");
const http = require("http");
const { promises: fsp } = require("fs");
const WebSocket = require("ws");
const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", ws => {
  const obj = {
    hello() {
      console.log("What?");
      return "Done";
    }
  };
  Comlink.expose(
    obj,
    nodeEndpoint(
      wrap({
        addMessageListener(f) {
          ws.addEventListener("message", ev => f(ev.data));
        },
        send(msg) {
          ws.send(msg);
        }
      })
    )
  );
});

const server = new http.Server();
server.on("upgrade", async (req, res, head) => {
  const reqUrl = url.parse(req.url);
  if (reqUrl.pathname !== "/ws") {
    res.statusCode = 400;
    res.end("No websocket at this path");
  }
  wss.handleUpgrade(req, res, head, socket => {
    wss.emit("connection", socket, req);
  });
});

server.on("request", async (req, res) => {
  res.setHeader("Cache-Control", "max-age=0");
  const reqUrl = url.parse(req.url);
  if (reqUrl.pathname === "/ws") {
    return;
  }
  if (reqUrl.pathname.startsWith("/dist")) {
    const fullPath = join("../../../../", reqUrl.pathname);
    res.setHeader("Content-Type", "text/javascript");
    res.end(await fsp.readFile(fullPath));
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(await fsp.readFile("index.html"));
});
server.listen(8080);
