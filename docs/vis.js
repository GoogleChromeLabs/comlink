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
