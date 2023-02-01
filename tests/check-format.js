const path = require("path");
const { spawn } = require("child_process");

var subProcess = spawn(
  process.env.NODE,
  [
    path.resolve(__dirname, "../node_modules/prettier/bin-prettier.js"),
    "-l",
    "./*.{mjs,js,ts,md,json,html}",
    "./{src,docs,tests}/{**/,}*.{mjs,js,ts,md,json,html}",
  ],
  { stdio: ["ignore", "pipe", "inherit"] }
);

process.on("exit", () => subProcess.kill());

var result = "";
subProcess.stdout.on("data", (data) => {
  result += data;
});

subProcess.on("close", (code) => {
  if (result) {
    console.log("Unformatted files: ");
    console.log(result);
    process.exit(1);
  }

  if (code !== 0) {
    process.exit(code);
  }
});
