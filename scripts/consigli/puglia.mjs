// Consiglio regionale della Puglia "in chiaro": consiglieri, giunta, atti e leggi letti dai siti ufficiali
// (consiglio.puglia.it, archivio atti GIAC e regione.puglia.it). Restituisce i dati nel formato comune dei consigli
// in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti, citazioni e conteggi.
//
// Note: il sito del Consiglio non indica la circoscrizione di elezione: è in un file curato a mano
// (data/manual/circoscrizioni-consiglieri/puglia.json). Nel GIAC ogni atto ha una scheda con data e proponenti,
// collegati ai consiglieri tramite il loro codice (lo stesso usato nei filtri "proponenti=").

import fs from "node:fs";
import path from "node:path";

const CR_BASE = "https://www.consiglio.puglia.it";
const GIAC = "https://giac.consiglio.puglia.it/web";
const GIUNTA_URL = "https://www.regione.puglia.it/giunta";
const LEGISLATURA = "12";
const INIZIO_LEGISLATURA = "2025-11-24"; // elezioni regionali del 23 e 24 novembre 2025
const PORTLET = "com_liferay_asset_publisher_web_portlet_AssetPublisherPortlet_INSTANCE_rScneN6h9gGs";
const TIPI_ATTO = [
  { id: "pdl", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "interpellanza", nome: "Interpellanza", plurale: "Interpellanze" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
  { id: "odg", nome: "Ordine del giorno", plurale: "Ordini del giorno" },
];
/** Elenchi del GIAC → tipo di atto */
const ELENCHI = [
  ["progetti-legge", "pdl"],
  ["interrogazioni", "interrogazione"],
  ["interpellanze", "interpellanza"],
  ["mozioni", "mozione"],
  ["ordini-del-giorno", "odg"],
];

export const puglia = {
  codice: "16",
  slug: "puglia",
  nome: "Puglia",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_puglia", consiglio: "crpuglia" },
  /** Circoscrizione regionale di ogni provincia (sigla → nome): una per provincia. */
  circoscrizioni: { BA: "Bari", BT: "Barletta-Andria-Trani", BR: "Brindisi", FG: "Foggia", LE: "Lecce", TA: "Taranto" },
  elezione: "I consiglieri sono eletti in sei circoscrizioni, una per provincia.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Castro", "Sava", "Diso", "Specchia", "Faeto", "Carpino"],
  leggi: leggiConsiglio,
};

const dataIso = (d) => {
  const [g, m, a] = d.split("/");
  return `${a}-${m.padStart(2, "0")}-${g.padStart(2, "0")}`;
};
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

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
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;

  /** Pagina dei siti del Consiglio: se non si legge la saltiamo (gli atti mancanti si recuperano dalla pubblicazione precedente). */
  async function pagina(file, url) {
    const cached = fs.existsSync(path.join(RAW, file));
    let html;
    try {
      html = await download(file, url);
    } catch {
      warnGruppo("Pagine del Consiglio regionale della Puglia non lette", file);
      return "";
    }
    if (!cached || REFRESH) await sleep(300);
    return html;
  }

  // ---------------------------------------------------------------- Consiglieri
  // Elenco a pagine da 10 (il sito ignora richieste di pagine più grandi).
  const voci = new Map(); // slug della scheda → "Cognome Nome"
  for (let p = 1; p <= 10; p++) {
    const html = await pagina(
      `puglia-consiglieri-${p}.html`,
      `${CR_BASE}/consiglieri-2026?p_p_id=${PORTLET}&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_${PORTLET}_delta=10&p_r_p_resetCur=false&_${PORTLET}_cur=${p}`,
    );
    const prima = voci.size;
    for (const [, slug, nome] of html.matchAll(/<div class="media-body">\s*<strong><a href="https:\/\/www\.consiglio\.puglia\.it\/([a-z0-9-]+)">([^<]+)<\/a>/g))
      voci.set(slug, testo(nome));
    if (voci.size === prima) break;
  }
  if (voci.size < 40) warn(`Puglia: trovati solo ${voci.size} consiglieri sul sito del Consiglio (cambiato il sito?)`);

  // Cognomi dal filtro "Proponenti" del GIAC (codice → cognome): servono a separare nome e cognome.
  const primaPdl = await pagina("puglia-pdl-1.html", `${GIAC}/progetti-legge`);
  const cognomi = new Map([...primaPdl.slice(primaPdl.indexOf('name="proponenti"')).split("</select>")[0].matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)].map(([, id, c]) => [id, testo(c)]));

  const circManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "circoscrizioni-consiglieri", "puglia.json"), "utf8")).consiglieri;
  const sesso = new Map(ammreg.filter((r) => r.codice_regione === puglia.codice).map((r) => [norm(`${r.cognome} ${r.nome}`), r.sesso]));

  const consiglieri = [];
  for (const [slug, nomeSito] of voci) {
    const url = `${CR_BASE}/${slug}`;
    const html = await pagina(`puglia-consigliere-${slug}.html`, url);
    const giacId = html.match(/progetti-legge\?proponenti=(\d+)/)?.[1];
    const gruppo = testo(html.match(/lblGruppo">([^<]*)</)?.[1] ?? "") || undefined;
    const email = html.match(/mailto:([^?"]+)/)?.[1];
    // "Cognome Nome": il cognome viene dal GIAC; in mancanza, la prima parola
    // (nel GIAC alcuni cognomi hanno l'iniziale del nome per distinguere omonimi: "Gatta N.")
    const cognome = ((giacId && cognomi.get(giacId)) || nomeSito.split(" ")[0]).replace(/\s+[A-Z]\.$/, "");
    const nomeProprio = norm(nomeSito).startsWith(norm(cognome)) ? nomeSito.slice(cognome.length).trim() : nomeSito.split(" ").slice(1).join(" ");
    const nome = titleCase(`${nomeProprio} ${cognome}`);
    const incarichi = [...(html.split("INCARICHI ISTITUZIONALI")[1]?.split("ATTIVITA'")[0] ?? "").matchAll(/»<\/strong>([^<]+)/g)].map((m) => testo(m[1]));
    // "Presidente Commissione VI (Politiche comunitarie - Lavoro - Formazione professionale)" → "Politiche comunitarie (presidente)"
    const commissioni = incarichi
      .filter((i) => /Commissione/i.test(i))
      .map((i) => {
        const ruolo = i.match(/^(Presidente|Vicepresidente|Vice Presidente|Segretario|Segretaria|Componente)\b/i)?.[1]?.toLowerCase().replace(" ", "");
        const tema = i.match(/\(([^)]+)\)/)?.[1]?.split(/\s+-\s+|,/)[0]?.trim() ?? i;
        return !ruolo || ruolo === "componente" ? tema : `${tema} (${ruolo})`;
      });
    const presidenzaConsiglio = incarichi.find((i) => /^(Vice)?\s*Presidente del Consiglio/i.test(i));
    const chiave = norm(nomeSito);
    const circ = circManual[nomeSito];
    if (circ === undefined) warn(`Puglia: consigliere senza circoscrizione nel file manuale: ${nomeSito}`);
    consiglieri.push(
      persona({
        nome,
        ruolo: presidenzaConsiglio ? declina(titleCase(presidenzaConsiglio.replace(/\s+regionale.*$/i, "") + " regionale"), sesso.get(chiave)) : declina("Consigliere regionale", sesso.get(chiave)),
        dettaglio: gruppo ? `Gruppo: ${gruppo}` : undefined,
        email,
        commissioni: commissioni.length ? commissioni : undefined,
        url,
        circoscrizione: circ === "PRESIDENTE" || circ === "CANDIDATO" ? undefined : (circ ?? null),
        username: `${norm(cognome).toLowerCase()}.${norm(nomeProprio).toLowerCase().slice(0, 3)}`,
        gruppo,
        giacId,
      }),
    );
  }
  const ripetuti = new Set(consiglieri.map((c) => c.username).filter((u, i, l) => l.indexOf(u) !== i));
  if (ripetuti.size) warn(`Puglia: identificativi dei consiglieri ripetuti: ${[...ripetuti].join(", ")}`);
  // Coalizione e colore di ogni gruppo (file curato a mano): servono per l'emiciclo.
  const gruppiManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "puglia.json"), "utf8")).gruppi;
  for (const c of consiglieri)
    if (c.gruppo && !gruppiManual[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/puglia.json: ${c.gruppo}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali`);

  // ---------------------------------------------------------------- Giunta
  const giuntaHtml = await download("puglia-giunta.html", GIUNTA_URL);
  const giunta = [];
  for (const [, href, corpo] of giuntaHtml.matchAll(/<a href="(\/[a-z0-9-]+)">([\s\S]*?)<\/a>/g)) {
    const righe = corpo
      .split(/<[^>]+>/)
      .map(testo)
      .filter(Boolean);
    if (righe.length >= 2 && /^(Presidente|Vicepresidente|Assessore|Assessora|Sottosegretari)/i.test(righe[0])) giunta.push({ href, ruolo: righe[0], nome: righe[1], deleghe: righe[2] });
  }
  if (!giunta.length) warn("Puglia: Giunta regionale, nessun componente trovato (cambiato il sito?)");
  const presidente = giunta.find((g) => /^Presidente/i.test(g.ruolo));
  const consPresidente = presidente && consiglieri.find((c) => norm(c.nome) === norm(presidente.nome));
  const regione = {
    nome: puglia.nome,
    presidente: presidente
      ? persona({ ...(consPresidente ?? {}), circoscrizione: undefined, giacId: undefined, nome: presidente.nome, ruolo: "Presidente della Regione", url: `https://www.regione.puglia.it${presidente.href}` })
      : null,
    giunta: giunta
      .filter((g) => g !== presidente)
      .map((g) =>
        persona({
          nome: g.nome,
          ruolo: /^Vicepresidente/i.test(g.ruolo) ? "Vicepresidente e assessore" : declina("Assessore", sesso.get(norm(g.nome.split(" ").reverse().join(" ")))),
          dettaglio: g.deleghe,
          url: `https://www.regione.puglia.it${g.href}`,
        }),
      ),
    consiglieri: consiglieri.filter((c) => c !== consPresidente).map(({ giacId, ...c }) => c),
    gruppi: Object.entries(gruppiManual).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti (GIAC)
  const perGiac = new Map(consiglieri.filter((c) => c.giacId && c !== consPresidente).map((c) => [c.giacId, c]));
  // Alcune schede indicano il primo proponente solo per cognome, come nel filtro del GIAC
  const perCognomeGiac = new Map([...perGiac].map(([id, c]) => [norm(cognomi.get(id) ?? ""), c]));
  const ultimaPagina = (html) => Math.max(1, ...[...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1])));
  const atti = [];
  for (const [elenco, tipo] of ELENCHI) {
    const prima = elenco === "progetti-legge" ? primaPdl : await pagina(`puglia-${tipo}-1.html`, `${GIAC}/${elenco}`);
    const n = ultimaPagina(prima);
    for (let p = 1; p <= n; p++) {
      const html = p === 1 ? prima : await pagina(`puglia-${tipo}-${p}.html`, `${GIAC}/${elenco}?page=${p}`);
      for (const scheda of html.split('<div class="card-wrapper card-space"').slice(1)) {
        const numero = Number(scheda.match(/<span style="font-size: 1\.2rem;">(\d+)/)?.[1]);
        const link = scheda.match(/href="(https:\/\/giac\.consiglio\.puglia\.it\/web\/timeline\/[^"]+)"/)?.[1];
        if (!numero || !link) continue;
        const titolo = testo(scheda.match(/<h5 class="card-title">([\s\S]*?)<\/h5>/)?.[1] ?? "");
        // Scheda dell'atto: data di arrivo, proponenti (con il codice del consigliere), commissione capofila
        const dett = await pagina(`puglia-atto-${link.split("/timeline/")[1].replace(/\//g, "-")}.html`, link);
        let data = testo(dett).match(/Data di arrivo\s*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
        if (!data) continue;
        // Proposte popolari o di enti locali della legislatura precedente, iscritte d'ufficio in quella nuova:
        // contano dalla prima data successiva all'inizio della legislatura che compare nella scheda.
        if (dataIso(data) < INIZIO_LEGISLATURA)
          data = [...testo(dett).matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g)].map((m) => m[1]).filter((d) => dataIso(d) >= INIZIO_LEGISLATURA).sort((a, b) => dataIso(a).localeCompare(dataIso(b)))[0] ?? data;
        const sezione = dett.slice(dett.indexOf(">Proponenti<"));
        const proponenti = [...sezione.split(/Sottoscrittori|Categoria|Comporta Spesa|Testo proposta/)[0].matchAll(/data-scheda_id="(\d+)"[^>]*>([^<]+)</g)].map(([, id, n]) => {
          const c = perGiac.get(id);
          return c ? { nome: c.nome, username: c.username } : { nome: testo(n) };
        });
        const tipologia = testo(dett).match(/Tipologia atto\s*:?\s*([^|]+?)\s{2,}|Tipologia atto\s+(Disegno di Legge)/)?.[0] ?? "";
        // Senza consiglieri collegati: la Giunta (disegni di legge) o l'ente indicato nella scheda ("Città Metropolitana di Bari")
        const enteProponente = testo(scheda.match(/Proponenti:<\/span>([\s\S]*?)<\/p>/)?.[1] ?? "").replace(/\s+e altri$/, "");
        const perCognome = enteProponente
          .split(/\s*,\s*|\s+e\s+/)
          .filter(Boolean)
          .map((v) => perCognomeGiac.get(norm(v)));
        const firmatari = proponenti.length
          ? proponenti
          : /Disegno di Legge/i.test(tipologia + scheda)
            ? [{ nome: "Giunta regionale" }]
            : perCognome.length && perCognome.every(Boolean)
              ? perCognome.map((c) => ({ nome: c.nome, username: c.username }))
              : enteProponente
                ? [{ nome: enteProponente }]
                : [];
        const commissione = testo(dett).match(/Referenti:\s*Commissione\s+([IVX]+)\s*-\s*([^|]+?)\s+Capofila/)?.[2]?.split(",")[0]?.trim();
        atti.push(
          persona({
            id: `${tipo}-${numero}`,
            tipo,
            numero,
            data: dataIso(data),
            titolo,
            commissione,
            firmatari,
            url: link,
          }),
        );
      }
    }
  }

  // ---------------------------------------------------------------- Leggi (tabella del GIAC)
  const leggi = [];
  const legge = new Map(); // numero della proposta → id della legge (per l'esito delle proposte)
  for (let p = 1; p <= 10; p++) {
    const html = await pagina(`puglia-leggi-${p}.html`, `${GIAC}/leggi-regionali${p > 1 ? `?page=${p}` : ""}`);
    const tabella = html.slice(html.lastIndexOf(">Leggi regionali<"));
    let nuove = 0;
    for (const [, riga] of tabella.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const celle = [...riga.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
      if (celle.length < 4) continue;
      const numero = Number(testo(celle[0]));
      const data = testo(celle[1]).match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
      if (!numero || !data || dataIso(data) < INIZIO_LEGISLATURA) continue;
      const iso = dataIso(data);
      const id = `${iso.slice(0, 4)}-${numero}`;
      if (leggi.some((l) => l.id === id)) continue;
      nuove++;
      const oggetto = testo(celle[2])
        .replace(/^Legge regionale\s*/i, "")
        .replace(/^["“]\s*|\s*["”]$/g, "")
        .replace(/\.\s*$/, "");
      const pdf = riga.match(/href="(https:\/\/burp\.regione\.puglia\.it\/[^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
      const scheda = celle[3].match(/href="([^"]+)"/)?.[1];
      for (const n of testo(celle[3]).split(/\s+/).filter((x) => /^\d+$/.test(x))) legge.set(Number(n), `legge regionale n. ${numero}/${iso.slice(0, 4)}`);
      leggi.push(persona({ id, numero, data: iso, intestazione: `Legge regionale ${dataLunga(iso)}, n. ${numero}`, oggetto, url: scheda ?? pdf ?? `${GIAC}/leggi-regionali`, pdf }));
    }
    if (!nuove) break;
  }
  leggi.sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
  // Proposte di legge diventate legge
  for (const a of atti) if (a.tipo === "pdl" && legge.has(a.numero)) Object.assign(a, { esito: "approvata", esitoData: legge.get(a.numero) });

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
      consiglieri: { id: "puglia-cr", nome: "Consiglieri regionali", ente: "Consiglio regionale della Puglia", url: `${CR_BASE}/consiglieri-2026`, raccolto: raccolto("puglia-consiglieri-1.html") },
      giunta: { id: "puglia-giunta", nome: "La Giunta regionale", ente: "Regione Puglia", url: GIUNTA_URL, raccolto: raccolto("puglia-giunta.html") },
      atti: { id: "puglia-atti", nome: "Atti consiliari e leggi regionali (GIAC)", ente: "Consiglio regionale della Puglia", url: `${GIAC}/progetti-legge`, raccolto: raccolto("puglia-pdl-1.html") },
      circoscrizioni: { id: "puglia-circoscrizioni", nome: "Circoscrizione di elezione dei consiglieri regionali (elezioni 2025)", ente: "Wikipedia (verificato a mano)", url: "https://it.wikipedia.org/wiki/Elezioni_regionali_in_Puglia_del_2025" },
    },
  };
}
