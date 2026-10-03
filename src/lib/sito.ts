// URL pubblico del sito: serve per gli indirizzi assoluti (immagini di anteprima, feed).
// In produzione impostare SITE_URL (es. https://chimirappresenta.it); su Vercel si usa il dominio di produzione.
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3107");
