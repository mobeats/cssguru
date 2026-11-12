const input = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const preview = document.getElementById("previewImage");
const emptyPreview = document.querySelector(".empty-preview");
const meta = document.getElementById("fileMeta");
const status = document.getElementById("previewStatus");
const generate = document.getElementById("generateBtn");
const notice = document.getElementById("notice");
const resultPanel = document.getElementById("resultPanel");
const codeOutput = document.getElementById("codeOutput");
const copyBtn = document.getElementById("copyBtn");
let selectedFile = null;
let imageUrl = null;

function loadFile(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    notice.textContent = "Bitte wähle eine JPG-, PNG- oder WEBP-Datei aus.";
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    notice.textContent = "Die Datei ist größer als 15 MB. Bitte wähle ein kleineres Bild.";
    return;
  }
  selectedFile = file;
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(file);
  preview.src = imageUrl;
  preview.hidden = false;
  emptyPreview.hidden = true;
  meta.textContent = file.name + " · " + (file.size / 1024 / 1024).toFixed(2) + " MB";
  status.textContent = "BILD GELADEN";
  generate.disabled = false;
  resultPanel.hidden = true;
  notice.textContent = "Bild erfolgreich geladen. Die KI-Analyse ist noch nicht verbunden; du kannst bereits einen responsiven HTML-Bild-Startcode exportieren.";
}
input.addEventListener("change", () => loadFile(input.files[0]));
["dragenter", "dragover"].forEach(type => dropzone.addEventListener(type, event => {
  event.preventDefault(); dropzone.classList.add("dragover");
}));
["dragleave", "drop"].forEach(type => dropzone.addEventListener(type, event => {
  event.preventDefault(); dropzone.classList.remove("dragover");
}));
dropzone.addEventListener("drop", event => loadFile(event.dataTransfer.files[0]));

generate.addEventListener("click", () => {
  if (!selectedFile) return;
  const safeName = selectedFile.name.replace(/[<>&"]/g, "");
  const code = `<!-- CSSGuru starter export: ${safeName} -->
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mein Design</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="design-preview">
    <img src="DEIN-BILD.jpg" alt="Design-Vorlage">
  </main>
</body>
</html>

/* style.css */
* { box-sizing: border-box; }
body { margin: 0; background: #f5f5f5; }
.design-preview { width: 100%; max-width: 1440px; margin: 0 auto; }
.design-preview img { display: block; width: 100%; height: auto; }`;
  codeOutput.textContent = code;
  resultPanel.hidden = false;
  notice.textContent = "Startcode erstellt. Wichtig: Das ist noch keine KI-Rekonstruktion der einzelnen Designelemente.";
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(codeOutput.textContent);
    copyBtn.textContent = "Kopiert ✓";
  } catch {
    copyBtn.textContent = "Bitte Code markieren";
  }
});