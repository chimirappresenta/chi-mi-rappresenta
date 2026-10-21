import caroVitaJson from "@/data/caro-vita.json";

export type FonteNotizia = { nome: string; url: string };
/** Un fatto del contesto: verificato su almeno due fonti indipendenti. */
export type Fatto = { titolo: string; testo: string; fonti: FonteNotizia[] };
export type TemaCaroVita = { id: string; nome: string; descrizione: string };

type CaroVita = {
  aggiornato: string;
  /** Data di chiusura dello speciale ("2026-11-30"): da allora spariscono i link e le pagine diventano un archivio. */
  chiuso: string | null;
  temi: TemaCaroVita[];
  contesto: {
    generale: Fatto[];
    /** `fatti`: cosa succede nella regione; `regione`: cosa ha annunciato o deciso la Giunta (non leggi del Consiglio). */
    regioni: Record<string, { fatti: Fatto[]; regione: Fatto[] }>;
  };
  /** Selezione curata: id della legge o dell'atto → id del tema. */
  regioni: Record<string, { leggi: Record<string, string>; atti: Record<string, string> }>;
};

export const caroVita = caroVitaJson as unknown as CaroVita;
/** Tutte le regioni dello speciale (il contesto c'è per tutte e 20). */
export const regioniCaroVita = Object.keys(caroVita.contesto.regioni);
/** Le regioni con il Consiglio in chiaro: solo per queste ci sono leggi e atti selezionati. */
export const regioniConAtti = Object.keys(caroVita.regioni);
export const specialeAttivo = !caroVita.chiuso;
/** Voce di menu dello speciale, solo finché è attivo. */
export const VOCE_CARO_VITA = {
  href: "/caro-vita/",
  label: "Speciale caro vita",
  descrizione: "Proteste e caro vita: cosa fanno davvero Regioni e Consigli regionali",
};
