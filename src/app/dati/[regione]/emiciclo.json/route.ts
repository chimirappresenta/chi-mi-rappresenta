import { consiglieriPerEmiciclo, consigliInChiaro, getConsiglio } from "@/lib/data";

// File statico con i dati dell'emiciclo di ogni Consiglio in chiaro: le pagine dei comuni lo caricano solo quando serve,
// invece di incorporare ciascuna i dati di tutti i consiglieri.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return consigliInChiaro.map((cr) => ({ regione: cr.slug }));
}

export async function GET(_req: Request, ctx: RouteContext<"/dati/[regione]/emiciclo.json">) {
  const cr = getConsiglio((await ctx.params).regione)!;
  return Response.json({ consiglieri: consiglieriPerEmiciclo(cr), gruppi: cr.regione.gruppi, tipi: cr.consiglio.tipi });
}
