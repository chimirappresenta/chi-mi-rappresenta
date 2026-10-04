// Vincitori dei 74 collegi uninominali del Senato (politiche 2022), dai risultati per comune del Ministero dell'Interno.
// Il Senato non pubblica in open data il collegio di elezione dei senatori: lo ricaviamo da qui e lo confrontiamo
// con i senatori in carica (dati.senato.it) per intercettare cambi di nome ed elezioni suppletive.

import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const URL = "https://dait.interno.gov.it/documenti/opendata/senato/senato-20220925.zip";

const righe = (buf) =>
  new TextDecoder("windows-1252")
    .decode(buf)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.split(";").map((x) => x.replace(/^"|"$/g, "")))
    .slice(1);

/** Map "LOMBARDIA - U06" → { cognome, nome } del candidato più votato nel collegio. Cache in data/raw. */
export async function vincitoriSenato({ RAW, UA }) {
  const cache = path.join(RAW, "senato-2022-vincitori.json");
  if (fs.existsSync(cache)) return new Map(Object.entries(JSON.parse(fs.readFileSync(cache, "utf8"))));
  console.log("  ↓ senato-2022-vincitori.json (da senato-20220925.zip)");
  const res = await fetch(URL, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${URL} → HTTP ${res.status}`);
  const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));
  const file = (re) => zip.getEntries().find((e) => re.test(e.entryName)).getData();

  const voti = new Map(); // collegio → Map("COGNOME|NOME" → { v, comuni })
  const somma = (collegio, cognome, nome, comune, v) => {
    const m = voti.get(collegio) ?? voti.set(collegio, new Map()).get(collegio);
    const k = `${cognome}|${nome}`;
    const x = m.get(k) ?? { v: 0, comuni: new Set() };
    // i voti del candidato si ripetono su ogni lista collegata: una volta per comune
    if (!x.comuni.has(comune)) {
      x.comuni.add(comune);
      x.v += Number(v) || 0;
    }
    m.set(k, x);
  };
  // Tutte le regioni tranne Valle d'Aosta e Trentino-Alto Adige: "REGIONE - U06 (DESCRIZIONE)"
  for (const r of righe(file(/Senato_Italia_LivComune\.csv$/i))) somma(r[4].replace(/\s*\(.*$/, "").trim(), r[13], r[14], r[5], r[18]);
  // Valle d'Aosta e Trentino-Alto Adige: file a parte, con il collegio senza la regione e i voti per comune e lista
  const vt = new Map();
  for (const r of righe(file(/Senato_VAosta&Trentino_livComune\.csv$/i))) {
    const collegio = `${r[2]} - ${r[3].trim().replace(/\s*\(.*$/, "")}`;
    const k = `${collegio}|${r[5]}|${r[6]}|${r[4]}`;
    vt.set(k, (vt.get(k) ?? 0) + (Number(r[10]) || 0));
  }
  for (const [k, v] of vt) {
    const [collegio, cognome, nome, comune] = k.split("|");
    somma(collegio, cognome, nome, comune, v);
  }
  const out = {};
  for (const [collegio, m] of voti) {
    const [k] = [...m].sort((a, b) => b[1].v - a[1].v)[0];
    const [cognome, nome] = k.split("|");
    out[collegio] = { cognome, nome };
  }
  fs.writeFileSync(cache, JSON.stringify(out));
  return new Map(Object.entries(out));
}
