# CSSGuru — Modern Dark AI

CSSGuru ist eine Design-zu-Code-Anwendung: Ein PNG-, JPG- oder WEBP-Design wird hochgeladen, durch KI analysiert und in HTML, CSS und JavaScript umgesetzt. Das Ergebnis kann responsiv in der Vorschau geprüft und als ZIP exportiert werden.

## Aktueller Stand

Die Grundinstallation ist eingerichtet:

- Website: GitHub Pages
- Domain: `cssguru.de`
- Frontend: statisches HTML, CSS und JavaScript
- KI-Backend: Supabase Edge Function `analyze-design`
- KI-Modell: OpenAI Vision über die OpenAI API
- Der OpenAI API-Key liegt serverseitig als Supabase Secret `OPENAI_API_KEY`
- Im Frontend wird nur die öffentliche Supabase-Anon-Key verwendet. Der Service-Role-Key gehört niemals in den Browser.

Es muss für den normalen Betrieb kein Node.js auf dem Hosting installiert werden.

## Ablauf der KI-Analyse

1. Der Nutzer wählt ein Bild aus.
2. Erst beim Klick auf **„In Code umwandeln“** wird das Bild an die Supabase Edge Function gesendet.
3. Die Edge Function ruft OpenAI zur Bildanalyse und Code-Erstellung auf.
4. Das Ergebnis wird im Browser angezeigt. Die ZIP-Datei wird im Browser aus den erzeugten Dateien erstellt.

CSSGuru speichert die hochgeladenen Bilder nicht dauerhaft in einem eigenen Datei-Speicher.

## Wichtige Dienste

- **GitHub Pages:** Veröffentlichung der Website und Verwaltung des Quellcodes.
- **Supabase:** Serverseitige Edge Function für die KI-Anfrage.
- **OpenAI:** Analyse des hochgeladenen Designs und Erzeugung des Codes.
- **Hetzner:** Verwaltung der Domain und der E-Mail-Adresse.

## Wartung

- Änderungen an Website-Dateien werden im GitHub-Repository vorgenommen und über GitHub Pages veröffentlicht.
- Die Edge Function und das Secret werden im Supabase-Projekt verwaltet.
- API-Schlüssel und andere Geheimnisse dürfen nicht in öffentliche GitHub-Dateien oder in den Frontend-Code eingetragen werden.

## Hinweis

Diese README beschreibt die derzeit vorgesehene Architektur und den eingerichteten Projektstand. Zugangsdaten und geheime Schlüssel werden aus Sicherheitsgründen nicht dokumentiert.
