const fs = require("fs");

function mangleUMD(contents, global) {
  const lines = contents.split("\n");
  lines.splice(20, 0, `else {factory([], self.${global}={});}`);
  return lines.join("\n");
}

Object.entries({
  Comlink: "dist/umd/comlink.js",
  MessageChannelAdapter: "dist/umd/messagechanneladapter.js"
}).forEach(([lib, file]) => {
  const contents = fs.readFileSync(file).toString();
  const mangled = mangleUMD(contents, lib);
  fs.writeFileSync(file, mangled);
});
