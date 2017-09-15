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
  const workerSection = document.querySelector('.worker');
  const siteSection = document.querySelector('.site');

  function takeWhile(arr, f, n = 1) {
    let count = 0;
    return arr.filter(e => count < n && ((count += f(e)?0:1), count < n));
  }

  [
    ...workerSection.querySelector('code').childNodes,
    ...siteSection.querySelector('code').childNodes,
  ]
    .forEach(node => {
      if (node.nodeType !== Node.TEXT_NODE)
        return;
      const s = document.createElement('span');
      node.parentNode.replaceChild(s, node);
      s.appendChild(node);
    });

  const siteSpans = [...siteSection.querySelectorAll('code > span')];
  const workerSpans = [...workerSection.querySelectorAll('code > span')];

  [...siteSpans, ...workerSpans]
    .forEach(span => span.style.opacity = 0);

  const defaultValues = {
    opacity: 1,
    easing: 'easeInOutQuad',
    duration: 300,
    offset: '+=2000',
  };
  anime.timeline({
    loop: true,
  })
    .add(Object.assign({}, defaultValues, {targets: siteSection}))
    .add(Object.assign({}, defaultValues, {targets: takeWhile(siteSpans, s => !s.textContent.includes('\n'))}))
    .add(Object.assign({}, defaultValues, {targets: workerSection}))
    .add(Object.assign({}, defaultValues, {targets: takeWhile(workerSpans, s => !s.textContent.includes('Comlink'))}))
    .add(Object.assign({}, defaultValues, {targets: workerSpans, offset: '+=3000'}))
    .add(Object.assign({}, defaultValues, {targets: takeWhile(siteSpans, s => !s.textContent.includes('\n'))}))
    .add(Object.assign({}, defaultValues, {targets: takeWhile(siteSpans, s => !s.textContent.includes('\n'), 2)}))
    .add(Object.assign({}, defaultValues, {targets: siteSpans}))
    .add(Object.assign({}, defaultValues, {targets: [...siteSpans, ...workerSpans, siteSection, workerSection], opacity: 0, offset: '+=10000'}));
})();
