const fs = require("fs");

function mangleUMD(contents) {
  const lines = contents.split("\n");
  lines.splice(20, 0, "else {factory([], self.Comlink={});}");
  return lines.join("\n");
}

["dist/umd/comlink.js", "dist/umd/messagechanneladapter.js"].forEach(file => {
  const contents = fs.readFileSync(file).toString();
  const mangled = mangleUMD(contents);
  fs.writeFileSync(file, mangled);
});
