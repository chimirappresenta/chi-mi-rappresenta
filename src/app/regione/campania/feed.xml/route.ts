import { consiglio } from "@/lib/data";
import { rss, vociLeggi, vocePerAtto } from "@/lib/feed";
import { SITE_URL } from "@/lib/sito";

// Feed RSS del Consiglio regionale: nuovi atti dei consiglieri e nuove leggi.
export const dynamic = "force-static";

export function GET() {
  return rss({
    titolo: "Consiglio regionale della Campania · Chi mi rappresenta",
    descrizione: "Interrogazioni, mozioni, proposte di legge e nuove leggi regionali della Campania.",
    link: `${SITE_URL}/regione/campania/`,
    self: `${SITE_URL}/regione/campania/feed.xml`,
    voci: [...consiglio.atti.map((a) => vocePerAtto(a)), ...vociLeggi()],
  });
}
