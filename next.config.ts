import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tutte le pagine sono generate al build (dati da scripts/build-data.mjs): niente database, niente query a ogni visita.
  // L'unica parte dinamica è /api/segnala, che crea le segnalazioni su GitHub senza esporre il token.
  trailingSlash: true,
};

export default nextConfig;
