import "server-only";
import { consiglio, nomeTipo } from "./data";
import { SITE_URL } from "./sito";
import type { Atto, Legge } from "./types";

export type VoceFeed = { titolo: string; link: string; data: string; descrizione: string; guid: string };

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (iso: string) => new Date(`${iso}T12:00:00Z`).toUTCString();

export const vocePerAtto = (a: Atto, prefisso = ""): VoceFeed => ({
  titolo: `${prefisso}${nomeTipo(a.tipo)} n. ${a.numero}: ${a.titolo}`,
  link: a.url ?? `${SITE_URL}/regione/attivita/`,
  data: a.data,
  descrizione: `Presentata da ${a.firmatari.map((f) => f.nome).join(", ")} nel Consiglio regionale della Campania.`,
  guid: `atto-${a.id}`,
});

export const vocePerLegge = (l: Legge, prefisso = ""): VoceFeed => ({
  titolo: `${prefisso}${l.intestazione}${l.oggetto ? `: ${l.oggetto}` : ""}`,
  link: `${SITE_URL}/regione/leggi/`,
  data: l.data,
  descrizione: l.riassunto?.testo ?? l.oggetto ?? l.intestazione,
  guid: `legge-${l.id}`,
});

/** Le nuove leggi regionali riguardano tutti: entrano in ogni feed. */
export const vociLeggi = () => consiglio.leggi.map((l) => vocePerLegge(l, "Nuova legge regionale · "));

/** Documento RSS 2.0: si apre con qualsiasi lettore di notizie. */
export function rss({ titolo, descrizione, link, self, voci }: { titolo: string; descrizione: string; link: string; self: string; voci: VoceFeed[] }) {
  // a parità di guid vince la prima voce (es. "Parla di Pozzuoli" prima di "Nuova legge regionale")
  const uniche = new Map<string, VoceFeed>();
  for (const v of voci) if (!uniche.has(v.guid)) uniche.set(v.guid, v);
  const ordinate = [...uniche.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 60);
  const items = ordinate
    .map(
      (v) => `    <item>
      <title>${xml(v.titolo)}</title>
      <link>${xml(v.link)}</link>
      <guid isPermaLink="false">${xml(v.guid)}</guid>
      <pubDate>${rfc822(v.data)}</pubDate>
      <description>${xml(v.descrizione)}</description>
    </item>`,
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(titolo)}</title>
    <link>${xml(link)}</link>
    <description>${xml(descrizione)}</description>
    <language>it</language>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
${ordinate[0] ? `    <lastBuildDate>${rfc822(ordinate[0].data)}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
