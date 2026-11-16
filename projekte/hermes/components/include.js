/**
 * CSSGuru – Shared Header/Footer Injection & Recognition
 *
 * Lädt header.html und footer.html als Server-Side-Include (SSI)-äquivalent.
 * Erweitert um Recognition-Methoden zur Erkennung von Header-/Footer-Blöcken
 * in generierten HTML-Code (aus AI-Generierten).
 *
 * Verwendung:
 *   - Jede Seite lädt dies als <script src="components/include.js"></script>
 *   - Beim DOMContentLoaded werden <header class="topbar"> und <footer>
 *     automatisch nach <body> eingefügt.
 *
 * Recognition (Erkennung):
 *   - `csguru.detectHeaderAndFooter(html)` erkennt Header-/Footer-Blöcke
 *     in generiertem HTML und gibt eine Struktur mit {hasHeader, hasFooter,
 *     header, footer} zurück.
 *   - `csguru.HeaderRecognition` und `csguru.FooterRecognition` sind
 *     synonyme Objekte mit den Methoden hasHeader/hasFooter/extractHeader/extractFooter.
 *
 * Das Modul exportiert auch ES-Module-Variablen (falls als Modul geladen),
 * damit andere Skripte auf die Recognition-Funktionen zugreifen können.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Recognition Objekte (aus recognition.js)
  // ---------------------------------------------------------------------------

  const HeaderRecognition = {
    hasHeader(html) {
      if (!html || typeof html !== "string") return false;
      const trimmed = html.trim();
      return /<header[\s>]/i.test(trimmed);
    },
    hasFooter(html) {
      if (!html || typeof html !== "string") return false;
      const trimmed = html.trim();
      return /<footer[\s>]/i.test(trimmed);
    },
    extractHeader(html) {
      if (!html || typeof html !== "string") return null;
      const trimmed = html.trim();
      if (!/<header[\s>]/i.test(trimmed)) return null;
      const match = trimmed.match(/<header[\s\S]*?<\/header>/i);
      return match ? match[0] : null;
    },
    extractFooter(html) {
      if (!html || typeof html !== "string") return null;
      const trimmed = html.trim();
      if (!/<footer[\s>]/i.test(trimmed)) return null;
      const match = trimmed.match(/<footer[\s\S]*?<\/footer>/i);
      return match ? match[0] : null;
    },
    analyze(html, headerTemplate) {
      const has = this.hasHeader(html);
      const header = has ? this.extractHeader(html) : null;
      return {
        hasHeader: has,
        header: header,
        needsWrap: !has
      };
    }
  };

  const FooterRecognition = {
    hasFooter(html) {
      if (!html || typeof html !== "string") return false;
      const trimmed = html.trim();
      return /<footer[\s>]/i.test(trimmed);
    },
    extractFooter(html) {
      if (!html || typeof html !== "string") return null;
      const trimmed = html.trim();
      if (!/<footer[\s>]/i.test(trimmed)) return null;
      const match = trimmed.match(/<footer[\s\S]*?<\/footer>/i);
      return match ? match[0] : null;
    },
    analyze(html, footerTemplate) {
      const has = this.hasFooter(html);
      const footer = has ? this.extractFooter(html) : null;
      return {
        hasFooter: has,
        footer: footer,
        needsWrap: !has
      };
    }
  };

  function detectHeaderAndFooter(html) {
    return {
      hasHeader: HeaderRecognition.hasHeader(html),
      hasFooter: FooterRecognition.hasFooter(html),
      header: HeaderRecognition.extractHeader(html),
      footer: FooterRecognition.extractFooter(html)
    };
  }

  // ---------------------------------------------------------------------------
  // DOM-Injection (Original-Funktionalität)
  // ---------------------------------------------------------------------------

  function inject(name, where) {
    var url = 'components/' + name + '.html';
    fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (html) {
        if (html && typeof document !== 'undefined') {
          document.body.insertAdjacentHTML(where, html);
        }
      })
      .catch(function () { /* silent: page must not break without the shared parts */ });
  }

  function init() {
    inject('header', 'afterbegin');
    inject('footer', 'beforeend');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---------------------------------------------------------------------------
  // Export für ES-Modul-Kontext / andere Skripte
  // ---------------------------------------------------------------------------

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      HeaderRecognition: HeaderRecognition,
      FooterRecognition: FooterRecognition,
      detectHeaderAndFooter: detectHeaderAndFooter,
      inject: inject,
      init: init
    };
  }

  if (typeof window !== 'undefined') {
    window.CSGuru = window.CSGuru || {};
    window.CSGuru.HeaderRecognition = HeaderRecognition;
    window.CSGuru.FooterRecognition = FooterRecognition;
    window.CSGuru.detectHeaderAndFooter = detectHeaderAndFooter;
  }
})();
