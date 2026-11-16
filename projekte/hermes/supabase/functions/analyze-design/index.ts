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

    const prompt = 'Rekonstruiere dieses Website-Design möglichst detailgetreu als responsive Website. Analysiere Layout, Farben, Typografie, Abstände und Komponenten. Semantisches HTML5, vollständiges CSS3 mit Mobile Media Queries und optional Vanilla JS. Erfinde keine großen zusätzlichen Sektionen. Antworte ausschließlich als JSON-Objekt mit String-Feldern: {"index.html":"vollständiges HTML","styles.css":"vollständiges CSS","script.js":"JavaScript oder leer"}. Kein Markdown.';
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