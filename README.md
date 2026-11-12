# CSSGuru — Modern Dark AI

Version 1: Design-zu-Code-Anwendung mit PNG/JPG/WEBP-Upload, KI-Analyse, HTML/CSS/JavaScript-Ausgabe, responsiver Vorschau und ZIP-Export.

## Architektur
- Frontend: HTML, CSS, JavaScript (statisch, ohne Node.js auf dem Hosting)
- Hosting: GitHub Pages
- KI-Backend: Supabase Edge Function
- Modell: OpenAI Vision (API-Key bleibt serverseitig als Supabase Secret)

## Noch einzurichten
1. Supabase-Projekt erstellen.
2. Edge Function `analyze-design` deployen.
3. Supabase Secret `OPENAI_API_KEY` setzen.
4. In `app.js` Supabase Project URL und anon key eintragen (öffentlicher anon key, niemals den Service Role Key).
5. GitHub Pages aktivieren und DNS für cssguru.de auf GitHub Pages konfigurieren.

Bis zur Supabase-Verbindung zeigt die Seite beim Start der KI-Analyse eine klare Meldung. Es wird kein KI-Ergebnis simuliert.
