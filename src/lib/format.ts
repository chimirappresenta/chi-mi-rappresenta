const fmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-06-29" → "29 giugno 2026" */
export const dataLunga = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

/** Username del sito del Consiglio ("ALAIA.VIN") → slug per gli URL ("alaia-vin"). */
export const slugConsigliere = (username: string) => username.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Circoscrizione regionale di elezione, come si scrive in una frase. Le circoscrizioni sono indicate con le province che
 * comprendono: "Napoli" → "in provincia di Napoli"; "Catanzaro, Crotone e Vibo Valentia" o "Campobasso e Isernia"
 * (circoscrizione unica del Molise) → "nelle province di …".
 */
/** Province il cui nome contiene già " e " (non sono due province). */
const PROVINCE_CON_E = ["Pesaro e Urbino", "Monza e Brianza"];
/** Circoscrizione di chi è eletto nella lista regionale collegata al presidente (Sicilia): vale per tutta la regione. */
export const LISTA_REGIONALE = "Lista regionale";
export const piuProvince = (circ: string) => circ.includes(", ") || (circ.includes(" e ") && !PROVINCE_CON_E.includes(circ));
/** Circoscrizioni della Sardegna: le otto province precedenti al 2016, che non coincidono con quelle di oggi. */
const CIRCOSCRIZIONI_STORICHE = ["Cagliari", "Sassari", "Nuoro", "Oristano", "Olbia-Tempio", "Ogliastra", "Medio Campidano", "Carbonia-Iglesias"];
export const inCircoscrizione = (circ: string) =>
  circ === LISTA_REGIONALE
    ? "nella lista regionale"
    : CIRCOSCRIZIONI_STORICHE.includes(circ)
      ? `nella circoscrizione di ${circ}`
      : piuProvince(circ)
        ? `nelle province di ${circ}`
        : `in provincia di ${circ}`;

/** Articolo e preposizione per le regioni: "dell'Abruzzo", "del Molise", "della Campania". */
const ARTICOLO_REGIONE: Record<string, "l'" | "il" | "la"> = {
  Abruzzo: "l'",
  "Emilia-Romagna": "l'",
  Umbria: "l'",
  Molise: "il",
  Lazio: "il",
  Piemonte: "il",
  Veneto: "il",
  "Trentino-Alto Adige": "il",
  "Friuli-Venezia Giulia": "il",
};
export const laRegione = (nome: string) => ({ "l'": `l'${nome}`, il: `il ${nome}`, la: `la ${nome}` })[ARTICOLO_REGIONE[nome] ?? "la"];
export const dellaRegione = (nome: string) => ({ "l'": `dell'${nome}`, il: `del ${nome}`, la: `della ${nome}` })[ARTICOLO_REGIONE[nome] ?? "la"];
