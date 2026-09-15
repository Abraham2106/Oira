export const PRINT_SHELL = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
  <title>Oira</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 20mm; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", "Liberation Serif", "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.45;
      color: #111;
    }
    header { margin-bottom: 1.2rem; }
    .brand { font-size: 11pt; letter-spacing: 0.08em; text-transform: uppercase; }
    .disclaimer { font-size: 10pt; color: #333; margin: 0.4rem 0 1rem; }
    dl { display: grid; grid-template-columns: 8rem 1fr; gap: 0.2rem 0.8rem; margin: 0; }
    dt { color: #555; font-weight: 600; }
    dd { margin: 0; }
    h2 { font-size: 13pt; margin: 1.1rem 0 0.4rem; page-break-after: avoid; }
    h3 { font-size: 12pt; margin: 0.8rem 0 0.25rem; page-break-after: avoid; }
    p { margin: 0 0 0.6rem; white-space: pre-wrap; page-break-inside: avoid; }
  </style>
</head>
<body>
  <header>
    <p class="brand">Oira</p>
    <p id="disclaimer" class="disclaimer"></p>
    <dl>
      <dt>Nota</dt><dd id="noteId"></dd>
      <dt>Consulta</dt><dd id="encounterId"></dd>
      <dt>Aceptada</dt><dd id="acceptedAt"></dd>
      <dt>Etiqueta</dt><dd id="label"></dd>
      <dt>Tipo</dt><dd id="visitType"></dd>
      <dt>Autoría</dt><dd id="authorship"></dd>
    </dl>
  </header>
  <main id="body"></main>
  <script>
    window.__oiraFill = function (payload) {
      document.getElementById("disclaimer").textContent = payload.disclaimer;
      document.getElementById("noteId").textContent = payload.noteId;
      document.getElementById("encounterId").textContent = payload.encounterId;
      document.getElementById("acceptedAt").textContent = payload.acceptedAt;
      document.getElementById("label").textContent = payload.label;
      document.getElementById("visitType").textContent = payload.visitType;
      document.getElementById("authorship").textContent = payload.authorshipLine;
      var main = document.getElementById("body");
      main.replaceChildren();
      payload.blocks.forEach(function (block) {
        var heading = document.createElement(block.kind === "group" ? "h2" : "h3");
        heading.textContent = block.title;
        main.appendChild(heading);
        if (block.body != null) {
          var paragraph = document.createElement("p");
          paragraph.textContent = block.body;
          main.appendChild(paragraph);
        }
      });
    };
  </script>
</body>
</html>
`
