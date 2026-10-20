// Consiglio regionale della Campania "in chiaro": consiglieri, giunta, atti e leggi letti dai siti ufficiali
// (cr.campania.it e regione.campania.it). Restituisce i dati nel formato comune dei consigli in chiaro:
// la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti delle leggi, citazioni dei comuni e conteggi.

import fs from "node:fs";
import path from "node:path";

const CR_BASE = "https://www.cr.campania.it";
const GIUNTA_URL = "https://www.regione.campania.it/regione/la-giunta-regionale";
const LEGISLATURA = "12";
const INIZIO_LEGISLATURA = "2025-11-23"; // data delle elezioni regionali
const TIPI_ATTO = [
  { id: "pdl", path: "progetti-legge", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "interrogazione", path: "interrogazioni-presentate", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "question-time", path: "question_time", nome: "Question time", plurale: "Question time" },
  { id: "mozione", path: "mozioni", nome: "Mozione", plurale: "Mozioni" },
  { id: "risoluzione", path: "risoluzioni", nome: "Risoluzione", plurale: "Risoluzioni" },
];

export const campania = {
  codice: "15",
  slug: "campania",
  nome: "Campania",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_campan", consiglio: "cr_campa" },
  /** Circoscrizione regionale di ogni provincia (sigla → nome): i consiglieri sono eletti per provincia. */
  circoscrizioni: { NA: "Napoli", SA: "Salerno", CE: "Caserta", AV: "Avellino", BN: "Benevento" },
  /** Come sono eletti i consiglieri, in una frase (per la pagina della regione). */
  elezione: "I consiglieri sono eletti in cinque circoscrizioni, una per provincia.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Campagna", "Liberi", "Ponte", "Lettere", "Contrada", "Serre", "Conca", "Prata", "Pietra"],
  leggi: leggiConsiglio,
};

async function leggiConsiglio(ctx) {
  const { download, htmlText, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;

  // ---------------------------------------------------------------- Consiglieri e giunta
  const consHtml = await download("cr-consiglieri.html", `${CR_BASE}/consiglio-regionale/consiglieri`);
  const consLinks = [
    ...new Map(
      [...consHtml.matchAll(/href="(\/scheda-personale\/consigliere\/[^"]+?\?username=([^&"]+)&amp;id_tipo_carica=\d+)"/g)].map(
        (m) => [m[2], m[1].replace(/&amp;/g, "&")],
      ),
    ),
  ];
  const circManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "consiglieri-regionali-circoscrizione.json"), "utf8")).consiglieri;

  function campo(lines, label) {
    const i = lines.findIndex((l) => l.startsWith(label));
    if (i < 0) return undefined;
    const inline = lines[i].slice(label.length).trim();
    return inline || lines[i + 1];
  }

  // Sesso dei consiglieri regionali dall'anagrafe del Ministero dell'Interno (per declinare "Consigliera").
  const chiaveNomeCons = (s) => norm(s).split(" ").filter(Boolean).sort().join(" ");
  const sessoRegionale = new Map(ammreg.filter((r) => r.codice_regione === campania.codice).map((r) => [chiaveNomeCons(`${r.nome} ${r.cognome}`), r.sesso]));

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
  const gruppiManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "campania.json"), "utf8")).gruppi;
  for (const c of consiglieri)
    if (c.gruppo && !gruppiManual[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/campania.json: ${c.gruppo}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali`);

  const giuntaHtml = await download("regione-giunta.html", GIUNTA_URL);
  const gl = htmlText(giuntaHtml);
  const giunta = [];
  for (let i = 0; i < gl.length; i++) {
    if (gl[i] === "Vedi dettaglio" && i >= 2) giunta.push({ nome: gl[i - 2], deleghe: gl[i - 1] });
  }
  if (!giunta.length) warn("Giunta regionale: nessun componente trovato (cambiato il sito?)");
  const presidente = giunta.find((g) => /^Presidente/i.test(g.deleghe));
  const regione = {
    nome: campania.nome,
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

  // ---------------------------------------------------------------- Atti e leggi
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
    // Se una pagina proprio non si legge, la saltiamo: gli atti mancanti si recuperano dalla pubblicazione precedente.
    let html;
    try {
      html = await download(file, url, { accetta404: true });
    } catch {
      warnGruppo("Pagine del Consiglio regionale non lette", file);
      return "";
    }
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

  return {
    regione,
    consiglio: {
      legislatura: LEGISLATURA,
      inizio: INIZIO_LEGISLATURA,
      tipi: TIPI_ATTO.map(({ id, nome, plurale }) => ({ id, nome, plurale })),
      atti,
      leggi,
    },
    fonti: {
      consiglieri: { id: "cr", nome: "Consiglieri regionali", ente: "Consiglio regionale della Campania", url: `${CR_BASE}/consiglio-regionale/consiglieri`, raccolto: raccolto("cr-consiglieri.html") },
      giunta: { id: "giunta", nome: "La Giunta regionale", ente: "Regione Campania", url: GIUNTA_URL, raccolto: raccolto("regione-giunta.html") },
      atti: { id: "cr-atti", nome: "Attività dei consiglieri e leggi regionali", ente: "Consiglio regionale della Campania", url: `${CR_BASE}/leggi-progetti/leggi-regolamenti`, raccolto: raccolto("cr-atti-pdl-0.html") },
      circoscrizioni: { id: "wiki-regionali", nome: "Circoscrizione di elezione dei consiglieri regionali (elezioni 2025)", ente: "Wikipedia (verificato a mano)", url: "https://it.wikipedia.org/wiki/Elezioni_regionali_in_Campania_del_2025" },
    },
  };
}
