export function printOrdonnance({ consultation, patient, ordonnance }) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;

  const lignes = ordonnance?.lignes || [];
  const dateStr = consultation?.date ? new Date(consultation.date).toLocaleString() : "";

  const html = `
  <html>
    <head>
      <title>Ordonnance - Consultation #${consultation?.id ?? ""}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        h1,h2,h3 { margin: 0; }
        .muted { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f9fafb; }
        .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-top: 12px; }
        .pre { white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="top">
        <div>
          <h2>Ordonnance</h2>
          <div class="muted">Consultation #${consultation?.id ?? ""} — ${dateStr}</div>
        </div>
      </div>

      <div class="box">
        <b>Patient</b>
        <div>${patient ? `#${patient.id} — ${patient.nom} ${patient.prenom}` : "—"}</div>
      </div>

      <div class="box">
        <b>Notes</b>
        <div class="pre">${(ordonnance?.notes || "—").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>
      </div>

      <div class="box">
        <b>Médicaments prescrits</b>
        ${
          lignes.length === 0
            ? `<div class="muted" style="margin-top:8px;">— Aucun médicament —</div>`
            : `
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Dosage</th>
                    <th>Fréquence</th>
                    <th>Durée (jours)</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${lignes
                    .map(
                      (l) => `
                      <tr>
                        <td>${(l.nom || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>
                        <td>${(l.dosage || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>
                        <td>${(l.frequence || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>
                        <td>${l.duree_jours ?? ""}</td>
                        <td>${(l.instructions || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
              </table>
            `
        }
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
  </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}