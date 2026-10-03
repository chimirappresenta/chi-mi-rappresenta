const fmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-06-29" → "29 giugno 2026" */
export const dataLunga = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

/** Username del sito del Consiglio ("ALAIA.VIN") → slug per gli URL ("alaia-vin"). */
export const slugConsigliere = (username: string) => username.toLowerCase().replace(/[^a-z0-9]+/g, "-");
