import { CopiaTesto } from "./CopiaTesto";

/**
 * "Resta aggiornato": un feed RSS, che si segue con un'app di notizie. Niente email da lasciare,
 * niente account: il sito resta statico e non conserva dati di nessuno.
 */
export function Segui({ feed, titolo, testo }: { feed: string; titolo: string; testo: string }) {
  const enc = encodeURIComponent(feed);
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-semibold";
  return (
    <div id="segui" className="scroll-mt-24 rounded-3xl border border-[var(--lv)]/30 bg-[var(--lv-bg)] p-4 sm:p-5">
      <p className="flex items-center gap-2 text-base font-semibold">
        <span aria-hidden>🔔</span> {titolo}
      </p>
      <p className="mt-1 text-base text-ink-2">{testo}</p>
      <details className="mt-2 text-base text-ink-2">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--lv)] underline">Come funziona?</summary>
        <p className="pb-2">
          Si usa un&apos;app gratuita per leggere le notizie (un &quot;lettore di feed RSS&quot;), come Feedly o Inoreader. Tocchi uno dei
          pulsanti qui sotto, confermi, e da quel momento le novità ti arrivano lì, insieme alle altre notizie che segui. Non ti chiediamo
          l&apos;email e non registriamo nulla.
        </p>
      </details>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={`https://feedly.com/i/subscription/feed%2F${enc}`} target="_blank" rel="noreferrer" data-umami-event="segui" data-umami-event-canale="feedly" className={`${btn} bg-[var(--lv)] text-white hover:opacity-90`}>
          Segui con Feedly ↗
        </a>
        <a
          href={`https://www.inoreader.com/?add_feed=${enc}`}
          data-umami-event="segui"
          data-umami-event-canale="inoreader"
          target="_blank"
          rel="noreferrer"
          className={`${btn} border border-[var(--lv)] bg-surface text-[var(--lv)] hover:opacity-90`}
        >
          Segui con Inoreader ↗
        </a>
        <CopiaTesto testo={feed} etichetta="Copia l'indirizzo del feed" evento="segui-copia" />
      </div>
    </div>
  );
}
