(function() {
  const ENDPOINT = 'https://api.github.com/repos/GoogleChrome/comlink/commits/master';
  const hashPromise = (async _ => {
    const resp = await fetch(ENDPOINT);
    const payload = await resp.json();
    return payload.sha;
  })();
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
    const hash = await hashPromise;
    const extensions = selectors
      .map(select => select.value)
      .filter(v => v.length > 0)
      .join('.');
    return `https://cdn.rawgit.com/GoogleChrome/comlink/${hash}/dist/comlink.${extensions}.js`;
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
