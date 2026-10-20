// Consiglio regionale della Calabria "in chiaro": consiglieri, giunta, atti e leggi letti dai siti ufficiali
// (consiglioregionale.calabria.it e regione.calabria.it). Restituisce i dati nel formato comune dei consigli in chiaro:
// la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti delle leggi, citazioni dei comuni e conteggi.
//
// Note sul sito del Consiglio: il dominio senza "www" non risponde da tutte le reti, quindi usiamo sempre www.
// Interrogazioni e mozioni si sfogliano con ?page=N; le proposte di legge solo dentro la sessione del modulo di ricerca
// (cookie e codice di sicurezza del modulo). Le leggi vengono dal catalogo XML ufficiale (open data).

import fs from "node:fs";
import path from "node:path";

const CR_BASE = "https://www.consiglioregionale.calabria.it";
const GIUNTA_URL = "https://www.regione.calabria.it/la-regione/la-giunta-regionale/";
const LEGISLATURA = "13";
const INIZIO_LEGISLATURA = "2025-10-06"; // elezioni regionali del 5 e 6 ottobre 2025
const TIPI_ATTO = [
  { id: "pdl", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "question-time", nome: "Question time", plurale: "Question time" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
];
/** Circoscrizioni elettorali: Nord (Cosenza), Centro (Catanzaro, Crotone, Vibo Valentia), Sud (Reggio Calabria). */
const CIRCOSCRIZIONI = { Nord: "Cosenza", Centro: "Catanzaro, Crotone e Vibo Valentia", Sud: "Reggio Calabria" };

export const calabria = {
  codice: "18",
  slug: "calabria",
  nome: "Calabria",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "regcal", consiglio: "r_calabr" },
  /** Circoscrizione regionale di ogni provincia (sigla → province della circoscrizione). */
  circoscrizioni: { CS: CIRCOSCRIZIONI.Nord, CZ: CIRCOSCRIZIONI.Centro, KR: CIRCOSCRIZIONI.Centro, VV: CIRCOSCRIZIONI.Centro, RC: CIRCOSCRIZIONI.Sud },
  elezione: "I consiglieri sono eletti in tre circoscrizioni: Nord (Cosenza), Centro (Catanzaro, Crotone e Vibo Valentia) e Sud (Reggio Calabria).",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Lago", "Bianco", "Cardinale", "Arena", "Pizzo", "Amato", "Grimaldi"],
  /** Nomi con cui i comuni compaiono nei titoli, diversi da quelli ISTAT. */
  aliasComuni: { "Reggio di Calabria": ["Reggio Calabria"] },
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
/** "17/9/2026" → "2026-09-17" (il sito a volte non mette lo zero iniziale) */
const dataIso = (d) =>
  d
    .split("/")
    .reverse()
    .map((x) => x.padStart(2, "0"))
    .join("-");
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Testo di un frammento HTML: tag tolti, entità decodificate (anche quelle numeriche, che il sito usa per le lettere accentate). */
const testo = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;

  /** Pagina del Consiglio: se non si legge la saltiamo (gli atti mancanti si recuperano dalla pubblicazione precedente). */
  async function pagina(file, url, opzioni) {
    const cached = fs.existsSync(path.join(RAW, file));
    let html;
    try {
      html = await download(file, url, opzioni);
    } catch {
      warnGruppo("Pagine del Consiglio regionale della Calabria non lette", file);
      return "";
    }
    if (!cached || REFRESH) await sleep(300);
    return html;
  }

  // ---------------------------------------------------------------- Consiglieri
  const elenco = await download("calabria-consiglieri.html", `${CR_BASE}/portale/Istituzione/Consiglieri/Consiglieri`);
  const voci = [...elenco.matchAll(/href="Consigliere\/(\d+)"[\s\S]*?<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/div>/g)].map(([, id, nome, resto]) => ({
    id,
    nomeSito: testo(nome),
    email: resto.match(/mailto:([^"]+)/)?.[1],
    gruppo: testo(resto.match(/\(([^)]*)\)<\/a>/)?.[1] ?? "") || undefined,
  }));
  if (!voci.length) warn("Calabria: nessun consigliere trovato sul sito del Consiglio (cambiato il sito?)");

  // Sesso dall'anagrafe del Ministero dell'Interno (per declinare "Consigliera").
  const chiaveNome = (s) => norm(s).split(" ").filter(Boolean).sort().join(" ");
  const sesso = new Map(ammreg.filter((r) => r.codice_regione === calabria.codice).map((r) => [chiaveNome(`${r.nome} ${r.cognome}`), r.sesso]));

  const consiglieri = [];
  const senzaCircoscrizione = [];
  for (const v of voci) {
    const url = `${CR_BASE}/portale/Istituzione/Consiglieri/Consigliere/${v.id}`;
    const html = await pagina(`calabria-consigliere-${v.id}.html`, url);
    // Sul sito il cognome è in maiuscolo: "Ernesto Francesco ALECCI", "Antonio DE CAPRIO".
    const parole = v.nomeSito.split(" ");
    const inizioCognome = parole.findIndex((p, i) => parole.slice(i).every((q) => q === q.toUpperCase()));
    const cognome = parole.slice(inizioCognome).join(" ");
    const nome = titleCase(v.nomeSito);
    const username = `${norm(cognome).toLowerCase()}.${norm(parole[0]).toLowerCase().slice(0, 3)}`;

    // Biografia: "… eletto nella circoscrizione Centro …"; incarichi: un rigo per incarico.
    const bio = testo(html.slice(html.indexOf("col-md-9 text-justify"), html.indexOf("Incarichi")));
    const circ = bio.match(/circoscrizione\s+(Nord|Centro|Sud)\b/i)?.[1];
    const incarichi = [...html.slice(html.indexOf("Incarichi"), html.indexOf("Dove siamo")).matchAll(/<li[^>]*>([\s\S]*?)<\/li>|<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map((m) => testo(m[1] ?? m[2]))
      .filter(Boolean);
    const incarichiTesto = incarichi.length ? incarichi : testo(html.slice(html.indexOf("Incarichi") + 9, html.indexOf("Dove siamo"))).split(/(?=\b(?:Presidente|Vicepresidente|Segretario|Componente)\b)/).map((s) => s.trim()).filter(Boolean);
    const caricaGruppo = incarichiTesto.find((i) => /^(Vice)?presidente Gruppo/i.test(i));
    const ruoloGruppo = caricaGruppo ? (/^Vice/i.test(caricaGruppo) ? "vicecapogruppo" : "capogruppo") : undefined;
    // "Vicepresidente Quinta Commissione - Istruzione, cultura, …" → "Istruzione (vicepresidente)"
    const commissioni = incarichiTesto
      .filter((i) => /Commissione|Giunta delle Elezioni/i.test(i) && !/Gruppo/i.test(i))
      .map((i) => {
        const m = i.match(/^(Presidente|Vicepresidente|Segretario|Segretaria|Componente)\s+(.+)$/i);
        const ruolo = m?.[1].toLowerCase();
        const organo = m ? m[2] : i;
        const breve = (organo.includes(" - ") ? organo.split(" - ")[1].split(",")[0] : organo).trim();
        const nomeBreve = breve.charAt(0).toUpperCase() + breve.slice(1);
        return !ruolo || ruolo === "componente" ? nomeBreve : `${nomeBreve} (${ruolo})`;
      });
    // Chi è subentrato dopo le elezioni non ha una circoscrizione (come in Campania); il presidente è eletto in tutta la regione.
    if (!circ && !/Subentra/i.test(bio)) senzaCircoscrizione.push(nome);
    consiglieri.push(
      persona({
        nome,
        ruolo: declina("Consigliere regionale", sesso.get(chiaveNome(nome))),
        dettaglio: v.gruppo ? `Gruppo: ${v.gruppo}${ruoloGruppo ? ` (${ruoloGruppo})` : ""}` : undefined,
        email: v.email,
        commissioni: commissioni.length ? commissioni : undefined,
        url,
        circoscrizione: circ ? CIRCOSCRIZIONI[titleCase(circ)] : null,
        username,
        gruppo: v.gruppo,
        ruoloGruppo,
        idSito: v.id,
      }),
    );
  }
  const doppi = consiglieri.filter((c, i) => consiglieri.findIndex((x) => x.username === c.username) !== i);
  if (doppi.length) warn(`Calabria: identificativi dei consiglieri ripetuti: ${doppi.map((c) => c.username).join(", ")}`);
  // Coalizione e colore di ogni gruppo (file curato a mano): servono per l'emiciclo.
  const gruppiManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "calabria.json"), "utf8")).gruppi;
  for (const c of consiglieri)
    if (c.gruppo && !gruppiManual[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/calabria.json: ${c.gruppo}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali`);

  // ---------------------------------------------------------------- Giunta
  const giuntaHtml = await download("calabria-giunta.html", GIUNTA_URL);
  const giunta = [...giuntaHtml.matchAll(/<h2 class="card-title[^"]*">([\s\S]*?)<\/h2>[\s\S]*?<p class="accent[^"]*">([\s\S]*?)<\/p>/g)].map(([, nome, descr]) => ({
    nome: testo(nome),
    descr: testo(descr),
  }));
  if (!giunta.length) warn("Calabria: Giunta regionale, nessun componente trovato (cambiato il sito?)");
  const presidente = giunta.find((g) => /^Presidente della Regione/i.test(g.descr));
  const consPresidente = presidente && consiglieri.find((c) => chiaveNome(c.nome) === chiaveNome(presidente.nome));
  const mancanti = senzaCircoscrizione.filter((n) => n !== consPresidente?.nome);
  if (mancanti.length) warn(`Calabria: circoscrizione non trovata nella biografia di ${mancanti.join(", ")}`);
  /** "Assessore in materia di agricoltura, …" → "Agricoltura, …" */
  const deleghe = (d) => {
    const s = d
      .replace(/^(Vice ?presidente della Giunta regionale|Assessore)\s*(con competenze di indirizzo politico\s*)?(in materia di|con delega (a|alla|al|ai|alle)?)\s*/i, "")
      .replace(/\.\s*$/, "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const regione = {
    nome: calabria.nome,
    presidente: presidente
      ? persona({ ...(consPresidente ?? {}), circoscrizione: undefined, idSito: undefined, nome: presidente.nome, ruolo: "Presidente della Regione", url: GIUNTA_URL })
      : null,
    giunta: giunta
      .filter((g) => g !== presidente)
      .map((g) =>
        persona({
          nome: g.nome,
          ruolo: /^Vice ?presidente/i.test(g.descr) ? "Vicepresidente e assessore" : declina("Assessore", sesso.get(chiaveNome(g.nome))),
          dettaglio: deleghe(g.descr),
          url: GIUNTA_URL,
        }),
      ),
    consiglieri: consiglieri.filter((c) => c !== consPresidente).map(({ idSito, ...c }) => c),
    gruppi: Object.entries(gruppiManual).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti
  const perId = new Map(consiglieri.map((c) => [c.idSito, c]));
  const pagine = (html) => Number(html.match(/Pagina \d+ di (\d+)/)?.[1] ?? 1);

  /** Schede di un elenco di atti: numero, titolo, link, firmatari (collegati alla scheda del consigliere), date e iter. */
  function schede(html, tipo) {
    const atti = [];
    for (const blocco of html.split(/<div class="featured-box featured-box-primary/).slice(1)) {
      const numero = blocco.match(/<strong>N\.\s*(\d+)/)?.[1];
      const link = blocco.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      // Proposte di iniziativa popolare depositate in legislature passate e riassegnate: contano dalla data di assegnazione.
      const depositata = blocco.match(/(?:Data di presentazione|in data):\s*<strong>\s*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
      const assegnata = blocco.match(/Assegnato in data\s*<strong>\s*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
      const data = depositata && assegnata && dataIso(depositata) < INIZIO_LEGISLATURA ? assegnata : depositata;
      if (!numero || !link || !data) continue;
      if (/[?&]leg=(\d+)/.test(link[1]) && link[1].match(/[?&]leg=(\d+)/)[1] !== LEGISLATURA) continue;
      const proponenti = blocco.slice(blocco.indexOf("Proponente:"));
      const collegati = [...proponenti.matchAll(/Consigliere\/(\d+)'>([\s\S]*?)<\/a>/g)].map(([, id, n]) => {
        const c = perId.get(id);
        return c ? { nome: c.nome, username: c.username } : { nome: titleCase(testo(n)) };
      });
      const altri = collegati.length
        ? []
        : [testo(proponenti.replace("Proponente:", "").split(/<br/)[0])].filter(Boolean).map((n) => ({ nome: n.charAt(0).toUpperCase() + n.slice(1) }));
      const t = tipo === "interrogazione" && /risposta immediata/i.test(blocco.match(/\(A risposta [^)]*\)/i)?.[0] ?? "") ? "question-time" : tipo;
      const stato = testo(blocco.match(/Stato dell'iter:\s*<strong>([\s\S]*?)<\/strong>/)?.[1] ?? "");
      const esitoParola = stato.match(/(NON APPROVAT|APPROVAT|RESPINT|RITIRAT|DECADUT)/i)?.[1].toUpperCase();
      const esito = { "NON APPROVAT": "non-approvata", APPROVAT: "approvata", RESPINT: "respinta", RITIRAT: "ritirata", DECADUT: "decaduta" }[esitoParola];
      const merito = blocco.match(/<strong>([^<]*Commissione[^<]*)<\/strong>\s*per l'esame di merito/)?.[1];
      atti.push(
        persona({
          id: `${t}-${numero}`,
          tipo: t,
          numero: Number(numero),
          data: dataIso(data),
          titolo: testo(link[2]).replace(/^"\s*|\s*"$/g, "").trim(),
          esito,
          commissione: merito ? testo(merito).replace(/^(\d+)\^/, "$1ª") : undefined,
          firmatari: [...collegati, ...altri],
          url: link[1].startsWith("http") ? link[1].replace(/ /g, "%20") : CR_BASE + encodeURI(testo(link[1])),
        }),
      );
    }
    return atti;
  }

  const atti = [];
  const modulo = (dati) => ({ method: "POST", body: new URLSearchParams(dati).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } });

  // Interrogazioni (a risposta scritta, orale e immediata) e mozioni: prima pagina con la ricerca, poi ?page=N.
  for (const [tipo, percorso, dati] of [
    ["interrogazione", "SindacatoIspettivo/Interrogazioni", { tipologia: "", legislatura: LEGISLATURA, anno: "" }],
    ["mozione", "SindacatoIspettivo/Mozioni", { legislatura: LEGISLATURA, anno: "" }],
  ]) {
    const base = `${CR_BASE}/portale/BancheDati/${percorso}`;
    const prima = await pagina(`calabria-${tipo}-1.html`, base, { richiesta: async () => modulo(dati) });
    atti.push(...schede(prima, tipo));
    for (let p = 2; p <= pagine(prima); p++) atti.push(...schede(await pagina(`calabria-${tipo}-${p}.html`, `${base}?page=${p}`), tipo));
  }

  // Proposte di legge: la ricerca vive nella sessione del modulo (cookie + codice di sicurezza), poi si sfoglia con ?page=N.
  let sessione;
  const sessionePl = () =>
    (sessione ??= (async () => {
      const form = await fetch(`${CR_BASE}/portale/BancheDati/PL/PLForm`, { headers: { "User-Agent": "Mozilla/5.0 (chi-mi-rappresenta)" } });
      const cookie = form.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      const token = (await form.text()).match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/)?.[1] ?? "";
      const dati = { __RequestVerificationToken: token, legislatura: LEGISLATURA, tipologia: "", anno: "", numero: "", oggetto: "", proponenti: "", commissioneMerito: "", commissioneParere: "", modalitaOggetto: "AlmenoUnaParola" };
      await fetch(`${CR_BASE}/portale/BancheDati/PL/PL`, { ...modulo(dati), headers: { ...modulo(dati).headers, Cookie: cookie, "User-Agent": "Mozilla/5.0 (chi-mi-rappresenta)" } });
      return cookie;
    })());
  const conSessione = { richiesta: async () => ({ headers: { Cookie: await sessionePl() } }) };
  const primaPl = await pagina("calabria-pdl-1.html", `${CR_BASE}/portale/BancheDati/PL/PL?page=1`, conSessione);
  atti.push(...schede(primaPl, "pdl"));
  for (let p = 2; p <= pagine(primaPl); p++) atti.push(...schede(await pagina(`calabria-pdl-${p}.html`, `${CR_BASE}/portale/BancheDati/PL/PL?page=${p}`, conSessione), "pdl"));

  // ---------------------------------------------------------------- Leggi (catalogo XML ufficiale)
  const xml = await download("calabria-leggi.xml", `${CR_BASE}/bdf/api/CTG`);
  const campo = (l, n) => testo(l.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`))?.[1] ?? "");
  const leggi = [...xml.matchAll(/<LEGGE>([\s\S]*?)<\/LEGGE>/g)]
    .map(([, l]) => ({ data: campo(l, "DATA"), numero: Number(campo(l, "NUMERO")), titolo: campo(l, "TITOLO"), tipo: campo(l, "TIPO") }))
    .filter((l) => l.tipo === "legger" && l.data >= INIZIO_LEGISLATURA && l.numero)
    .sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero)
    .map((l) => {
      const anno = l.data.slice(0, 4);
      const pdf = `${CR_BASE}/bdf/api/BDF?numero=${l.numero}&anno=${anno}`;
      return persona({
        id: `${anno}-${l.numero}`,
        numero: l.numero,
        data: l.data,
        intestazione: `Legge regionale ${dataLunga(l.data)}, n. ${l.numero}`,
        oggetto: l.titolo.replace(/\.\s*$/, ""),
        url: pdf,
        pdf,
        testo: `${pdf}&tipo=TXT`,
      });
    });

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
      consiglieri: { id: "calabria-cr", nome: "Consiglieri regionali", ente: "Consiglio regionale della Calabria", url: `${CR_BASE}/portale/Istituzione/Consiglieri/Consiglieri`, raccolto: raccolto("calabria-consiglieri.html") },
      giunta: { id: "calabria-giunta", nome: "La Giunta regionale", ente: "Regione Calabria", url: GIUNTA_URL, raccolto: raccolto("calabria-giunta.html") },
      atti: { id: "calabria-atti", nome: "Atti dei consiglieri e leggi regionali (open data)", ente: "Consiglio regionale della Calabria", url: `${CR_BASE}/portale/BancheDati/OpenData/OpenData`, raccolto: raccolto("calabria-leggi.xml") },
      circoscrizioni: { id: "calabria-circoscrizioni", nome: "Circoscrizione di elezione (biografie dei consiglieri)", ente: "Consiglio regionale della Calabria", url: `${CR_BASE}/portale/Istituzione/Consiglieri/Consiglieri` },
    },
  };
}
