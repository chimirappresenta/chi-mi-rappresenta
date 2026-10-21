// Consiglio regionale della Sardegna "in chiaro": consiglieri, giunta, atti e leggi letti dal sito del Consiglio
// (consregsardegna.it, un WordPress: gli atti sono articoli per categoria, letti con l'interfaccia REST del sito).
// Restituisce i dati nel formato comune dei consigli in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti,
// riassunti, citazioni e conteggi.
//
// Note:
// - la circoscrizione di elezione dei consiglieri non è pubblicata: data/manual/circoscrizioni-consiglieri/sardegna.json;
//   le circoscrizioni del 2024 sono le otto province precedenti al 2016, quindi l'abbinamento dei comuni è comune per comune
//   (data/manual/circoscrizioni-comuni/sardegna.json).
// - gli atti indicano i firmatari solo per cognome (con il nome quando ci sono omonimi: "MELONI Corrado").
// - giunta: anagrafe degli amministratori regionali del Ministero dell'Interno.

import fs from "node:fs";
import path from "node:path";

const CR = "https://www.consregsardegna.it";
const API = `${CR}/wp-json/wp/v2`;
/**
 * Alcuni articoli del sito del Consiglio contengono uno script iniettato da terzi (carica codice da un dominio esterno):
 * lo si toglie prima di salvare la pagina in cache (l'antivirus altrimenti svuota il file) e prima di leggerne il testo.
 * Nel JSON di WordPress il tag di chiusura è scritto "<\/script>".
 */
const senzaScript = (s) =>
  s
    .replace(/<script\b[\s\S]*?<\\?\/script>/gi, "")
    // la stessa iniezione, a volte senza tag, come testo di un paragrafo
    .replace(/;?\(function\(e,l,v,j,f\)\{[\s\S]*?\}\)\(document,[^)]*\);?/g, "");
const GIUNTA_URL = "https://www.regione.sardegna.it/la-regione/giunta";
/** "TRUZZU – PIGA – MELONI Corrado, sul …": firmatari (cognomi in maiuscolo, nome se serve) e poi l'oggetto */
// (il nome dopo il cognome non è mai una preposizione: "SPANO Sulle misure…" è l'inizio dell'oggetto)
const NOME_FIRMA = "[A-ZÀ-ÝÈÙ'’]{2,}(?:-?[A-ZÀ-ÝÈÙ'’]{2,})*(?: [A-ZÀ-ÝÈÙ'’]{2,})*(?: (?!(?:Su|Sul|Sull|Sulla|Sulle|Sullo|Sugli|Sui|In|Per|Con|Circa)\\b)[A-ZÀ-Ý][a-zà-ÿ'’]+)?";
const RE_INTESTAZIONE = new RegExp(`^(${NOME_FIRMA}(?:\\s*[–-]\\s*${NOME_FIRMA})*)(.*)$`, "s");
const LEGISLATURA = "XVII";
const INIZIO_LEGISLATURA = "2024-02-25"; // elezioni regionali del 25 febbraio 2024
const TIPI_ATTO = [
  { id: "pdl", nome: "Progetto di legge", plurale: "Progetti di legge" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "interpellanza", nome: "Interpellanza", plurale: "Interpellanze" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
];
/** Categorie WordPress della XVII legislatura → tipo di atto */
const CATEGORIE = [
  [1269, "interrogazione"],
  [1270, "interpellanza"],
  [1271, "mozione"],
  [1253, "pdl"],
];

export const sardegna = {
  codice: "20",
  slug: "sardegna",
  nome: "Sardegna",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_sardeg", consiglio: "crsarde" },
  /** Le circoscrizioni non seguono le province attuali: l'abbinamento è comune per comune (file manuale). */
  circoscrizioni: {},
  elezione: "I consiglieri sono eletti in otto circoscrizioni, le province della Sardegna precedenti al 2016.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Monti", "Villanova", "Sini", "Ales", "Siddi", "Turri", "Uri"],
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** "16 ottobre 2026" → "2026-10-16" */
const dataDaTesto = (s) => {
  const m = s.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  const mese = m && MESI.indexOf(m[2].toLowerCase());
  return m && mese >= 0 ? `${m[3]}-${String(mese + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : undefined;
};
/** Testo di un frammento HTML: tag tolti, entità decodificate. */
const testo = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
/** "sul mancato pagamento del TFR." → "Mancato pagamento del TFR" */
const oggettoDa = (s) =>
  s
    .replace(/^,?\s*(con richiesta di risposta (scritta|orale|in commissione),?\s*)?/i, "")
    // (anche con l'apostrofo tipografico: "sull’attuazione"; "su" solo come parola intera)
    .replace(/^(?:(?:in merito (?:a|al|alla|alle|allo|ai|agli)|relativ[ao] (?:a|al|alla|alle|allo|ai|agli)|sulla|sullo|sulle|sugli|sui|sul|su|per)\s+|(?:in merito all|relativ[ao] all|sull)['’]\s*)/i, "")
    .replace(/\s*\*{3,}.*$/, "")
    .replace(/[.;:,\s]+$/, "")
    .replace(/^./, (c) => c.toUpperCase());

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;
  const chiave = (s) => norm(s).split(" ").sort().join(" ");

  async function pagina(file, url, opzioni) {
    const cached = fs.existsSync(path.join(RAW, file));
    try {
      const html = await download(file, url, opzioni);
      if (!cached || REFRESH) await sleep(250);
      return html;
    } catch {
      warnGruppo("Pagine del Consiglio regionale della Sardegna non lette", file);
      return "";
    }
  }

  // ---------------------------------------------------------------- Consiglieri
  const elenco = await pagina("sardegna-consiglieri.html", `${CR}/xvii-legislatura/consiglieri/schede-biografiche/`);
  // di solito …/schede-biografiche/<slug>/, qualche scheda è invece …/xvii-legislatura-<slug>/
  const indirizzi = new Map();
  for (const m of elenco.matchAll(/href="https?:\/\/www\.consregsardegna\.it\/xvii-legislatura(?:\/consiglieri\/schede-biografiche\/|-)([a-z][a-z0-9-]+?)\/?"/g))
    if (!indirizzi.has(m[1])) indirizzi.set(m[1], m[0].slice(6, -1).replace(/\/?$/, "/"));
  const pagine = [...indirizzi.keys()];
  if (pagine.length < 55) warn(`Sardegna: trovati solo ${pagine.length} consiglieri sul sito del Consiglio (cambiato il sito?)`);
  const fileGruppi = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "sardegna.json"), "utf8"));
  const circManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "circoscrizioni-consiglieri", "sardegna.json"), "utf8")).consiglieri;
  const circPerChiave = new Map(Object.entries(circManual).map(([n, c]) => [chiave(n), c]));
  const righeMinistero = ammreg.filter((r) => r.codice_regione === sardegna.codice);
  const perMinistero = new Map(righeMinistero.map((r) => [chiave(`${r.cognome} ${r.nome}`), r]));

  const consiglieri = [];
  for (const slug of pagine) {
    const html = await pagina(`sardegna-consigliere-${slug}.html`, indirizzi.get(slug));
    const t = testo(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ""));
    // "AGUS Francesco": cognome in maiuscolo, poi il nome
    const intestazione = t.match(/Versione per la stampa ((?:[A-ZÀ-ÝÈÙ'’]+ )+)((?:[A-ZÀ-Ý][a-zà-ÿ'’]+ ?)+?) Scrivi/);
    if (!intestazione) {
      warn(`Sardegna: nome non trovato nella pagina ${slug}`);
      continue;
    }
    const cognome = titleCase(intestazione[1].trim());
    const nomeProprio = intestazione[2].trim();
    const nome = `${nomeProprio} ${cognome}`;
    // gruppo attuale: il primo link a una pagina di gruppo dopo "Gruppo consiliare"
    const daGruppo = html.slice(html.indexOf("Gruppo consiliare"));
    const slugGruppo = daGruppo.match(/gruppi-consiliari\/(gruppo-[a-z0-9-]+)/)?.[1] ?? html.match(/gruppi-consiliari\/(gruppo-[a-z0-9-]+)/)?.[1];
    const gruppo = slugGruppo && fileGruppi.slugSito?.[slugGruppo];
    if (!gruppo) warn(`Sardegna: gruppo di ${nome} non riconosciuto (${slugGruppo ?? "nessun link"}): aggiornare data/manual/gruppi-consiliari/sardegna.json`);
    const email = [...html.matchAll(/([a-z0-9._-]+@consregsardegna\.it)/gi)].map((m) => m[1].toLowerCase())[0];
    const m = perMinistero.get(chiave(nome));
    const senzaSpazi = (s) => norm(s).replace(/ /g, "");
    const circ =
      circPerChiave.get(chiave(nome)) ??
      Object.entries(circManual).find(([n]) => senzaSpazi(n).includes(senzaSpazi(cognome)) && norm(n).split(" ").includes(norm(nomeProprio).split(" ")[0]))?.[1];
    const presidenzaConsiglio = /^Presidente del consiglio/i.test(m?.incarico ?? "") || /Incarichi ricoperti Presidente del Consiglio regionale/i.test(t);
    consiglieri.push(
      persona({
        nome,
        ruolo: presidenzaConsiglio ? declina("Presidente del Consiglio regionale", m?.sesso) : declina("Consigliere regionale", m?.sesso),
        dettaglio: gruppo ? `Gruppo: ${gruppo}` : undefined,
        email,
        url: indirizzi.get(slug),
        circoscrizione: circ === "PRESIDENTE" || circ === "CANDIDATO" ? undefined : (circ ?? null),
        username: `${norm(cognome).toLowerCase().replace(/ /g, "-")}.${norm(nomeProprio).toLowerCase().replace(/ /g, "")}`,
        gruppo,
        cognomeMaiuscolo: norm(cognome),
        presidente: circ === "PRESIDENTE",
      }),
    );
  }
  const ripetuti = new Set(consiglieri.map((c) => c.username).filter((u, i, l) => l.indexOf(u) !== i));
  if (ripetuti.size) warn(`Sardegna: identificativi dei consiglieri ripetuti: ${[...ripetuti].join(", ")}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali`);

  // ---------------------------------------------------------------- Giunta (anagrafe del Ministero dell'Interno)
  const presRiga = righeMinistero.find((r) => r.descrizione_carica === "Presidente della regione");
  const consPresidente = consiglieri.find((c) => c.presidente) ?? (presRiga && consiglieri.find((c) => chiave(c.nome) === chiave(`${presRiga.nome} ${presRiga.cognome}`)));
  // L'anagrafe del Ministero non ha gli assessori sardi: la composizione è nei dati della pagina della Giunta
  // sul sito della Regione ({"nome","cognome","caricaIstituzionale": "Assessore dei Trasporti", …}).
  const htmlGiunta = await pagina("sardegna-giunta.html", GIUNTA_URL);
  const perSlug = new Map();
  for (const m of htmlGiunta.matchAll(/\{"slug":"([^"]+)","titolo":[^{}]*?"nome":"([^"]*)","cognome":"([^"]*)"[\s\S]*?"caricaIstituzionale":"([^"]*)"/g)) {
    const [, slug, nomeP, cogn, carica] = m;
    if (slug === "presidente" || !/^Assessore/i.test(carica) || perSlug.has(slug)) continue;
    perSlug.set(slug, { nome: `${nomeP.trim()} ${cogn.trim()}`, delega: carica.replace(/^Assessore\s+/i, "").trim() });
  }
  const giunta = [...perSlug.values()]
    .map(({ nome, delega }) => {
      const r = perMinistero.get(chiave(nome));
      const interim = presRiga && chiave(nome) === chiave(`${presRiga.nome} ${presRiga.cognome}`);
      return persona({
        nome,
        ruolo: interim ? "Presidente, assessore ad interim" : declina("Assessore", r?.sesso),
        // "dell'Agricoltura e Riforma agro-pastorale" → "Agricoltura e Riforma agro-pastorale"
        dettaglio: delega.replace(/^(?:dell'|della |dello |degli |dei |del |delle )/i, "").replace(/^./, (c) => c.toUpperCase()),
        sesso: r?.sesso === "F" || r?.sesso === "M" ? r.sesso : undefined,
        url: GIUNTA_URL,
      });
    })
    .sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  if (giunta.length < 8) warn(`Sardegna: Giunta regionale, trovati solo ${giunta.length} assessori sul sito della Regione (cambiato il sito?)`);
  const pulisci = ({ cognomeMaiuscolo, presidente, ...c }) => c;
  const regione = {
    nome: sardegna.nome,
    presidente: presRiga
      ? persona({ ...(consPresidente ? pulisci(consPresidente) : {}), circoscrizione: undefined, nome: titleCase(`${presRiga.nome} ${presRiga.cognome}`), ruolo: declina("Presidente della Regione", presRiga.sesso) })
      : null,
    giunta,
    consiglieri: consiglieri.filter((c) => c !== consPresidente).map(pulisci),
    gruppi: Object.entries(fileGruppi.gruppi).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti (articoli WordPress per categoria)
  const perCognome = Map.groupBy(
    consiglieri.filter((c) => c !== consPresidente),
    (c) => c.cognomeMaiuscolo,
  );
  /** "MELONI Corrado" / "TRUZZU" → consigliere (se il cognome è ambiguo serve il nome) */
  const firmatario = (s) => {
    const [, cogn, nomeDato] = s.trim().match(/^([A-ZÀ-ÝÈÙ'’]+(?:-?[A-ZÀ-ÝÈÙ'’]+)*(?:\s[A-ZÀ-ÝÈÙ'’]+)*)(?:\s+([A-ZÀ-Ý][a-zà-ÿ'’]+(?:\s[A-ZÀ-Ý][a-zà-ÿ'’]+)*))?$/) ?? [];
    if (!cogn) return null;
    // "MELONI CORRADO", tutto in maiuscolo: si confronta il nome completo
    const intero = !nomeDato && consiglieri.find((c) => c !== consPresidente && chiave(c.nome) === chiave(cogn));
    if (intero) return { nome: intero.nome, username: intero.username };
    // "RU-BIU": refusi con un trattino dentro il cognome
    const candidati = perCognome.get(norm(cogn)) ?? perCognome.get(norm(cogn).replace(/ /g, "")) ?? [];
    const c = candidati.length === 1 ? candidati[0] : candidati.find((x) => nomeDato && norm(x.nome).split(" ").includes(norm(nomeDato).split(" ")[0]));
    return c ? { nome: c.nome, username: c.username } : { nome: titleCase(`${nomeDato ?? ""} ${cogn}`.trim()) };
  };
  const atti = [];
  for (const [categoria, tipo] of CATEGORIE) {
    const articoli = [];
    for (let p = 1; p <= 30; p++) {
      const json = await pagina(`sardegna-${tipo}-${p}.json`, `${API}/posts?categories=${categoria}&per_page=100&page=${p}&_fields=id,date,title,link,content`, { pulisci: senzaScript });
      if (!json) break; // oltre l'ultima pagina il sito risponde 400
      let lista = [];
      try {
        lista = JSON.parse(json);
      } catch {
        // pagina scaricata a metà: la si toglie dalla cache, così il prossimo aggiornamento la riscarica
        fs.rmSync(path.join(RAW, `sardegna-${tipo}-${p}.json`), { force: true });
        warn(`Sardegna: pagina ${p} di ${tipo} incompleta, riprovare l'aggiornamento`);
        continue;
      }
      if (!Array.isArray(lista) || !lista.length) break;
      articoli.push(...lista);
      if (lista.length < 100) break;
    }
    for (const a of articoli) {
      const titoloPost = testo(a.title?.rendered ?? "");
      const numero = Number(titoloPost.match(/N\.\s*(\d+)/i)?.[1]);
      if (!numero) continue;
      const corpo = testo(senzaScript(a.content?.rendered ?? ""));
      let firmatari = [];
      let titolo = "";
      let id = `${tipo}-${numero}`;
      if (tipo === "pdl") {
        // "TICCA – SALARIS – FASOLINO – Titolo della proposta scarica la PROPOSTA DI LEGGE …"; disegni di legge: della Giunta
        const parti = corpo.split(/\s+[–-]\s+/);
        const nomi = [];
        while (parti.length > 1 && /^[A-ZÀ-ÝÈÙ'’]+(?:\s[A-ZÀ-ÝÈÙ'’]+)*(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’]+)*$/.test(parti[0].trim())) nomi.push(parti.shift());
        titolo = parti.join(" – ").replace(/\s+scarica\b.*$/i, "").replace(/\s+\d+$/, "").trim();
        const disegno = /DISEGNO DI LEGGE/i.test(titoloPost);
        if (disegno) id = `ddl-${numero}`;
        firmatari = disegno ? [{ nome: "Giunta regionale" }] : nomi.map(firmatario).filter(Boolean);
      } else {
        // "INTERROGAZIONE TRUZZU – PIGA – MELONI Corrado, con richiesta di risposta scritta, sul …"
        // solo l'intestazione: il testo dopo "***" contiene altri trattini
        const dopo = corpo
          .replace(/\s*\*{3,}[\s\S]*$/, "")
          .replace(/^.*?\bXVII Legislatura\s+/i, "")
          .replace(/^(?:Interrogazione|Interpellanza|Mozione) n\.\s*\S+\s+/i, "")
          .replace(/^(?:\([^)]*\)\s*)+/, "")
          .replace(/^(?:INTERROGAZIONE|INTERPELLANZA|MOZIONE)\s+/, "");
        const [, nomi, resto] = dopo.match(RE_INTESTAZIONE) ?? [, "", dopo];
        firmatari = nomi.split(/\s*–\s*|\s+-\s*|\s*-\s+/).filter((x) => x.trim()).map(firmatario).filter(Boolean);
        titolo = oggettoDa(resto ?? "");
      }
      if (!titolo || /^Ritirat[ao]$/i.test(titolo)) continue; // atti ritirati: sul sito resta solo "Ritirata"
      atti.push(persona({ id, tipo, numero, data: a.date.slice(0, 10), titolo: titolo.slice(0, 600), firmatari, url: a.link }));
    }
  }

  // ---------------------------------------------------------------- Leggi (pagina delle leggi approvate)
  const leggiHtml = await pagina("sardegna-leggi.html", `${CR}/leggi-approvate-xvii-legislatura/`);
  const leggi = [];
  for (const blocco of leggiHtml.split(/(?=Legge regionale \d{1,2} \w+ \d{4}[,.] n\. \d+)/).slice(1)) {
    const t = testo(blocco);
    const [, quando, n] = t.match(/^Legge regionale (\d{1,2} \w+ \d{4})[,.] n\. (\d+)/) ?? [];
    const data = quando && dataDaTesto(quando);
    if (!data || data < INIZIO_LEGISLATURA) continue;
    const numero = Number(n);
    const id = `${data.slice(0, 4)}-${numero}`;
    if (leggi.some((l) => l.id === id)) continue;
    // "Legge regionale 22 dicembre 2025, n. 35 (ALLEGATO 01 - ALLEGATO 02) - Titolo." (le parentesi possono contenere trattini)
    let oggetto = t
      .replace(/^Legge regionale \d{1,2} \w+ \d{4}[,.] n\. \d+\s*(?:\([^)]*\)\s*)*-\s*/, "")
      .replace(/\s*\(\s*vai alla pagina.*$/i, "")
      .replace(/\.\s*$/, "")
      .trim();
    // sul sito qualche titolo è ripetuto due volte di fila
    const meta = oggetto.length / 2;
    if (Number.isInteger(meta) && oggetto.slice(0, meta) === oggetto.slice(meta)) oggetto = oggetto.slice(0, meta);
    // il link al PDF sta prima del titolo della legge (quindi nel blocco precedente): lo si cerca per anno e numero
    const pdf = leggiHtml.match(new RegExp(`href="(https://www\\.consregsardegna\\.it/wp-content/uploads/[^"]+LEGGE-REGIONALE-${data.slice(0, 4)}-0?${numero}\\.pdf)"`, "i"))?.[1];
    const iter = blocco.match(/href="(https:\/\/www\.consregsardegna\.it\/17legislatura\/progetti-legge\/\d+\/?)"/)?.[1];
    leggi.push(persona({ id, numero, data, intestazione: `Legge regionale ${dataLunga(data)}, n. ${numero}`, oggetto, url: iter ?? pdf ?? `${CR}/leggi-approvate-xvii-legislatura/`, pdf }));
  }
  if (leggi.length < 30) warn(`Sardegna: solo ${leggi.length} leggi sulla pagina delle leggi approvate (cambiato il sito?)`);
  leggi.sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
  // Proposte diventate legge: la pagina iter della legge è quella della proposta
  for (const l of leggi) {
    const pl = l.url.match(/progetti-legge\/(\d+)/)?.[1];
    const a = pl && atti.find((x) => x.tipo === "pdl" && x.url.includes(`/progetti-legge/${pl}/`));
    if (a) Object.assign(a, { esito: "approvata", esitoData: `legge regionale n. ${l.numero}/${l.data.slice(0, 4)}` });
  }

  return {
    regione,
    consiglio: {
      legislatura: LEGISLATURA,
      inizio: INIZIO_LEGISLATURA,
      tipi: TIPI_ATTO.filter((t) => atti.some((a) => a.tipo === t.id)),
      atti,
      leggi,
    },
    fonti: {
      consiglieri: { id: "sardegna-cr", nome: "Consiglieri regionali", ente: "Consiglio regionale della Sardegna", url: `${CR}/xvii-legislatura/consiglieri/schede-biografiche/`, raccolto: raccolto("sardegna-consiglieri.html") },
      giunta: { id: "sardegna-giunta", nome: "Composizione della Giunta regionale", ente: "Regione Autonoma della Sardegna", url: GIUNTA_URL, raccolto: raccolto("sardegna-giunta.html") },
      atti: { id: "sardegna-atti", nome: "Atti consiliari e leggi regionali", ente: "Consiglio regionale della Sardegna", url: `${CR}/xvii-legislatura/attivita/`, raccolto: raccolto("sardegna-mozione-1.json") },
      circoscrizioni: { id: "sardegna-circoscrizioni", nome: "Circoscrizione di elezione dei consiglieri regionali (elezioni 2024)", ente: "Wikipedia (verificato a mano)", url: "https://it.wikipedia.org/wiki/Elezioni_regionali_in_Sardegna_del_2024" },
    },
  };
}
