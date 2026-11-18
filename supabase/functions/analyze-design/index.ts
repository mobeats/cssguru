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
- Ein Logo muss immer sichtbar umgesetzt werden: Wenn es sich aus dem Screenshot erkennen lässt, baue es möglichst ähnlich als inline-SVG direkt im HTML oder als gestaltetes Textlogo mit CSS nach. Verwende keine leere Bildfläche und keinen bloßen Alt-Text als Ersatz.
- Kleine Symbole und einfache Grafiken bevorzugt als inline-SVG erstellen. Das SVG muss direkt im HTML stehen, damit es auch im ZIP-Export enthalten ist.
- Für erkennbare Fotos oder komplexe Motive: Verwende nur eine tatsächlich bekannte, vollständige und plausible HTTPS-Bildadresse, wenn du sie sicher kennst. Erfinde niemals URLs, Dateinamen oder nicht vorhandene lokale Bilddateien.
- Wenn keine verlässliche Bilddatei-Adresse vorliegt, erstelle eine passende, optisch ansprechende SVG-Illustration oder CSS-Grafik als eingebetteten Bestandteil der Seite, statt ein kaputtes <img>-Element auszugeben.
- Jedes echte <img>-Element braucht ein sinnvolles alt-Attribut, eine gültige src-Adresse und sollte mit CSS responsiv dargestellt werden (max-width:100%; height:auto;).
- Bevorzuge selbst enthaltene Inhalte (inline-SVG, CSS-Grafiken und Textlogos), damit Vorschau und ZIP-Export ohne zusätzliche Bilddateien funktionieren.
- Keine externen JavaScript- oder CSS-Abhängigkeiten für Logos und Icons voraussetzen.

Gib vollständiges, zusammenhängendes HTML, CSS und optional JS zurück. Erfinde keine großen zusätzlichen Sektionen. Antworte ausschließlich als JSON-Objekt mit String-Feldern: {"index.html":"vollständiges HTML","styles.css":"vollständiges CSS","script.js":"JavaScript oder leer"}. Kein Markdown.`;
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
    return new Response(JSON.stringify({ files: { "index.html": out["index.html"], "styles.css": out["styles.css"], "script.js": typeof out["script.js"] === "string" ? out["script.js"] : "" } }), {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }
});