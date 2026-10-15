// URL pubblico del sito: serve per gli indirizzi assoluti (immagini di anteprima, feed).
// Su Vercel si usa il dominio di produzione (https://chimirappresenta.com); altrove si può impostare SITE_URL.
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3107");
