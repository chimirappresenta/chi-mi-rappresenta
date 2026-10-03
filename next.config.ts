import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pagine preparate alla build per i comuni più grandi, le altre create alla prima visita e poi in cache
  // (dati da scripts/build-data.mjs: niente database). L'unica parte sempre dinamica è /api/segnala.
  trailingSlash: true,
  // Le schede dei comuni si leggono dal disco alla prima visita: vanno incluse nelle funzioni delle pagine comune.
  outputFileTracingIncludes: {
    "/comune/**": ["./src/data/comuni/*.json"],
  },
};

export default nextConfig;
