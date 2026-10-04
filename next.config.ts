import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pagine preparate alla build per i comuni più grandi, le altre create alla prima visita e poi in cache
  // (dati da scripts/build-data.mjs: niente database). L'unica parte sempre dinamica è /api/segnala.
  trailingSlash: true,
  // Le schede dei comuni si leggono dal disco alla prima visita: vanno incluse nelle funzioni delle pagine comune.
  outputFileTracingIncludes: {
    "/comune/**": ["./src/data/comuni/*.json"],
  },
  // Con tutta Italia le pagine del Consiglio regionale della Campania sono passate sotto /regione/campania/:
  // i vecchi indirizzi (già condivisi) portano a quelli nuovi.
  async redirects() {
    return [
      { source: "/regione/attivita", destination: "/regione/campania/attivita/", permanent: true },
      { source: "/regione/leggi", destination: "/regione/campania/leggi/", permanent: true },
      { source: "/regione/consiglieri/:percorso*", destination: "/regione/campania/consiglieri/:percorso*/", permanent: true },
      { source: "/regione/feed.xml", destination: "/regione/campania/feed.xml", permanent: true },
    ];
  },
};

export default nextConfig;
