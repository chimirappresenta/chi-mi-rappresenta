"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { CopiaTesto } from "./CopiaTesto";

type Props = {
  /** Indirizzo del destinatario. */
  a: string;
  oggetto: string;
  corpo: string;
  /** Il destinatario è una PEC: mostra la nota sulle PEC che accettano solo messaggi da altre PEC. */
  pec?: boolean;
  /** Cosa fare in alternativa se la PEC rifiuta il messaggio (sostituisce la parte finale della nota). */
  alternativaPec?: ReactNode;
  /** Pulsanti disattivati (es. manca ancora l'indirizzo). */
  disattivato?: boolean;
  /** Nome dell'evento Umami e dati aggiuntivi (data-umami-event-*). */
  evento: string;
  datiEvento?: Record<string, string>;
};

const nessunaSottoscrizione = () => () => {};
const suIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

const SECONDARIO =
  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-2 hover:border-ink-3 hover:text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40";

/**
 * I pulsanti per inviare un messaggio già pronto: l'app di posta predefinita (mailto), Gmail e "Copia il testo".
 * Gmail: sull'iPhone si apre l'app (googlegmail://), altrove la scrittura di Gmail nel browser.
 */
export function InviaEmail({ a, oggetto, corpo, pec = false, alternativaPec, disattivato = false, evento, datiEvento = {} }: Props) {
  const iphone = useSyncExternalStore(nessunaSottoscrizione, suIphone, () => false);
  const q = (s: string) => encodeURIComponent(s);
  const mailto = `mailto:${a}?subject=${q(oggetto)}&body=${q(corpo)}`;
  const gmail = iphone
    ? `googlegmail:///co?to=${q(a)}&subject=${q(oggetto)}&body=${q(corpo)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${q(a)}&su=${q(oggetto)}&body=${q(corpo)}`;
  const attributi = (canale: string) => ({
    "data-umami-event": evento,
    "data-umami-event-canale": canale,
    ...Object.fromEntries(Object.entries(datiEvento).map(([k, v]) => [`data-umami-event-${k}`, v])),
  });

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-2">
        <a
          href={disattivato ? undefined : mailto}
          aria-disabled={disattivato}
          {...attributi("app")}
          className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          Apri nella tua app di posta
        </a>
        <div className="flex gap-2">
          <a href={disattivato ? undefined : gmail} aria-disabled={disattivato} target="_blank" rel="noreferrer" {...attributi("gmail")} className={SECONDARIO}>
            <svg viewBox="0 0 24 24" aria-hidden className="size-4">
              <path fill="#4285F4" d="M2 6.5V18a2 2 0 0 0 2 2h3V11l5 3.75L17 11v9h3a2 2 0 0 0 2-2V6.5l-1.5-1.13L12 11.75 3.5 5.37Z" />
              <path fill="#EA4335" d="M22 6.5V6a2 2 0 0 0-3.2-1.6L12 9.5 5.2 4.4A2 2 0 0 0 2 6v.5l10 7.5Z" />
            </svg>
            Apri in Gmail
          </a>
          <CopiaTesto testo={`${oggetto}\n\n${corpo}`} etichetta="Copia il testo" evento={evento} className={SECONDARIO} />
        </div>
      </div>
      {pec && (
        <p className="mt-2 text-sm text-ink-3">
          <span aria-hidden>ℹ️ </span>
          Questo indirizzo è una PEC (posta certificata). Alcune PEC accettano solo messaggi inviati da un&apos;altra PEC: se ricevi un
          avviso di mancata consegna,{" "}
          {alternativaPec ?? <>inviala dalla tua PEC oppure usa il modulo di contatto sul sito dell&apos;ente.</>}
        </p>
      )}
    </div>
  );
}
