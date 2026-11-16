/**
 * CSSGuru – Header-/Footer-Recognition & Umsetzung
 * Modul zur Erkennung und Implementierung von Header- und Footer-Blöcken
 * in generierten Designs.
 *
 * Erkennung = Erkennt, ob eine HTML-Zeichenkette einen Header-/Footer-Block
 *             enthält und extrahiert ihn bei Bedarf.
 * Umsetzung = Baut den Header/Footer aus Vorlagen zusammen und stellt
 *             sicher, dass generierter Code vollständige Seiten ist.
 */
export const HeaderRecognition = {
  /**
   * Prüft, ob HTML einen <header>-Block enthält.
   * @param {string} html
   * @returns {boolean}
   */
  hasHeader(html) {
    if (!html || typeof html !== "string") return false;
    const trimmed = html.trim();
    return /<header[\s>]/i.test(trimmed);
  },

  /**
   * Prüft, ob HTML einen <footer>-Block enthält.
   * @param {string} html
   * @returns {boolean}
   */
  hasFooter(html) {
    if (!html || typeof html !== "string") return false;
    const trimmed = html.trim();
    return /<footer[\s>]/i.test(trimmed);
  },

  /**
   * Extrahiert den Header-Block aus HTML (inkl. <header>...</header>)
   * @param {string} html
   * @returns {string|null} Header-Inhalt oder null
   */
  extractHeader(html) {
    if (!html || typeof html !== "string") return null;
    const trimmed = html.trim();
    if (!/<header[\s>]/i.test(trimmed)) return null;
    const match = trimmed.match(/<header[\s\S]*?<\/header>/i);
    return match ? match[0] : null;
  },

  /**
   * Extrahiert den Footer-Block aus HTML (inkl. <footer>...</footer>)
   * @param {string} html
   * @returns {string|null} Footer-Inhalt oder null
   */
  extractFooter(html) {
    if (!html || typeof html !== "string") return null;
    const trimmed = html.trim();
    if (!/<footer[\s>]/i.test(trimmed)) return null;
    const match = trimmed.match(/<footer[\s\S]*?<\/footer>/i);
    return match ? match[0] : null;
  },

  /**
   * Encapsuliert Header-Recognition: liefert eine Sicherheitsfarm, ob
   * der generierte Code bereits einen Header enthält und ihn ggf. ersetzt.
   * @param {string} html
   * @param {string} headerTemplate
   * @returns {{ hasHeader: boolean, header: string|null, needsWrap: boolean }}
   */
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

export const FooterRecognition = {
  /**
   * Prüft, ob HTML einen <footer>-Block enthält.
   * @param {string} html
   * @returns {boolean}
   */
  hasFooter(html) {
    if (!html || typeof html !== "string") return false;
    const trimmed = html.trim();
    return /<footer[\s>]/i.test(trimmed);
  },

  /**
   * Extrahiert den Footer-Block aus HTML
   * @param {string} html
   * @returns {string|null}
   */
  extractFooter(html) {
    if (!html || typeof html !== "string") return null;
    const trimmed = html.trim();
    if (!/<footer[\s>]/i.test(trimmed)) return null;
    const match = trimmed.match(/<footer[\s\S]*?<\/footer>/i);
    return match ? match[0] : null;
  },

  /**
   * Encapsuliert Footer-Recognition
   * @param {string} html
   * @param {string} footerTemplate
   * @returns {{ hasFooter: boolean, footer: string|null, needsWrap: boolean }}
   */
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

/**
 * Zusammenfassung: Erkennt Header und Footer in generierten HTML-Content.
 * @param {string} html
 * @returns {{
 *   hasHeader: boolean,
 *   hasFooter: boolean,
 *   header: string|null,
 *   footer: string|null
 * }}
 */
export function detectHeaderAndFooter(html) {
  return {
    hasHeader: HeaderRecognition.hasHeader(html),
    hasFooter: FooterRecognition.hasFooter(html),
    header: HeaderRecognition.extractHeader(html),
    footer: FooterRecognition.extractFooter(html)
  };
}
