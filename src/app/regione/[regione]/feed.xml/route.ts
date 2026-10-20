import { consigliInChiaro, getConsiglio } from "@/lib/data";
import { rss, vociLeggi, vocePerAtto } from "@/lib/feed";
import { SITE_URL } from "@/lib/sito";
import { dellaRegione } from "@/lib/format";

// Feed RSS di ogni Consiglio regionale in chiaro: nuovi atti dei consiglieri e nuove leggi.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return consigliInChiaro.map((cr) => ({ regione: cr.slug }));
}

export async function GET(_req: Request, ctx: RouteContext<"/regione/[regione]/feed.xml">) {
  const cr = getConsiglio((await ctx.params).regione)!;
  return rss({
    titolo: `Consiglio regionale ${dellaRegione(cr.nome)} · Chi mi rappresenta`,
    descrizione: `Interrogazioni, mozioni, proposte di legge e nuove leggi regionali ${dellaRegione(cr.nome)}.`,
    link: `${SITE_URL}/regione/${cr.slug}/`,
    self: `${SITE_URL}/regione/${cr.slug}/feed.xml`,
    voci: [...cr.consiglio.atti.map((a) => vocePerAtto(cr, a)), ...vociLeggi(cr)],
  });
}
