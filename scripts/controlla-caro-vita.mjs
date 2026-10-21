// Controlla src/data/caro-vita.json prima di pubblicare un aggiornamento dello speciale caro vita.
// Uso: node scripts/controlla-caro-vita.mjs   (esce con codice 1 e l'elenco dei problemi se qualcosa non va)

import fs from "node:fs";

const cv = JSON.parse(fs.readFileSync("src/data/caro-vita.json", "utf8"));
const consigli = JSON.parse(fs.readFileSync("src/data/consigli.json", "utf8"));
// il contesto vale per tutte le 20 regioni; leggi e atti solo per quelle in chiaro
const slugRegioni = new Set(JSON.parse(fs.readFileSync("src/data/regioni.json", "utf8")).regioni.map((r) => r.slug));
const problemi = [];
const data = /^\d{4}-\d{2}-\d{2}$/;

if (!data.test(cv.aggiornato ?? "")) problemi.push(`"aggiornato" non è una data AAAA-MM-GG: ${cv.aggiornato}`);
if (cv.chiuso !== null && !data.test(cv.chiuso ?? "")) problemi.push(`"chiuso" deve essere null o una data AAAA-MM-GG: ${cv.chiuso}`);
const temi = new Set((cv.temi ?? []).map((t) => t.id));
if (!temi.size) problemi.push("nessun tema");

// ogni fatto: titolo, testo e almeno due fonti con link http(s) distinti
const controllaFatti = (fatti, dove) => {
  if (!Array.isArray(fatti)) return problemi.push(`${dove}: deve essere un elenco`);
  for (const f of fatti) {
    if (!f.titolo || !f.testo) problemi.push(`${dove}: fatto senza titolo o testo`);
    const url = new Set((f.fonti ?? []).map((s) => s.url));
    if (url.size < 2) problemi.push(`${dove} – "${f.titolo}": servono almeno due fonti diverse`);
    for (const s of f.fonti ?? []) if (!s.nome || !/^https?:\/\//.test(s.url ?? "")) problemi.push(`${dove} – "${f.titolo}": fonte non valida`);
  }
};
controllaFatti(cv.contesto?.generale, "contesto generale");
for (const [r, c] of Object.entries(cv.contesto?.regioni ?? {})) {
  if (!slugRegioni.has(r)) problemi.push(`contesto: regione sconosciuta ${r}`);
  controllaFatti(c.fatti, `${r} – fatti`);
  controllaFatti(c.regione, `${r} – Regione`);
}

// selezione: ogni legge e atto deve esistere nei dati del Consiglio e avere un tema valido
for (const [r, sel] of Object.entries(cv.regioni ?? {})) {
  const k = consigli[r]?.consiglio;
  if (!k) {
    problemi.push(`selezione: regione sconosciuta ${r}`);
    continue;
  }
  for (const [id, tema] of Object.entries(sel.leggi ?? {})) {
    if (!k.leggi.some((l) => l.id === id)) problemi.push(`${r}: legge ${id} non trovata`);
    if (!temi.has(tema)) problemi.push(`${r}: legge ${id} con tema sconosciuto ${tema}`);
  }
  for (const [id, tema] of Object.entries(sel.atti ?? {})) {
    if (!k.atti.some((a) => a.id === id)) problemi.push(`${r}: atto ${id} non trovato`);
    if (!temi.has(tema)) problemi.push(`${r}: atto ${id} con tema sconosciuto ${tema}`);
  }
}

if (problemi.length) {
  console.error(`caro-vita.json: ${problemi.length} problemi\n- ${problemi.join("\n- ")}`);
  process.exit(1);
}
console.log("caro-vita.json: tutto in ordine.");
