export function printOrdonnance({ consultation, patient, ordonnance }) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;

  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const lignes = ordonnance?.lignes || [];
  const dateStr = consultation?.date ? new Date(consultation.date).toLocaleString() : "";

  // Essaie de déduire le nom du médecin selon ce que ton API renvoie
  const med = consultation?.medecin;
  const doctorName =
    `${consultation?.medecin_prenom || ""} ${consultation?.medecin_nom || ""}`.trim() ||
    consultation?.medecin_username ||
    "—";

  const patientLine = patient
    ? `#${esc(patient.id)} — ${esc(patient.nom)} ${esc(patient.prenom)}`
    : "—";

  const html = `
  <html>
    <head>
      <title>Ordonnance - Consultation #${esc(consultation?.id)}</title>
      <style>
        @page { margin: 14mm; }
        :root{
          --text:#111827;
          --muted:#6b7280;
          --border:#e5e7eb;
          --bg:#f9fafb;
          --primary:#111827;
        }
        * { box-sizing: border-box; }
        body {
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
          color: var(--text);
          padding: 0;
          margin: 0;
        }
        .page { padding: 24px; }
        .header {
          display:flex;
          justify-content: space-between;
          align-items:flex-start;
          gap: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--border);
          margin-bottom: 16px;
        }
        .brand {
          font-weight: 800;
          font-size: 22px;
          letter-spacing: .2px;
          line-height: 1.1;
        }
        .subtitle {
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
        }
        .meta {
          text-align: right;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.5;
          white-space: nowrap;
        }
        .meta b { color: var(--text); font-weight: 700; }
        .section {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 12px;
          background: #fff;
        }
        .section h3 {
          margin: 0 0 8px 0;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--muted);
        }
        .row {
          display:flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .col {
          flex: 1 1 240px;
          min-width: 240px;
        }
        .value {
          font-size: 14px;
          font-weight: 600;
        }
        .pre { white-space: pre-wrap; font-size: 13px; line-height: 1.45; }
        table { width:100%; border-collapse: collapse; margin-top: 8px; }
        th, td {
          border: 1px solid var(--border);
          padding: 10px 10px;
          vertical-align: top;
          font-size: 13px;
        }
        th {
          background: var(--bg);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: .06em;
          color: var(--muted);
        }
        .muted { color: var(--muted); }
        .footer {
          margin-top: 16px;
          padding-top: 10px;
          border-top: 1px dashed var(--border);
          color: var(--muted);
          font-size: 11px;
          display:flex;
          justify-content: space-between;
        }
        .pill {
          display:inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 11px;
          color: var(--muted);
        }
      </style>
    </head>

    <body>
      <div class="page">
        <div class="header">
          <div>
            <div class="brand">Med Predict</div>
            <div class="subtitle">Ordonnance médicale</div>
          </div>

          <div class="meta">
            <div><b>Consultation</b> #${esc(consultation?.id)}</div>
            <div><b>Date</b> ${esc(dateStr) || "—"}</div>
            <div><b>Médecin</b> ${esc(doctorName)}</div>
          </div>
        </div>

        <div class="row">
          <div class="col section">
            <h3>Patient</h3>
            <div class="value">${patientLine}</div>
          </div>

          <div class="col section">
            <h3>Référence</h3>
            <div class="value">
              <span class="pill">Ordonnance</span>
              <span class="pill">WhatsApp/Plateforme</span>
            </div>
            <div class="muted" style="margin-top:8px;">
              Document généré automatiquement pour impression.
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Notes</h3>
          <div class="pre">${esc(ordonnance?.notes || "—")}</div>
        </div>

        <div class="section">
          <h3>Médicaments prescrits</h3>
          ${
            lignes.length === 0
              ? `<div class="muted" style="margin-top:6px;">— Aucun médicament —</div>`
              : `
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Dosage (mg)</th>
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
                            <td>${esc(l.nom)}</td>
                            <td>${esc(l.dosage)}</td>
                            <td>${esc(l.frequence)}</td>
                            <td>${esc(l.duree_jours)}</td>
                            <td>${esc(l.instructions)}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
          }
        </div>

        <div class="footer">
          <div>Med Predict — Document imprimé</div>
          <div>${esc(new Date().toLocaleString())}</div>
        </div>
      </div>

      <script>
        window.onload = function () { window.print(); };
      </script>
    </body>
  </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}