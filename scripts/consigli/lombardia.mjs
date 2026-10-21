// Consiglio regionale della Lombardia "in chiaro": consiglieri, gruppi, atti e leggi letti dai servizi del sito
// del Consiglio (consiglio.regione.lombardia.it), gli stessi che usa il sito per le sue pagine. Restituisce i dati nel formato
// comune dei consigli in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti, citazioni e conteggi.
//
// Note:
// - consiglieri e gruppi: open data del Consiglio (CaricheConsiglieri, ComposizioneGruppi); l'email è nella pagina di ogni
//   consigliere, il cui indirizzo è in un file curato a mano (data/manual/schede-consiglieri/lombardia.json: il sito lo
//   costruisce con JavaScript). La circoscrizione di elezione non è pubblicata: data/manual/circoscrizioni-consiglieri/lombardia.json.
// - giunta: anagrafe degli amministratori regionali del Ministero dell'Interno.
// - interrogazioni, mozioni e altri atti di indirizzo: banca dati GEDASI; la scheda di ogni atto (data, firmatari, stato) si
//   scarica una volta sola e si riscarica solo finché l'atto è recente e ancora aperto.
// - progetti di legge e leggi: banca dati GEA (le leggi sono i progetti con numero di legge regionale); testo su NormeLombardia.

import fs from "node:fs";
import path from "node:path";

const CR_BASE = "https://www.consiglio.regione.lombardia.it";
const SERVIZI = `${CR_BASE}/wps/RLCRLServiceIntegrator`;
const PORTALE = `${CR_BASE}/wps/portal/crl/home`;
const LEGISLATURA = "XII";
const ID_LEGISLATURA_GEDASI = 33; // la XII legislatura nella banca dati GEDASI
const INIZIO_LEGISLATURA = "2023-02-13"; // elezioni regionali del 12 e 13 febbraio 2023
const TIPI_ATTO = [
  { id: "pdl", nome: "Progetto di legge", plurale: "Progetti di legge" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "question-time", nome: "Interrogazione a risposta immediata", plurale: "Interrogazioni a risposta immediata" },
  { id: "interpellanza", nome: "Interpellanza", plurale: "Interpellanze" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
  { id: "risoluzione", nome: "Risoluzione", plurale: "Risoluzioni" },
  { id: "odg", nome: "Ordine del giorno", plurale: "Ordini del giorno" },
];
/** Sigla GEDASI → tipo di atto */
// Gli ordini del giorno (ODG) non si includono: sono migliaia, quasi tutti legati all'esame del bilancio.
const TIPI_GEDASI = { ITR: "interrogazione", IQT: "question-time", ITL: "interpellanza", MOZ: "mozione", RIS: "risoluzione" };

export const lombardia = {
  codice: "03",
  slug: "lombardia",
  nome: "Lombardia",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_lombar", consiglio: "r_lomb" },
  /** Circoscrizione regionale di ogni provincia (sigla → nome): una per provincia. */
  circoscrizioni: {
    MI: "Milano",
    BG: "Bergamo",
    BS: "Brescia",
    CO: "Como",
    CR: "Cremona",
    LC: "Lecco",
    LO: "Lodi",
    MN: "Mantova",
    MB: "Monza e Brianza",
    PV: "Pavia",
    SO: "Sondrio",
    VA: "Varese",
  },
  elezione: "I consiglieri sono eletti in dodici circoscrizioni, una per provincia.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Calcio", "Cene", "Isso", "Mese", "Rea", "Lirio", "Bema"],
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** "20/10/2026 13:21:40" → "2026-10-20" */
const dataIso = (d) => {
  const [g, m, a] = d.slice(0, 10).split("/");
  return `${a}-${m.padStart(2, "0")}-${g.padStart(2, "0")}`;
};
/** Oggetti tra virgolette di vario tipo (anche "?" al posto delle virgolette curve perse nella codifica del servizio). */
const pulisciOggetto = (s) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[“”"«»?\u0093\u0094]+\s*|\s*[“”"«»?\u0093\u0094]+$/g, "")
    .replace(/\.\s*$/, "");

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;

  /** Risposta JSON di un servizio del Consiglio; `latin1`: i servizi GEA rispondono in ISO-8859-1. */
  async function servizio(file, url, { latin1 = false } = {}) {
    try {
      const buf = await download(file, url, { binary: true });
      return JSON.parse(Buffer.from(buf).toString(latin1 ? "latin1" : "utf8"));
    } catch (e) {
      warnGruppo("Servizi del Consiglio regionale della Lombardia non letti", `${file} (${e.message})`);
      return null;
    }
  }
  /** Chiave di confronto dei nomi che non dipende dall'ordine nome/cognome. */
  const chiave = (s) => norm(s).split(" ").sort().join(" ");

  // ---------------------------------------------------------------- Consiglieri
  const cariche = (await servizio("lombardia-consiglieri.json", `${SERVIZI}/jsp/opendata/CaricheConsiglieri.jsp?legislatura=${LEGISLATURA}&id_organo=127&ordine=4&order=cognome%2Cnome`))?.results ?? [];
  const inCarica = cariche.filter((c) => !c.data_fine_carica);
  if (inCarica.length < 75) warn(`Lombardia: trovati solo ${inCarica.length} consiglieri in carica negli open data del Consiglio (cambiato il servizio?)`);
  const gruppiRighe = (await servizio("lombardia-gruppi.json", `${SERVIZI}/jsp/opendata/ComposizioneGruppi.jsp?legislatura=${LEGISLATURA}`))?.results ?? [];
  const fileGruppi = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "lombardia.json"), "utf8"));
  const nomiGruppi = fileGruppi.nomiSito ?? {};
  const gruppoDi = new Map();
  for (const g of gruppiRighe.filter((r) => !r.data_fine_carica)) {
    const nomeSito = g.nome_gruppo.trim().toUpperCase();
    const nome = nomiGruppi[nomeSito];
    if (!nome) warn(`Gruppo consiliare della Lombardia senza nome in data/manual/gruppi-consiliari/lombardia.json (nomiSito): ${g.nome_gruppo}`);
    gruppoDi.set(g.id_consigliere, { nome: nome ?? titleCase(g.nome_gruppo), capogruppo: /^capogruppo|presidente/i.test(g.nome_carica ?? "") });
  }

  const circManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "circoscrizioni-consiglieri", "lombardia.json"), "utf8")).consiglieri;
  const circPerChiave = new Map(Object.entries(circManual).map(([n, c]) => [chiave(n), c]));
  const schede = JSON.parse(fs.readFileSync(path.join(MANUAL, "schede-consiglieri", "lombardia.json"), "utf8")).consiglieri;
  const schedaPerChiave = new Map(Object.entries(schede).map(([n, p]) => [chiave(n), p]));
  const righeMinistero = ammreg.filter((r) => r.codice_regione === lombardia.codice);
  const sesso = new Map(righeMinistero.map((r) => [chiave(`${r.cognome} ${r.nome}`), r.sesso]));
  const incaricoMinistero = new Map(righeMinistero.map((r) => [chiave(`${r.cognome} ${r.nome}`), r.incarico]));

  const consiglieri = [];
  for (const c of inCarica) {
    const nome = titleCase(`${c.nome} ${c.cognome}`);
    const k = chiave(`${c.cognome} ${c.nome}`);
    // Email dalla pagina del consigliere (indirizzo nel file manuale)
    const percorso = schedaPerChiave.get(k);
    let email;
    if (percorso) {
      try {
        const html = await download(`lombardia-consigliere-${c.id_consigliere}.html`, `${PORTALE}/istituzione/I-Consiglieri/elenco-consiglieri/${percorso}`);
        // nella pagina c'è anche l'indirizzo dell'URP: si prende il primo che non sia di un ufficio
        email = [...html.matchAll(/([a-z0-9._-]+@consiglio\.regione\.lombardia\.it)/gi)].map((m) => m[1].toLowerCase()).find((e) => !/^(urp|protocollo)/.test(e));
      } catch {
        warnGruppo("Pagine dei consiglieri della Lombardia non lette", nome);
      }
    } else warn(`Lombardia: consigliere senza pagina in data/manual/schede-consiglieri/lombardia.json: ${c.cognome} ${c.nome}`);
    // stessi nomi; oppure stesso cognome (anche scritto staccato: "Del Bono") e stesso primo nome ("Davide Carlo" / "Davide")
    const senzaSpazi = (s) => norm(s).replace(/ /g, "");
    const circ =
      circPerChiave.get(k) ??
      Object.entries(circManual).find(([n]) => senzaSpazi(n).includes(senzaSpazi(c.cognome)) && norm(n).split(" ").includes(norm(c.nome).split(" ")[0]))?.[1];
    const presidenzaConsiglio = /^Presidente del consiglio/i.test(incaricoMinistero.get(k) ?? "");
    const g = gruppoDi.get(c.id_consigliere);
    consiglieri.push(
      persona({
        nome,
        ruolo: presidenzaConsiglio ? declina("Presidente del Consiglio regionale", sesso.get(k)) : declina("Consigliere regionale", sesso.get(k)),
        dettaglio: g ? `Gruppo: ${g.nome}` : undefined,
        email,
        url: percorso ? `${PORTALE}/istituzione/I-Consiglieri/elenco-consiglieri/${percorso}` : undefined,
        // PRESIDENTE e CANDIDATO: eletti come candidati alla presidenza, senza circoscrizione; chi non è nel file è subentrato
        circoscrizione: circ === "PRESIDENTE" || circ === "CANDIDATO" ? undefined : (circ ?? null),
        username: `${norm(c.cognome).toLowerCase().replace(/ /g, "-")}.${norm(c.nome).toLowerCase().replace(/ /g, "").slice(0, 3)}`,
        gruppo: g?.nome,
        ruoloGruppo: g?.capogruppo ? "Capogruppo" : undefined,
        idCrl: c.id_consigliere,
        presidente: circ === "PRESIDENTE",
      }),
    );
  }
  for (const [n, c] of Object.entries(circManual))
    if (c !== null && !consiglieri.some((x) => chiave(x.nome) === chiave(n)) && c !== "PRESIDENTE")
      warnGruppo("Lombardia: eletti nel 2023 non più in carica (subentrati altri)", n);
  const ripetuti = new Set(consiglieri.map((c) => c.username).filter((u, i, l) => l.indexOf(u) !== i));
  if (ripetuti.size) warn(`Lombardia: identificativi dei consiglieri ripetuti: ${[...ripetuti].join(", ")}`);
  for (const c of consiglieri) if (c.gruppo && !fileGruppi.gruppi[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/lombardia.json: ${c.gruppo}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali`);

  // ---------------------------------------------------------------- Giunta (anagrafe del Ministero dell'Interno)
  const presRiga = righeMinistero.find((r) => r.descrizione_carica === "Presidente della regione");
  const consPresidente = consiglieri.find((c) => c.presidente) ?? (presRiga && consiglieri.find((c) => chiave(c.nome) === chiave(`${presRiga.nome} ${presRiga.cognome}`)));
  const giunta = righeMinistero
    .filter((r) => r.descrizione_carica.startsWith("Assessore"))
    .map((r) =>
      persona({
        nome: titleCase(`${r.nome} ${r.cognome}`),
        ruolo: /Vicepresidente/i.test(r.incarico) ? "Vicepresidente e assessore" : declina("Assessore", r.sesso),
        sesso: r.sesso === "F" || r.sesso === "M" ? r.sesso : undefined,
      }),
    )
    .sort((a, b) => (a.ruolo.startsWith("Vice") ? -1 : 0) - (b.ruolo.startsWith("Vice") ? -1 : 0) || a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  if (!giunta.length) warn("Lombardia: Giunta regionale, nessun assessore nell'anagrafe del Ministero");
  const pulisci = ({ idCrl, presidente, ...c }) => c;
  const regione = {
    nome: lombardia.nome,
    presidente: presRiga
      ? persona({ ...(consPresidente ? pulisci(consPresidente) : {}), circoscrizione: undefined, nome: titleCase(`${presRiga.nome} ${presRiga.cognome}`), ruolo: declina("Presidente della Regione", presRiga.sesso) })
      : null,
    giunta,
    consiglieri: consiglieri.filter((c) => c !== consPresidente).map(pulisci),
    gruppi: Object.entries(fileGruppi.gruppi).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti di indirizzo e controllo (GEDASI)
  const perId = new Map(consiglieri.filter((c) => c !== consPresidente).map((c) => [String(c.idCrl), c]));
  const perNomeCons = new Map(consiglieri.filter((c) => c !== consPresidente).map((c) => [chiave(c.nome), c]));
  const atti = [];
  const elenco = [];
  for (let pagina = 1; pagina <= 40; pagina++) {
    const r = await servizio(
      `lombardia-atti-${pagina}.json`,
      `${SERVIZI}/gedasi?context=cerca&id_legislatura=${ID_LEGISLATURA_GEDASI}&id_proponente=%5B%5D&page=${pagina}&size=500`,
    );
    if (!r) break;
    elenco.push(...(r.results ?? []));
    if (!r.paging?.has_Next) break;
  }
  if (elenco.length < 5000) warn(`Lombardia: solo ${elenco.length} atti di indirizzo e controllo nella banca dati GEDASI (cambiato il servizio?)`);
  const oggi = new Date().toISOString().slice(0, 10);
  const giorniFa = (iso) => (Date.parse(oggi) - Date.parse(iso)) / 86400000;
  let scaricate = 0;
  for (const voce of elenco) {
    const tipo = TIPI_GEDASI[voce.tipo];
    if (!tipo) continue;
    // Scheda dell'atto: si tiene per sempre, tranne se l'atto è recente e ancora in corso (può arrivare la risposta o il voto)
    const fileScheda = path.join(RAW, `lombardia-atto-${voce.tipo}-${voce.natto}.json`);
    let det = fs.existsSync(fileScheda) ? JSON.parse(fs.readFileSync(fileScheda, "utf8")) : null;
    const daRileggere = det && REFRESH && /presentat|in trattazione/i.test(det.stato ?? "") && giorniFa(dataIso(det.data_presentazione)) < 180;
    if (!det || daRileggere) {
      try {
        const res = await fetch(`${SERVIZI}/gedasi?context=atto&uidAtto=${voce.uidAtto}`, { headers: { "User-Agent": "chi-mi-rappresenta/0.1 (progetto civico open source)" } });
        if (res.ok) {
          const nuovo = await res.json();
          if (nuovo?.data_presentazione) {
            det = nuovo;
            fs.writeFileSync(fileScheda, JSON.stringify(det));
            scaricate++;
          }
        }
        await sleep(150);
      } catch (e) {
        warnGruppo("Schede degli atti del Consiglio regionale della Lombardia non lette", `${voce.display} (${e.message})`);
      }
    }
    if (!det?.data_presentazione || !(det.oggetto ?? voce.oggetto)) continue;
    const firme = (det.firme ?? []).filter((f) => !f.data_ritirofirma).sort((a, b) => Number(Boolean(b.primoFirmatario)) - Number(Boolean(a.primoFirmatario)));
    const firmatari = firme.map((f) => {
      // di solito l'identificativo della firma è quello del consigliere; per alcuni no: allora si confronta il nome
      const nomeFirma = f.firmaCert.replace(/\s*\([^)]*\)\s*$/, "");
      const c = perId.get(String(f.id_persona)) ?? perNomeCons.get(chiave(nomeFirma));
      return c ? { nome: c.nome, username: c.username } : { nome: titleCase(f.firmaCert.replace(/\s*\([^)]*\)\s*$/, "").replace(/^(\S+(?:\s+[A-Z'’]+)*)\s+(.+)$/, "$2 $1")) };
    });
    // esito in "stato_iter" quando l'atto è concluso: Approvato, Respinto, Ritirato, Decaduto, Inammissibile
    const stato = det.stato_iter ?? "";
    const esito = /approvat/i.test(stato)
      ? "approvata"
      : /respint/i.test(stato)
        ? "respinta"
        : /ritirat/i.test(stato)
          ? "ritirata"
          : /decadut|inammissib/i.test(stato)
            ? "decaduta"
            : undefined;
    atti.push(
      persona({
        id: `${tipo}-${det.n_atto}`,
        tipo,
        numero: Number(det.n_atto),
        data: dataIso(det.data_presentazione),
        titolo: pulisciOggetto(det.oggetto ?? voce.oggetto ?? ""),
        esito,
        esitoData: esito && det.data_chiusura_iter ? dataIso(det.data_chiusura_iter) : undefined,
        commissione: det.commissioni?.[0]?.descr?.replace(/^.*?Commissione\s+(permanente\s+)?(-\s*)?/i, "") || undefined,
        firmatari,
        url: `${PORTALE}/leggi-e-banche-dati/Atti-di-indirizzo-e-controllo/Dettaglio-atto-di-indirizzo-e-controllo?tipoatto=${voce.tipo}&numeroatto=${voce.natto}&idlegislatura=${ID_LEGISLATURA_GEDASI}&uid=${voce.uidAtto}`,
      }),
    );
  }
  if (scaricate) console.log(`  ${scaricate} schede di atti scaricate`);

  // ---------------------------------------------------------------- Progetti di legge e leggi (GEA)
  const pdl = [];
  for (let start = 0; start < 2000; start += 20) {
    const r = await servizio(
      `lombardia-pdl-${start / 20 + 1}.json`,
      `${SERVIZI}/jsp/gea/RicercaGEA.jsp?legislatura=${LEGISLATURA}&tipo_atto=PDL&start=${start}&limit=20`,
      { latin1: true },
    );
    const pagina = r?.results?.[0]?.atti ?? [];
    pdl.push(...pagina);
    if (pagina.length < 20) break;
  }
  if (pdl.length < 150) warn(`Lombardia: solo ${pdl.length} progetti di legge nella banca dati GEA (cambiato il servizio?)`);
  const perNome = new Map(consiglieri.map((c) => [chiave(c.nome), c]));
  const leggi = [];
  for (const p of pdl) {
    const numero = Number(p.numeroAtto);
    if (!numero || !p.dataPresentazione || !p.oggetto) continue;
    const iniziativa = p.tipoIniziativa ?? "";
    const nomiFirmatari = (p.elencoFirmatari || p.primoFirmatario || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const firmatari = /GIUNTA/i.test(iniziativa)
      ? [{ nome: "Giunta regionale" }]
      : /POPOLARE/i.test(iniziativa)
        ? [{ nome: "Iniziativa popolare" }]
        : nomiFirmatari.length
          ? nomiFirmatari.map((n) => {
              const c = perNome.get(chiave(n));
              return c ? { nome: c.nome, username: c.username } : { nome: titleCase(n) };
            })
          : /CONSILIARE/i.test(iniziativa) || !iniziativa
            ? []
            : [{ nome: titleCase(iniziativa.replace(/^\d+_\s*/, "").replace(/^ATTO DI INIZIATIVA\s*/i, "")) }];
    let esito;
    let esitoData;
    if (p.numeroLr && p.dataLR) {
      esito = "approvata";
      esitoData = `legge regionale n. ${Number(p.numeroLr)}/${p.dataLR.slice(0, 4)}`;
    } else if (/respint/i.test(`${p.esitoVotazioneAula} ${p.tipoChiusura}`)) esito = "respinta";
    else if (/ritirat/i.test(p.tipoChiusura ?? "")) esito = "ritirata";
    else if (/decadut/i.test(p.tipoChiusura ?? "")) esito = "decaduta";
    atti.push(
      persona({
        id: `pdl-${numero}${p.estensioneAtto ? `-${p.estensioneAtto}` : ""}`,
        tipo: "pdl",
        numero,
        data: p.dataPresentazione,
        titolo: pulisciOggetto(p.oggetto ?? ""),
        esito,
        esitoData,
        commissione: p.commissioniNonConsultive?.split(",")[0]?.replace(/^.*?Commissione permanente\s*-\s*/i, "")?.trim() || undefined,
        firmatari,
        url: `${PORTALE}/leggi-e-banche-dati/Elenco-generale-atti/Dettaglio-atto?tipoatto=Pdl&numeroatto=${numero}&estensioneatto=${p.estensioneAtto ?? ""}&legislatura=${LEGISLATURA}`,
      }),
    );
    if (p.numeroLr && p.dataLR && p.dataLR >= INIZIO_LEGISLATURA) {
      const n = Number(p.numeroLr);
      leggi.push(
        persona({
          id: `${p.dataLR.slice(0, 4)}-${n}`,
          numero: n,
          data: p.dataLR,
          intestazione: `Legge regionale ${dataLunga(p.dataLR)}, n. ${n}`,
          oggetto: pulisciOggetto(p.oggetto ?? ""),
          // scheda del progetto di legge sul sito del Consiglio, con il testo approvato: l'indirizzo del testo su NormeLombardia
          // dipende dalla data della legge, che nella banca dati GEA a volte è sbagliata di qualche giorno
          url: `${PORTALE}/leggi-e-banche-dati/Elenco-generale-atti/Dettaglio-atto?tipoatto=Pdl&numeroatto=${numero}&estensioneatto=${p.estensioneAtto ?? ""}&legislatura=${LEGISLATURA}`,
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
      consiglieri: { id: "lombardia-cr", nome: "Consiglieri e gruppi (open data)", ente: "Consiglio regionale della Lombardia", url: `${PORTALE}/istituzione/I-Consiglieri/elenco-consiglieri`, raccolto: raccolto("lombardia-consiglieri.json") },
      giunta: { id: "lombardia-giunta", nome: "Anagrafe degli amministratori regionali", ente: "Ministero dell'Interno", url: "https://dait.interno.gov.it/elezioni/open-data/amministratori-regionali", raccolto: raccolto("ammreg.csv") },
      atti: { id: "lombardia-atti", nome: "Atti di indirizzo e controllo, progetti di legge e leggi", ente: "Consiglio regionale della Lombardia", url: `${PORTALE}/leggi-e-banche-dati/Atti-di-indirizzo-e-controllo`, raccolto: raccolto("lombardia-atti-1.json") },
      circoscrizioni: { id: "lombardia-circoscrizioni", nome: "Circoscrizione di elezione dei consiglieri regionali (elezioni 2023)", ente: "Wikipedia (verificato a mano)", url: "https://it.wikipedia.org/wiki/Elezioni_regionali_in_Lombardia_del_2023" },
    },
  };
}
