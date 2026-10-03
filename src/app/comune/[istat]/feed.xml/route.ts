import { citazioniDi, comuni, getComune } from "@/lib/data";
import { rss, vociLeggi, vocePerAtto, vocePerLegge } from "@/lib/feed";
import { SITE_URL } from "@/lib/sito";

// Feed RSS di ogni comune, generato al build: gli atti e le leggi del Consiglio regionale che citano il comune,
// più tutte le nuove leggi regionali. Si aggiorna a ogni ricostruzione dei dati.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return comuni.map((c) => ({ istat: c.istat }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ istat: string }> }) {
  const c = getComune((await params).istat);
  if (!c) return new Response("Comune non trovato", { status: 404 });
  const { atti, leggi } = citazioniDi(c);
  const prefisso = `Parla di ${c.nome} · `;
  return rss({
    titolo: `${c.nome} in Regione · Chi mi rappresenta`,
    descrizione: `Quando nel Consiglio regionale della Campania si parla di ${c.nome}, e le nuove leggi regionali.`,
    link: `${SITE_URL}/comune/${c.istat}/`,
    self: `${SITE_URL}/comune/${c.istat}/feed.xml`,
    voci: [...leggi.map((l) => vocePerLegge(l, prefisso)), ...atti.map((a) => vocePerAtto(a, prefisso)), ...vociLeggi()],
  });
}
