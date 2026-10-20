// Consiglio regionale dell'Abruzzo "in chiaro": consiglieri, giunta, atti e leggi letti dai siti ufficiali
// (consiglio.regione.abruzzo.it, IterLegis, banca dati delle leggi e regione.abruzzo.it). Restituisce i dati nel formato
// comune dei consigli in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti, citazioni e conteggi.
//
// Note: in Abruzzo i consiglieri nominati assessori sono sospesi dal Consiglio e sostituiti da supplenti, quindi i
// consiglieri "attivi" sono quelli non sospesi. Negli elenchi degli atti i proponenti sono indicati solo per cognome.
// La banca dati delle leggi e IterLegis rispondono solo in http (il certificato https di www2 non è valido).

import fs from "node:fs";
import path from "node:path";

const CR_BASE = "https://www.consiglio.regione.abruzzo.it";
const ITER = "http://iter.crabruzzo.it/crabiterfo";
const LEGGI_BASE = "http://www2.consiglio.regione.abruzzo.it/leggi_tv";
const GIUNTA_URL = "https://www.regione.abruzzo.it/giunta";
const LEGISLATURA = "12";
const INIZIO_LEGISLATURA = "2024-03-10"; // elezioni regionali del 10 marzo 2024
const TIPI_ATTO = [
  { id: "pdl", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "interpellanza", nome: "Interpellanza", plurale: "Interpellanze" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
  { id: "risoluzione", nome: "Risoluzione", plurale: "Risoluzioni" },
];
/** Tipologie dell'elenco dei documenti politici del Consiglio → tipo di atto */
const DOCUMENTI = [
  ["Interpellanza", "interpellanza"],
  ["Interrogazione_r", "interrogazione"],
  ["Interrogazione_w", "interrogazione"],
  ["Mozione", "mozione"],
  ["Risoluzione", "risoluzione"],
];

export const abruzzo = {
  codice: "13",
  slug: "abruzzo",
  nome: "Abruzzo",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_abruzz", consiglio: "cr_abbru" },
  /** Circoscrizione regionale di ogni provincia (sigla → nome): una per provincia. */
  circoscrizioni: { AQ: "L'Aquila", TE: "Teramo", PE: "Pescara", CH: "Chieti" },
  elezione: "I consiglieri sono eletti in quattro circoscrizioni, una per provincia. Chi è nominato assessore viene sospeso dal Consiglio e sostituito da un supplente.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Penne", "Popoli", "Bomba", "Liscia", "Archi", "Filetto", "Castelli", "Ari", "Opi", "Cappadocia"],
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
/** "22/04/24" o "22/04/2024" → "2024-04-22" */
const dataIso = (d) => {
  const [g, m, a] = d.split("/");
  return `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, "0")}-${g.padStart(2, "0")}`;
};
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

const ENTITA = { agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù", Agrave: "À", Egrave: "È", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", ndash: "–", mdash: "—", deg: "°", acirc: "â" };
/** Testo di un frammento HTML: tag tolti, entità decodificate. */
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
    .replace(/&(?:amp;?)+/g, "&") // il sito a volte codifica due volte: "&ampamp;"
    .replace(/&([a-z]+);/gi, (e, n) => ENTITA[n] ?? e)
    .replace(/\s+/g, " ")
    .trim();

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;

  /** Pagina di un sito del Consiglio: se non si legge la saltiamo (gli atti mancanti si recuperano dalla pubblicazione precedente). */
  async function pagina(file, url, opzioni) {
    const cached = fs.existsSync(path.join(RAW, file));
    let html;
    try {
      html = await download(file, url, opzioni);
    } catch {
      warnGruppo("Pagine del Consiglio regionale dell'Abruzzo non lette", file);
      return "";
    }
    if (!cached || REFRESH) await sleep(300);
    return html;
  }
  /** I siti più vecchi del Consiglio sono in windows-1252. */
  async function paginaLatina(file, url, opzioni) {
    await pagina(file, url, opzioni);
    const p = path.join(RAW, file);
    return fs.existsSync(p) ? new TextDecoder("windows-1252").decode(fs.readFileSync(p)) : "";
  }

  // ---------------------------------------------------------------- Consiglieri
  // Tabella degli eletti: circoscrizione, email, eventuale sospensione.
  const tabella = await download("abruzzo-consiglieri.html", `${CR_BASE}/contenuti/consiglieri-xii-legislatura`);
  const eletti = new Map(); // "COGNOME NOME" normalizzato → { circ, email, nota }
  for (const [, riga] of tabella.slice(tabella.indexOf("<table")).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celle = [...riga.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => testo(m[1]));
    if (celle.length < 4) continue;
    const [nome, circ, nota, email] = celle.slice(-4);
    if (nome) eletti.set(norm(nome.replace(/\(.*\)/, "")), { circ, email, nota });
  }

  // Gruppi consiliari della legislatura: una pagina per gruppo con i componenti ("<strong>COGNOME</strong> Nome (Capogruppo)").
  const indice = await download("abruzzo-gruppi.html", `${CR_BASE}/gruppi-consiliari-generale`);
  const sezione = indice.slice(indice.indexOf("Gruppi Consiliari XII Legislatura"), indice.indexOf("Gruppi Consiliari XI Legislatura"));
  const pagineGruppi = [...new Set([...sezione.matchAll(/href="(\/gruppi-consiliari\/[^"]+)"/g)].map((m) => m[1]))];
  if (!pagineGruppi.length) warn("Abruzzo: nessun gruppo consiliare trovato (cambiato il sito?)");

  const sesso = new Map(ammreg.filter((r) => r.codice_regione === abruzzo.codice).map((r) => [norm(`${r.cognome} ${r.nome}`), r.sesso]));
  const componenti = [];
  for (const href of pagineGruppi) {
    const html = await pagina(`abruzzo-gruppo-${href.split("/").pop()}.html`, CR_BASE + href);
    const gruppo = testo(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? "");
    const corpo = html.slice(html.indexOf("field-name-body"), html.indexOf("field-name-field-rendiconto"));
    for (const [, p] of corpo.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      const forte = p.match(/<strong>([\s\S]*?)<\/strong>([\s\S]*)/);
      if (!forte) continue;
      // "VERRECCHIA Massimo" tutto nel grassetto, oppure "CAMPITELLI" in grassetto e "NICOLA" dopo
      const parole = `${testo(forte[1])} ${testo(forte[2]).split(/\s+-\s+|\(/)[0]}`.trim().split(" ");
      // il cognome è la parte in grassetto scritta in maiuscolo; il nome segue
      const grassetto = testo(forte[1]).split(" ").filter((w) => w === w.toUpperCase());
      const cognomeParole = parole.slice(0, grassetto.length);
      const nomeParole = parole.slice(grassetto.length);
      const resto = testo(forte[2]);
      componenti.push({
        cognome: cognomeParole.join(" "),
        nome: nomeParole.join(" "),
        gruppo,
        ruoloGruppo: /\(Capogruppo\)/i.test(resto) ? "capogruppo" : undefined,
        carica: resto.match(/\((Presidente[^)]*)\)/i)?.[1],
        sospeso: /sospes[oa] dalle funzioni/i.test(resto),
        gruppoUrl: CR_BASE + href,
      });
    }
  }

  const consiglieri = [];
  for (const c of componenti) {
    const chiave = norm(`${c.cognome} ${c.nome}`);
    const e = eletti.get(chiave);
    if (!e && !/Presidente Giunta/i.test(c.carica ?? "")) warn(`Abruzzo: ${c.cognome} ${c.nome} non trovato nella tabella degli eletti`);
    const nome = titleCase(`${c.nome} ${c.cognome}`);
    consiglieri.push(
      persona({
        nome,
        ruolo: /Presidente Giunta/i.test(c.carica ?? "")
          ? "Presidente della Regione"
          : /Presidente del Consiglio/i.test(c.carica ?? "")
            ? declina("Presidente del Consiglio regionale", sesso.get(chiave))
            : declina("Consigliere regionale", sesso.get(chiave)),
        dettaglio: `Gruppo: ${c.gruppo}${c.ruoloGruppo ? ` (${c.ruoloGruppo})` : ""}`,
        email: e?.email || undefined,
        url: c.gruppoUrl,
        // Nella tabella degli eletti solo il candidato presidente arrivato secondo non ha circoscrizione:
        // non è "subentrato", quindi la circoscrizione resta vuota (non null)
        circoscrizione: e?.circ ? titleCase(e.circ) : e ? undefined : null,
        username: `${norm(c.cognome).toLowerCase()}.${norm(c.nome).toLowerCase().slice(0, 3)}`,
        gruppo: c.gruppo,
        ruoloGruppo: c.ruoloGruppo,
        sospeso: c.sospeso || undefined,
      }),
    );
  }
  // Coalizione e colore di ogni gruppo (file curato a mano): servono per l'emiciclo.
  const gruppiManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "abruzzo.json"), "utf8")).gruppi;
  for (const c of consiglieri)
    if (c.gruppo && !gruppiManual[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/abruzzo.json: ${c.gruppo}`);
  // Stesso cognome e stesse iniziali ("Marilena Rossi" e "Maria Assunta Rossi"): nell'identificativo il nome intero.
  const ripetuti = new Set(consiglieri.map((c) => c.username).filter((u, i, l) => l.indexOf(u) !== i));
  for (const c of consiglieri)
    if (ripetuti.has(c.username)) {
      const comp = componenti.find((x) => titleCase(`${x.nome} ${x.cognome}`) === c.nome);
      c.username = `${norm(comp.cognome).toLowerCase()}.${norm(comp.nome).toLowerCase().replace(/ /g, "")}`;
    }
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  const attivi = consiglieri.filter((c) => !c.sospeso);
  console.log(`  ${attivi.length} consiglieri regionali in carica (${consiglieri.length - attivi.length} sospesi perché assessori)`);

  // ---------------------------------------------------------------- Giunta
  const giuntaHtml = await download("abruzzo-giunta.html", GIUNTA_URL);
  const giunta = [];
  for (const m of giuntaHtml.matchAll(/<a href="(\/giunta\/[^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    const righe = giuntaHtml
      .slice(m.index + m[0].length, m.index + m[0].length + 1500)
      .replace(/<!--[\s\S]*?-->/g, "")
      .split(/<[^>]+>/)
      .map(testo)
      .filter(Boolean);
    if (giunta.some((g) => g.href === m[1])) continue;
    giunta.push({ href: m[1], nome: testo(m[2]), ruolo: righe[0] ?? "", deleghe: (righe[1] ?? "").startsWith("Deleghe") ? righe[1] : righe[0] });
  }
  if (!giunta.length) warn("Abruzzo: Giunta regionale, nessun componente trovato (cambiato il sito?)");
  const presidente = giunta.find((g) => /^Presidente/i.test(g.ruolo));
  const consPresidente = presidente && consiglieri.find((c) => norm(c.nome) === norm(presidente.nome));
  const deleghe = (d) => {
    const s = d.replace(/^(Presidente della Giunta Regionale con )?deleghe\s+(all'|alla|alle|allo|agli|ai|al|a)\s*/i, "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const regione = {
    nome: abruzzo.nome,
    presidente: presidente
      ? persona({ ...(consPresidente ?? {}), circoscrizione: undefined, sospeso: undefined, nome: presidente.nome, ruolo: "Presidente della Regione", url: GIUNTA_URL, dettaglio: consPresidente?.dettaglio })
      : null,
    giunta: giunta
      .filter((g) => g !== presidente)
      .map((g) =>
        persona({
          nome: g.nome,
          ruolo: /vicepresidente/i.test(g.ruolo) ? "Vicepresidente e assessore" : /sottosegretari/i.test(g.ruolo) ? "Sottosegretario" : declina("Assessore", sesso.get(norm(g.nome.split(" ").reverse().join(" ")))),
          dettaglio: deleghe(g.deleghe),
          url: `https://www.regione.abruzzo.it${g.href}`,
        }),
      ),
    consiglieri: attivi.filter((c) => c !== consPresidente).map(({ sospeso, ...c }) => c),
    gruppi: Object.entries(gruppiManual).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti
  // I proponenti sono scritti in modi diversi: "PAOLUCCI", "Monaco e Mariani", "Rossi M. A.", "Marilena Rossi",
  // "Sospiri. Aggiunge firma Scoccia", "La Porta (firma aggiunta il 5/3/2025)". Li separiamo e li abbiniamo ai consiglieri
  // in carica confrontando il cognome e, se c'è, il nome o le sue iniziali.
  const candidati = regione.consiglieri.map((c) => {
    const comp = componenti.find((x) => titleCase(`${x.nome} ${x.cognome}`) === c.nome);
    return { c, cognome: norm(comp?.cognome ?? c.nome.split(" ").pop()).split(" "), nome: norm(comp?.nome ?? "").split(" ") };
  });
  const abbina = (voce) => {
    const parole = norm(voce).split(" ").filter(Boolean);
    const trovati = candidati.filter(({ cognome, nome }) => {
      // basta una parte dei cognomi doppi ("Taglieri" per "Taglieri Sclocchi")
      if (!cognome.some((w) => parole.includes(w))) return false;
      const resto = parole.filter((w) => !cognome.includes(w));
      return resto.every((w) => nome.some((n) => n.startsWith(w)));
    });
    return trovati.length === 1 ? trovati[0].c : undefined;
  };
  const firmatari = (testoProponenti) =>
    testoProponenti
      .replace(/\([^)]*\)/g, " ")
      .replace(/\.?\s*aggiunge firma\s*/gi, ", ")
      .split(/\s*[,;]\s*|\s+e\s+/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((voce) => {
        const c = abbina(voce);
        return c ? { nome: c.nome, username: c.username } : { nome: /^giunta/i.test(voce) ? "Giunta regionale" : titleCase(voce) };
      });

  const atti = [];
  const ESITI = { respinta: "respinta", ritirata: "ritirata", approvata: "approvata", "non approvata": "non-approvata", decaduta: "decaduta" };
  for (const [tipologia, tipo] of DOCUMENTI) {
    const html = await pagina(
      `abruzzo-${tipologia.toLowerCase()}.html`,
      `${CR_BASE}/documenti-politici-elenco?field_leg_value=${LEGISLATURA}&field_tipologia_documento_value=${tipologia}`,
    );
    for (const [, riga] of html.matchAll(/<tr class="(?:odd|even)[^"]*">([\s\S]*?)<\/tr>/g)) {
      const celle = [...riga.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
      if (celle.length < 7) continue;
      const nodo = celle[0].match(/href="\/node\/(\d+)"/)?.[1];
      const data = testo(celle[1]).match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
      const numero = Number(testo(celle[2]));
      if (!nodo || !data || !numero) continue;
      const esito = ESITI[testo(celle[5]).toLowerCase()];
      atti.push(
        persona({
          // la numerazione delle risoluzioni riparte per Consiglio e commissioni: l'identificativo è il nodo del sito
          id: `${tipo}-${nodo}`,
          tipo,
          numero,
          data: dataIso(data),
          titolo: testo(celle[6]),
          esito,
          firmatari: firmatari(testo(celle[3])),
          url: `${CR_BASE}/node/${nodo}`,
        }),
      );
    }
  }

  // Proposte di legge da IterLegis: la ricerca vive nella sessione (cookie), poi si sfoglia; data e commissione dalla scheda.
  let sessione;
  const sessioneIter = () =>
    (sessione ??= (async () => {
      const form = await fetch(`${ITER}/showRicerca.do`, { headers: { "User-Agent": "Mozilla/5.0 (chi-mi-rappresenta)" } });
      const cookie = form.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      const dati = {
        "criterioRicerca.legislatura": LEGISLATURA,
        "criterioRicerca.annoProgettoLegge": "-1",
        "criterioRicerca.numeroProgettoDilegge": "",
        "criterioRicerca.keyword": "",
        "criterioRicerca.diventatoLegge": "0",
        "criterioRicerca.proponente": "",
        "criterioRicerca.numeroLegge": "",
        "criterioRicerca.annoLegge": "-1",
        "action:ricerca": "Cerca",
      };
      await fetch(`${ITER}/showRicerca.do`, {
        method: "POST",
        body: new URLSearchParams(dati).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie, Referer: `${ITER}/showRicerca.do`, "User-Agent": "Mozilla/5.0 (chi-mi-rappresenta)" },
      });
      return cookie;
    })());
  const conSessione = { richiesta: async () => ({ headers: { Cookie: await sessioneIter() } }) };
  const primaPdl = await paginaLatina("abruzzo-pdl-1.html", `${ITER}/continuaRicerca.do?criterioRicerca.pageNumber=1`, conSessione);
  const nPagine = Number(primaPdl.match(/pagina\s*(?:<[^>]+>\s*)*\d+\s*(?:<[^>]+>\s*)*di\s*(?:<[^>]+>\s*)*(\d+)/i)?.[1] ?? 1);
  for (let p = 1; p <= nPagine; p++) {
    const html = p === 1 ? primaPdl : await paginaLatina(`abruzzo-pdl-${p}.html`, `${ITER}/continuaRicerca.do?criterioRicerca.pageNumber=${p}`, conSessione);
    const corpo = html.slice(html.indexOf("N. Progetto"));
    for (const [, riga] of corpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const celle = [...riga.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
      const idAtto = riga.match(/mostraDettaglio\.do\?idAtto=(\d+)/)?.[1];
      if (celle.length < 4 || !idAtto) continue;
      const numero = Number(testo(celle[0]));
      const legge = testo(celle[1]);
      const titolo = testo(celle[2]);
      const proponenti = testo(celle[3]);
      // Scheda: "Progetto di Legge numero: 2 del 22/04/24", commissione di merito
      const scheda = await paginaLatina(`abruzzo-pdl-scheda-${idAtto}.html`, `${ITER}/mostraDettaglio.do?idAtto=${idAtto}`);
      const data = testo(scheda).match(/Progetto di Legge numero:\s*\d+\s*del\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1];
      if (!numero || !data) continue;
      const merito = testo(scheda).match(/XII - ([A-Za-zà ]+Commissione)\s*\|?\s*Merito/)?.[1]?.trim();
      atti.push(
        persona({
          id: `pdl-${numero}`,
          tipo: "pdl",
          numero,
          data: dataIso(data),
          titolo,
          esito: legge ? "approvata" : undefined,
          esitoData: legge ? `legge regionale n. ${legge}` : undefined,
          commissione: merito,
          firmatari: firmatari(proponenti),
          url: `${ITER}/mostraDettaglio.do?idAtto=${idAtto}`,
        }),
      );
    }
  }

  // ---------------------------------------------------------------- Leggi (banca dati dei testi, un elenco per anno)
  const leggi = [];
  const annoFine = new Date().getFullYear();
  for (let anno = Number(INIZIO_LEGISLATURA.slice(0, 4)); anno <= annoFine; anno++) {
    const html = await paginaLatina(`abruzzo-leggi-${anno}.html`, `${LEGGI_BASE}/testi_vigenti/Cronologico/${anno}.asp`);
    for (const [, voce] of html.matchAll(/<a name="\d+"><\/a><p class="CAPOVERSO">([\s\S]*?)<\/p>/g)) {
      const link = voce.match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/);
      if (!link) continue;
      // "L.R. 16 settembre 2026 n. 28"
      const m = testo(link[2]).match(/L\.R\.\s*(\d{1,2})\s+(\w+)\s+(\d{4}),?\s*n\.\s*(\d+)/i);
      if (!m) continue;
      const mese = MESI.indexOf(m[2].toLowerCase()) + 1;
      if (!mese) continue;
      const data = `${m[3]}-${String(mese).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      if (data < INIZIO_LEGISLATURA) continue;
      const numero = Number(m[4]);
      const oggetto = testo(voce.slice(voce.indexOf("<br>") + 4).replace(/<a title="Torna su"[\s\S]*$/, "")).replace(/\.\s*$/, "");
      const testoHtml = `${LEGGI_BASE}/abruzzo_lr/${m[3]}/lr${m[3].slice(2)}${String(numero).padStart(3, "0")}.htm`;
      leggi.push(
        persona({
          id: `${m[3]}-${numero}`,
          numero,
          data,
          intestazione: `Legge regionale ${dataLunga(data)}, n. ${numero}`,
          oggetto,
          url: testoHtml,
          testo: testoHtml,
        }),
      );
    }
  }
  leggi.sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);

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
      consiglieri: { id: "abruzzo-cr", nome: "Consiglieri e gruppi consiliari", ente: "Consiglio regionale dell'Abruzzo", url: `${CR_BASE}/contenuti/consiglieri-xii-legislatura`, raccolto: raccolto("abruzzo-consiglieri.html") },
      giunta: { id: "abruzzo-giunta", nome: "La Giunta regionale", ente: "Regione Abruzzo", url: GIUNTA_URL, raccolto: raccolto("abruzzo-giunta.html") },
      atti: { id: "abruzzo-atti", nome: "Documenti politici, progetti di legge (IterLegis) e leggi regionali", ente: "Consiglio regionale dell'Abruzzo", url: `${CR_BASE}/documenti-politici-elenco`, raccolto: raccolto("abruzzo-interpellanza.html") },
    },
  };
}
