import { createServer } from "node:http";
import { extname } from "node:path";
import { parse } from "node:url";
import { readFile } from "node:fs/promises";

const testFixturesPath = "./tests/fixtures";
const buildPath = "./dist/esm";
const port = process.argv[2] || 3000;

const mimeMap = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".mjs", "text/javascript"],
  [".map", "application/json"],
]);

createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  const { pathname } = parse(req.url);
  try {
    const result = await readLocalFile(pathname);
    if (!result) {
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    }
    const ext = extname(pathname);
    res.setHeader("Content-type", mimeMap.get(ext) ?? "text/plain");
    res.end(result);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end(`Error getting the file: ${err}.`);
    return;
  }
}).listen(parseInt(port));

console.log(`Server listening on port ${port}`);

async function readLocalFile(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) {
    return await readLocalFileFromPath(segments[0], testFixturesPath);
  } else if (segments.length === 2 && segments[0] === "dist") {
    return await readLocalFileFromPath(segments[1], buildPath);
  } else {
    return null;
  }
}

async function readLocalFileFromPath(basename, rootpath) {
  try {
    return await readFile(`${rootpath}/${basename}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
