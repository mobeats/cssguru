import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const allowedOrigins = new Set(["https://cssguru.de", "https://www.cssguru.de"]);
function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}


// Download remote image assets into the generated project.
function safeImageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
    return url;
  } catch { return null; }
}
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
async function downloadImage(source: string) {
  let current = source;
  let response: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects++) {
    const url = safeImageUrl(current);
    if (!url) return null;
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10000), headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) return null;
      current = new URL(location, url).toString();
      continue;
    }
    break;
  }
  if (!response || !response.ok || !response.body) return null;
  const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
  const extension = extensions[mime];
  if (!extension || Number(response.headers.get("content-length") || "0") > 5 * 1024 * 1024) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > 5 * 1024 * 1024) { await reader.cancel(); return null; }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { base64: bytesToBase64(bytes), contentType: mime, extension, size };
}
async function bundleImages(html: string, css: string) {
  const assets: Record<string, { base64: string; contentType: string }> = {};
  const warnings: string[] = [];
  const cache = new Map<string, string | null>();
  let total = 0;
  let number = 1;
  async function localPath(url: string): Promise<string | null> {
    if (cache.has(url)) return cache.get(url) || null;
    if (number > 8 || total >= 12 * 1024 * 1024) { warnings.push("Bildlimit erreicht"); cache.set(url, null); return null; }
    try {
      const image = await downloadImage(url);
      if (!image || total + image.size > 12 * 1024 * 1024) { warnings.push("Bild konnte nicht heruntergeladen werden"); cache.set(url, null); return null; }
      const path = "images/image-" + String(number).padStart(2, "0") + "." + image.extension;
      number++;
      total += image.size;
      assets[path] = { base64: image.base64, contentType: image.contentType };
      cache.set(url, path);
      return path;
    } catch { warnings.push("Bildquelle nicht erreichbar"); cache.set(url, null); return null; }
  }
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (const match of imgTags) {
    const tag = match[0];
    const src = tag.match(/\bsrc\s*=\s*(["'])(https:\/\/[^"']+)\1/i);
    if (!src) continue;
    const path = await localPath(src[2]);
    if (path) html = html.replace(tag, tag.replace(src[0], 'src="' + path + '"'));
  }
  const cssUrls = [...css.matchAll(/url\(\s*(["']?)(https:\/\/[^)'"]+)\1\s*\)/gi)];
  for (const match of cssUrls) {
    const path = await localPath(match[2]);
    if (path) css = css.replace(match[0], 'url("' + path + '")');
  }
  return { html, css, assets, warnings };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Methode nicht erlaubt." }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: "Diese Website ist für die KI-Funktion nicht freigeschaltet." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
  }
  try {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY ist in Supabase noch nicht hinterlegt.");

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 17_000_000) throw new Error("Die Anfrage ist zu groß. Bitte ein Bild unter 12 MB verwenden.");
    const body = await req.json();
    const { image } = body;
    if (typeof image !== "string" || !image.startsWith("data:image/")) throw new Error("Ungültiges Bild.");
    if (image.length > 16_800_000) throw new Error("Das Bild ist zu groß. Bitte ein Bild unter 12 MB verwenden.");

    const prompt = `Rekonstruiere dieses Website-Design möglichst detailgetreu als vollständige responsive Website. Analysiere Layout, Farben, Typografie, Abstände und alle sichtbaren Komponenten. Erstelle semantisches HTML5, vollständiges CSS3 mit Mobile Media Queries und bei Bedarf Vanilla JavaScript. Erfinde keine großen zusätzlichen Sektionen.

BILDER, LOGOS UND GRAFIKEN – besonders wichtig:
- Lass sichtbare Bildbereiche, Logos, Produktbilder, Fotos, Illustrationen und Icons nicht einfach weg. Setze sie im HTML an der passenden Stelle um.
- WICHTIG: Du bekommst nur einen Screenshot, nicht die Originaldateien. Erkenne deshalb alle sichtbaren echten Fotos und Produktbilder als zuschneidbare Bildbereiche.
- Für jedes sichtbare Foto/Produktbild gib einen Bildbereich in imageRegions zurück. Koordinaten sind normierte Dezimalwerte von 0 bis 1 bezogen auf das gesamte hochgeladene Bild: x, y, width, height. x/y sind linke obere Ecke; width/height sind die Größe.
- Nummeriere Bildbereiche in Leserichtung von oben nach unten und links nach rechts: region-01, region-02 usw. Erfasse jedes eigenständige Foto einzeln, auch zwei nebeneinanderliegende Kartenbilder. Schneide möglichst nur das Foto selbst aus, nicht Überschrift, Beschreibung oder Button.
- Verwende für diese Bereiche zwingend echte <img>-Elemente mit src="images/screenshot-01.png", src="images/screenshot-02.png" usw. Die Dateinummer muss zu region-01, region-02 usw. passen. CSSGuru schneidet diese Bereiche anschließend aus dem hochgeladenen Screenshot aus und speichert sie im ZIP.
- Erzeuge keine erfundenen Bildadressen und schreibe für erkannte Screenshot-Bildbereiche keine figcaption als Ersatz. Wenn kein Foto sichtbar ist, gib imageRegions als leeres Array zurück.
- Ein Logo muss immer sichtbar umgesetzt werden: Wenn es sich aus dem Screenshot erkennen lässt, baue es möglichst ähnlich als inline-SVG direkt im HTML oder als gestaltetes Textlogo mit CSS nach. Verwende keine leere Bildfläche und keinen bloßen Alt-Text als Ersatz.
- Kleine Symbole und einfache Grafiken bevorzugt als inline-SVG erstellen. Das SVG muss direkt im HTML stehen, damit es auch im ZIP-Export enthalten ist.
- WICHTIG: Für jedes Foto/Produktbild, das im hochgeladenen Screenshot sichtbar ist, hat der Screenshot-Ausschnitt immer Vorrang vor externen Bildadressen. Gib dafür imageRegions zurück und verwende im HTML zwingend src="images/screenshot-01.png", src="images/screenshot-02.png" usw. Verwende für diese sichtbaren Motive KEINE HTTPS-Bildadresse.
- Die Reihenfolge der Foto-<img>-Elemente im HTML muss exakt der Reihenfolge der Einträge in imageRegions entsprechen (oben nach unten, links nach rechts). Logos und reine Icons dürfen inline-SVG bleiben und zählen nicht als Foto-Bildbereiche.
- Externe HTTPS-Bildadressen sind nur für zusätzliche Bilder erlaubt, die nicht im Screenshot sichtbar sind.
- Verwende für Fotos keine bloßen figcaption-Beschreibungen als Ersatz für das Bild.
- Wenn keine verlässliche Bilddatei-Adresse vorliegt, erstelle eine passende, optisch ansprechende SVG-Illustration oder CSS-Grafik als eingebetteten Bestandteil der Seite, statt ein kaputtes <img>-Element auszugeben.
- Jedes echte <img>-Element braucht ein sinnvolles alt-Attribut, eine gültige src-Adresse und sollte mit CSS responsiv dargestellt werden (max-width:100%; height:auto;).
- Bevorzuge selbst enthaltene Inhalte (inline-SVG, CSS-Grafiken und Textlogos), damit Vorschau und ZIP-Export ohne zusätzliche Bilddateien funktionieren.
- Keine externen JavaScript- oder CSS-Abhängigkeiten für Logos und Icons voraussetzen.

Gib vollständiges, zusammenhängendes HTML, CSS und optional JS zurück. Erfinde keine großen zusätzlichen Sektionen. Antworte ausschließlich als JSON-Objekt mit diesen Feldern: {"index.html":"vollständiges HTML","styles.css":"vollständiges CSS","script.js":"JavaScript oder leer","imageRegions":[{"id":"region-01","x":0.1,"y":0.2,"width":0.3,"height":0.4}]}. imageRegions muss ein Array mit allen erkannten Foto-/Produktbild-Ausschnitten sein oder [] wenn keine vorhanden sind. Kein Markdown.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_tokens: 8000,
        store: false,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image, detail: "high" } }] }]
      })
    });
    if (!response.ok) throw new Error("KI-Anfrage fehlgeschlagen (" + response.status + "): " + (await response.text()).slice(0, 350));
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Leere KI-Antwort.");
    const out = JSON.parse(content);
    if (typeof out["index.html"] !== "string" || typeof out["styles.css"] !== "string") throw new Error("HTML/CSS fehlen.");
    const bundled = await bundleImages(out["index.html"], out["styles.css"]);
    return new Response(JSON.stringify({
      files: { "index.html": bundled.html, "styles.css": bundled.css, "script.js": typeof out["script.js"] === "string" ? out["script.js"] : "" },
      assets: bundled.assets,
      assetWarnings: bundled.warnings,
      imageRegions: Array.isArray(out.imageRegions) ? out.imageRegions : []
    }), {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }
});