import { citazioniDi, consiglioDellaRegione, getComune } from "@/lib/data";
import { rss, vociLeggi, vocePerAtto, vocePerLegge } from "@/lib/feed";
import { SITE_URL } from "@/lib/sito";
import { dellaRegione } from "@/lib/format";

// Feed RSS di ogni comune, generato alla prima richiesta e poi in cache: gli atti e le leggi del Consiglio regionale che citano il comune,
// più tutte le nuove leggi regionali. Si aggiorna a ogni ricostruzione dei dati.
export const dynamic = "force-static";

export function generateStaticParams() {
  // nessuna alla build: si generano alla prima richiesta (social, lettori di feed) e restano in cache
  return [];
}

export async function GET(_req: Request, { params }: { params: Promise<{ istat: string }> }) {
  const c = getComune((await params).istat);
  // il feed segue il Consiglio regionale "in chiaro": solo per i comuni delle regioni che ce l'hanno
  const cr = c && consiglioDellaRegione(c.codiceRegione);
  if (!c || !cr) return new Response("Feed non disponibile per questo comune", { status: 404 });
  const { atti, leggi } = citazioniDi(c);
  const prefisso = `Parla di ${c.nome} · `;
  return rss({
    titolo: `${c.nome} in Regione · Chi mi rappresenta`,
    descrizione: `Quando nel Consiglio regionale ${dellaRegione(cr.nome)} si parla di ${c.nome}, e le nuove leggi regionali.`,
    link: `${SITE_URL}/comune/${c.istat}/`,
    self: `${SITE_URL}/comune/${c.istat}/feed.xml`,
    voci: [...leggi.map((l) => vocePerLegge(cr, l, prefisso)), ...atti.map((a) => vocePerAtto(cr, a, prefisso)), ...vociLeggi(cr)],
  });
}
