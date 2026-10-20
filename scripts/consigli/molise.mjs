// Consiglio regionale del Molise "in chiaro": consiglieri, giunta, atti e leggi letti dai siti ufficiali
// (consiglio.regione.molise.it, consiglioweb.regione.molise.it e regione.molise.it). Restituisce i dati nel formato
// comune dei consigli in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti, citazioni e conteggi.
//
// Note: il Molise elegge i consiglieri in un'unica circoscrizione regionale. Dal sito si leggono gli atti di indirizzo
// approvati (mozioni, ordini del giorno) con i firmatari, e le proposte di legge senza proponenti. Le pagine mescolano
// caratteri UTF-8 e Windows-1252: vanno decodificate con attenzione. Usiamo consiglio.regione.molise.it senza "www"
// (con "www" il sito risponde spesso 503).

import fs from "node:fs";
import path from "node:path";

const CR_BASE = "https://consiglio.regione.molise.it";
const ATTI_URL = "https://consiglioweb.regione.molise.it/atti.php";
const GIUNTA_URL = "https://www.regione.molise.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/15989";
const LEGISLATURA = "13";
const INIZIO_LEGISLATURA = "2023-06-26"; // elezioni regionali del 25 e 26 giugno 2023
const CIRCOSCRIZIONE = "Campobasso e Isernia"; // circoscrizione unica regionale
const TIPI_ATTO = [
  { id: "pdl", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
  { id: "odg", nome: "Ordine del giorno", plurale: "Ordini del giorno" },
  { id: "risoluzione", nome: "Risoluzione", plurale: "Risoluzioni" },
];

export const molise = {
  codice: "14",
  slug: "molise",
  nome: "Molise",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_molise", consiglio: "crmolise" },
  /** Una sola circoscrizione per tutta la regione. */
  circoscrizioni: { CB: CIRCOSCRIZIONE, IS: CIRCOSCRIZIONE },
  elezione: "I consiglieri sono eletti in un'unica circoscrizione che comprende tutta la regione.",
  /** Nomi di comuni che sono anche parole comuni (o il nome della regione): contano solo come "Comune di …". */
  comuniAmbigui: ["Molise", "Toro", "Pesche", "Fornelli", "Lupara"],
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
/** "24/09/2026" o "06/10/26" → "2026-09-24" */
const dataIso = (d) => {
  const [g, m, a] = d.split("/");
  return `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, "0")}-${g.padStart(2, "0")}`;
};
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Decodifica pagine che mescolano UTF-8 e Windows-1252 (virgolette e accenti incollati da Word). */
const CP1252 = { 0x80: "€", 0x82: "‚", 0x84: "„", 0x85: "…", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x96: "–", 0x97: "—" };
function decodificaMista(buf) {
  return buf
    .toString("latin1")
    .replace(/[\xC2-\xF4][\x80-\xBF]+/g, (m) => {
      const s = Buffer.from(m, "latin1").toString("utf8");
      return s.includes("�") ? m : s;
    })
    .replace(/[\x80-\x9F]/g, (c) => CP1252[c.charCodeAt(0)] ?? "");
}

/** Testo di un frammento HTML: tag tolti, entità decodificate. */
const testo = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;

  /** Pagina dei siti del Molise, decodificata; se non si legge la saltiamo. */
  async function pagina(file, url) {
    const cached = fs.existsSync(path.join(RAW, file));
    try {
      await download(file, url);
    } catch {
      warnGruppo("Pagine del Consiglio regionale del Molise non lette", file);
      return "";
    }
    if (!cached || REFRESH) await sleep(300);
    return decodificaMista(fs.readFileSync(path.join(RAW, file)));
  }

  // ---------------------------------------------------------------- Consiglieri
  const elenco = await pagina("molise-consiglieri.html", `${CR_BASE}/13_legislatura`);
  const inizioElenco = elenco.indexOf("Consiglieri XIII Legislatura", elenco.indexOf('id="main-content"'));
  const corpoElenco = elenco.slice(inizioElenco, elenco.indexOf("Amministrazione Trasparente", inizioElenco));
  const voci = [];
  for (const m of corpoElenco.matchAll(/<a href="https?:\/\/consiglio\.regione\.molise\.it\/([a-z]+XIII)">([^<]+)<\/a>([^<]{0,120})/g)) {
    const [, slug, nomeSito, dopo] = m;
    if (/cessazione/i.test(dopo)) continue; // consiglieri non più in carica
    if (voci.some((v) => v.slug === slug)) continue;
    // la carica può stare nello stesso link o in un secondo link alla stessa scheda ("… ROBERTI</a><a …> - Presidente della Giunta")
    const seguito = corpoElenco.slice(m.index, m.index + m[0].length + 250);
    voci.push({ slug, nomeSito: testo(nomeSito).replace(/\s*-\s*Presidente.*$/i, ""), carica: testo(seguito).match(/Presidente (del Consiglio|della Giunta)/i)?.[0] });
  }
  if (voci.length < 15) warn(`Molise: trovati solo ${voci.length} consiglieri sul sito del Consiglio (cambiato il sito?)`);

  // Gruppi consiliari: "GIORGIA MELONI - FRATELLI D'ITALIA" seguito dai componenti "D'EGIDIO Armandino - Capogruppo dal …"
  const gruppiHtml = await pagina("molise-gruppi.html", `${CR_BASE}/node/25078`);
  const righeGruppi = gruppiHtml
    .slice(gruppiHtml.indexOf("Gruppi consiliari XIII"))
    .split("</article>")[0]
    .split(/<[^>]+>/)
    .map(testo)
    .filter(Boolean)
    .slice(1);
  const fileGruppi = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "molise.json"), "utf8"));
  const nomiGruppi = fileGruppi.nomiSito ?? {};
  const gruppoDi = new Map(); // "COGNOME NOME" normalizzato → { gruppo, capogruppo }
  let gruppoCorrente;
  for (const r of righeGruppi) {
    // i gruppi sono scritti in maiuscolo: il nome da mostrare viene dal file curato a mano ("PD - PARTITO DEMOCRATICO" → "Partito Democratico")
    if (!/[a-zà-ù]/.test(r)) gruppoCorrente = nomiGruppi[r] ?? titleCase(r, { minori: true });
    else if (gruppoCorrente) gruppoDi.set(norm(r.split(/\s+-\s+/)[0]), { gruppo: gruppoCorrente, capogruppo: /Capogruppo/i.test(r) });
  }

  // Atti di indirizzo approvati: servono anche come riserva per il gruppo ("Fanelli Micaela (XIII) - Partito Democratico")
  const attiHtml = await pagina("molise-atti.html", ATTI_URL);

  const sesso = new Map(ammreg.filter((r) => r.codice_regione === molise.codice).map((r) => [norm(`${r.cognome} ${r.nome}`), r.sesso]));
  const gruppiNoti = [...new Set([...gruppoDi.values()].map((g) => g.gruppo))];
  const consiglieri = [];
  for (const v of voci) {
    const url = `${CR_BASE}/${v.slug}`;
    const html = await pagina(`molise-consigliere-${v.slug}.html`, url);
    // "Armandino D'EGIDIO": il cognome è in maiuscolo
    const parole = v.nomeSito.split(" ");
    const iCognome = parole.findIndex((p, i) => parole.slice(i).every((q) => q === q.toUpperCase()));
    const cognome = parole.slice(iCognome).join(" ");
    const nomeProprio = parole.slice(0, iCognome).join(" ");
    const chiave = norm(`${cognome} ${nomeProprio}`);
    let g = gruppoDi.get(chiave);
    if (!g) {
      // riserva: il gruppo con cui firma gli atti, ricondotto al nome della pagina dei gruppi
      const firmato = attiHtml.match(new RegExp(`${cognome.replace(/'/g, ".")}\\s+${nomeProprio.split(" ")[0]}[^,<]*\\(XIII\\)\\s*-\\s*([^,<]+)`, "i"))?.[1]?.trim();
      const gruppo = firmato && (gruppiNoti.find((n) => norm(n).includes(norm(firmato))) ?? titleCase(firmato, { minori: true }));
      g = gruppo ? { gruppo } : undefined;
    }
    const email = html.match(/mailto:([^"?]+@regione\.molise\.it)/)?.[1];
    const nome = titleCase(`${nomeProprio} ${cognome}`);
    const presidenteGiunta = /Giunta/i.test(v.carica ?? "");
    consiglieri.push(
      persona({
        nome,
        ruolo: /Consiglio/i.test(v.carica ?? "") ? declina("Presidente del Consiglio regionale", sesso.get(chiave)) : declina("Consigliere regionale", sesso.get(chiave)),
        dettaglio: g ? `Gruppo: ${g.gruppo}${g.capogruppo ? " (capogruppo)" : ""}` : undefined,
        email,
        url,
        // Gravina è in Consiglio come candidato presidente arrivato secondo (seggio senza circoscrizione)
        circoscrizione: presidenteGiunta || norm(cognome) === "GRAVINA" ? undefined : CIRCOSCRIZIONE,
        username: `${norm(cognome).toLowerCase()}.${norm(nomeProprio).toLowerCase().slice(0, 3)}`,
        gruppo: g?.gruppo,
        ruoloGruppo: g?.capogruppo ? "capogruppo" : undefined,
        presidenteGiunta: presidenteGiunta || undefined,
      }),
    );
  }
  const gruppiManual = fileGruppi.gruppi;
  for (const c of consiglieri)
    if (c.gruppo && !gruppiManual[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/molise.json: ${c.gruppo}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali`);

  // ---------------------------------------------------------------- Giunta (con le deleghe dalla scheda di ognuno)
  const giuntaHtml = await pagina("molise-giunta.html", GIUNTA_URL);
  const giunta = [];
  const sezioneGiunta = giuntaHtml.slice(giuntaHtml.indexOf("ROBERTI") - 800, giuntaHtml.indexOf("ROBERTI") + 12000);
  for (const m of sezioneGiunta.matchAll(/<a href='(https:\/\/www\.regione\.molise\.it\/flex\/cm\/pages\/ServeBLOB\.php\/L\/IT\/IDPagina\/\d+)'>([\s\S]{0,120}?)<\/a>/g)) {
    const href = m[1];
    const nome = testo(m[2]);
    if (!/[A-Z]{2,}/.test(nome)) continue;
    // il ruolo è il primo testo dopo il link ("Presidente", "Assessore - Vice Presidente")
    const ruolo = sezioneGiunta
      .slice(m.index + m[0].length, m.index + m[0].length + 400)
      .split(/<[^>]+>/)
      .map(testo)
      .find(Boolean) ?? "";
    if (!/Presidente|Assessore|Sottosegretari/i.test(ruolo) || giunta.some((x) => x.href === href)) continue;
    const scheda = await pagina(`molise-giunta-${href.split("/").pop()}.html`, href);
    const testoDeleghe = testo(scheda.split(/Deleghe:/)[1]?.split(/Contatti:/)[0] ?? "").replace(/;\s*$/, "");
    const deleghe = testoDeleghe ? testoDeleghe.charAt(0).toUpperCase() + testoDeleghe.slice(1) : undefined;
    giunta.push({ href, nome: titleCase(testo(nome)), ruolo: testo(ruolo), deleghe });
  }
  if (!giunta.length) warn("Molise: Giunta regionale, nessun componente trovato (cambiato il sito?)");
  const presidente = giunta.find((g) => /^Presidente/i.test(g.ruolo));
  const consPresidente = consiglieri.find((c) => c.presidenteGiunta);
  const regione = {
    nome: molise.nome,
    presidente: presidente
      ? persona({ ...(consPresidente ?? {}), presidenteGiunta: undefined, circoscrizione: undefined, nome: presidente.nome, ruolo: "Presidente della Regione", url: presidente.href })
      : null,
    giunta: giunta
      .filter((g) => g !== presidente)
      .map((g) =>
        persona({
          nome: g.nome,
          ruolo: /Vice ?Presidente/i.test(g.ruolo) ? "Vicepresidente e assessore" : /Sottosegretari/i.test(g.ruolo) ? "Sottosegretario" : declina("Assessore", sesso.get(norm(g.nome.split(" ").reverse().join(" ")))),
          dettaglio: g.deleghe,
          url: g.href,
        }),
      ),
    consiglieri: consiglieri.filter((c) => c !== consPresidente).map(({ presidenteGiunta, ...c }) => c),
    gruppi: Object.entries(gruppiManual).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti di indirizzo approvati
  const perNome = new Map(regione.consiglieri.map((c) => [norm(c.nome).split(" ").sort().join(" "), c]));
  const TIPO = { mozione: "mozione", odg: "odg", "odg collegato": "odg", risoluzione: "risoluzione" };
  const atti = [];
  for (const [, riga, dettagli] of attiHtml.matchAll(/<tr class="(?:odd|even)">([\s\S]*?)<\/tr>\s*<tr class="showhide"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celle = [...riga.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => testo(m[1]));
    const tipo = TIPO[celle[0]?.toLowerCase()];
    const data = celle[1];
    const numero = Number(testo(dettagli).match(/Registro Generale Numero:\s*(\d+)/)?.[1] ?? celle[2]);
    if (!tipo || !/^\d{4}-\d\d-\d\d$/.test(data ?? "") || !numero) continue;
    // "Salvatore Alessandra (XIII) - Partito Democratico,Fanelli Micaela (XIII) - …"
    const firmatari = (testo(dettagli).match(/Firmatari:\s*(.*?)\s*Data di presentazione/)?.[1] ?? "")
      .split(/,(?=\s*[A-Z][^,]*\(X)/)
      .map((f) => f.replace(/\s*\(X[IVX]*\).*$/, "").trim())
      .filter(Boolean)
      .map((f) => {
        const c = perNome.get(norm(f).split(" ").sort().join(" "));
        return c ? { nome: c.nome, username: c.username } : { nome: titleCase(f) };
      });
    const pdf = dettagli.match(/href='(atti-approvati\/[^']+\.pdf)'/)?.[1];
    atti.push(
      persona({
        id: `${tipo}-${numero}`,
        tipo,
        numero,
        data,
        titolo: celle[3].replace(/^(Mozione|Ordine del giorno|Risoluzione) ad oggetto\s*/i, "").replace(/^["“]|["”]\.?$/g, ""),
        esito: "approvata",
        esitoData: dataLunga(data),
        firmatari,
        url: pdf ? `https://consiglioweb.regione.molise.it/${encodeURI(pdf)}` : ATTI_URL,
      }),
    );
  }

  // Proposte di legge (testo originario): numero, data, titolo e PDF; i proponenti non sono indicati.
  for (let p = 0; p < 40; p++) {
    const html = await pagina(`molise-pdl-${p}.html`, `${CR_BASE}/testo-originario${p ? `?page=${p}` : ""}`);
    const righe = [...html.matchAll(/<tr[^>]*class="(?:odd|even)[^"]*"[^>]*>([\s\S]*?)<\/tr>/g)];
    let recenti = 0;
    for (const [, riga] of righe) {
      const numero = Number(testo(riga.match(/views-field-title[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? ""));
      const nodo = riga.match(/href="\/node\/(\d+)"/)?.[1];
      const data = testo(riga.match(/views-field-created[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "").match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
      if (!numero || !data || dataIso(data) < INIZIO_LEGISLATURA) continue;
      recenti++;
      const titolo = testo(riga.match(/views-field-body[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "").replace(/^["“]\s*|\s*["”]$/g, "");
      const pdf = riga.match(/href="(https:\/\/consiglio\.regione\.molise\.it\/sites\/[^"]+\.pdf)"/i)?.[1];
      atti.push(
        persona({
          id: `pdl-${numero}`,
          tipo: "pdl",
          numero,
          data: dataIso(data),
          titolo: titolo || `Proposta di legge n. ${numero} (titolo nel testo allegato)`,
          firmatari: [],
          url: pdf ?? `${CR_BASE}/node/${nodo}`,
        }),
      );
    }
    if (!recenti || !righe.length) break; // arrivati alla legislatura precedente
  }

  // ---------------------------------------------------------------- Leggi (banca dati del Consiglio, per anno)
  const leggi = [];
  for (let anno = Number(INIZIO_LEGISLATURA.slice(0, 4)); anno <= new Date().getFullYear(); anno++) {
    for (let p = 0; p < 5; p++) {
      const url = `${CR_BASE}/leggi_consiglio?${new URLSearchParams({ "field_data_value[value][year]": String(anno), ...(p ? { page: String(p) } : {}) })}`;
      const html = await pagina(`molise-leggi-${anno}-${p}.html`, url);
      const voci = [...html.matchAll(/<a href="\/node\/(\d+)">Legge regionale (\d{1,2}) (\w+) (\d{4}), n\.\s*(\d+)<\/a>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)];
      for (const [, nodo, g, mese, a, n, titolo] of voci) {
        const m = MESI.indexOf(mese.toLowerCase()) + 1;
        const data = `${a}-${String(m).padStart(2, "0")}-${g.padStart(2, "0")}`;
        if (!m || data < INIZIO_LEGISLATURA || leggi.some((l) => l.id === `${a}-${n}`)) continue;
        leggi.push(persona({ id: `${a}-${n}`, numero: Number(n), data, intestazione: `Legge regionale ${dataLunga(data)}, n. ${n}`, oggetto: testo(titolo).replace(/\.\s*$/, ""), url: `${CR_BASE}/node/${nodo}` }));
      }
      if (!html.includes(`page=${p + 1}`)) break;
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
      consiglieri: { id: "molise-cr", nome: "Consiglieri e gruppi consiliari", ente: "Consiglio regionale del Molise", url: `${CR_BASE}/13_legislatura`, raccolto: raccolto("molise-consiglieri.html") },
      giunta: { id: "molise-giunta", nome: "La Giunta regionale", ente: "Regione Molise", url: GIUNTA_URL, raccolto: raccolto("molise-giunta.html") },
      atti: { id: "molise-atti", nome: "Atti di indirizzo approvati, proposte di legge e leggi regionali", ente: "Consiglio regionale del Molise", url: ATTI_URL, raccolto: raccolto("molise-atti.html") },
    },
  };
}
