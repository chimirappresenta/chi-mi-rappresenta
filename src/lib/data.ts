import "server-only";
import fs from "node:fs";
import path from "node:path";
import elencoJson from "@/data/comuni-elenco.json";
import statisticheJson from "@/data/statistiche.json";
import regioneJson from "@/data/regione.json";
import parlamentoJson from "@/data/parlamento.json";
import europaJson from "@/data/europa.json";
import metaJson from "@/data/meta.json";
import consiglioJson from "@/data/consiglio.json";
import { slugConsigliere } from "./format";
import type { Atto, Comune, ComuneElenco, Consiglio, Europa, Fonte, Legge, Meta, NumeriComune, Parlamento, Regione } from "./types";

// I JSON sono generati da scripts/build-data.mjs (npm run data).
/** Elenco leggero di tutti i comuni: la scheda completa di ognuno sta in src/data/comuni/<istat>.json. */
export const comuni = elencoJson as ComuneElenco[];
export const regione = regioneJson as Regione;
export const parlamento = parlamentoJson as Parlamento;
export const europa = europaJson as Europa;
export const meta = metaJson as Meta;
export const consiglio = consiglioJson as Consiglio;

const DIR_COMUNI = path.join(process.cwd(), "src", "data", "comuni");
const schede = new Map<string, Comune | undefined>();

/**
 * Scheda completa di un comune, letta dal suo file solo quando serve (alla build per le pagine preparate
 * in anticipo, alla prima visita per le altre). Così nessuna pagina carica i dati di tutti i comuni.
 */
export function getComune(istat: string): Comune | undefined {
  if (!/^\d{6}$/.test(istat)) return undefined;
  if (!schede.has(istat)) {
    let c: Comune | undefined;
    try {
      c = JSON.parse(fs.readFileSync(path.join(DIR_COMUNI, `${istat}.json`), "utf8")) as Comune;
    } catch {
      c = undefined;
    }
    schede.set(istat, c);
  }
  return schede.get(istat);
}

/**
 * Comuni le cui pagine si preparano alla build: capoluoghi e comuni con almeno 15.000 abitanti,
 * dove si concentra la maggior parte delle visite. Gli altri si creano alla prima visita e restano in cache.
 */
export const comuniDaPreparare = () => comuni.filter((c) => c.capoluogo || (c.abitanti ?? 0) >= 15000);

export const fonte = (id: string) => meta.fonti.find((f) => f.id === id)!;

const consigliereBySlug = new Map(regione.consiglieri.map((c) => [slugConsigliere(c.username), c]));
export const getConsigliere = (slug: string) => consigliereBySlug.get(slug);

export const attiDi = (username: string) => consiglio.atti.filter((a) => a.firmatari.some((f) => f.username === username));

const attoById = new Map(consiglio.atti.map((a) => [a.id, a]));
const leggeById = new Map(consiglio.leggi.map((l) => [`legge-${l.id}`, l]));

/** Risolve le citazioni di un comune in atti e leggi, dal più recente. */
export function citazioniDi(comune: Comune): { atti: Atto[]; leggi: Legge[] } {
  return {
    atti: comune.citazioni.flatMap((id) => attoById.get(id) ?? []),
    leggi: comune.citazioni.flatMap((id) => leggeById.get(id) ?? []),
  };
}

export const nomeTipo = (id: string) => consiglio.tipi.find((t) => t.id === id)?.nome ?? id;

/** Dati per l'emiciclo: ogni consigliere con slug, conteggi e ultimi 3 atti (per tenere leggera la pagina). */
export function consiglieriPerEmiciclo() {
  return regione.consiglieri.map((c) => ({
    ...c,
    slug: slugConsigliere(c.username),
    attivita: consiglio.attivita[c.username],
    ultimiAtti: attiDi(c.username)
      .slice(0, 3)
      .map(({ id, tipo, data, titolo, url }) => ({ id, tipo, data, titolo, url })),
  }));
}

/** Media dei Comuni della regione (calcolata dalla pipeline), per confronto. */
export const mediaRegione = (statisticheJson as { mediaRegione: NumeriComune }).mediaRegione;

/** Anno previsto per le prossime elezioni comunali: il mandato dura 5 anni. */
export const prossimeElezioni = (dataElezione?: string) => {
  const anno = Number(dataElezione?.slice(-4));
  return anno ? anno + 5 : undefined;
};

export const fonteData = (f: Fonte) => f.aggiornato ?? (f.raccolto ? f.raccolto.split("-").reverse().join("/") : undefined);
