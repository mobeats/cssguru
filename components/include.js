/* CSSGuru shared header/footer loader for GitHub Pages */
(() => {
  'use strict';
  const assetUrl = (name) => new URL('/components/' + name, window.location.origin).href;

  function loadStyles() {
    if (document.querySelector('link[data-csguru-shared-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = assetUrl('shared.css');
    link.dataset.csguruSharedStyles = 'true';
    document.head.appendChild(link);
  }

  async function loadFragment(name) {
    const response = await fetch(assetUrl(name + '.html'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('CSSGuru fragment not found: ' + name);
    return response.text();
  }

  async function mount(selector, name) {
    const slots = Array.from(document.querySelectorAll(selector));
    if (!slots.length) return;
    const html = await loadFragment(name);
    slots.forEach((slot) => {
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      slot.replaceWith(template.content.cloneNode(true));
    });
  }

  async function init() {
    loadStyles();
    const results = await Promise.allSettled([
      mount('[data-csguru-header]', 'header'),
      mount('[data-csguru-footer]', 'footer')
    ]);
    results.filter((result) => result.status === 'rejected')
      .forEach((result) => console.error('[CSSGuru shared layout]', result.reason));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
