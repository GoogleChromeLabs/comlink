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

(function() {
  const quickstartSection = document.querySelector('#quickstart');
  const cdnLink = document.querySelector('#cdnlink');
  const downloadLink = document.querySelector('#downloadlink');
  const moduleFormatSelect = document.querySelector('#moduleformat');
  const minificationSelect = document.querySelector('#minification');
  const selectors = [
    moduleFormatSelect,
    minificationSelect,
  ];

  async function generateLink() {
    const extensions = selectors
      .map(select => select.value)
      .filter(v => v.length > 0)
      .join('.');
    return `https://cdn.jsdelivr.net/npm/comlinkjs/comlink.${extensions}.js`;
  }

  async function update() {
    const link = await generateLink();
    cdnLink.textContent = link;
    downloadLink.href = link;
    for (const opt of moduleFormatSelect.options)
      quickstartSection.classList.remove(opt.value);
    quickstartSection.classList.add(moduleFormatSelect.value);
  }

  selectors.forEach(selector => selector.addEventListener('change', update));
  update();
})();
