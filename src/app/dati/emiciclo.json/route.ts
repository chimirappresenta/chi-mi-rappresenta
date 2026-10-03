import { consiglieriPerEmiciclo, consiglio, regione } from "@/lib/data";

// File statico con i dati dell'emiciclo: le 550 pagine dei comuni lo caricano solo quando serve,
// invece di incorporare ciascuna i dati di tutti i consiglieri.
export const dynamic = "force-static";

export function GET() {
  return Response.json({ consiglieri: consiglieriPerEmiciclo(), gruppi: regione.gruppi, tipi: consiglio.tipi });
}
