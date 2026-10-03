// Pipeline dati di "Chi mi rappresenta".
// Scarica le fonti ufficiali (con cache in data/raw/), le normalizza e scrive i JSON in src/data/.
// Uso: node scripts/build-data.mjs [--refresh]   (--refresh ignora la cache e riscarica tutto)

import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { elezioniPerComune, FONTE_ELEZIONI } from "./elezioni.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const MANUAL = path.join(ROOT, "data", "manual");
const OUT = path.join(ROOT, "src", "data");
const REFRESH = process.argv.includes("--refresh");

// Tutta Italia per comuni, Parlamento ed Europa. La regione "in chiaro" (Consiglio regionale con atti, leggi,
// emiciclo) per ora è solo la Campania: per aggiungerne altre serve un adattatore del loro Consiglio regionale.
const REGIONE = { codice: "15", nome: "Campania" };
/** Codice IPA dell'ente Regione, per codice ISTAT della regione. */
const IPA_REGIONE = {
  "01": "r_piemon", "02": "r_vda", "03": "r_lombar", "04": "r_trenti", "05": "r_veneto", "06": "r_friuve", "07": "r_liguri",
  "08": "r_emiro", "09": "r_toscan", "10": "r_umbria", "11": "r_marche", "12": "r_lazio", "13": "r_abruzz", "14": "r_molise",
  "15": "r_campan", "16": "r_puglia", "17": "r_basili", "18": "regcal", "19": "r_sicili", "20": "r_sardeg",
};

const UA = "chi-mi-rappresenta/0.1 (progetto civico open source)";
const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn("  ! " + msg);
};
/** Avvisi dello stesso tipo raccolti e scritti una volta sola, con il conteggio (con 7.900 comuni sarebbero troppi). */
const gruppiAvvisi = new Map();
const warnGruppo = (tipo, chi) => (gruppiAvvisi.get(tipo) ?? gruppiAvvisi.set(tipo, []).get(tipo)).push(chi);
const chiudiAvvisi = () => {
  for (const [tipo, chi] of gruppiAvvisi) warn(`${tipo}: ${chi.length} (${chi.slice(0, 8).join(", ")}${chi.length > 8 ? ", …" : ""})`);
  gruppiAvvisi.clear();
};

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- utilità

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(name, url, { binary = false, headers = {}, accetta404 = false } = {}) {
  const file = path.join(RAW, name);
  if (!REFRESH && fs.existsSync(file)) return binary ? fs.readFileSync(file) : fs.readFileSync(file, "utf8");
  console.log(`  ↓ ${name}`);
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!res.ok && !(accetta404 && res.status === 404)) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return binary ? buf : buf.toString("utf8");
}

async function sparql(name, endpoint, query) {
  const url = `${endpoint}?${new URLSearchParams({ query, format: "application/sparql-results+json" })}`;
  const text = await download(name, url, { headers: { Accept: "application/sparql-results+json" } });
  return JSON.parse(text).results.bindings.map((b) =>
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])),
  );
}

/** CSV con separatore ";" e campi tra virgolette. */
function parseCsv(text, sep = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Tabella CSV → array di oggetti, a partire dalla riga di intestazione indicata. */
function csvObjects(text, headerRow = 0, sep = ";") {
  // I file a tabulazioni (IPA, ISTAT) non usano le virgolette come delimitatori ma le contengono nei nomi:
  // li leggiamo riga per riga, altrimenti una virgoletta "fonderebbe" più righe.
  const rows =
    sep === "\t"
      ? text
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .map((l) => l.split("\t"))
      : parseCsv(text, sep);
  const header = rows[headerRow].map((h) => h.trim());
  return rows.slice(headerRow + 1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/** Lettore DBF minimale (shapefile ISTAT). */
function readDbf(buf, encoding = "latin1") {
  const n = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recLen = buf.readUInt16LE(10);
  const fields = [];
  for (let off = 32; buf[off] !== 0x0d; off += 32) {
    fields.push({ name: buf.toString("ascii", off, off + 11).replace(/\0.*$/, ""), len: buf[off + 16] });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let p = headerLen + i * recLen + 1;
    const rec = {};
    for (const f of fields) {
      rec[f.name] = buf.toString(encoding, p, p + f.len).trim();
      p += f.len;
    }
    out.push(rec);
  }
  return out;
}

const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

const PAROLE_MINORI = new Set("a al alla con da dal dalla de dei del della delle di e gli i il in la le lo nel nella per su".split(" "));

/** "DE LUCA PIERO" → "De Luca Piero"; gestisce apostrofi e accenti finali tipo "MIMI'". */
function titleCase(s, { minori = false } = {}) {
  let out = s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s'’\-(])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
    .replace(/([aeiou])'(?=\s|$|\|)/gi, (_, v) => {
      const acc = { a: "à", e: "è", i: "ì", o: "ò", u: "ù" }[v.toLowerCase()];
      return v === v.toUpperCase() ? acc.toUpperCase() : acc;
    });
  if (minori) out = out.replace(/(?<=[^|\s]\s)(\p{L}+)(?=\s)/gu, (w) => (PAROLE_MINORI.has(w.toLowerCase()) ? w.toLowerCase() : w));
  return out;
}

/**
 * Ruolo al femminile quando la fonte indica il sesso: "Sindaco" → "Sindaca", "Deputato eletto" → "Deputata eletta".
 * Senza indicazione resta la forma della fonte.
 */
const FEMMINILI = [
  [/\bVicesindaco\b/g, "Vicesindaca"],
  [/\bSindaco\b/g, "Sindaca"],
  [/\bAssessore\b/g, "Assessora"],
  [/\bConsigliere\b/g, "Consigliera"],
  [/\bEurodeputato\b/g, "Eurodeputata"],
  [/\bDeputato\b/g, "Deputata"],
  [/\bSenatore\b/g, "Senatrice"],
  [/\beletto\b/g, "eletta"],
  [/\bsubentrato\b/g, "subentrata"],
];
const declina = (ruolo, sesso) => (sesso === "F" ? FEMMINILI.reduce((t, [re, f]) => t.replace(re, f), ruolo) : ruolo);

/** Liste elettorali: "A | B | C" → "A · B · C", con articoli e preposizioni in minuscolo. */
const formatListe = (s) => (s ? titleCase(s, { minori: true }).replace(/\s*\|\s*/g, " · ") : undefined);

const persona = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));

function htmlText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------- 1. Comuni (ISTAT)

console.log("1/7 Elenco comuni ISTAT");
const istatBuf = await download(
  "istat-comuni.csv",
  "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv",
  { binary: true },
);
const istatRows = parseCsv(istatBuf.toString("latin1")).slice(1);
/** "Valle d'Aosta/Vallée d'Aoste" → "Valle d'Aosta" (il nome bilingue resta solo nelle fonti). */
const nomeRegione = (s) => s.split("/")[0].trim();
const slugRegione = (nome) => norm(nome).toLowerCase().replace(/ /g, "-");
const comuni = istatRows
  .filter((r) => /^\d{6}$/.test(r[4]))
  .map((r) => ({
    istat: r[4],
    nome: r[6],
    provincia: nomeRegione(r[11]),
    sigla: r[14],
    capoluogo: r[13] === "1",
    codiceRegione: r[0],
    regione: nomeRegione(r[10]),
    regioneSlug: slugRegione(nomeRegione(r[10])),
  }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
const REGIONI = new Map(comuni.map((c) => [c.codiceRegione, { codice: c.codiceRegione, nome: c.regione, slug: c.regioneSlug }]));
const comuneByNameProv = new Map(comuni.map((c) => [`${norm(c.nome)}|${c.sigla}`, c]));
// Ripiego per nome nella stessa regione: le fonti a volte usano le sigle delle vecchie province (es. Sardegna).
const comuneByNameReg = new Map();
for (const c of comuni) {
  const k = `${norm(c.nome)}|${c.codiceRegione}`;
  comuneByNameReg.set(k, comuneByNameReg.has(k) ? null : c); // null = ambiguo
}
// Codice catastale → codice ISTAT: l'IPA usa già i nuovi codici dei comuni sardi, l'ISTAT ancora quelli statistici.
const istatByCatastale = new Map(istatRows.filter((r) => /^\d{6}$/.test(r[4]) && r[19]).map((r) => [r[19], r[4]]));
const istatDaIpa = (r) => istatByCatastale.get(r.Codice_catastale_comune) ?? r.Codice_comune_ISTAT;
console.log(`  ${comuni.length} comuni in ${REGIONI.size} regioni`);

// ---------------------------------------------------------------- 2. Amministratori comunali (Viminale)

console.log("2/7 Amministratori comunali (Ministero dell'Interno)");
const AMM_URL = "https://dait.interno.gov.it/documenti/ammcom.csv";
const COMM_URL = "https://dait.interno.gov.it/documenti/organistraordinariincarica.csv";
const ammText = await download("ammcom.csv", AMM_URL);
const ammAggiornato = ammText.match(/Aggiornato al (\d{2}\/\d{2}\/\d{4})/)?.[1];
const amm = csvObjects(ammText, 2);
const commText = await download("organistraordinari.csv", COMM_URL);
const comm = csvObjects(commText, 2);

const nonTrovatiViminale = new Set();
function findComune(nome, sigla, codiceRegione) {
  const c = comuneByNameProv.get(`${norm(nome)}|${sigla}`) ?? comuneByNameReg.get(`${norm(nome)}|${codiceRegione}`);
  if (!c && !nonTrovatiViminale.has(`${nome}|${sigla}`)) {
    nonTrovatiViminale.add(`${nome}|${sigla}`);
    warnGruppo("Comuni del Ministero dell'Interno non trovati nell'elenco ISTAT (fusioni recenti?)", `${nome} (${sigla})`);
  }
  return c ?? undefined;
}


function ruoloComunale(r) {
  const carica = r.descrizione_carica;
  const inc = r.incarico;
  if (carica === "Sindaco") return { ruolo: "Sindaco", gruppo: "sindaco" };
  if (carica.startsWith("Assessore") || inc.includes("Vicesindaco")) {
    if (inc.startsWith("Vicesindaco")) return { ruolo: "Vicesindaco", gruppo: "giunta" };
    return { ruolo: carica.includes("supplente") ? "Assessore supplente" : "Assessore", gruppo: "giunta" };
  }
  if (inc === "Presidente del consiglio") return { ruolo: "Presidente del consiglio comunale", gruppo: "consiglio" };
  if (inc === "Vicepresidente del consiglio") return { ruolo: "Vicepresidente del consiglio comunale", gruppo: "consiglio" };
  if (carica === "Consigliere candidato sindaco") return { ruolo: "Consigliere (candidato sindaco)", gruppo: "consiglio" };
  return { ruolo: carica, gruppo: "consiglio" };
}

/** "dd/mm/yyyy" → "yyyy-mm-dd" (confrontabile come stringa). */
const isoDate = (d) => (d ? d.split("/").reverse().join("-") : "");

const OGGI = new Date().toISOString().slice(0, 10);
/** Età in anni compiuti a oggi, da "dd/mm/yyyy". Pubblichiamo l'età, non la data di nascita. */
function eta(dataNascita) {
  const n = isoDate(dataNascita);
  if (!n) return undefined;
  let anni = Number(OGGI.slice(0, 4)) - Number(n.slice(0, 4));
  if (OGGI.slice(5) < n.slice(5)) anni--;
  return anni > 15 && anni < 110 ? anni : undefined;
}
/** Titolo di studio in forma breve e confrontabile. */
function studio(t) {
  const x = (t ?? "").toLowerCase();
  if (!x) return undefined;
  if (x.includes("post laurea") || x.includes("dottorato") || x.includes("specializzazione")) return "Post-laurea";
  if (x.includes("laurea")) return "Laurea";
  if (x.includes("secondo grado")) return "Diploma";
  if (x.includes("primo grado")) return "Licenza media";
  if (x.includes("elementare") || x.includes("primaria")) return "Licenza elementare";
  return undefined;
}
/** "INGEGNERI, ARCHITETTI E ALTRI…" → "Ingegneri, architetti e altri…" */
const fraseMinuscola = (s) => {
  const t = (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return t ? t[0].toUpperCase() + t.slice(1) : undefined;
};

const amministrazioni = new Map();
for (const r of amm) {
  // I commissari compaiono anche in ammcom: li prendiamo dal file degli organi straordinari.
  if (r.descrizione_carica.startsWith("Commiss")) continue;
  const c = findComune(r.denominazione_comune, r.sigla_provincia, r.codice_regione);
  if (!c) continue;
  const a = amministrazioni.get(c.istat) ?? {
    tipo: "ordinaria",
    dataElezione: r.data_elezione,
    popolazione: Number(r.popolazione_censita_alla_data_elezione) || undefined,
    sindaco: null,
    giunta: [],
    consiglio: [],
    commissari: [],
  };
  const { ruolo, gruppo } = ruoloComunale(r);
  const p = persona({
    nome: titleCase(`${r.nome} ${r.cognome}`),
    ruolo: declina(ruolo, r.sesso),
    dettaglio: formatListe(r["lista_appartenenza/collegamento"]),
    eta: eta(r.data_nascita),
    sesso: r.sesso === "F" || r.sesso === "M" ? r.sesso : undefined,
    studio: studio(r.titolo_studio),
    professione: fraseMinuscola(r.professione),
  });
  // Un assessore può comparire anche come consigliere: lo teniamo in entrambe le liste, come nella fonte.
  if (gruppo === "sindaco") {
    a.sindaco = p;
    a._ingressoSindaco = isoDate(r.data_entrata_in_carica);
  } else a[gruppo].push(p);
  amministrazioni.set(c.istat, a);
}
for (const r of comm) {
  const c = findComune(r.denominazione_comune, r.sigla_provincia, r.codice_regione);
  if (!c) continue;
  const a = amministrazioni.get(c.istat) ?? { sindaco: null, giunta: [], consiglio: [], commissari: [] };
  // La fonte a volte conserva commissioni già concluse: se c'è un sindaco entrato in carica dopo, vale il sindaco.
  if (a.sindaco && a._ingressoSindaco > isoDate(r.data_entrata_in_carica)) continue;
  a.tipo = "commissariata";
  a.dataCommissariamento = r.data_entrata_in_carica;
  a.commissari.push(persona({ nome: titleCase(`${r.nome} ${r.cognome}`), ruolo: r.descrizione_carica }));
  amministrazioni.set(c.istat, a);
}
const rankGiunta = (p) => (p.ruolo === "Vicesindaco" ? 0 : 1);
const rankConsiglio = (p) => (p.ruolo.startsWith("Presidente") ? 0 : p.ruolo.startsWith("Vicepresidente") ? 1 : 2);
for (const a of amministrazioni.values()) {
  delete a._ingressoSindaco;
  a.giunta.sort((x, y) => rankGiunta(x) - rankGiunta(y) || x.nome.localeCompare(y.nome, "it"));
  a.consiglio.sort((x, y) => rankConsiglio(x) - rankConsiglio(y) || x.nome.localeCompare(y.nome, "it"));
}
chiudiAvvisi();
console.log(`  ${amministrazioni.size} amministrazioni (aggiornate al ${ammAggiornato})`);

// ---------------------------------------------------------------- 2b. Contatti dei Comuni, frazioni e CAP

console.log("2b/7 Contatti dei Comuni (IPA), frazioni (ISTAT) e CAP (Wikidata)");
const istatTutti = new Set(comuni.map((c) => c.istat));

// Indice delle Pubbliche Amministrazioni: PEC e sito istituzionale di ogni Comune.
// Pubblichiamo solo la PEC e il sito: gli altri indirizzi email a volte sono di singoli dipendenti.
const IPA_URL = "https://indicepa.gov.it/ipa-dati/datastore/dump/d09adf99-dc10-4349-8c53-27b1e5aa97b6?format=csv";
const ipa = csvObjects(await download("ipa-enti.csv", IPA_URL), 0, ",").filter(
  (r) => r.Codice_Categoria === "L6" && istatTutti.has(istatDaIpa(r)),
);
for (const r of ipa) r.Codice_comune_ISTAT = istatDaIpa(r);
const contattiByIstat = new Map();
for (const r of ipa) {
  const pec = [1, 2, 3, 4, 5].map((i) => (r[`Tipo_Mail${i}`] === "Pec" ? r[`Mail${i}`] : "")).find(Boolean);
  let sito = r.Sito_istituzionale?.trim();
  if (sito && !/^https?:\/\//i.test(sito)) sito = `https://${sito}`;
  contattiByIstat.set(
    r.Codice_comune_ISTAT,
    persona({
      pec: pec?.toLowerCase(),
      sito,
      indirizzo: r.Indirizzo
        ? `${r.Indirizzo === r.Indirizzo.toUpperCase() ? titleCase(r.Indirizzo, { minori: true }) : r.Indirizzo}${r.CAP ? `, ${r.CAP}` : ""}`
        : undefined,
      aggiornato: r.Data_aggiornamento?.split("-").reverse().join("/"),
    }),
  );
}
for (const c of comuni) if (!contattiByIstat.has(c.istat)) warnGruppo("Comuni senza contatti nell'IPA", `${c.nome} (${c.istat})`);
chiudiAvvisi();

// Uffici dei Comuni (unità organizzative IPA): per ogni tipo di problema, l'ufficio giusto con telefono ed email.
// Pubblichiamo solo contatti d'ufficio: niente nomi dei responsabili, niente email personali o per le fatture.
const OU_URL =
  "https://indicepa.gov.it/ipa-dati/dataset/7a2db7d8-4123-41b4-a1d6-d7b712a193f1/resource/4740588c-eb09-4ce8-92b0-86626508ad49/download/ou.txt";
const istatByIpa = new Map(ipa.map((r) => [r.Codice_IPA, r.Codice_comune_ISTAT]));
// Per ogni voce della guida: parole del nome dell'ufficio in ordine di precisione (il primo livello vince) e parole da escludere.
const CATEGORIE_UFFICI = [
  { voce: "anagrafe", livelli: [/anagraf|demograf/i, /stato civile|elettoral/i] },
  { voce: "tributi", livelli: [/tribut/i, /entrate|fiscalit/i] },
  { voce: "rifiuti", livelli: [/rifiut|igiene urbana|nettezza/i, /ecolog|ambient/i] },
  { voce: "sociale", livelli: [/servizi sociali|politiche sociali|welfare|fasce deboli|protezione sociale/i, /\bsocial[ei]\b/i], escludi: /housing|edilizia/i },
  {
    voce: "scuola-infanzia",
    livelli: [/pubblica istruzione|servizi scolastici|refezione|\bmens[ae]\b|\basil|\bnid[io]\b|politiche educative/i, /istruzion|scolast/i],
    escludi: /edilizia/i,
  },
  { voce: "polizia", livelli: [/polizia (locale|municipale)|vigili/i, /polizia/i] },
  { voce: "strade", livelli: [/\bstrad/i, /viabilit/i, /lavori pubblici|ll\.?\s?pp/i, /manutenz|tecnic/i], escludi: /^\s*(polizia|vigili|patrimonio)|patrimonio edilizio|edilizia scolastica/i },
  { voce: "verde", livelli: [/verde|illumin/i, /manutenz|lavori pubblici|ll\.?\s?pp/i, /tecnic/i] },
];
const PAROLE_UFFICIO = /uff|serv|protocollo|tribut|anagraf|demograf|polizia|pm|vigil|ambient|igiene|lavori|tecnic|social|segreter|info|comune|entrate|urbanist|scuol|istruz|suap|patrimonio|ragioner|protezione|rifiut|manutenz|personale|elettoral|statocivile|cultura|sport/i;
function emailUfficio(mail, mailResp) {
  const m = (mail ?? "").trim().toLowerCase();
  if (!m || m === "null" || !m.includes("@")) return undefined;
  // fatture, gare d'appalto e indirizzi del responsabile non servono a un cittadino
  if (/fattur|sdi|efattura|committenza|appalt|gare|contratti/.test(m) || m === (mailResp ?? "").trim().toLowerCase()) return undefined;
  const locale = m.split("@")[0];
  // "nome.cognome@..." senza parole d'ufficio: è l'indirizzo di una persona, non lo pubblichiamo
  if (/^[a-z]+[._][a-z]+\d*$/.test(locale) && !PAROLE_UFFICIO.test(locale)) return undefined;
  return m;
}
const telefono = (t) => {
  const d = (t ?? "").replace(/[^\d]/g, "");
  return d.length >= 6 && d.length <= 11 ? d : undefined;
};
/** "LAVORI PUBBLICI - EDILIZIA PUBBLICA (...) - ..." → "Lavori Pubblici": la prima parte, leggibile. */
function nomeBreveUfficio(n) {
  let t = n.replace(/_/g, " ").split(/\s+-\s+/)[0].replace(/\s+/g, " ").trim();
  const lettere = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (lettere && lettere.replace(/[^A-ZÀ-Þ]/g, "").length / lettere.length > 0.6) t = titleCase(t, { minori: true });
  t = t.replace(/\bll\.?\s?pp\.?(?=\s|$)/gi, "Lavori Pubblici").replace(/\bpp\.?\s?mm\.?(?=\s|$)/gi, "Polizia Municipale");
  return t.length > 70 ? `${t.slice(0, 68)}…` : t;
}
const ouText = await download("ipa-uffici.txt", OU_URL);
const ufficiByIstat = new Map();
for (const r of csvObjects(ouText.replace(/^\uFEFF/, ""), 0, "\t")) {
  const istat = istatByIpa.get(r.cod_amm);
  if (!istat) continue;
  const nomeUff = r.des_ou?.trim();
  if (!nomeUff || /fattura|transizione al digitale|e-government/i.test(nomeUff)) continue;
  const mails = [1, 2, 3].map((i) => ({ m: emailUfficio(r[`mail${i}`], r.mail_resp), pec: r[`tipo_mail${i}`] === "Pec" }));
  const uff = persona({
    nome: nomeBreveUfficio(nomeUff),
    tel: telefono(r.Tel),
    email: mails.find((x) => x.m && !x.pec)?.m,
    pec: mails.find((x) => x.m && x.pec)?.m,
  });
  if (!uff.tel && !uff.email && !uff.pec) continue;
  const voci = ufficiByIstat.get(istat) ?? {};
  for (const { voce, livelli, escludi } of CATEGORIE_UFFICI) {
    if (escludi?.test(nomeUff)) continue;
    const livello = livelli.findIndex((re) => re.test(nomeUff));
    if (livello < 0) continue;
    // più è preciso il nome, più conta; a parità, vince chi ha più contatti
    const punti = (livelli.length - livello) * 10 + (uff.tel ? 2 : 0) + (uff.email ? 1 : 0) + (uff.pec ? 1 : 0);
    if (!voci[voce] || punti > voci[voce]._punti) voci[voce] = { ...uff, _punti: punti };
  }
  ufficiByIstat.set(istat, voci);
}
for (const voci of ufficiByIstat.values()) for (const v of Object.values(voci)) delete v._punti;
console.log(`  Uffici specifici per ${[...ufficiByIstat.values()].filter((v) => Object.keys(v).length).length} comuni`);

// ASL di ogni comune: abbinamento ufficiale del Ministero della Salute ("Corrispondenze ASL-Comuni"), tutta Italia.
// PEC e sito vengono dall'ente ASL nell'IPA: abbinamento automatico per nome, più i casi scritti a mano.
const SALUTE_URL = "https://www.dati.salute.gov.it/sites/default/files/2026-05/ASL_comuni_popolazione_2024.csv";
const saluteRows = parseCsv(new TextDecoder("windows-1252").decode(await download("salute-asl-comuni.csv", SALUTE_URL, { binary: true }))).slice(1);
const aslPerComune = new Map(); // istat → ["reg|NOME ASL", ...] (Roma ne ha più di una)
for (const r of saluteRows) {
  if (!/^\d{6}$/.test(r[5] ?? "")) continue;
  const reg = r[1].slice(0, 2) === "04" ? "04" : r[1].slice(0, 2); // 041 e 042: province autonome
  const k = `${reg}|${r[4].trim()}`;
  const l = aslPerComune.get(r[5]) ?? [];
  if (!l.includes(k)) l.push(k);
  aslPerComune.set(r[5], l);
}
const aslManuali = JSON.parse(fs.readFileSync(path.join(MANUAL, "asl-ipa.json"), "utf8")).asl;
const ipaAsl = csvObjects(await download("ipa-enti.csv", IPA_URL), 0, ",").filter((r) => r.Codice_Categoria === "L7");
const ipaAslByCod = new Map(ipaAsl.map((r) => [r.Codice_IPA, r]));
const regioneDiIstat = new Map(comuni.map((c) => [c.istat, c.codiceRegione]));
const PAROLE_ASL = new Set("AZIENDA SANITARIA LOCALE LOCALI ASL USL AUSL ULSS ASP ATS AST ASU AS ASM A S L P DI DELLA DEL DELL N UNITA PROVINCIALE TERRITORIALE REGIONALE SOCIO DEI DEGLI E UNICA".split(" "));
const paroleAsl = (t) => norm(t).split(" ").filter((w) => w && !PAROLE_ASL.has(w));
function enteAsl(chiave) {
  if (aslManuali[chiave]) return ipaAslByCod.get(aslManuali[chiave]);
  const [reg, nome] = chiave.split("|");
  const cerca = paroleAsl(nome);
  let migliore;
  for (const r of ipaAsl) {
    const regEnte = regioneDiIstat.get(istatDaIpa(r));
    if (regEnte !== reg && !(reg === "04" && regEnte === "04")) continue;
    const parole = new Set(paroleAsl(r.Denominazione_ente));
    if (cerca.length && cerca.every((w) => parole.has(w))) migliore ??= r;
  }
  return migliore;
}
/** "Azienda Sanitaria Locale Napoli 2 Nord" → "ASL Napoli 2 Nord" */
const nomeBreveAsl = (n) => {
  const t = n === n.toUpperCase() ? titleCase(n, { minori: true }) : n;
  return t
    .replace(/^Azienda Socio[ -]Sanitaria Locale (di |della |dell')?/i, "ASL ")
    .replace(/^Azienda Sanitaria Locale (di |della )?/i, "ASL ")
    .replace(/^Azienda Sanitaria Provinciale (di )?/i, "ASP ")
    .replace(/^Azienda Unita' Sanitaria Locale (di )?/i, "AUSL ")
    .replace(/^Agenzia di Tutela della Salute (di |della |dell')?/i, "ATS ")
    .replace(/\s+-\s+Suedtiroler Sanitaetsbetrieb$/i, "")
    .trim();
};
const schedaAsl = new Map();
function aslDaChiave(chiave) {
  if (schedaAsl.has(chiave)) return schedaAsl.get(chiave);
  const r = enteAsl(chiave);
  if (!r) warnGruppo("ASL senza ente IPA (solo il nome, senza PEC e sito)", chiave);
  const pec = r && [1, 2, 3, 4, 5].map((i) => (r[`Tipo_Mail${i}`] === "Pec" ? r[`Mail${i}`] : "")).find(Boolean);
  const sito = r?.Sito_istituzionale?.trim();
  const out = persona({
    nome: r ? nomeBreveAsl(r.Denominazione_ente) : titleCase(chiave.split("|")[1], { minori: true }),
    sito: sito ? `https://${sito.replace(/^https?:\/\//, "")}` : undefined,
    pec: pec?.toLowerCase(),
  });
  schedaAsl.set(chiave, out);
  return out;
}
const aslDiComune = (c) => {
  const chiavi = aslPerComune.get(c.istat);
  if (!chiavi?.length) {
    warnGruppo("Comuni senza ASL nel file del Ministero della Salute", `${c.nome} (${c.istat})`);
    return null;
  }
  if (chiavi.length === 1) return aslDaChiave(chiavi[0]);
  // comuni divisi tra più ASL (Roma): l'ASL dipende dal quartiere
  const nomi = chiavi.map((k) => aslDaChiave(k).nome);
  return { nome: `${nomi.slice(0, -1).join(", ")} o ${nomi.at(-1)}, secondo il quartiere` };
};
console.log(`  ${contattiByIstat.size} Comuni con contatti ufficiali`);

// Località abitate del Censimento 2021 (ISTAT): servono a trovare il comune partendo dalla frazione.
const LOC_URL = "https://www.istat.it/storage/cartografia/basi_territoriali/2021/LocalitaPuntuali_21.zip";
const locFile = path.join(RAW, "localita-2021.csv");
if (REFRESH || !fs.existsSync(locFile)) {
  const zip = new AdmZip(await download("localita-2021.zip", LOC_URL, { binary: true }));
  const entry = zip.getEntries().find((e) => e.entryName.endsWith(".csv"));
  fs.writeFileSync(locFile, entry.getData().toString("latin1"));
}
const frazioniByIstat = new Map();
const nomeComune = new Map(comuni.map((c) => [c.istat, norm(c.nome)]));
for (const r of csvObjects(fs.readFileSync(locFile, "utf8"), 0, "\t")) {
  // 1 = centro abitato, 2 = nucleo abitato; escludiamo le case sparse e le località minuscole.
  if (!["1", "2"].includes(r.TIPO_LOC) || Number(r.POP21) < 100) continue;
  const istat = r.PRO_COM.padStart(6, "0");
  if (!istatTutti.has(istat) || norm(r.NOME) === nomeComune.get(istat)) continue;
  (frazioniByIstat.get(istat) ?? frazioniByIstat.set(istat, []).get(istat)).push({ nome: r.NOME, pop: Number(r.POP21) });
}
for (const [k, v] of frazioniByIstat)
  frazioniByIstat.set(k, [...new Map(v.sort((a, b) => b.pop - a.pop).map((f) => [norm(f.nome), f.nome])).values()].slice(0, 30));
console.log(`  ${[...frazioniByIstat.values()].flat().length} frazioni e località in ${frazioniByIstat.size} comuni`);

// CAP da Wikidata (CC0): l'ISTAT non li pubblica. Le grandi città ne hanno più di uno.
const capQuery = `SELECT ?istat ?cap WHERE { ?c wdt:P635 ?istat; wdt:P281 ?cap. }`;
const capText = await download(
  "wikidata-cap-italia.csv",
  `https://query.wikidata.org/sparql?${new URLSearchParams({ query: capQuery })}`,
  { headers: { Accept: "text/csv" } },
);
const capByIstat = new Map();
for (const r of csvObjects(capText, 0, ",")) {
  if (!istatTutti.has(r.istat)) continue;
  for (const cap of r.cap.match(/\d{5}/g) ?? []) (capByIstat.get(r.istat) ?? capByIstat.set(r.istat, new Set()).get(r.istat)).add(cap);
}
// Il CAP della sede comunale (IPA) completa i comuni che su Wikidata non lo hanno.
for (const r of ipa) if (/^\d{5}$/.test(r.CAP)) (capByIstat.get(r.Codice_comune_ISTAT) ?? capByIstat.set(r.Codice_comune_ISTAT, new Set()).get(r.Codice_comune_ISTAT)).add(r.CAP);
console.log(`  CAP per ${capByIstat.size} comuni`);

// ---------------------------------------------------------------- 3. Collegi elettorali (ISTAT)

console.log("3/7 Collegi elettorali ISTAT");
/** Circoscrizione senza la parte bilingue: "TRENTINO-ALTO ADIGE/SÜDTIROL" → "TRENTINO-ALTO ADIGE". */
const chiaveCirc = (s) => s.split("/")[0].trim().toUpperCase();
const chiaveCollegio = (s) => {
  const [circ, cod] = s.split(" - ");
  return `${chiaveCirc(circ)} - ${cod.trim()}`;
};
const COLLEGI_URL =
  "https://www.istat.it/storage/Basi%20Geografiche%202022/Collegi_Elettorali_BasiGeografiche.zip";
const dbfFile = path.join(RAW, "UT_Collegi2020.dbf");
if (REFRESH || !fs.existsSync(dbfFile)) {
  const zipBuf = await download("collegi.zip", COLLEGI_URL, { binary: true });
  const entry = new AdmZip(zipBuf).getEntries().find((e) => e.entryName.endsWith("UT_Collegi2020.dbf"));
  fs.writeFileSync(dbfFile, entry.getData());
}
// Il DBF dei collegi è in UTF-8 (nomi bilingui come "Trentino-Alto Adige/Südtirol").
const ut = readDbf(fs.readFileSync(dbfFile), "utf8");
const collegiByComune = new Map();
for (const r of ut) {
  const istat = r.PRO_COM.padStart(6, "0");
  const circ = chiaveCirc(r.CIRC_DEN);
  const reg = REGIONI.get(String(r.COD_REG).padStart(2, "0"))?.nome.toUpperCase() ?? circ;
  const k = collegiByComune.get(istat) ?? {
    cameraU: new Set(),
    cameraP: new Set(),
    senatoU: new Set(),
    senatoP: new Set(),
    quartieri: {},
  };
  const cameraU = `${circ} - ${r.CU20_C1}`;
  k.cameraU.add(cameraU);
  k.cameraP.add(`${circ} - ${r.CP20_C1}`);
  // i codici dei collegi del Senato si ripetono in ogni regione: li prefissiamo con la regione
  k.senatoU.add(`${reg} - ${r.SU20_C1}`);
  k.senatoP.add(`${reg} - ${r.SP20_C1}`);
  // Nei comuni grandi l'ISTAT divide il territorio in quartieri/aree sub-comunali: ci dicono quale collegio è di chi.
  if (r.ASC_NOME) {
    for (const key of [cameraU, `${reg} - ${r.SU20_C1}`]) (k.quartieri[key] ??= []).push(r.ASC_NOME);
  }
  collegiByComune.set(istat, k);
}
console.log(`  ${collegiByComune.size} comuni con collegi`);

// ---------------------------------------------------------------- 4. Camera e Senato (open data)

console.log("4/7 Deputati (dati.camera.it) e senatori (dati.senato.it)");
const deputatiRows = await sparql(
  "camera-deputati-italia.json",
  "https://dati.camera.it/sparql",
  `PREFIX ocd: <http://dati.camera.it/ocd/>
   PREFIX dc: <http://purl.org/dc/elements/1.1/>
   PREFIX foaf: <http://xmlns.com/foaf/0.1/>
   PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
   SELECT DISTINCT ?d ?nome ?cognome ?label ?lista ?tipo ?genere WHERE {
     ?m a ocd:mandatoCamera; ocd:rif_leg <http://dati.camera.it/ocd/legislatura.rdf/repubblica_19>;
        ocd:rif_deputato ?d; ocd:rif_elezione ?e.
     FILTER NOT EXISTS { ?m ocd:endDate ?fine }
     ?d foaf:firstName ?nome; foaf:surname ?cognome. OPTIONAL { ?d foaf:gender ?genere }
     ?e rdfs:label ?label. OPTIONAL { ?e ocd:lista ?lista } OPTIONAL { ?e ocd:tipoElezione ?tipo }
   }`,
);
const deputatiPerCollegio = {};
for (const r of deputatiRows) {
  // es. "Eletto nel collegio uninominale di CAMPANIA 1 - U02 (CAMPANIA 1 - P01) ..." oppure "...circoscrizione EMILIA-ROMAGNA - P02 ..."
  const m = r.label.match(/(?:uninominale di|circoscrizione)\s+(.+? - [UP]\d{2})/);
  if (!m) {
    // eletti all'estero: non hanno un collegio sul territorio
    if (!/circoscrizione (EUROPA|AMERICA|AFRICA)/.test(r.label)) warn(`Collegio non riconosciuto per ${r.nome} ${r.cognome}: ${r.label}`);
    continue;
  }
  const collegio = chiaveCollegio(m[1].trim());
  const id = r.d.match(/d(\d+)_19/)?.[1];
  const uninominale = collegio.includes(" - U");
  (deputatiPerCollegio[collegio] ??= []).push(
    persona({
      nome: titleCase(`${r.nome} ${r.cognome}`),
      ruolo: declina(uninominale ? "Deputato eletto nel collegio della tua zona" : "Deputato eletto con le liste dei partiti", r.genere === "female" ? "F" : "M"),
      dettaglio: formatListe(r.lista),
      url: id ? `https://www.camera.it/deputati/elenco/19-${id}` : r.d,
      // la Camera non pubblica le email: ogni deputato si contatta con il modulo ufficiale
      modulo: id ? `https://scrivi.camera.it/scrivi?dest=deputato&id_aul=${id}` : undefined,
      fonteUrl: r.d.replace("http://", "https://"),
    }),
  );
}
for (const l of Object.values(deputatiPerCollegio)) l.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
console.log(`  ${deputatiRows.length} deputati in carica, ${Object.keys(deputatiPerCollegio).length} collegi`);

const senatoriRows = await sparql(
  "senato-senatori.json",
  "https://dati.senato.it/sparql",
  `PREFIX osr: <http://dati.senato.it/osr/>
   PREFIX foaf: <http://xmlns.com/foaf/0.1/>
   SELECT DISTINCT ?s ?nome ?cognome ?tipo ?genere WHERE {
     ?s a osr:Senatore; foaf:firstName ?nome; foaf:lastName ?cognome; osr:mandato ?m.
     OPTIONAL { ?s foaf:gender ?genere }
     ?m osr:legislatura 19; osr:regioneElezione ?reg; osr:tipoElezione ?tipo.
     FILTER NOT EXISTS { ?m osr:fine ?fine }
     FILTER(CONTAINS(STR(?reg), "${REGIONE.nome}"))
   }`,
);
const senUni = JSON.parse(fs.readFileSync(path.join(MANUAL, "senato-uninominali.json"), "utf8")).collegi;
const senatoriEmail = JSON.parse(fs.readFileSync(path.join(MANUAL, "senatori-email.json"), "utf8")).email;
const senatoreById = new Map();
for (const r of senatoriRows) {
  const id = r.s.split("/").pop();
  senatoreById.set(
    id,
    persona({
      nome: `${r.nome} ${r.cognome}`,
      ruolo: declina(
        r.tipo.toLowerCase().includes("uninominale") ? "Senatore eletto nel collegio della tua zona" : "Senatore eletto con le liste dei partiti",
        /^f/i.test(r.genere ?? "") ? "F" : "M",
      ),
      url: `https://www.senato.it/composizione/senatori/elenco-alfabetico/scheda-attivita?did=${id}`,
      email: senatoriEmail[id],
      fonteUrl: r.s.replace("http://", "https://"),
      _id: id,
      _uninominale: r.tipo.toLowerCase().includes("uninominale"),
    }),
  );
}
for (const id of senatoreById.keys()) if (!senatoriEmail[id]) warn(`Email mancante per il senatore ${id} in data/manual/senatori-email.json`);
const senatoUninominali = {};
for (const [collegio, id] of Object.entries(senUni)) {
  const s = senatoreById.get(id);
  if (!s) warn(`Senatore ${id} del collegio ${collegio} non risulta in carica`);
  else senatoUninominali[`${REGIONE.nome.toUpperCase()} - ${collegio}`] = s;
}
const senatoProporzionale = [...senatoreById.values()]
  .filter((s) => !s._uninominale)
  .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
const strip = ({ _id, _uninominale, ...p }) => (void _id, void _uninominale, p);
console.log(`  ${senatoriRows.length} senatori eletti in ${REGIONE.nome}`);

// ---------------------------------------------------------------- 5. Regione (Consiglio + Giunta)

console.log("5/7 Consiglio e Giunta regionale");
const CR_BASE = "https://www.cr.campania.it";
const consHtml = await download("cr-consiglieri.html", `${CR_BASE}/consiglio-regionale/consiglieri`);
const consLinks = [
  ...new Map(
    [...consHtml.matchAll(/href="(\/scheda-personale\/consigliere\/[^"]+?\?username=([^&"]+)&amp;id_tipo_carica=\d+)"/g)].map(
      (m) => [m[2], m[1].replace(/&amp;/g, "&")],
    ),
  ),
];
const circManual = JSON.parse(
  fs.readFileSync(path.join(MANUAL, "consiglieri-regionali-circoscrizione.json"), "utf8"),
).consiglieri;

function campo(lines, label) {
  const i = lines.findIndex((l) => l.startsWith(label));
  if (i < 0) return undefined;
  const inline = lines[i].slice(label.length).trim();
  return inline || lines[i + 1];
}

// Sesso dei consiglieri regionali dall'anagrafe del Ministero dell'Interno (per declinare "Consigliera").
const ammregTutte = csvObjects(await download("ammreg.csv", "https://dait.interno.gov.it/documenti/ammreg.csv"), 2);
const ammregAggiornato = ammregTutte.length ? (fs.readFileSync(path.join(RAW, "ammreg.csv"), "utf8").match(/Aggiornato al (\d{2}\/\d{2}\/\d{4})/)?.[1]) : undefined;
const ammreg = ammregTutte.filter((r) => r.codice_regione === REGIONE.codice);
const chiaveNomeCons = (s) => norm(s).split(" ").filter(Boolean).sort().join(" ");
const sessoRegionale = new Map(ammreg.map((r) => [chiaveNomeCons(`${r.nome} ${r.cognome}`), r.sesso]));

const consiglieri = [];
for (const [username, href] of consLinks) {
  const name = decodeURIComponent(href.match(/consigliere\/([^?]+)/)[1]).replace(/\s+/g, " ").trim();
  const file = `cr-${username.replace(/[^A-Z0-9.]/gi, "_")}.html`;
  const cached = fs.existsSync(path.join(RAW, file));
  const html = await download(file, CR_BASE + encodeURI(decodeURI(href)));
  if (!cached || REFRESH) await sleep(300);
  const lines = htmlText(html);
  const inizioCommissioni = lines.indexOf("Cariche in commissione");
  // "Presidente in: Sanità e Sicurezza Sociale" → "Sanità e Sicurezza Sociale (presidente)"; nome breve della commissione.
  const commissioni = (inizioCommissioni < 0 ? [] : lines.slice(inizioCommissioni))
    .map((l) => l.match(/^(\S+(?:\s\S+)?)\s+in:\s+(.+)$/))
    .filter(Boolean)
    .map(([, ruolo, comm]) => {
      const breve = comm.split(/\s+-\s+|\.\s|,\s/)[0].replace(/\.$/, "").trim();
      return /^componente$/i.test(ruolo) ? breve : `${breve} (${ruolo.toLowerCase().replace("vice ", "vice")})`;
    });
  const gruppoRaw = campo(lines, "Gruppo consiliare:");
  const gruppoMatch = gruppoRaw?.match(/^(.+?)\s+in:\s+(.+)$/);
  const gruppo = gruppoMatch
    ? /^componente$/i.test(gruppoMatch[1])
      ? gruppoMatch[2]
      : `${gruppoMatch[2]} (${gruppoMatch[1].toLowerCase().replace("vice capogruppo", "vicecapogruppo")})`
    : gruppoRaw;
  const partito = campo(lines, "Partito:");
  const mostraPartito = partito && !(gruppo && norm(gruppo).startsWith(norm(partito)));
  const circ = circManual[username];
  if (circ === undefined) warn(`Consigliere regionale senza circoscrizione nel file manuale: ${username}`);
  // nome sul sito: "Cognome Nome" → "Nome Cognome" (cognomi composti: usiamo lo username per capire dove finisce)
  const parts = name.split(" ");
  const cognomeLen = Math.max(1, parts.findIndex((p) => norm(p).startsWith(username.split(".")[1].slice(0, 3))));
  const nome = titleCase([...parts.slice(cognomeLen), ...parts.slice(0, cognomeLen)].join(" "));
  consiglieri.push(
    persona({
      nome,
      ruolo: circ === "PRESIDENTE" ? "Presidente della Regione" : declina("Consigliere regionale", sessoRegionale.get(chiaveNomeCons(nome))),
      dettaglio:
        [gruppo && `Gruppo: ${gruppo}`, mostraPartito && `Partito: ${titleCase(partito, { minori: true })}`]
          .filter(Boolean)
          .join(" · ") || undefined,
      email: campo(lines, "Email:"),
      pec: campo(lines, "PEC:"),
      tel: campo(lines, "Telefono:"),
      commissioni: commissioni.length ? commissioni : undefined,
      url: CR_BASE + href,
      circoscrizione: circ === "PRESIDENTE" ? undefined : (circ ?? null),
      username,
      gruppo: gruppoMatch ? gruppoMatch[2] : gruppoRaw,
      ruoloGruppo: gruppoMatch && !/^componente$/i.test(gruppoMatch[1]) ? gruppoMatch[1].toLowerCase().replace("vice capogruppo", "vicecapogruppo") : undefined,
    }),
  );
}
// Coalizione e colore di ogni gruppo (file curato a mano): servono per l'emiciclo.
const gruppiManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari.json"), "utf8")).gruppi;
for (const c of consiglieri)
  if (c.gruppo && !gruppiManual[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari.json: ${c.gruppo}`);
consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
console.log(`  ${consiglieri.length} consiglieri regionali`);

const GIUNTA_URL = "https://www.regione.campania.it/regione/la-giunta-regionale";
const giuntaHtml = await download("regione-giunta.html", GIUNTA_URL);
const gl = htmlText(giuntaHtml);
const giunta = [];
for (let i = 0; i < gl.length; i++) {
  if (gl[i] === "Vedi dettaglio" && i >= 2) giunta.push({ nome: gl[i - 2], deleghe: gl[i - 1] });
}
if (!giunta.length) warn("Giunta regionale: nessun componente trovato (cambiato il sito?)");
const presidente = giunta.find((g) => /^Presidente/i.test(g.deleghe));
const regione = {
  nome: REGIONE.nome,
  presidente: presidente
    ? { ...(consiglieri.find((c) => c.ruolo === "Presidente della Regione") ?? {}), nome: presidente.nome, ruolo: "Presidente della Regione", url: GIUNTA_URL }
    : null,
  giunta: giunta
    .filter((g) => g !== presidente)
    .map((g) =>
      persona({
        nome: g.nome,
        ruolo: /^Vice Presidente/i.test(g.deleghe) ? "Vicepresidente e assessore" : "Assessore",
        dettaglio: g.deleghe.replace(/^Vice Presidente\s*-\s*/i, ""),
        url: GIUNTA_URL,
      }),
    ),
  consiglieri: consiglieri.filter((c) => c.ruolo !== "Presidente della Regione"),
  gruppi: Object.entries(gruppiManual).map(([nome, g]) => ({ nome, ...g })),
};

// ---------------------------------------------------------------- 5b. Attività del Consiglio regionale

console.log("5b/7 Atti e leggi del Consiglio regionale");
const LEGISLATURA = "12";
const INIZIO_LEGISLATURA = "2025-11-23"; // data delle elezioni regionali
const TIPI_ATTO = [
  { id: "pdl", path: "progetti-legge", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "interrogazione", path: "interrogazioni-presentate", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "question-time", path: "question_time", nome: "Question time", plurale: "Question time" },
  { id: "mozione", path: "mozioni", nome: "Mozione", plurale: "Mozioni" },
  { id: "risoluzione", path: "risoluzioni", nome: "Risoluzione", plurale: "Risoluzioni" },
];

const decodeHtml = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** Righe delle viste Drupal del sito del Consiglio: { etichetta: valore, link }. */
function parseViewRows(html) {
  const rows = [];
  for (const [, li] of html.matchAll(/<li class="views-row[^"]*">([\s\S]*?)<\/li>/g)) {
    const row = {};
    for (const [, field] of li.matchAll(/<div class="views-field[^"]*">([\s\S]*?)<\/div>/g)) {
      const label = field.match(/class="views-label[^"]*">([\s\S]*?)<\/(?:strong|span)>/);
      const value = field.match(/class="field-content">([\s\S]*?)<\/(?:span|div)>/);
      const href = field.match(/href="([^"]+)"/);
      if (label) row[decodeHtml(label[1]).replace(/[:.]+$/, "").trim()] = value ? decodeHtml(value[1]) : "";
      else if (href) row.link = href[1].replace(/&amp;/g, "&");
    }
    if (Object.keys(row).length > 1) rows.push(row);
  }
  return rows;
}

const ultimaPagina = (html) => Math.max(0, ...[...html.matchAll(/[?&;]page=(\d+)/g)].map((m) => Number(m[1])));

async function paginaCr(file, url) {
  const cached = fs.existsSync(path.join(RAW, file));
  // Le viste del Consiglio senza alias rispondono 404 ma con la pagina corretta.
  const html = await download(file, url, { accetta404: true });
  if (!cached || REFRESH) await sleep(300);
  return html;
}

// Firmatari → consiglieri: confronto sull'insieme delle parole del nome ("CIRO  BUONAJUTO" = "Ciro Buonajuto").
const chiaveNome = (s) => norm(s).split(" ").filter(Boolean).sort().join(" ");
const consigliereByNome = new Map(consiglieri.map((c) => [chiaveNome(c.nome), c.username]));
const dataIso = (d) => d.split("/").reverse().join("-");
const ESITO = /\s+((?:NON\s+)?APPROVAT[AO]|RESPINT[AO]|RITIRAT[AO]|DECADUT[AO])\b(.*)$/i;

/** "NON APPROVATA CR 29 GIUGNO 2026" → { esito: "non-approvata", esitoData: "29 giugno 2026" } */
function esito(m) {
  if (!m) return {};
  const parola = m[1].toLowerCase().replace(/\s+/g, " ");
  const tipo = parola.startsWith("non") ? "non-approvata" : parola.startsWith("approvat") ? "approvata" : parola.startsWith("respint") ? "respinta" : parola.startsWith("ritirat") ? "ritirata" : "decaduta";
  const data = m[2].match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i);
  return { esito: tipo, esitoData: data ? `${Number(data[1])} ${data[2].toLowerCase()} ${data[3]}` : undefined };
}

const atti = [];
for (const tipo of TIPI_ATTO) {
  const base = `${CR_BASE}/scheda-personale/consigliere/attivita-consigliere/${tipo.path}?id_legislatura=${LEGISLATURA}`;
  const prima = await paginaCr(`cr-atti-${tipo.id}-0.html`, base);
  const n = ultimaPagina(prima);
  for (let p = 0; p <= n; p++) {
    const html = p === 0 ? prima : await paginaCr(`cr-atti-${tipo.id}-${p}.html`, `${base}&page=${p}`);
    for (const r of parseViewRows(html)) {
      const numero = r.numero ?? r.num;
      if (!numero || !r.data || !r.titolo) continue;
      const esitoMatch = r.titolo.match(ESITO);
      const firmatari = (r.firmatari ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
        .map((f) => {
          const username = consigliereByNome.get(chiaveNome(f));
          return username ? { nome: titleCase(f), username } : { nome: titleCase(f) };
        });
      const merito = r.categoria?.match(/Assegnato per Merito\s*:\s*([^.,]+)/i)?.[1]?.trim();
      atti.push(
        persona({
          id: `${tipo.id}-${numero}`,
          tipo: tipo.id,
          numero: Number(numero),
          data: dataIso(r.data),
          titolo: esitoMatch ? r.titolo.slice(0, esitoMatch.index).trim() : r.titolo,
          ...esito(esitoMatch),
          commissione: merito,
          firmatari,
          url: r.link ? CR_BASE + r.link : undefined,
        }),
      );
    }
  }
}
// La stessa scheda può comparire su più pagine se nel frattempo ne arrivano di nuove: teniamo la prima.
const attiUnici = [...new Map(atti.map((a) => [a.id, a])).values()]
  .filter((a) => a.data >= INIZIO_LEGISLATURA)
  .sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
const nonAttribuiti = new Set(attiUnici.flatMap((a) => a.firmatari.filter((f) => !f.username).map((f) => f.nome)));
if (nonAttribuiti.size) warn(`Firmatari non riconosciuti tra i consiglieri: ${[...nonAttribuiti].join(", ")}`);
console.log(`  ${attiUnici.length} atti della XII legislatura`);

// Leggi regionali approvate nella legislatura in corso.
const leggi = [];
for (let p = 0; p < 20; p++) {
  const html = await paginaCr(`cr-leggi-${p}.html`, `${CR_BASE}/leggi-progetti/leggi-regolamenti${p ? `?page=${p}` : ""}`);
  const rows = parseViewRows(html);
  const recenti = rows.filter((r) => r.data && dataIso(r.data) >= INIZIO_LEGISLATURA);
  for (const r of recenti) {
    const detUrl = CR_BASE + r.link;
    const det = await paginaCr(`cr-legge-${r.link.match(/id=(\d+)/)[1]}.html`, detUrl);
    const pdf = det.match(/href="([^"]+)">\s*Scarica il documento/)?.[1];
    const relazione = det.match(/href="([^"]+)"[^>]*>[^<]*RELAZIONE ILLUSTRATIVA(?! riformulata)[^<]*/i)?.[1];
    // "Legge regionale 28 agosto 2026, n. 11 (Misure ...)" → intestazione + oggetto
    const m = r.titolo.match(/^(Legge regionale [^(]+?)\s*\((.*)\)\s*$/s);
    leggi.push(
      persona({
        id: `${dataIso(r.data).slice(0, 4)}-${r.numero}`,
        numero: Number(r.numero),
        data: dataIso(r.data),
        intestazione: m ? m[1].replace(/,$/, "") : r.titolo,
        oggetto: m ? m[2] : undefined,
        url: detUrl,
        pdf: pdf?.replace(/&amp;/g, "&"),
        relazione: relazione?.replace(/&amp;/g, "&"),
      }),
    );
  }
  if (recenti.length < rows.length || rows.length === 0) break; // siamo arrivati alla legislatura precedente
}
const riassuntiFile = path.join(MANUAL, "riassunti-leggi.json");
const riassunti = fs.existsSync(riassuntiFile) ? JSON.parse(fs.readFileSync(riassuntiFile, "utf8")).leggi : {};
for (const l of leggi) if (riassunti[l.id]) l.riassunto = riassunti[l.id];
console.log(`  ${leggi.length} leggi regionali (${leggi.filter((l) => l.riassunto).length} con riassunto)`);

// Quali atti e leggi citano un comune nel titolo. Nomi lunghi prima, così "Monte di Procida" non conta come "Procida".
// Per i nomi che sono anche parole comuni serve "Comune di ...".
const AMBIGUI = new Set(["Campagna", "Liberi", "Ponte", "Lettere", "Contrada", "Serre", "Conca", "Prata", "Pietra"]);
// atti e leggi della Campania: si cercano solo i comuni campani
const comuniPerLunghezza = comuni.filter((c) => c.codiceRegione === REGIONE.codice).sort((a, b) => b.nome.length - a.nome.length);
const testoPerMatch = (s) =>
  ` ${s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")} `;
function comuniCitati(titolo) {
  let t = testoPerMatch(titolo);
  const trovati = [];
  for (const c of comuniPerLunghezza) {
    const nome = testoPerMatch(c.nome); // " Monte di Procida "
    const ago = AMBIGUI.has(c.nome) ? ` omune di${nome}` : nome;
    if (t.includes(ago)) {
      trovati.push(c.istat);
      t = t.split(ago).join(" # ");
    }
  }
  return trovati;
}
const citazioni = new Map(); // istat → [{tipo: "atto"|"legge", id}]
for (const a of attiUnici) for (const istat of comuniCitati(a.titolo)) (citazioni.get(istat) ?? citazioni.set(istat, []).get(istat)).push(a.id);
for (const l of leggi)
  for (const istat of comuniCitati(l.oggetto ?? l.intestazione)) (citazioni.get(istat) ?? citazioni.set(istat, []).get(istat)).push(`legge-${l.id}`);
console.log(`  ${citazioni.size} comuni citati in atti o leggi`);

// Conteggi per consigliere (primo firmatario o cofirmatario).
const attivita = {};
for (const a of attiUnici)
  for (const f of a.firmatari) {
    if (!f.username) continue;
    const s = (attivita[f.username] ??= { totale: 0, primoFirmatario: 0, perTipo: {} });
    s.totale++;
    s.perTipo[a.tipo] = (s.perTipo[a.tipo] ?? 0) + 1;
    if (a.firmatari[0] === f) s.primoFirmatario++;
  }

// ---------------------------------------------------------------- 6. Parlamento europeo

console.log("6/7 Eurodeputati (API Parlamento europeo)");
const epText = await download(
  "ep-meps-it.json",
  "https://data.europarl.europa.eu/api/v2/meps/show-current?country-of-representation=IT&format=application%2Fld%2Bjson&offset=0&limit=200",
  { headers: { Accept: "application/ld+json" } },
);
const epById = new Map(JSON.parse(epText).data.map((m) => [m.identifier, m]));
const epManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "eurodeputati-sud.json"), "utf8"));
const GRUPPI_PE = {
  ECR: "Conservatori e Riformisti europei (ECR)",
  "S&D": "Socialisti e Democratici (S&D)",
  PPE: "Partito popolare europeo (PPE)",
  PfE: "Patrioti per l'Europa (PfE)",
  "The Left": "La Sinistra (The Left)",
  "Verts/ALE": "Verdi/Alleanza libera europea",
  Renew: "Renew Europe",
  ESN: "Europa delle Nazioni Sovrane (ESN)",
  NI: "Non iscritti",
};
// La scheda di ogni eurodeputato nell'API contiene anche email istituzionale e sesso.
async function schedaEurodeputato(id) {
  try {
    const t = await download(`ep-mep-${id}.json`, `https://data.europarl.europa.eu/api/v2/meps/${id}?format=application%2Fld%2Bjson`, {
      headers: { Accept: "application/ld+json" },
    });
    const d = JSON.parse(t).data?.[0] ?? {};
    return { email: d.hasEmail?.replace(/^mailto:/, ""), sesso: /FEMALE$/.test(d.hasGender ?? "") ? "F" : "M" };
  } catch {
    warn(`Scheda non disponibile per l'eurodeputato ${id}`);
    return {};
  }
}
const eurodeputati = (
  await Promise.all(
    epManual.ids.map(async (id) => {
      const m = epById.get(id);
      if (!m) {
        warn(`Eurodeputato ${id} non più in carica secondo l'API del PE: aggiornare data/manual/eurodeputati-sud.json`);
        return null;
      }
      const scheda = await schedaEurodeputato(id);
      return persona({
        nome: titleCase(`${m.givenName} ${m.familyName}`),
        ruolo: declina("Eurodeputato · circoscrizione Italia meridionale", scheda.sesso),
        dettaglio: GRUPPI_PE[m["api:political-group"]] ?? m["api:political-group"],
        url: `https://www.europarl.europa.eu/meps/it/${id}`,
        email: scheda.email,
      });
    }),
  )
)
  .filter(Boolean)
  .sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
console.log(`  ${eurodeputati.length} eurodeputati Italia meridionale`);

// ---------------------------------------------------------------- 6b. Risultati elettorali

console.log("Risultati elettorali (Ministero dell'Interno, Eligendo)");
// Le ultime comunali di ogni comune sono quelle in cui è stata eletta l'amministrazione in carica.
const dataComunali = new Map(
  comuni.flatMap((c) => {
    const a = amministrazioni.get(c.istat);
    return a?.tipo === "ordinaria" && a.dataElezione ? [[c.istat, a.dataElezione]] : [];
  }),
);
const elezioni = await elezioniPerComune({ RAW, REFRESH, UA, comuni, dataComunali, warn });
console.log(`  Comunali per ${[...elezioni.values()].filter((e) => e.some((x) => x.id === "comunali")).length} comuni`);

// ---------------------------------------------------------------- 7. Output

console.log("7/7 Scrittura JSON");
const PROV_CIRC = { NA: "Napoli", SA: "Salerno", CE: "Caserta", AV: "Avellino", BN: "Benevento" };
const schede = comuni.map((c) => {
  const k = collegiByComune.get(c.istat);
  if (!k) warnGruppo("Comuni senza collegio ISTAT", `${c.nome} (${c.istat})`);
  const a = amministrazioni.get(c.istat);
  if (!a) warnGruppo("Comuni senza amministratori nell'anagrafe del Ministero", `${c.nome} (${c.istat})`);
  return {
    ...c,
    circoscrizioneRegionale: c.codiceRegione === REGIONE.codice ? PROV_CIRC[c.sigla] : undefined,
    collegi: k
      ? {
          cameraU: [...k.cameraU].sort(),
          cameraP: [...k.cameraP].sort(),
          senatoU: [...k.senatoU].sort(),
          senatoP: [...k.senatoP].sort(),
          // utile solo se il comune è diviso tra più collegi
          quartieri:
            k.cameraU.size > 1 || k.senatoU.size > 1
              ? Object.fromEntries(Object.entries(k.quartieri).map(([key, q]) => [key, [...new Set(q)].sort((a, b) => a.localeCompare(b, "it"))]))
              : undefined,
        }
      : null,
    amministrazione: a ?? null,
    contatti: contattiByIstat.get(c.istat) ?? null,
    uffici: ufficiByIstat.get(c.istat) ?? {},
    asl: aslDiComune(c),
    frazioni: frazioniByIstat.get(c.istat) ?? [],
    cap: [...(capByIstat.get(c.istat) ?? [])].sort(),
    citazioni: citazioni.get(c.istat) ?? [],
    elezioni: elezioni.get(c.istat) ?? [],
  };
});
chiudiAvvisi();

const oggi = new Date().toISOString().slice(0, 10);
/** Quando abbiamo scaricato davvero la fonte: data del file in data/raw (con la cache può essere precedente a oggi). */
const raccolto = (file) => {
  try {
    return fs.statSync(path.join(RAW, file)).mtime.toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
};
const meta = {
  generato: oggi,
  regione: REGIONE.nome,
  comuni: comuni.length,
  fonti: [
    { id: "istat-comuni", nome: "Elenco dei comuni italiani", ente: "ISTAT", url: "https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/", raccolto: raccolto("istat-comuni.csv") },
    { id: "viminale", nome: "Anagrafe degli amministratori locali e regionali", ente: "Ministero dell'Interno – DAIT", url: "https://dait.interno.gov.it/elezioni/open-data/amministratori-locali-e-regionali-in-carica", aggiornato: ammAggiornato, raccolto: raccolto("ammcom.csv") },
    { id: "ipa", nome: "Indice delle Pubbliche Amministrazioni (PEC e sito dei Comuni)", ente: "AgID – IPA", url: "https://indicepa.gov.it/ipa-portale/consultazione/indirizzo-sede/ricerca-ente", raccolto: raccolto("ipa-enti.csv") },
    { id: "ipa-uffici", nome: "Uffici dei Comuni (unità organizzative)", ente: "AgID – IPA", url: "https://indicepa.gov.it/ipa-dati/dataset/ou", raccolto: raccolto("ipa-uffici.txt") },
    { id: "asl", nome: "Corrispondenze ASL-Comuni (abbinamento comune → ASL)", ente: "Ministero della Salute", url: "https://www.dati.salute.gov.it/dataset/corrispondenze_asl_comuni_popolazione_residente.jsp", raccolto: raccolto("salute-asl-comuni.csv") },
    { id: "istat-localita", nome: "Località abitate del Censimento 2021 (frazioni)", ente: "ISTAT", url: "https://www.istat.it/notizia/basi-territoriali-e-variabili-censuarie/", raccolto: raccolto("localita-2021.csv") },
    { id: "wikidata-cap", nome: "Codici di avviamento postale dei comuni", ente: "Wikidata", url: "https://www.wikidata.org/wiki/Property:P281", raccolto: raccolto("wikidata-cap-italia.csv") },
    { id: "istat-collegi", nome: "Basi geografiche dei collegi elettorali (D.Lgs. 177/2020)", ente: "ISTAT", url: "https://www.istat.it/notizia/le-basi-geografiche-dei-nuovi-collegi-elettorali-2/", raccolto: raccolto("UT_Collegi2020.dbf") },
    { id: "camera", nome: "Open data della Camera dei deputati", ente: "Camera dei deputati", url: "https://dati.camera.it/", raccolto: raccolto("camera-deputati-italia.json") },
    { id: "senato", nome: "Open data del Senato della Repubblica (email dalle schede ufficiali)", ente: "Senato della Repubblica", url: "https://dati.senato.it/", raccolto: raccolto("senato-senatori.json") },
    { id: "cr", nome: "Consiglieri regionali", ente: "Consiglio regionale della Campania", url: `${CR_BASE}/consiglio-regionale/consiglieri`, raccolto: raccolto("cr-consiglieri.html") },
    { id: "giunta", nome: "La Giunta regionale", ente: "Regione Campania", url: GIUNTA_URL, raccolto: raccolto("regione-giunta.html") },
    { id: "pe", nome: "Open Data Portal – deputati in carica", ente: "Parlamento europeo", url: "https://data.europarl.europa.eu/", raccolto: raccolto("ep-meps-it.json") },
    { id: "cr-atti", nome: "Attività dei consiglieri e leggi regionali", ente: "Consiglio regionale della Campania", url: `${CR_BASE}/leggi-progetti/leggi-regolamenti`, raccolto: raccolto("cr-atti-pdl-0.html") },
    { id: "eligendo", nome: "Risultati delle elezioni per comune (open data)", ente: "Ministero dell'Interno – DAIT (Eligendo)", url: FONTE_ELEZIONI, raccolto: raccolto("elezioni-europee-20240609.json") },
    { id: "wiki-regionali", nome: "Circoscrizione di elezione dei consiglieri regionali (elezioni 2025)", ente: "Wikipedia (verificato a mano)", url: "https://it.wikipedia.org/wiki/Elezioni_regionali_in_Campania_del_2025" },
  ],
  avvisi: warnings,
};

const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1));

// Numeri sulla squadra di governo del Comune (età, donne, laureati), calcolati qui una volta sola
// invece che a ogni pagina: così la pagina di un comune non ha bisogno dei dati di tutti gli altri.
function numeriAmministrazione(a) {
  if (!a || a.tipo !== "ordinaria") return null;
  const tutte = new Map();
  for (const p of [a.sindaco, ...a.giunta, ...a.consiglio]) if (p) tutte.set(p.nome, p);
  const persone = [...tutte.values()];
  const perc = (n, d) => (d ? Math.round((100 * n) / d) : undefined);
  const conEta = persone.filter((p) => p.eta);
  const conSesso = persone.filter((p) => p.sesso);
  const conStudio = persone.filter((p) => p.studio);
  return persona({
    persone: persone.length,
    etaMedia: conEta.length ? Math.round(conEta.reduce((s, p) => s + p.eta, 0) / conEta.length) : undefined,
    donne: perc(conSesso.filter((p) => p.sesso === "F").length, conSesso.length),
    laureati: perc(conStudio.filter((p) => p.studio === "Laurea" || p.studio === "Post-laurea").length, conStudio.length),
    under40: perc(conEta.filter((p) => p.eta < 40).length, conEta.length),
  });
}
for (const s of schede) s.numeri = numeriAmministrazione(s.amministrazione);
// Media dei Comuni di ogni regione, per il confronto "più alta / più bassa della media regionale".
const medieRegioni = {};
for (const reg of REGIONI.keys()) {
  const tutti = schede.filter((s) => s.codiceRegione === reg && s.numeri).map((s) => s.numeri);
  const mediaDi = (k) => {
    const v = tutti.map((x) => x[k]).filter((x) => typeof x === "number");
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : undefined;
  };
  medieRegioni[reg] = persona({
    persone: mediaDi("persone") ?? 0,
    etaMedia: mediaDi("etaMedia"),
    donne: mediaDi("donne"),
    laureati: mediaDi("laureati"),
    under40: mediaDi("under40"),
  });
}

// Un file per comune (letto solo quando serve quella pagina) e un elenco leggero per home, ricerca e build.
const DIR_COMUNI = path.join(OUT, "comuni");
fs.rmSync(DIR_COMUNI, { recursive: true, force: true });
fs.mkdirSync(DIR_COMUNI, { recursive: true });
for (const s of schede) fs.writeFileSync(path.join(DIR_COMUNI, `${s.istat}.json`), JSON.stringify(s));
fs.rmSync(path.join(OUT, "comuni.json"), { force: true });
write(
  "comuni-elenco.json",
  schede.map((s) =>
    persona({
      istat: s.istat,
      nome: s.nome,
      provincia: s.provincia,
      sigla: s.sigla,
      capoluogo: s.capoluogo || undefined,
      regione: s.regioneSlug,
      abitanti: s.amministrazione?.popolazione,
      sindaco: s.amministrazione?.sindaco ? true : undefined,
    }),
  ),
);
write("statistiche.json", { medieRegioni });
// PEC della Regione e del Consiglio regionale (per "Chiedi un documento"), dall'IPA.
const ipaTutti = csvObjects(await download("ipa-enti.csv", IPA_URL), 0, ",");
const contattiEnte = (codice) => {
  const r = ipaTutti.find((x) => x.Codice_IPA === codice);
  if (!r) {
    warn(`Ente ${codice} non trovato nell'IPA`);
    return null;
  }
  const pec = [1, 2, 3, 4, 5].map((i) => (r[`Tipo_Mail${i}`] === "Pec" ? r[`Mail${i}`] : "")).find(Boolean);
  return persona({ nome: r.Denominazione_ente, pec: pec?.toLowerCase(), sito: `https://${r.Sito_istituzionale.replace(/^https?:\/\//, "")}` });
};
write("regione.json", { ...regione, contatti: contattiEnte("r_campan"), contattiConsiglio: contattiEnte("cr_campa") });

// Tutte le regioni, in versione essenziale: presidente, giunta e consiglieri dall'anagrafe del Ministero dell'Interno.
// (Trentino-Alto Adige e Marche oggi mancano nella fonte: la pagina rimanda al sito del Consiglio regionale.)
function personaRegionale(r, ruolo) {
  return persona({
    nome: titleCase(`${r.nome} ${r.cognome}`),
    ruolo: declina(ruolo, r.sesso),
    dettaglio: formatListe(r["lista_appartenenza/collegamento"]),
    sesso: r.sesso === "F" || r.sesso === "M" ? r.sesso : undefined,
  });
}
const consigliRegionali = JSON.parse(fs.readFileSync(path.join(MANUAL, "consigli-regionali.json"), "utf8")).consigli;
const regioni = [...REGIONI.values()]
  .sort((a, b) => a.nome.localeCompare(b.nome, "it"))
  .map((reg) => {
    const righe = ammregTutte.filter((r) => r.codice_regione === reg.codice);
    if (!righe.length) warnGruppo("Regioni assenti nell'anagrafe regionale del Ministero", reg.nome);
    const pres = righe.find((r) => r.descrizione_carica === "Presidente della regione");
    const giunta = righe
      .filter((r) => r.descrizione_carica.startsWith("Assessore"))
      .map((r) => personaRegionale(r, /Vicepresidente/i.test(r.incarico) ? "Vicepresidente e assessore" : "Assessore"))
      .sort((a, b) => (a.ruolo.startsWith("Vice") ? -1 : 0) - (b.ruolo.startsWith("Vice") ? -1 : 0) || a.nome.localeCompare(b.nome, "it"));
    const consiglieri = righe
      .filter((r) => r.descrizione_carica === "Consigliere" || r.descrizione_carica === "Consigliere candidato presidente")
      .map((r) =>
        personaRegionale(
          r,
          r.incarico === "Presidente del consiglio" ? "Presidente del consiglio regionale" : r.descrizione_carica === "Consigliere candidato presidente" ? "Consigliere (candidato presidente)" : "Consigliere regionale",
        ),
      )
      .sort((a, b) => (a.ruolo.startsWith("Presidente") ? -1 : 0) - (b.ruolo.startsWith("Presidente") ? -1 : 0) || a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
    return {
      ...reg,
      inChiaro: reg.codice === REGIONE.codice,
      presidente: pres ? personaRegionale(pres, "Presidente della Regione") : null,
      giunta,
      consiglieri,
      contatti: IPA_REGIONE[reg.codice] ? contattiEnte(IPA_REGIONE[reg.codice]) : null,
      consiglio: consigliRegionali[reg.codice] ?? null,
    };
  });
chiudiAvvisi();
write("regioni.json", { aggiornato: ammregAggiornato, regioni });
write("parlamento.json", {
  camera: deputatiPerCollegio,
  senato: {
    uninominali: Object.fromEntries(Object.entries(senatoUninominali).map(([k, v]) => [k, strip(v)])),
    // per regione (il Senato è eletto su base regionale)
    proporzionale: { [REGIONE.nome.toUpperCase()]: senatoProporzionale.map(strip) },
  },
});
write("europa.json", { circoscrizione: "Italia meridionale", eurodeputati });
write("meta.json", meta);
write("consiglio.json", {
  legislatura: LEGISLATURA,
  inizio: INIZIO_LEGISLATURA,
  tipi: TIPI_ATTO.map(({ id, nome, plurale }) => ({ id, nome, plurale })),
  atti: attiUnici,
  leggi,
  attivita,
});
// Indice leggero per la ricerca lato client, caricato solo quando serve.
fs.writeFileSync(
  path.join(ROOT, "public", "comuni-index.json"),
  // alt = frazioni e località, cap = codici postali: si può cercare anche "Licola" o "80078"
  JSON.stringify(
    schede.map(({ istat, nome, provincia, sigla, frazioni, cap, collegi }) => {
      const quartieri = [...new Set(Object.values(collegi?.quartieri ?? {}).flat())];
      const alt = [...new Set([...frazioni, ...quartieri])];
      return persona({ istat, nome, provincia, sigla, alt: alt.length ? alt : undefined, cap: cap.length ? cap : undefined });
    }),
  ),
);
console.log(`Fatto. ${warnings.length} avvisi.`);
