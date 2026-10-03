import type { ConsigliereRegionale, GruppoConsiliare } from "./types";

// Geometria dell'emiciclo, condivisa tra il grafico interattivo e le immagini di anteprima.
// File concentriche, posti proporzionali al raggio.
export const W = 400;
export const H = 214;
export const CX = W / 2;
export const CY = 200;
export const R_DOT = 8.2;
const R_MAX = 188;
const R_MIN = 86;

export function posti(n: number) {
  const file = n <= 30 ? 3 : n <= 70 ? 4 : 6;
  const raggi = Array.from({ length: file }, (_, i) => R_MIN + ((R_MAX - R_MIN) * i) / (file - 1));
  const somma = raggi.reduce((a, b) => a + b, 0);
  const perFila = raggi.map((r) => Math.floor((n * r) / somma));
  // distribuisce i posti residui dalle file esterne
  for (let i = file - 1, resto = n - perFila.reduce((a, b) => a + b, 0); resto > 0; i = (i - 1 + file) % file, resto--) perFila[i]++;
  const pts: { x: number; y: number; angolo: number; r: number }[] = [];
  raggi.forEach((r, i) => {
    const k = perFila[i];
    for (let j = 0; j < k; j++) {
      const angolo = k === 1 ? Math.PI / 2 : Math.PI - (j * Math.PI) / (k - 1);
      // arrotondate: server e browser calcolano seno e coseno con differenze all'ultima cifra (errore di hydration)
      const x = Math.round((CX + r * Math.cos(angolo)) * 100) / 100;
      const y = Math.round((CY - r * Math.sin(angolo)) * 100) / 100;
      pts.push({ x, y, angolo, r });
    }
  });
  // da sinistra a destra: i gruppi occupano spicchi del ventaglio
  return pts.sort((a, b) => b.angolo - a.angolo || a.r - b.r);
}

const ordineRuolo = (c: ConsigliereRegionale) => (c.ruoloGruppo === "capogruppo" ? 0 : c.ruoloGruppo ? 1 : 2);

/** Assegna i seggi: per gruppo (nell'ordine del file dei gruppi), capogruppo prima, poi per cognome. */
export function assegnaSeggi<C extends ConsigliereRegionale>(consiglieri: C[], gruppi: GruppoConsiliare[]) {
  const ordineGruppo = new Map(gruppi.map((g, i) => [g.nome, i]));
  const ordinati = [...consiglieri].sort(
    (a, b) =>
      (ordineGruppo.get(a.gruppo ?? "") ?? 99) - (ordineGruppo.get(b.gruppo ?? "") ?? 99) ||
      ordineRuolo(a) - ordineRuolo(b) ||
      a.nome.split(" ").pop()!.localeCompare(b.nome.split(" ").pop()!, "it"),
  );
  const pts = posti(ordinati.length);
  return ordinati.map((c, i) => ({ c, ...pts[i] }));
}
