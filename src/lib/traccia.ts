// Statistiche anonime con Umami (senza cookie): https://umami.is
// I click sui pulsanti si contano con l'attributo data-umami-event; questa funzione serve
// per gli eventi che nascono dal codice (es. comune scelto nella ricerca).

export const UMAMI_WEBSITE_ID = "a318ecf4-c620-4723-b236-d87174350ba4";
/** Solo il sito pubblicato viene contato: niente statistiche da localhost o dalle anteprime. */
export const UMAMI_DOMINI = "chi-mi-rappresenta.vercel.app";

type Umami = { track: (evento: string, dati?: Record<string, string | number>) => void };

export function traccia(evento: string, dati?: Record<string, string | number>) {
  try {
    (window as unknown as { umami?: Umami }).umami?.track(evento, dati);
  } catch {
    // le statistiche non devono mai rompere il sito
  }
}
