// Risultati elettorali per comune dagli open data del Ministero dell'Interno (Eligendo / DAIT), tutta Italia.
// Ultime comunali del comune, regionali 2025 (dove si è votato), politiche 2022 (Camera) ed europee 2024.
// Gli archivi sono grandi (le europee superano i 100 MB): in cache teniamo solo le colonne che servono.

import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { righeXlsx } from "./xlsx.mjs";

const BASE = "https://dait.interno.gov.it/documenti/opendata";
export const FONTE_ELEZIONI = "https://elezionistorico.interno.gov.it/eligendo/opendata.php";

/** Testo in UTF-8 se valido, altrimenti Windows-1252 (i file più vecchi). */
function testo(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

/** CSV con ";" e virgolette, riga per riga (i campi non vanno mai a capo in questi file). */
function righeCsv(t) {
  return t
    .split(/\r?\n/)
    .filter((r) => r.trim())
    .map((r) => {
      const out = [];
      let f = "";
      let q = false;
      for (let i = 0; i < r.length; i++) {
        const c = r[i];
        if (q) {
          if (c === '"' && r[i + 1] === '"') {
            f += '"';
            i++;
          } else if (c === '"') q = false;
          else f += c;
        } else if (c === '"') q = true;
        else if (c === ";") {
          out.push(f);
          f = "";
        } else f += c;
      }
      out.push(f);
      return out;
    });
}

/** Righe come oggetti con chiavi in maiuscolo, da CSV/TXT o XLSX. */
function oggetti(nome, buf) {
  const righe = /\.xlsx$/i.test(nome) ? righeXlsx(buf) : righeCsv(testo(buf));
  const int = righe[0].map((h) => h.trim().toUpperCase());
  return righe.slice(1).map((r) => Object.fromEntries(int.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const campo = (r, ...chiavi) => {
  for (const k of chiavi) if (r[k] !== undefined && r[k] !== "") return r[k];
  return "";
};
const num = (s) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;
export const normNome = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

// ------------------------------------------------------------ nomi leggibili

const MINUSCOLE = new Set("di da e ed il la lo le i gli un una per con su sul sulla tra fra a al alla allo ai agli del della dello dei degli delle nel nella in o".split(" "));
const PAROLE_BREVI = new Set("de le ma mi ci vi ne re fa va sud nord noi voi tu io mio tuo suo ora oggi qui per con sei tre due uno ama oro via sì si no non più piu bene vita".split(" "));
const maiuscolaIniziale = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/** "FRATELLI D'ITALIA" → "Fratelli d'Italia"; le sigle (PD, M5S, PPE) restano in maiuscolo. */
export function nomeLista(s) {
  return s
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w, i) => {
      if (/\d/.test(w) && /[A-Z]/.test(w) && w.length <= 4) return w; // M5S
      const lw = w.toLowerCase();
      const pulita = lw.replace(/[^a-zàèéìòù]/g, "");
      if (pulita.length >= 2 && pulita.length <= 3 && w === w.toUpperCase() && !MINUSCOLE.has(pulita) && !PAROLE_BREVI.has(pulita)) return w;
      const m = lw.match(/^([a-z]{1,2}')(.+)$/); // d'italia, l'altra
      if (m) return (i === 0 ? maiuscolaIniziale(m[1]) : m[1]) + maiuscolaIniziale(m[2]);
      if (i > 0 && MINUSCOLE.has(lw)) return lw;
      return lw.replace(/(^|[-/(+"«])([a-zàèéìòù])/g, (_, p, c) => p + c.toUpperCase());
    })
    .join(" ")
    // nei dati le vocali accentate finali sono scritte con l'apostrofo: "CITTA'" → "Città", "E'" → "È"
    .replace(/(^|\s)E'(?=\s|$)/g, "$1È")
    .replace(/([a-zA-Z]{2,})([aeiouAEIOU])'(?=[\s,.)!-]|$)/g, (_, w, v) => w + { a: "à", e: "è", i: "ì", o: "ò", u: "ù" }[v.toLowerCase()]);
}

/** "D'ALESSIO" → "D'Alessio", "DE LUCA" → "De Luca" */
export const nomePersona = (s) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zàèéìòù])/g, (_, p, c) => p + c.toUpperCase());

// ------------------------------------------------------------ download con cache ridotta

async function caricaZip(url, ua) {
  const res = await fetch(url, { headers: { "User-Agent": ua } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return new AdmZip(Buffer.from(await res.arrayBuffer()));
}

/**
 * Scarica un archivio, legge i file indicati e tiene solo le righe della regione, in un JSON di cache.
 * `file`: elenco di { match: RegExp, come: nome logico }.
 */
async function righeRegione({ RAW, REFRESH, UA, cache, url, file, filtro = () => true, tieni }) {
  const p = path.join(RAW, cache);
  if (!REFRESH && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`  ↓ ${cache} (da ${url.split("/").pop()})`);
  const zip = await caricaZip(url, UA);
  const out = {};
  for (const { match, come } of file) {
    const e = zip.getEntries().find((x) => match.test(x.entryName));
    if (!e) throw new Error(`${url}: file ${match} non trovato`);
    const righe = oggetti(e.entryName, e.getData()).filter(filtro);
    out[come] = tieni ? righe.map((x) => Object.fromEntries(tieni.filter((k) => x[k] !== undefined && x[k] !== "").map((k) => [k, x[k]]))) : righe;
  }
  fs.writeFileSync(p, JSON.stringify(out));
  return out;
}

// ------------------------------------------------------------ tornate delle comunali

/** Tornate di elezioni comunali con il loro formato. La chiave è la data come la dà l'anagrafe degli amministratori. */
const TORNATE = {
  "03/10/2021": { zip: "20211003", file: [{ match: /\.txt$/i, come: "liste" }] },
  "12/06/2022": {
    zip: "20220612",
    file: [
      { match: /Scrutini Primo Turno/i, come: "liste" },
      { match: /Scrutini Secondo Turno/i, come: "liste2" },
    ],
  },
  "14/05/2023": { zip: "20230514", file: [{ match: /\.xlsx$/i, come: "liste" }] },
  "09/06/2024": {
    zip: "20240609",
    file: [
      { match: /Liste&candidati/i, come: "liste" },
      { match: /scrutini\.csv$/i, come: "scrutini" },
    ],
  },
  "25/05/2025": {
    zip: "20250525",
    file: [
      { match: /Liste&Cand/i, come: "liste" },
      { match: /Scrutini/i, come: "scrutini" },
    ],
  },
  "24/05/2026": {
    zip: "20260524",
    file: [
      { match: /Liste&Cand_LivComune/i, come: "liste" },
      { match: /Scrutini_LivComune/i, come: "scrutini" },
    ],
  },
  "07/06/2026": {
    zip: "20260607",
    file: [
      { match: /Liste&Cand_LivComune/i, come: "liste" },
      { match: /Scrutini_LivComune/i, come: "scrutini" },
    ],
  },
};

const dataEstesa = (gg) => {
  const [d, m, y] = gg.split("/").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/** Prime N voci, ordinate per voti, con la percentuale sul totale. */
function classifica(voti, totale, n) {
  return [...voti]
    .sort((a, b) => b.voti - a.voti)
    .slice(0, n)
    .map((x) => ({ ...x, pct: pct(x.voti, totale) }));
}

/** Chiave regione: "CAMPANIA 1" (circoscrizione), "Trentino-Alto Adige/Südtirol", "EMILIA ROMAGNA" → stessa forma. */
const chiaveRegione = (s) => normNome((s ?? "").split("/")[0].replace(/\s+\d+$/, ""));
/** Nome del comune senza la parte in altra lingua ("BOLZANO/BOZEN"). */
const chiaveComune = (s) => normNome((s ?? "").split("/")[0]);

/**
 * Risultati per comune (chiave: codice ISTAT), per tutta Italia.
 * comuni: [{ istat, nome, codiceRegione, regione }], dataComunali: Map istat → "gg/mm/aaaa" (ultime comunali).
 * Non ci sono due comuni con lo stesso nome nella stessa regione: la chiave regione + nome è univoca.
 */
export async function elezioniPerComune({ RAW, REFRESH, UA, comuni, dataComunali, warn }) {
  const perNome = new Map(comuni.map((c) => [`${chiaveRegione(c.regione)}|${chiaveComune(c.nome)}`, c.istat]));
  const regioneDi = new Map(comuni.map((c) => [c.istat, c.codiceRegione]));
  const ris = new Map(comuni.map((c) => [c.istat, []]));
  const nonTrovati = new Map(); // contesto → nomi
  const istatDi = (regione, nome, contesto) => {
    const k = perNome.get(`${chiaveRegione(regione)}|${chiaveComune(nome)}`);
    if (!k) (nonTrovati.get(contesto) ?? nonTrovati.set(contesto, new Set()).get(contesto)).add(`${nome} (${regione})`);
    return k;
  };
  // I risultati di un'elezione passata non cambiano: non li riscarichiamo a ogni --refresh (sono archivi da oltre 100 MB).
  // Una nuova tornata ha un nuovo file di cache, quindi viene scaricata da sola.
  void REFRESH;
  const opz = { RAW, REFRESH: false, UA };

  // --- Comunali: per ogni comune, la tornata in cui ha eletto l'amministrazione in carica
  const servono = new Set([...dataComunali.values()]);
  for (const gg of servono) {
    const anno = Number(gg.slice(-4));
    if (!TORNATE[gg] && anno >= 2026) warn(`Comunali del ${gg}: tornata nuova, aggiungerla a TORNATE in scripts/elezioni.mjs`);
  }
  for (const [gg, t] of Object.entries(TORNATE)) {
    if (!servono.has(gg)) continue;
    const d = await righeRegione({
      ...opz,
      cache: `elezioni-comunali-${t.zip}-italia.json`,
      url: `${BASE}/comunali/comunali-${t.zip}.zip`,
      file: t.file,
    });
    const righe = [...(d.liste ?? []).map((r) => ({ ...r, TURNO: campo(r, "TURNO") || "1" })), ...(d.liste2 ?? []).map((r) => ({ ...r, TURNO: "2" }))];
    const scrutini = new Map(); // istat|turno → { elettori, votanti }
    for (const r of [...(d.scrutini ?? []), ...righe]) {
      const e = num(campo(r, "ELETTORITOT", "ELETTORITOTALI", "ELETTORI"));
      const v = num(campo(r, "VOTANTITOT", "VOTANTITOTALI", "NUMVOTANTITOTALI"));
      const k = `${chiaveRegione(campo(r, "REGIONE"))}|${chiaveComune(campo(r, "COMUNE"))}|${campo(r, "TURNO") || "1"}`;
      if (e && !scrutini.has(k)) scrutini.set(k, { elettori: e, votanti: v });
    }
    const perComune = Map.groupBy(righe, (r) => `${campo(r, "REGIONE")}|${campo(r, "COMUNE")}`);
    for (const [chiave, rr] of perComune) {
      const [regNome, nome] = chiave.split("|");
      const istat = istatDi(regNome, nome, `comunali ${gg}`);
      if (!istat || dataComunali.get(istat) !== gg) continue;
      const turno = Math.max(...rr.map((r) => Number(r.TURNO)));
      const delTurno = rr.filter((r) => Number(r.TURNO) === turno);
      const candidati = new Map();
      for (const r of delTurno) {
        const nomeC = nomePersona(`${campo(r, "NOME")} ${campo(r, "COGNOME")}`);
        const c = candidati.get(nomeC) ?? { nome: nomeC, voti: 0, liste: [], eletto: false };
        c.voti = Math.max(c.voti, num(campo(r, "VOTICAND", "VOTICANDIDSINDACO", "VOTICANDIDATO")));
        const lista = campo(r, "DESCRLISTA", "LISTA");
        if (lista && !c.liste.includes(nomeLista(lista))) c.liste.push(nomeLista(lista));
        if (campo(r, "CODTIPOELETTO") === "S") c.eletto = true;
        if (campo(r, "SESSO") === "F") c.f = true;
        candidati.set(nomeC, c);
      }
      const tot = [...candidati.values()].reduce((s, c) => s + c.voti, 0);
      const sc = scrutini.get(`${chiaveRegione(regNome)}|${chiaveComune(nome)}|${turno}`);
      ris.get(istat).push({
        id: "comunali",
        titolo: "Elezioni comunali",
        data: dataEstesa(gg),
        turno: turno > 1 ? turno : undefined,
        elettori: sc?.elettori,
        votanti: sc?.votanti,
        affluenza: sc ? pct(sc.votanti, sc.elettori) : undefined,
        candidati: classifica(candidati.values(), tot, 8).map((c) => ({ ...c, liste: c.liste.slice(0, 6) })),
        candidatiAltri: Math.max(0, candidati.size - 8),
      });
    }
  }

  // --- Elezioni con risultati per lista (e per candidato presidente, alle regionali)
  const perLista = (righe, { contesto, regioneRiga, comuneRiga, chiaveSezione, elettori, votanti, lista, votiLista, candidato, votiCandidato }) => {
    const out = new Map();
    for (const r of righe) {
      const istat = istatDi(regioneRiga(r), comuneRiga(r), contesto);
      if (!istat) continue;
      const o = out.get(istat) ?? { sezioni: new Map(), liste: new Map(), candidati: new Map() };
      // elettori e votanti si ripetono su ogni riga: li contiamo una volta per "sezione" (es. collegio, per i comuni divisi)
      o.sezioni.set(chiaveSezione(r), { e: num(elettori(r)), v: num(votanti(r)) });
      const l = lista(r);
      if (l) {
        const k = `${chiaveSezione(r)}|${l}`;
        if (!o.liste.has(k)) o.liste.set(k, { nome: l, voti: num(votiLista(r)) });
      }
      if (candidato) {
        const c = candidato(r);
        const k = `${chiaveSezione(r)}|${c}`;
        o.candidati.set(k, { nome: c, voti: Math.max(o.candidati.get(k)?.voti ?? 0, num(votiCandidato(r))) });
      }
      out.set(istat, o);
    }
    const somma = (vals) => {
      const m = new Map();
      for (const x of vals) m.set(x.nome, (m.get(x.nome) ?? 0) + x.voti);
      return [...m].map(([nome, voti]) => ({ nome, voti }));
    };
    const totaliRegione = new Map(); // codice regione → { e, v }
    const risultati = new Map();
    for (const [istat, o] of out) {
      const e = [...o.sezioni.values()].reduce((s, x) => s + x.e, 0);
      const v = [...o.sezioni.values()].reduce((s, x) => s + x.v, 0);
      const t = totaliRegione.get(regioneDi.get(istat)) ?? { e: 0, v: 0 };
      t.e += e;
      t.v += v;
      totaliRegione.set(regioneDi.get(istat), t);
      const liste = somma(o.liste.values());
      const cand = somma(o.candidati.values());
      const totL = liste.reduce((s, x) => s + x.voti, 0);
      const totC = cand.reduce((s, x) => s + x.voti, 0);
      risultati.set(istat, {
        elettori: e,
        votanti: v,
        affluenza: pct(v, e),
        candidati: cand.length ? classifica(cand, totC, 6) : undefined,
        liste: classifica(liste, totL, 7),
        listeAltre: Math.max(0, liste.length - 7),
      });
    }
    // comuni delle regioni presenti nel file ma senza risultati
    const mancano = comuni.filter((c) => totaliRegione.has(c.codiceRegione) && !risultati.has(c.istat)).map((c) => c.nome);
    if (mancano.length) warn(`Elezioni ${contesto}: nessun dato per ${mancano.length} comuni (${mancano.slice(0, 8).join(", ")}${mancano.length > 8 ? ", …" : ""})`);
    const affluenzaRegioni = new Map([...totaliRegione].map(([reg, t]) => [reg, pct(t.v, t.e)]));
    return { risultati, affluenzaRegioni };
  };

  const aggiungi = (base, { risultati, affluenzaRegioni }) => {
    for (const [istat, r] of risultati) ris.get(istat).push({ ...base, ...r, affluenzaRegione: affluenzaRegioni.get(regioneDi.get(istat)) });
  };

  // Regionali 2025
  const reg = await righeRegione({
    ...opz,
    cache: "elezioni-regionali-20251123-italia.json",
    url: `${BASE}/regionali/regionali-20251123.zip`,
    file: [{ match: /^20251123_REGIONALI_SCRUTINI\.csv$/i, come: "scrutini" }],
  });
  aggiungi(
    { id: "regionali", titolo: "Elezioni regionali", data: "23 novembre 2025" },
    perLista(reg.scrutini, {
      contesto: "regionali 2025",
      regioneRiga: (r) => r.REGIONE,
      comuneRiga: (r) => r.COMUNE,
      chiaveSezione: () => "",
      elettori: (r) => r.ELETTORI,
      votanti: (r) => r.VOTANTI,
      lista: (r) => (r.LISTA ? nomeLista(r.LISTA) : ""),
      votiLista: (r) => r.VOTI_LISTA,
      candidato: (r) => nomePersona(`${r.NOME} ${r.COGNOME}`),
      votiCandidato: (r) => r.VOTI_CANDIDATO,
    }),
  );

  // Politiche 2022, Camera (voti alle liste nella parte proporzionale)
  const cam = await righeRegione({
    ...opz,
    cache: "elezioni-camera-20220925-italia.json",
    url: `${BASE}/camera/camera-20220925.zip`,
    file: [{ match: /camera2022_Italia_LivComune\.csv$/i, come: "comuni" }],
    tieni: ["CIRC-REG", "COLLUNINOM", "COMUNE", "ELETTORITOT", "VOTANTITOT", "DESCRLISTA", "VOTILISTA"],
  });
  aggiungi(
    { id: "politiche", titolo: "Elezioni politiche (Camera)", data: "25 settembre 2022" },
    perLista(cam.comuni, {
      contesto: "politiche 2022",
      regioneRiga: (r) => r["CIRC-REG"],
      comuneRiga: (r) => r.COMUNE,
      chiaveSezione: (r) => r.COLLUNINOM,
      elettori: (r) => r.ELETTORITOT,
      votanti: (r) => r.VOTANTITOT,
      lista: (r) => nomeLista(r.DESCRLISTA),
      votiLista: (r) => r.VOTILISTA,
    }),
  );

  // Europee 2024
  const eu = await righeRegione({
    ...opz,
    cache: "elezioni-europee-20240609-italia.json",
    url: `${BASE}/europee/europee-20240609.zip`,
    file: [{ match: /^EUROPEE_ITALIA_LivComune\.csv$/i, come: "comuni" }],
    tieni: ["DESCREGIONE", "DESCCOMUNE", "ELETTORI", "VOTANTI", "DESCLISTA", "NUMVOTI"],
  });
  aggiungi(
    { id: "europee", titolo: "Elezioni europee", data: "9 giugno 2024" },
    perLista(eu.comuni, {
      contesto: "europee 2024",
      regioneRiga: (r) => r.DESCREGIONE,
      comuneRiga: (r) => r.DESCCOMUNE,
      chiaveSezione: () => "",
      elettori: (r) => r.ELETTORI,
      votanti: (r) => r.VOTANTI,
      lista: (r) => nomeLista(r.DESCLISTA),
      votiLista: (r) => r.NUMVOTI,
    }),
  );

  for (const [contesto, nomi] of nonTrovati)
    warn(`Elezioni ${contesto}: ${nomi.size} comuni non riconosciuti (${[...nomi].slice(0, 6).join(", ")}${nomi.size > 6 ? ", …" : ""})`);
  return ris;
}
