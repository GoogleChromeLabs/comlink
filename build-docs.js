/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {promisify} = require('util');
const fs = require('fs');
const [readFile, writeFile] = [promisify(fs.readFile), promisify(fs.writeFile)];
const prismjs = require('prismjs');
const postcss = require('postcss');
const cssnext = require('postcss-cssnext');

const placeholder = `{{placeholder}}`;
async function asyncReplace(str, re, f) {
  let promises = [];
  const placeholdered =
    str
      .replace(re, part => {
        const match = new RegExp(re).exec(part);
        if (!match)
          return;
        promises.push(f(match));
        return placeholder;
      });
  const values = await Promise.all(promises);
  return placeholdered
    .split(placeholder)
    .reduce((str, v) => str + v + (values.shift() || ''), '');
}

async function transformCSS() {
  let contents = await readFile('./docs/styles.tpl.css');
  contents =
    await postcss()
      .use(cssnext)
      .process(contents);
  await writeFile('./docs/styles.css', contents);
}

async function transformHTML() {
  const buffer = await readFile('./docs/index.tpl.html');
  let contents = buffer.toString();
  contents = await asyncReplace(contents, /(<code([^>]*) highlight>((.|\n)*?)<\/code>)/g, async matches => {
    return `<code${matches[2]}>${prismjs.highlight(matches[3], prismjs.languages.javascript)}</code>`;
  });
  await writeFile('./docs/index.html', contents);
}

async function main() {
  await transformCSS();
  await transformHTML();
}

main()
  .catch(err => console.error(err.stack));
