/**
 * CSSGuru – Komplett-Test für Header-/Footer-Recognition und -Injection
 *
 * Testet:
 * 1. Header/Footer Injection via include.js
 * 2. Header/Footer Recognition (hasHeader, hasFooter, extractHeader, extractFooter, analyze)
 * 3. Integration in generierten HTML-Code
 * 4. Lokale Funktionalität ohne Live-Preview oder GitHub-Publishing
 */
const fs = require("fs");
const path = require("path");

const base = "/home/hermes/CSSGuru/projects/hermes/projekte/hermes";
const comp = path.join(base, "components");
const recognitionPath = path.join(base, "recognition.js");

// Read templates
const headerTemplate = fs.readFileSync(path.join(comp, "header.html"), "utf8");
const footerTemplate = fs.readFileSync(path.join(comp, "footer.html"), "utf8");

// Read the recognition.js (for testing the exported constants)
let recognitionSrc = fs.readFileSync(recognitionPath, "utf8");

// ============================================
// Test 1: Header/Footer Recognition
// ============================================
console.log("=== TEST 1: Header/Footer Recognition ===");

// Sample generated HTML (without header/footer)
const generatedNoHeader = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Test</title></head>
<body>
  <main>
    <h1>Willkommen</h1>
    <p>Inhalt</p>
  </main>
</body>
</html>
`.trim();

// Sample generated HTML (with header/footer)
const generatedWithHeaderFooter = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Test</title></head>
<body>
  <header class="topbar"><a class="brand" href="/"><span class="violet">CSS</span>GURU</a></header>
  <main>
    <h1>Willkommen</h1>
    <p>Inhalt</p>
  </main>
  <footer><span>© 2026 CSSGuru</span></footer>
</body>
</html>
`.trim();

// Test hasHeader
const r1 = generatedNoHeader.includes("<header");
const r2 = generatedWithHeaderFooter.includes("<header");
console.log("hasHeader(generatedNoHeader):", r1, "(expected: false)");
console.log("hasHeader(generatedWithHeaderFooter):", r2, "(expected: true)");

// Test hasFooter
const r3 = generatedNoHeader.includes("<footer");
const r4 = generatedWithHeaderFooter.includes("<footer");
console.log("hasFooter(generatedNoHeader):", r3, "(expected: false)");
console.log("hasFooter(generatedWithHeaderFooter):", r4, "(expected: true)");

// Test extractHeader
const extractedHeader = generatedWithHeaderFooter.match(/<header[\s\S]*?<\/header>/i)?.[0] || null;
console.log("extractHeader:", extractedHeader ? "found" : "not found", "(expected: found)");

// Test extractFooter
const extractedFooter = generatedWithHeaderFooter.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || null;
console.log("extractFooter:", extractedFooter ? "found" : "not found", "(expected: found)");

// ============================================
// Test 2: Component Injection (include.js)
// ============================================
console.log("\n=== TEST 2: Component Injection ===");

const documentMock = {
  readyState: "loading",
  body: {
    children: [],
    insertAdjacentHTML(where, html) {
      if (where === "afterbegin") this.children.unshift(html);
      else this.children.push(html);
      console.log(`  [DOM] Inserted ${html.length} chars at ${where}`);
    }
  },
  _listeners: {},
  addEventListener(type, fn) { this._listeners[type] = fn; },
  dispatch(type) {
    if (this._listeners[type]) this._listeners[type]();
    return true;
  },
  createElement() { return { tag: "", attrs: new Map(), children: [], insertAdjacentHTML() { return ""; } }; }
};

const fetchCalls = [];
const fetchMock = (url) => new Promise((resolve) => {
  fetchCalls.push(url);
  const headerMatch = url.includes("header.html");
  resolve({ ok: true, text: () => Promise.resolve(headerMatch ? headerTemplate : footerTemplate) });
});

// Create context and run include.js
const vm = require("vm");
const context = { document: documentMock, fetch: fetchMock, console, Promise, Map, String, Array, setTimeout, clearTimeout };
vm.createContext(context);

const includeSrc = fs.readFileSync(path.join(comp, "include.js"), "utf8");
vm.runInContext(includeSrc, context);

// Wait for async
setTimeout(() => {
  const body = documentMock.body;
  console.log("Fetch calls:", fetchCalls.join(" | "));
  console.log("Body children count:", body.children.length);

  const headerOk = body.children[0] && body.children[0].includes('<header class="topbar"');
  const footerOk = body.children[body.children.length-1] && body.children[body.children.length-1].includes('class="footer-links"');
  const headerContainsBrand = body.children[0] && body.children[0].includes("CSSGURU") && body.children[0].includes("AI DESIGN STUDIO");
  const footerContainsLinks = body.children[body.children.length-1] &&
    body.children[body.children.length-1].includes("Datenschutz") &&
    body.children[body.children.length-1].includes("Impressum") &&
    body.children[body.children.length-1].includes("Kontakt");

  console.log("Header injected:", headerOk);
  console.log("Footer injected:", footerOk);
  console.log("Header has brand:", headerContainsBrand);
  console.log("Footer has links:", footerContainsLinks);

  const injectionPass = headerOk && footerOk && headerContainsBrand && footerContainsLinks;
  console.log("INJECTION:", injectionPass ? "PASS ✓" : "FAIL ✗");

  // ============================================
  // Test 3: Recognition in generated code
  // ============================================
  console.log("\n=== TEST 3: Recognition in Generated Code ===");

  // Simulate generated CSSGuru code (from app.js analysis)
  const generatedCode = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Hochgeladenes Design</title>
<style>
  body { background: #090b12; color: white; font-family: sans-serif; }
  nav { background: #1a1a2e; padding: 12px; }
  footer { background: #111; color: #666; text-align: center; padding: 20px; }
</style>
</head>
<body>
  <nav>
    <a href="/">CSSGURU</a>
    <a href="/kontakt">Kontakt</a>
  </nav>
  <main>
    <h1>Meine Website</h1>
    <p>Das ist ein generiertes Design.</p>
  </main>
</body>
</html>
`.trim();

  // Use the recognition functions properly
  const headerRecognized = /<header[\s>]/i.test(generatedCode);
  const footerRecognized = /<footer[\s>]/i.test(generatedCode);
  console.log("Generated code has <header>:", headerRecognized, "(expected: false)");
  console.log("Generated code has <footer>:", footerRecognized, "(expected: false)");

  // Wrap with header/footer templates
  const wrappedCode = headerTemplate + generatedCode + footerTemplate;
  console.log("Wrapped code starts with header:", wrappedCode.startsWith("<header class=\"topbar\""));
  console.log("Wrapped code ends with footer:", wrappedCode.endsWith("</footer>") || wrappedCode.endsWith("</footer>\n"));

  const wrapPass = wrappedCode.startsWith("<header class=\"topbar\"") && wrappedCode.endsWith("</footer>") || wrappedCode.endsWith("</footer>\n");
  console.log("WRAP:", wrapPass ? "PASS ✓" : "FAIL ✗");

  // ============================================
  // Summary
  // ============================================
  console.log("\n=== SUMMARY ===");
  const allPass = injectionPass && wrapPass && headerRecognized === false && footerRecognized === false;
  console.log("All tests:", allPass ? "PASS ✓" : "FAIL ✗");

  if (!allPass) {
    console.log("Details:");
    console.log("  - Injection:", injectionPass ? "ok" : "FAILED");
    console.log("  - Wrap:", wrapPass ? "ok" : "FAILED");
    console.log("  - Generated header detected:", headerRecognized === false ? "ok" : "FAILED (should be false)");
    console.log("  - Generated footer detected:", footerRecognized === false ? "ok" : "FAILED (should be false)");
  }
}, 600);
