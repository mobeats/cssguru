
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const base = "/home/hermes/CSSGuru/projects/hermes/projekte/hermes";
const comp = path.join(base, "components");

const headerTemplate = fs.readFileSync(path.join(comp, "header.html"), "utf8");
const footerTemplate = fs.readFileSync(path.join(comp, "footer.html"), "utf8");

console.log("=== TEST 1: Recognition (recognition.js) ===");
const HeaderRecognition = require(path.join(base, "recognition.js")).HeaderRecognition;
const FooterRecognition = require(path.join(base, "recognition.js")).FooterRecognition;

const generatedNoHeader = `<html><body><h1>Inhalt</h1></body></html>`;
const generatedWithHeaderFooter = `<html><body>
<header class="topbar"><span class="violet">CSS</span>GURU</header>
<main><h1>Inhalt</h1></main>
<footer><span>© 2026 CSSGuru</span></footer>
</body></html>`;

const checks = [
  ["hasHeader(no header)", HeaderRecognition.hasHeader(generatedNoHeader) === false],
  ["hasHeader(has header)", HeaderRecognition.hasHeader(generatedWithHeaderFooter) === true],
  ["extractHeader", HeaderRecognition.extractHeader(generatedWithHeaderFooter) !== null],
  ["hasFooter(no footer)", FooterRecognition.hasFooter(generatedNoHeader) === false],
  ["hasFooter(has footer)", FooterRecognition.hasFooter(generatedWithHeaderFooter) === true],
  ["extractFooter", FooterRecognition.extractFooter(generatedWithHeaderFooter) !== null],
];
let allPass = true;
for (const [name, result] of checks) {
  console.log(`  ${name}: ${result ? "PASS ✓" : "FAIL ✗"}`);
  allPass = allPass && result;
}

console.log("\n=== TEST 2: Component Injection (components/include.js) ===");

const fetchMock = (url) => {
  const headerMatch = url.includes("header.html");
  return Promise.resolve({ ok: true, text: () => Promise.resolve(headerMatch ? headerTemplate : footerTemplate) });
};

const documentMock = {
  readyState: "loading",
  body: {
    children: [],
    insertAdjacentHTML(where, html) {
      if (where === "afterbegin") this.children.unshift(html);
      else this.children.push(html);
    }
  },
  _listeners: {},
  addEventListener(type, fn) { this._listeners[type] = fn; },
  dispatch(type) {
    if (this._listeners[type]) this._listeners[type]();
    return true;
  }
};

const context = { document: documentMock, fetch: fetchMock, console, Promise, Map, String, Array, setTimeout, clearTimeout };
vm.createContext(context);

const includeSrc = fs.readFileSync(path.join(comp, "include.js"), "utf8");
vm.runInContext(includeSrc, context);

// Wait for async operations with proper timeout
let injectionDone = false;
const checkInjection = (attempt) => {
  if (injectionDone) return;
  const body = documentMock.body;
  const count = body.children.length;
  console.log(`    async attempt ${attempt}: children = ${count}`);
  
  if (count >= 2 && !injectionDone) {
    injectionDone = true;
    const headerOk = body.children[0] && body.children[0].includes('<header class="topbar"');
    const footerOk = body.children[body.children.length-1] && body.children[body.children.length-1].includes('class="footer-links"');
    const headerBrand = body.children[0] && body.children[0].includes('CSS') && body.children[0].includes('GURU');
    const footerLinks = body.children[body.children.length-1] && body.children[body.children.length-1].includes('Datenschutz') && body.children[body.children.length-1].includes('Impressum') && body.children[body.children.length-1].includes('Kontakt');
    
    console.log(`    Header injected: ${headerOk}`);
    console.log(`    Footer injected: ${footerOk}`);
    console.log(`    Header brand: ${headerBrand}`);
    console.log(`    Footer links: ${footerLinks}`);
    
    const pass = headerOk && footerOk && headerBrand && footerLinks;
    console.log(`    INJECTION: ${pass ? "PASS ✓" : "FAIL ✗"}`);
    allPass = allPass && pass;
    return;
  }
  
  if (attempt < 5) {
    setTimeout(() => checkInjection(attempt + 1), 200);
  } else {
    console.log("    Timeout - injection did not complete");
    console.log("    INJECTION: FAIL ✗");
    allPass = false;
  }
};

setTimeout(() => checkInjection(1), 300);

console.log("\n=== TEST 3: Template Wrapping ===");
const generated = `<main><h1>Willkommen</h1><p>Content</p></main>`;
const wrapped = headerTemplate + generated + footerTemplate;
const wrapPass = wrapped.startsWith("<header class=\"topbar\"") && (wrapped.endsWith("</footer>") || wrapped.endsWith("</footer>\n"));
console.log(`  Wrapped starts with header: ${wrapped.startsWith("<header class=\"topbar\"")}`);
console.log(`  Wrapped ends with footer: ${wrapped.endsWith("</footer>") || wrapped.endsWith("</footer>\n")}`);
const wrapResult = wrapPass ? "PASS ✓" : "FAIL ✗";
console.log(`  TEMPLATE WRAPPING: ${wrapResult}`);
allPass = allPass && wrapPass;

setTimeout(() => {
  console.log(`\n=== FINAL RESULT: ${allPass ? "ALL TESTS PASS ✓" : "SOME TESTS FAILED ✗"} ===`);
}, 1200);
