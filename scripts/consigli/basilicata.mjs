// Consiglio regionale della Basilicata "in chiaro": consiglieri, giunta, atti e leggi letti dai siti ufficiali
// (API del sito consiglio.basilicata.it e archivio atticonsiglio.consiglio.basilicata.it). Restituisce i dati nel formato
// comune dei consigli in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti, citazioni e conteggi.
//
// Note:
// - Consiglieri e gruppi vengono dall'API JSON del sito (/consiglio-api/<tipo>); la circoscrizione (Potenza o Matera) da un
//   file curato a mano. I consiglieri nominati assessori lasciano il posto a supplenti.
// - L'archivio degli atti è un'applicazione ASP.NET: elenchi e schede si aprono solo "cliccando" (postback con i campi
//   nascosti del modulo e il cookie di sessione). Gli elenchi si rileggono a ogni aggiornamento; la scheda di ogni atto
//   (oggetto completo e proponenti, che non cambiano) si scarica una volta sola e resta in data/raw.
// - Il certificato di atticonsiglio è emesso da una radice Actalis del 2025 che Node non conosce ancora: la catena è in
//   data/certificati/actalis-tls-2025.pem (verificata con quella di Windows). La verifica TLS resta attiva.

import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import tls from "node:tls";

const API = "https://www.consiglio.basilicata.it/consiglio-api";
const ATTI = "https://atticonsiglio.consiglio.basilicata.it";
const ELENCO_CONSIGLIERI = "https://www.consiglio.basilicata.it/pagina_elenco.html?ref_type_id=10010&sub_menu_id=200418&section_id=200424";
const LEGISLATURA = "12";
const LEGISLATURA_ATTI = "2024 - 2029";
const INIZIO_LEGISLATURA = "2024-04-22"; // elezioni regionali del 21 e 22 aprile 2024
/** Tipi dell'archivio (numero del link "Tipo Atto") → tipo di atto */
const TIPI_ARCHIVIO = [
  { link: 12, sigla: "PdL", tipo: "pdl" },
  { link: 6, sigla: "DdL", tipo: "pdl" },
  { link: 8, sigla: "IR", tipo: "interrogazione" },
  { link: 9, sigla: "IT", tipo: "interpellanza" },
  { link: 10, sigla: "MO", tipo: "mozione" },
];
const TIPI_ATTO = [
  { id: "pdl", nome: "Proposta di legge", plurale: "Proposte di legge" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "interpellanza", nome: "Interpellanza", plurale: "Interpellanze" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
];

export const basilicata = {
  codice: "17",
  slug: "basilicata",
  nome: "Basilicata",
  /** Codici IPA di Regione e Consiglio, per PEC e sito. */
  ipa: { regione: "r_basili", consiglio: "cr_basil" },
  /** Circoscrizione regionale di ogni provincia (sigla → nome): una per provincia. */
  circoscrizioni: { PZ: "Potenza", MT: "Matera" },
  elezione: "I consiglieri sono eletti in due circoscrizioni, Potenza e Matera. Chi è nominato assessore lascia il posto a un supplente.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Tito", "Rapone", "Calvera", "Nova Siri", "Craco"],
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataIso = (d) => {
  const [g, m, a] = d.split("/");
  return `${a}-${m.padStart(2, "0")}-${g.padStart(2, "0")}`;
};
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

/** Righe della tabella GVElenco (l'elenco dell'archivio): celle già ripulite. */
const righeGriglia = (html) => {
  const i = html.indexOf('id="MainContent_GVElenco"');
  if (i < 0) return [];
  const tabella = html.slice(i, html.indexOf("</table>", i));
  return [...tabella.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map(([, r]) => [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => testo(m[1])))
    .filter((r) => r.length >= 5 && /^\d+$/.test(r[1] ?? ""));
};

/** Sessione dell'archivio ASP.NET: cookie e campi nascosti del modulo, aggiornati a ogni risposta. */
function sessioneArchivio(ca) {
  let cookie = "";
  const richiesta = (url, corpo) =>
    new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: corpo ? "POST" : "GET",
          ca,
          headers: {
            "User-Agent": "Mozilla/5.0 (chi-mi-rappresenta)",
            ...(cookie ? { Cookie: cookie } : {}),
            ...(corpo ? { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(corpo) } : {}),
          },
          timeout: 120000,
        },
        (res) => {
          const nuovi = (res.headers["set-cookie"] ?? []).map((c) => c.split(";")[0]);
          if (nuovi.length) cookie = [...new Map([...cookie.split("; ").filter(Boolean), ...nuovi].map((c) => [c.split("=")[0], c])).values()].join("; ");
          const parti = [];
          res.on("data", (d) => parti.push(d));
          res.on("end", () => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) resolve(richiesta(new URL(res.headers.location, url).href));
            else if (res.statusCode >= 400) reject(new Error(`${url} → HTTP ${res.statusCode}`));
            else resolve(Buffer.concat(parti).toString("utf8"));
          });
        },
      );
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", reject);
      if (corpo) req.write(corpo);
      req.end();
    });
  const conRetry = async (url, corpo) => {
    for (let t = 1; ; t++) {
      try {
        return await richiesta(url, corpo);
      } catch (e) {
        if (t === 3) throw e;
        await new Promise((r) => setTimeout(r, 5000 * t));
      }
    }
  };
  /** Campi nascosti di una pagina + quelli indicati: è il "clic" su un controllo della pagina. */
  const postback = (url, html, campi) => {
    const dati = {};
    for (const n of ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION", "__PREVIOUSPAGE", "__LASTFOCUS"])
      dati[n] = html.match(new RegExp(`id="${n}" value="([^"]*)"`))?.[1] ?? "";
    return conRetry(url, new URLSearchParams({ __EVENTTARGET: "", __EVENTARGUMENT: "", ...dati, ...campi }).toString());
  };
  return { get: (url) => conRetry(url), postback };
}

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ROOT, ammreg, raccolto } = ctx;

  // ---------------------------------------------------------------- Consiglieri (API)
  const api = async (tipo) => JSON.parse(await download(`basilicata-api-${tipo}.json`, `${API}/${tipo}?size=500`)).content ?? [];
  const persone = (await api(10010)).filter((x) => x.properties?.legislatura === "XII");
  const fileGruppi = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "basilicata.json"), "utf8"));
  const nomeGruppo = (g) => (g && g !== "undefined" ? (fileGruppi.nomiSito?.[g] ?? titleCase(g, { minori: true })) : undefined);
  const circManual = JSON.parse(fs.readFileSync(path.join(MANUAL, "circoscrizioni-consiglieri", "basilicata.json"), "utf8")).consiglieri;
  const sesso = new Map(ammreg.filter((r) => r.codice_regione === basilicata.codice).map((r) => [norm(`${r.cognome} ${r.nome}`), r.sesso]));

  const consiglieri = [];
  const assessori = [];
  for (const { properties: p } of persone) {
    const nomeSito = `${titleCase(p.cognome)} ${p.nome}`;
    const nome = `${p.nome} ${titleCase(p.cognome)}`;
    const chiave = norm(`${p.cognome} ${p.nome}`);
    const gruppo = nomeGruppo(p.gruppo);
    if (p.tipologia === "Assessore") {
      assessori.push({ nome, gruppo, email: p.email, tel: p.telefono, esterno: p.esterno === "T", chiave });
      continue;
    }
    const circ = circManual[nomeSito];
    if (circ === undefined) warn(`Basilicata: consigliere senza circoscrizione nel file manuale: ${nomeSito}`);
    consiglieri.push(
      persona({
        nome,
        ruolo: p.presidente === "T" ? declina("Presidente del Consiglio regionale", sesso.get(chiave)) : declina("Consigliere regionale", sesso.get(chiave)),
        dettaglio: gruppo ? `Gruppo: ${gruppo}` : undefined,
        email: p.email,
        tel: p.telefono,
        url: ELENCO_CONSIGLIERI,
        circoscrizione: circ === "PRESIDENTE" || circ === "CANDIDATO" ? undefined : (circ ?? null),
        username: `${norm(p.cognome).toLowerCase()}.${norm(p.nome).toLowerCase().slice(0, 3)}`,
        gruppo,
        presidenteGiunta: circ === "PRESIDENTE" || undefined,
      }),
    );
  }
  for (const c of consiglieri)
    if (c.gruppo && !fileGruppi.gruppi[c.gruppo]) warn(`Gruppo consiliare senza coalizione/colore in data/manual/gruppi-consiliari/basilicata.json: ${c.gruppo}`);
  consiglieri.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${consiglieri.length} consiglieri regionali, ${assessori.length} assessori`);

  // ---------------------------------------------------------------- Giunta (assessori dall'API: le deleghe non sono pubblicate lì)
  const consPresidente = consiglieri.find((c) => c.presidenteGiunta);
  const regione = {
    nome: basilicata.nome,
    presidente: consPresidente ? persona({ ...consPresidente, presidenteGiunta: undefined, ruolo: "Presidente della Regione" }) : null,
    giunta: assessori.map((a) =>
      persona({
        nome: a.nome,
        ruolo: declina("Assessore", sesso.get(a.chiave)),
        dettaglio: a.esterno ? "Assessore esterno (non eletto in Consiglio)" : a.gruppo ? `Gruppo: ${a.gruppo}` : undefined,
        email: a.email && a.email !== "undefined" ? a.email : undefined,
        tel: a.tel && a.tel !== "undefined" ? a.tel : undefined,
        url: ELENCO_CONSIGLIERI,
      }),
    ),
    consiglieri: consiglieri.filter((c) => c !== consPresidente).map(({ presidenteGiunta, ...c }) => c),
    gruppi: Object.entries(fileGruppi.gruppi).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti (archivio ASP.NET)
  const ca = [...tls.rootCertificates, fs.readFileSync(path.join(ROOT, "data", "certificati", "actalis-tls-2025.pem"), "utf8")];
  const s = sessioneArchivio(ca);
  // Abbinamento dei proponenti ai consiglieri in carica. Sono scritti in modi diversi: "LACORAZZA P.", "Lacorazza Piero",
  // "Morea N. M.", "Leone R.l.": cognome (anche doppio) più, se c'è, il nome o le sue iniziali.
  const candidati = regione.consiglieri.map((c) => {
    const p = persone.find((x) => `${x.properties.nome} ${titleCase(x.properties.cognome)}` === c.nome)?.properties;
    return { c, cognome: norm(p?.cognome ?? c.nome.split(" ").pop()).split(" "), nome: norm(p?.nome ?? "").split(" ") };
  });
  const perCognome = (voce) => {
    const parole = norm(voce).split(" ").filter(Boolean);
    const trovati = candidati.filter(({ cognome, nome }) => cognome.every((w) => parole.includes(w)) && parole.filter((w) => !cognome.includes(w)).every((w) => nome.some((n) => n.startsWith(w))));
    return trovati.length === 1 ? trovati[0].c : undefined;
  };
  const atti = [];
  let elencoAtti;
  try {
    const home = await s.get(`${ATTI}/`);
    elencoAtti = await s.postback(`${ATTI}/`, home, { __EVENTTARGET: "ctl00$MainContent$Lnk2" });
  } catch (e) {
    warnGruppo("Pagine del Consiglio regionale della Basilicata non lette", `archivio atti (${e.message})`);
  }
  for (const t of elencoAtti ? TIPI_ARCHIVIO : []) {
    const fileElenco = path.join(RAW, `basilicata-atti-${t.sigla}.html`);
    let elenco;
    if (!REFRESH && fs.existsSync(fileElenco)) elenco = fs.readFileSync(fileElenco, "utf8");
    else {
      try {
        elenco = await s.postback(`${ATTI}/AD_Elenco_Atti_Segreteria_Commissioni`, elencoAtti, {
          __EVENTTARGET: `ctl00$MainContent$LnkTipoAtto${t.link}`,
          "ctl00$MainContent$DDLRisultati": "Tutti",
          "ctl00$MainContent$DDLLegislatura": LEGISLATURA_ATTI,
        });
        fs.writeFileSync(fileElenco, elenco);
        await sleep(500);
      } catch (e) {
        warnGruppo("Pagine del Consiglio regionale della Basilicata non lette", `${t.sigla} (${e.message})`);
        continue;
      }
    }
    const righe = righeGriglia(elenco);
    // colonne: [selezione, anno, tipo, numero, protocollo, data, oggetto (troncato), stato]
    for (const [i, r] of righe.entries()) {
      const numero = Number(r[3]);
      const data = r[5]?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
      if (!numero || !data) continue;
      // Scheda dell'atto: si scarica una volta sola (oggetto completo e proponenti non cambiano)
      const fileScheda = path.join(RAW, `basilicata-atto-${t.sigla}-${numero}.html`);
      let scheda = fs.existsSync(fileScheda) ? fs.readFileSync(fileScheda, "utf8") : "";
      if (!scheda) {
        try {
          const pagina = await s.postback(`${ATTI}/AD_Elenco_Atti_Segreteria_Commissioni`, elenco, {
            __EVENTTARGET: "ctl00$MainContent$GVElenco",
            __EVENTARGUMENT: `Select$${i}`,
            "ctl00$MainContent$DDLRisultati": "Tutti",
            "ctl00$MainContent$DDLLegislatura": LEGISLATURA_ATTI,
          });
          // teniamo solo il riquadro di dettaglio
          const inizio = pagina.indexOf("Tipo Atto:");
          scheda = inizio > 0 ? pagina.slice(Math.max(0, inizio - 2000), inizio + 8000) : "";
          if (scheda && testo(scheda).includes(`Numero Atto ${numero}`)) fs.writeFileSync(fileScheda, scheda);
          else scheda = "";
          await sleep(400);
        } catch (e) {
          warnGruppo("Pagine del Consiglio regionale della Basilicata non lette", `scheda ${t.sigla} ${numero} (${e.message})`);
        }
      }
      const det = testo(scheda);
      const oggetto = det.match(/Oggetto\s+(.*?)\s+Proponente\s/)?.[1] ?? r[6];
      const proponenti = (det.match(/Proponente\s+(.*?)\s+Destinatario/)?.[1] ?? "")
        .split(/;|,/)
        .map((x) => x.trim())
        .filter((x) => x && !/^ed altri$/i.test(x));
      const firmatari = proponenti.map((p) => {
        const c = perCognome(p);
        return c ? { nome: c.nome, username: c.username } : { nome: /GIUNTA|^G\.\s*R\.?$/i.test(p) ? "Giunta regionale" : titleCase(p) };
      });
      atti.push(
        persona({
          id: `${t.sigla.toLowerCase()}-${numero}`,
          tipo: t.tipo,
          numero,
          data: dataIso(data),
          titolo: oggetto
            .replace(/^(Interrogazione|Interpellanza|Mozione)[^:]*avente ad oggetto:\s*/i, "")
            .replace(/^["“]\s*|\s*["”]\.?$/g, "")
            .replace(/\s*\.\.\.$/, "…"),
          firmatari: firmatari.length ? firmatari : t.sigla === "DdL" ? [{ nome: "Giunta regionale" }] : [],
          url: `${ATTI}/AD_Elenco_Atti_Segreteria_Commissioni`,
        }),
      );
    }
  }

  // ---------------------------------------------------------------- Leggi (elenco dell'archivio, dalla più recente)
  const leggi = [];
  try {
    let html = await s.get(`${ATTI}/AD_Elenco_Leggi`);
    for (let pagina = 1; pagina <= 40; pagina++) {
      if (pagina > 1) {
        html = await s.postback(`${ATTI}/AD_Elenco_Leggi`, html, { __EVENTTARGET: "ctl00$MainContent$GVElenco", __EVENTARGUMENT: `Page$${pagina}` });
        await sleep(400);
      }
      const righe = righeGriglia(html);
      // colonne: [selezione, numero, data, tipo, testo, titolo]
      let vecchie = 0;
      for (const r of righe) {
        const data = r[2]?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
        if (!data || !/^Legger?/i.test(r[3] ?? "")) continue;
        const iso = dataIso(data);
        if (iso < INIZIO_LEGISLATURA) {
          vecchie++;
          continue;
        }
        const id = `${iso.slice(0, 4)}-${r[1]}`;
        if (leggi.some((l) => l.id === id)) continue;
        leggi.push(persona({ id, numero: Number(r[1]), data: iso, intestazione: `Legge regionale ${dataLunga(iso)}, n. ${r[1]}`, oggetto: r[5].replace(/\.\s*$/, ""), url: `${ATTI}/AD_Elenco_Leggi` }));
      }
      if (vecchie || !righe.length) break; // arrivati alla legislatura precedente
    }
    fs.writeFileSync(path.join(RAW, "basilicata-leggi.json"), JSON.stringify(leggi));
  } catch (e) {
    warnGruppo("Pagine del Consiglio regionale della Basilicata non lette", `leggi (${e.message})`);
    // riserva: l'elenco letto la volta precedente
    const riserva = path.join(RAW, "basilicata-leggi.json");
    if (fs.existsSync(riserva)) leggi.push(...JSON.parse(fs.readFileSync(riserva, "utf8")));
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
      consiglieri: { id: "basilicata-cr", nome: "Consiglieri, gruppi e assessori", ente: "Consiglio regionale della Basilicata", url: ELENCO_CONSIGLIERI, raccolto: raccolto("basilicata-api-10010.json") },
      giunta: { id: "basilicata-giunta", nome: "Assessori regionali (sito del Consiglio)", ente: "Consiglio regionale della Basilicata", url: ELENCO_CONSIGLIERI, raccolto: raccolto("basilicata-api-10010.json") },
      atti: { id: "basilicata-atti", nome: "Atti dell'Assemblea e leggi regionali", ente: "Consiglio regionale della Basilicata", url: `${ATTI}/`, raccolto: raccolto("basilicata-atti-IR.html") },
      circoscrizioni: { id: "basilicata-circoscrizioni", nome: "Circoscrizione di elezione dei consiglieri regionali (elezioni 2024)", ente: "Wikipedia (verificato a mano)", url: "https://it.wikipedia.org/wiki/Elezioni_regionali_in_Basilicata_del_2024" },
    },
  };
}
