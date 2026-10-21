// Assemblea regionale siciliana (ARS) "in chiaro": deputati, giunta, atti e leggi letti dai siti ufficiali
// (ars.sicilia.it e il motore di ricerca ICARO su dati.ars.sicilia.it). Restituisce i dati nel formato comune dei consigli
// in chiaro: la pipeline (scripts/build-data.mjs) aggiunge contatti, riassunti, citazioni e conteggi.
//
// Note:
// - deputati: la pagina di ogni deputato ha collegio di elezione, gruppo, email e incarichi. Chi ha lasciato l'Assemblea
//   (dimesso, decaduto, eletto altrove) ha una data di fine nell'iscrizione al gruppo e non conta.
// - atti e leggi: ICARO risponde a interrogazioni testuali ("18.LEGISL" = XVIII legislatura) con elenchi a pagine da 10,
//   legati a una sessione: si apre la ricerca e poi si leggono le pagine. Le leggi sono elencate articolo per articolo.
// - i disegni di legge negli elenchi non hanno i firmatari: si ricavano con una ricerca per primo firmatario per ogni deputato.

import fs from "node:fs";
import path from "node:path";

const ARS = "https://www.ars.sicilia.it";
const ICARO = "https://dati.ars.sicilia.it/icaro";
const LEGISLATURA = "XVIII";
const INIZIO_LEGISLATURA = "2022-09-25"; // elezioni regionali del 25 settembre 2022
const UA = "chi-mi-rappresenta/0.1 (progetto civico open source)";
/** Prime parole che fanno parte del cognome ("Di Paola Nunzio", "La Vardera Ismaele"). */
const PARTICELLE = new Set(["de", "di", "da", "del", "della", "la", "lo", "li", "d'", "dell'"]);
/**
 * Nomi che la pagina dell'ARS non permette di dividere da sola: "Cognome Nome" sul sito → [cognome, nome, nome
 * nell'anagrafe del Ministero se diverso, sesso se manca nell'anagrafe]. Verificati sulle pagine dei deputati e sull'anagrafe.
 */
const NOMI_DEPUTATI = {
  "Cirrone Cipolla Rosa": ["Cirrone Cipolla", "Rosa", undefined, "F"], // subentrata, non ancora nell'anagrafe
  "Daidone Letterio Dario": ["Daidone", "Dario", "DAIDONE LETTERIO DARIO"],
  "La Rocca Margherita": ["La Rocca Ruvolo", "Margherita"],
};
const TIPI_ATTO = [
  { id: "pdl", nome: "Disegno di legge", plurale: "Disegni di legge" },
  { id: "interrogazione", nome: "Interrogazione", plurale: "Interrogazioni" },
  { id: "interpellanza", nome: "Interpellanza", plurale: "Interpellanze" },
  { id: "mozione", nome: "Mozione", plurale: "Mozioni" },
  { id: "risoluzione", nome: "Risoluzione", plurale: "Risoluzioni" },
  { id: "odg", nome: "Ordine del giorno", plurale: "Ordini del giorno" },
];
/** Banche dati di ICARO → tipo di atto */
const BANCHE = [
  [233, "interrogazione"],
  [234, "interpellanza"],
  [235, "mozione"],
  [238, "risoluzione"],
  [236, "odg"],
];
/** Circoscrizione di chi è eletto nel collegio regionale (il "listino" collegato al presidente): come LISTA_REGIONALE in src/lib/format.ts. */
export const LISTA_REGIONALE = "Lista regionale";

export const sicilia = {
  codice: "19",
  slug: "sicilia",
  nome: "Sicilia",
  /** Codici IPA di Regione e Assemblea, per PEC e sito. */
  ipa: { regione: "r_sicili", consiglio: "ars_pa" },
  /** Circoscrizione regionale di ogni provincia (sigla → nome): una per provincia. */
  circoscrizioni: { AG: "Agrigento", CL: "Caltanissetta", CT: "Catania", EN: "Enna", ME: "Messina", PA: "Palermo", RG: "Ragusa", SR: "Siracusa", TP: "Trapani" },
  elezione: "I deputati sono eletti in nove collegi, uno per provincia, più alcuni nel collegio regionale collegato al presidente.",
  /** Nomi di comuni che sono anche parole comuni: nei titoli degli atti contano solo come "Comune di …". */
  comuniAmbigui: ["Alì", "Leni"],
  leggi: leggiConsiglio,
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataLunga = (iso) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** "15.09.26" o "13.12.2022" → "2026-09-15" / "2022-12-13"; "28-12-2022" → "2022-12-28" */
const dataIso = (d) => {
  const [g, m, a] = d.split(/[.\-/]/);
  if (!g || !m || !a) return undefined;
  return `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, "0")}-${g.padStart(2, "0")}`;
};
/** Testo di un frammento HTML: tag tolti, entità decodificate. */
const testo = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function leggiConsiglio(ctx) {
  const { download, persona, titleCase, norm, declina, sleep, warn, warnGruppo, REFRESH, RAW, MANUAL, ammreg, raccolto } = ctx;
  const chiave = (s) => norm(s).split(" ").sort().join(" ");

  async function pagina(file, url) {
    const cached = fs.existsSync(path.join(RAW, file));
    try {
      const html = await download(file, url);
      if (!cached || REFRESH) await sleep(250);
      return html;
    } catch {
      warnGruppo("Pagine dell'Assemblea regionale siciliana non lette", file);
      return "";
    }
  }

  /**
   * Tutte le righe di una ricerca ICARO. La sessione si apre solo se serve scaricare qualche pagina.
   * `nome`: prefisso dei file in data/raw.
   */
  async function icaro(db, query, nome) {
    let cookie;
    const apri = async () => {
      if (cookie !== undefined) return;
      const r = await fetch(`${ICARO}/default.jsp?icaDB=${db}&icaQuery=${encodeURIComponent(query)}`, { headers: { "User-Agent": UA } });
      cookie = (r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie") ?? ""]).map((c) => c.split(";")[0]).join("; ");
      await r.arrayBuffer();
    };
    const leggi = async (n) => {
      try {
        const buf = await download(`${nome}-${n}.html`, `${ICARO}/shortList.jsp?setPage=${n}`, {
          binary: true,
          richiesta: async () => {
            await apri();
            await sleep(200);
            return { headers: { Cookie: cookie } };
          },
        });
        // le pagine sono a volte in UTF-8 e a volte in ISO-8859-1
        try {
          return new TextDecoder("utf-8", { fatal: true }).decode(buf);
        } catch {
          return Buffer.from(buf).toString("latin1");
        }
      } catch {
        warnGruppo("Ricerche ICARO dell'Assemblea regionale siciliana non lette", `${nome}-${n}`);
        return "";
      }
    };
    const prima = await leggi(1);
    const totale = Number(testo(prima).match(/Pagina\s+1\s+di\s+(\d+)/)?.[1] ?? 1);
    const righe = [];
    for (let n = 1; n <= totale; n++) {
      const html = n === 1 ? prima : await leggi(n);
      for (const blocco of html.split('<li href="javascript: showDoc(').slice(1)) {
        const campo = (etichetta) => testo(blocco.match(new RegExp(`<span class="simobile">${etichetta}</span>([^<]*)`))?.[1] ?? "");
        righe.push({
          numero: campo("N\\.Ord\\.") || campo("Numero"),
          data: campo("Data Pres\\.") || campo("Data"),
          atto: campo("Atto"),
          documento: campo("Docum\\."),
          titolo: testo(blocco.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? ""),
          sotto: testo(blocco.match(/<\/h3>\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? ""),
        });
      }
    }
    return righe;
  }

  // ---------------------------------------------------------------- Deputati
  const elenco = await pagina("sicilia-deputati.html", `${ARS}/xviii-legislatura`);
  const pagine = [...new Set([...elenco.matchAll(/href="(\/deputati\/[a-z0-9-]+)(?:\?idLeg=\d+)?"/g)].map((m) => m[1]))].filter((p) => !p.includes("storico"));
  if (pagine.length < 70) warn(`Sicilia: trovati solo ${pagine.length} deputati sulla pagina della XVIII legislatura (cambiato il sito?)`);
  const righeMinistero = ammreg.filter((r) => r.codice_regione === sicilia.codice);
  const perMinistero = new Map(righeMinistero.map((r) => [chiave(`${r.cognome} ${r.nome}`), r]));
  const fileGruppi = JSON.parse(fs.readFileSync(path.join(MANUAL, "gruppi-consiliari", "sicilia.json"), "utf8"));
  const nomiGruppi = fileGruppi.nomiSito ?? {};

  const deputati = [];
  for (const p of pagine) {
    const html = await pagina(`sicilia-deputato-${p.split("/").pop()}.html`, `${ARS}${p}?idLeg=71`);
    const t = testo(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ""));
    const nomeSito = t.match(/Profilo di (.+?) \1/)?.[1] ?? t.match(/Profilo di ([^|]+?) (?:Deputat|Ex)/)?.[1];
    if (!nomeSito) continue;
    // Solo la sezione della XVIII legislatura (la pagina elenca anche le precedenti)
    const sezione = t.slice(t.indexOf("XVIII Legislatura Dati legislatura"), t.indexOf("Cariche assunte") > 0 ? t.indexOf("Cariche assunte") : undefined);
    const iscrizione = sezione.match(/Iscritto al gruppo (.+?) dal (\d{2}-\d{2}-\d{4})(?: al (\d{2}-\d{2}-\d{4}))?/);
    if (!iscrizione || iscrizione[3]) continue; // ha lasciato l'Assemblea
    const gruppoSito = iscrizione[1].trim();
    const gruppo = nomiGruppi[gruppoSito] ?? gruppoSito;
    if (!fileGruppi.gruppi[gruppo]) warn(`Gruppo parlamentare dell'ARS senza coalizione/colore in data/manual/gruppi-consiliari/sicilia.json: ${gruppoSito}`);
    const collegio = sezione.match(/Collegio: (\S+)/)?.[1];
    // La pagina scrive "Cognome Nome": quante parole sono cognome lo dice l'anagrafe del Ministero (anche se il nome
    // è scritto in modo un po' diverso: "De Luca Antonino" / DE LUCA ANTONIO); in mancanza, le particelle (De, Di, La…).
    const parole = nomeSito.split(" ");
    const forzato = NOMI_DEPUTATI[nomeSito];
    const daMinistero =
      perMinistero.get(chiave(nomeSito)) ?? righeMinistero.find(
        (r) =>
          r.descrizione_carica !== "Presidente della regione" &&
          norm(nomeSito).startsWith(`${norm(r.cognome)} `) &&
          norm(nomeSito).slice(norm(r.cognome).length + 1, norm(r.cognome).length + 5) === norm(r.nome).slice(0, 4),
      );
    const parteCognome = forzato
      ? forzato[0].split(" ").length
      : daMinistero && norm(nomeSito).startsWith(`${norm(daMinistero.cognome)} `)
        ? norm(daMinistero.cognome).split(" ").length
        : PARTICELLE.has(parole[0].toLowerCase()) ? 2 : 1;
    const cognome = forzato?.[0] ?? parole.slice(0, parteCognome).join(" ");
    const nomeProprio = forzato?.[1] ?? parole.slice(parteCognome).join(" ");
    const m = daMinistero ?? perMinistero.get(chiave(forzato?.[2] ?? `${cognome} ${nomeProprio}`)) ?? (forzato?.[3] && { sesso: forzato[3] });
    const email = html.match(/mailto:([^"?]+@ars\.sicilia\.it)/i)?.[1];
    const cariche = (t.split("Cariche assunte")[1] ?? "").split("Attività parlamentari")[0];
    const commissioni = [...cariche.matchAll(/Dal \d{2}-\d{2}-\d{4} (?!al )(Presidente|Vice-Presidente|Segretario|Componente) Commissione "([^"]+)"/g)].map(([, ruolo, nome]) => {
      const tema = nome.replace(/^[IVX]+ - /, "");
      return ruolo === "Componente" ? tema : `${tema} (${ruolo.toLowerCase().replace("-", "")})`;
    });
    const presidenzaAssemblea = /Dal \d{2}-\d{2}-\d{4} Presidente dell'Assemblea/.test(cariche) || /^Presidente dell'?Assemblea/i.test(m?.incarico ?? "");
    deputati.push(
      persona({
        nome: `${nomeProprio} ${cognome}`,
        ruolo: presidenzaAssemblea ? declina("Presidente dell'Assemblea regionale", m?.sesso) : declina("Deputato regionale", m?.sesso),
        dettaglio: `Gruppo: ${gruppo}`,
        email,
        commissioni: commissioni.length ? [...new Set(commissioni)] : undefined,
        url: `${ARS}${p}?idLeg=71`,
        circoscrizione: !collegio ? null : /^regionale$/i.test(collegio) ? LISTA_REGIONALE : titleCase(collegio),
        // nome intero: all'ARS ci sono omonimi (due De Luca, due Giuseppe Lombardo)
        username: `${norm(cognome).toLowerCase().replace(/ /g, "-")}.${norm(nomeProprio).toLowerCase().replace(/ /g, "")}`,
        gruppo,
        nomeIcaro: nomeSito,
      }),
    );
  }
  const ripetuti = new Set(deputati.map((c) => c.username).filter((u, i, l) => l.indexOf(u) !== i));
  if (ripetuti.size) warn(`Sicilia: identificativi dei deputati ripetuti: ${[...ripetuti].join(", ")}`);
  if (deputati.length !== 70) warn(`Sicilia: ${deputati.length} deputati in carica invece di 70 (controllare chi ha lasciato l'Assemblea)`);
  deputati.sort((a, b) => a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  console.log(`  ${deputati.length} deputati regionali`);

  // ---------------------------------------------------------------- Giunta (anagrafe del Ministero dell'Interno)
  const presRiga = righeMinistero.find((r) => r.descrizione_carica === "Presidente della regione");
  const depPresidente = presRiga && deputati.find((d) => chiave(d.nome) === chiave(`${presRiga.nome} ${presRiga.cognome}`));
  const giunta = righeMinistero
    .filter((r) => r.descrizione_carica.startsWith("Assessore"))
    .map((r) =>
      persona({
        nome: titleCase(`${r.nome} ${r.cognome}`),
        // il presidente che tiene per sé un assessorato compare nell'anagrafe anche come assessore
        ruolo:
          presRiga && chiave(`${r.cognome} ${r.nome}`) === chiave(`${presRiga.cognome} ${presRiga.nome}`)
            ? "Presidente, assessore ad interim"
            : /Vicepresidente/i.test(r.incarico)
              ? "Vicepresidente e assessore"
              : declina("Assessore", r.sesso),
        sesso: r.sesso === "F" || r.sesso === "M" ? r.sesso : undefined,
      }),
    )
    .sort((a, b) => (a.ruolo.startsWith("Vice") ? -1 : 0) - (b.ruolo.startsWith("Vice") ? -1 : 0) || a.nome.split(" ").pop().localeCompare(b.nome.split(" ").pop(), "it"));
  if (!giunta.length) warn("Sicilia: Giunta regionale, nessun assessore nell'anagrafe del Ministero");
  const pulisci = ({ nomeIcaro, ...d }) => d;
  const regione = {
    nome: sicilia.nome,
    presidente: presRiga
      ? persona({ ...(depPresidente ? pulisci(depPresidente) : {}), circoscrizione: undefined, nome: titleCase(`${presRiga.nome} ${presRiga.cognome}`), ruolo: declina("Presidente della Regione", presRiga.sesso) })
      : null,
    giunta,
    consiglieri: deputati.filter((d) => d !== depPresidente).map(pulisci),
    gruppi: Object.entries(fileGruppi.gruppi).map(([nome, g]) => ({ nome, ...g })),
  };

  // ---------------------------------------------------------------- Atti di indirizzo e controllo (ICARO)
  const perNome = new Map(deputati.filter((d) => d !== depPresidente).map((d) => [chiave(d.nomeIcaro), d]));
  const firmatariDa = (s) =>
    [...s.replace(/\|/g, " ").replace(/(^|\s)\d+\/\s*/g, " ").matchAll(/([^().]+?)\s*\(([^()]*)\)/g)].map(([, n]) => {
      const nome = n.trim();
      const d = perNome.get(chiave(nome));
      return d ? { nome: d.nome, username: d.username } : { nome: titleCase(nome.split(" ").slice(1).join(" ") + " " + nome.split(" ")[0]) };
    });
  const atti = [];
  const linkFirmatario = (db, d) => (d ? `${ICARO}/default.jsp?icaDB=${db}&icaQuery=${encodeURIComponent(`18.LEGISL E 1 ADJ2 ${d.nomeIcaro}.FIRMAT`)}` : `${ICARO}/default.jsp?icaDB=${db}&icaQuery=18.LEGISL`);
  for (const [db, tipo] of BANCHE) {
    for (const r of await icaro(db, "18.LEGISL", `sicilia-${tipo}`)) {
      const numero = Number(r.numero);
      if (!numero || !r.data || !dataIso(r.data)) continue;
      const titolo = r.titolo.replace(/^N\.\s*\d+\s*-\s*/, "").replace(/\.\s*$/, "");
      const firmatari = firmatariDa(r.sotto);
      const primo = firmatari[0]?.username ? deputati.find((d) => d.username === firmatari[0].username) : undefined;
      atti.push(persona({ id: `${tipo}-${numero}`, tipo, numero, data: dataIso(r.data), titolo, firmatari, url: linkFirmatario(db, primo) }));
    }
  }

  // ---------------------------------------------------------------- Disegni di legge (ICARO): primo firmatario per deputato
  const primoFirmatario = new Map(); // numero del ddl → deputato
  for (const d of deputati) {
    for (const r of await icaro(221, `18.LEGISL E 1 ADJ2 ${d.nomeIcaro}.FIRMAT`, `sicilia-ddl-${d.username}`)) if (Number(r.numero)) primoFirmatario.set(Number(r.numero), d);
  }
  for (const r of await icaro(221, "18.LEGISL", "sicilia-ddl")) {
    const numero = Number(r.numero);
    if (!numero || !r.data || !dataIso(r.data)) continue;
    const d = primoFirmatario.get(numero);
    atti.push(
      persona({
        id: `pdl-${numero}`,
        tipo: "pdl",
        numero,
        data: dataIso(r.data),
        titolo: r.titolo.replace(/\.\s*$/, ""),
        firmatari: d && d !== depPresidente ? [{ nome: d.nome, username: d.username }] : [],
        url: linkFirmatario(221, d),
      }),
    );
  }

  // ---------------------------------------------------------------- Leggi (ICARO, un articolo per riga)
  const perLegge = new Map();
  for (const r of await icaro(201, "18.LEGISL", "sicilia-leggi")) {
    const n = Number(r.atto.match(/L\.R\.\s*(\d+)/)?.[1]);
    const data = r.data && dataIso(r.data);
    if (!n || !data) continue;
    const id = `${data.slice(0, 4)}-${n}`;
    if (!perLegge.has(id)) perLegge.set(id, { id, numero: n, data, oggetto: r.titolo.replace(/\.\s*$/, "") });
  }
  const leggi = [...perLegge.values()]
    .filter((l) => l.data >= INIZIO_LEGISLATURA)
    .map((l) =>
      persona({
        ...l,
        intestazione: `Legge regionale ${dataLunga(l.data)}, n. ${l.numero}`,
        url: `${ICARO}/default.jsp?icaDB=201&icaQuery=18.LEGISL`,
      }),
    )
    .sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);

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
      consiglieri: { id: "sicilia-ars", nome: "Deputati della XVIII legislatura", ente: "Assemblea regionale siciliana", url: `${ARS}/xviii-legislatura`, raccolto: raccolto("sicilia-deputati.html") },
      giunta: { id: "sicilia-giunta", nome: "Anagrafe degli amministratori regionali", ente: "Ministero dell'Interno", url: "https://dait.interno.gov.it/elezioni/open-data/amministratori-regionali", raccolto: raccolto("ammreg.csv") },
      atti: { id: "sicilia-atti", nome: "Banche dati ICARO: atti parlamentari e leggi regionali", ente: "Assemblea regionale siciliana", url: "https://dati.ars.sicilia.it/home/cerca/235.jsp", raccolto: raccolto("sicilia-mozione-1.html") },
    },
  };
}
