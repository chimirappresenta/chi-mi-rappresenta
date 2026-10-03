import "server-only";
import comuniJson from "@/data/comuni.json";
import regioneJson from "@/data/regione.json";
import parlamentoJson from "@/data/parlamento.json";
import europaJson from "@/data/europa.json";
import metaJson from "@/data/meta.json";
import consiglioJson from "@/data/consiglio.json";
import { slugConsigliere } from "./format";
import type { Atto, Comune, Consiglio, Europa, Fonte, Legge, Meta, Parlamento, Persona, Regione } from "./types";

// I JSON sono generati da scripts/build-data.mjs (npm run data).
export const comuni = comuniJson as Comune[];
export const regione = regioneJson as Regione;
export const parlamento = parlamentoJson as Parlamento;
export const europa = europaJson as Europa;
export const meta = metaJson as Meta;
export const consiglio = consiglioJson as Consiglio;

const byIstat = new Map(comuni.map((c) => [c.istat, c]));

export const getComune = (istat: string) => byIstat.get(istat);

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

export type NumeriComune = {
  /** Persone elette diverse (sindaco, giunta, consiglio: chi ha più ruoli conta una volta). */
  persone: number;
  etaMedia?: number;
  /** Percentuali 0-100, sul totale di chi ha il dato. */
  donne?: number;
  laureati?: number;
  under40?: number;
};

/** Numeri sulla squadra di governo del Comune, calcolati sui dati del Ministero dell'Interno. */
export function numeriAmministrazione(a: Comune["amministrazione"]): NumeriComune | null {
  if (!a || a.tipo !== "ordinaria") return null;
  const tutte = new Map<string, Persona>();
  for (const p of [a.sindaco, ...a.giunta, ...a.consiglio]) if (p) tutte.set(p.nome, p);
  const persone = [...tutte.values()];
  const perc = (n: number, d: number) => (d ? Math.round((100 * n) / d) : undefined);
  const conEta = persone.filter((p) => p.eta);
  const conSesso = persone.filter((p) => p.sesso);
  const conStudio = persone.filter((p) => p.studio);
  return {
    persone: persone.length,
    etaMedia: conEta.length ? Math.round(conEta.reduce((s, p) => s + p.eta!, 0) / conEta.length) : undefined,
    donne: perc(conSesso.filter((p) => p.sesso === "F").length, conSesso.length),
    laureati: perc(conStudio.filter((p) => p.studio === "Laurea" || p.studio === "Post-laurea").length, conStudio.length),
    under40: perc(conEta.filter((p) => p.eta! < 40).length, conEta.length),
  };
}

/** Media dei Comuni campani, per confronto. */
export const mediaCampania: NumeriComune = (() => {
  const tutti = comuni.map((c) => numeriAmministrazione(c.amministrazione)).filter((x): x is NumeriComune => !!x);
  const media = (k: keyof NumeriComune) => {
    const v = tutti.map((x) => x[k]).filter((x): x is number => typeof x === "number");
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : undefined;
  };
  return { persone: media("persone") ?? 0, etaMedia: media("etaMedia"), donne: media("donne"), laureati: media("laureati"), under40: media("under40") };
})();

/** Anno previsto per le prossime elezioni comunali: il mandato dura 5 anni. */
export const prossimeElezioni = (dataElezione?: string) => {
  const anno = Number(dataElezione?.slice(-4));
  return anno ? anno + 5 : undefined;
};

export const fonteData = (f: Fonte) => f.aggiornato ?? (f.raccolto ? f.raccolto.split("-").reverse().join("/") : undefined);
