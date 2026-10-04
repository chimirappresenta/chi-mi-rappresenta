import type { Metadata } from "next";
import Link from "next/link";
import { PaginaTesto, Paragrafo } from "@/components/PaginaTesto";

export const metadata: Metadata = {
  title: "Termini d'uso",
  description: "Cosa è e cosa non è Chi mi rappresenta: informazioni da fonti ufficiali, non consulenza.",
};

const EMAIL = "infochimirappresenta@gmail.com";

export default function TerminiPage() {
  return (
    <PaginaTesto
      titolo="Termini d'uso"
      aggiornata="4 ottobre 2026"
      intro={<p>Usando il sito accetti queste poche regole. Le abbiamo scritte nel modo più semplice possibile.</p>}
    >
      <Paragrafo titolo="Cos'è il sito">
        <p>
          Chi mi rappresenta è un progetto civico personale e indipendente. <strong>Non è un sito della Pubblica
          Amministrazione</strong> e non è legato a partiti, istituzioni o aziende. Raccoglie in un unico posto informazioni già
          pubblicate da fonti ufficiali.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Le informazioni possono contenere errori">
        <p>
          I dati sono raccolti in automatico dalle fonti ufficiali e aggiornati ogni settimana, ma possono contenere errori, essere
          incompleti o non aggiornati (per esempio subito dopo un&apos;elezione o un cambio di incarico). Sono forniti &quot;così come
          sono&quot;, senza garanzie: <strong>fa sempre fede la fonte ufficiale</strong>, indicata accanto a ogni dato. Verificala prima
          di prendere decisioni.
        </p>
        <p>
          I riassunti delle leggi regionali sono generati con l&apos;intelligenza artificiale e indicati come tali: possono essere
          imprecisi e non sostituiscono il testo della legge, sempre linkato.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Non è consulenza">
        <p>
          La guida &quot;A chi mi rivolgo?&quot;, i modelli di richiesta di accesso civico e le bozze di messaggio sono aiuti pratici,
          non consulenza legale o professionale. Prima di inviare un messaggio o una richiesta, rileggila: sei tu a deciderne il
          contenuto e a inviarla.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Usa i contatti con rispetto">
        <p>
          I contatti pubblicati sono quelli istituzionali, pensati per comunicare con chi ti rappresenta. Non usarli per messaggi
          offensivi o minacciosi, invii di massa, spam o raccolte di indirizzi.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Segnalazioni">
        <p>
          Le segnalazioni di errori sono pubbliche. Non inserire dati personali o contenuti offensivi: possiamo modificare o rimuovere
          le segnalazioni che non rispettano queste regole. Come trattiamo i dati lo spieghiamo nella pagina{" "}
          <Link href="/privacy/">Privacy</Link>.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Codice, dati e nome">
        <p>
          Il codice del sito è libero, con licenza MIT. I dati restano soggetti alle licenze delle rispettive fonti, indicate nella
          pagina <Link href="/fonti/">Fonti e limiti</Link>. Il nome e l&apos;identità del progetto non sono liberi: copie del sito
          pubblicate ad altri indirizzi non sono gestite da noi e non ne garantiamo i contenuti.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Link ad altri siti">
        <p>Il sito rimanda a siti ufficiali e di terzi: non siamo responsabili dei loro contenuti né della loro disponibilità.</p>
      </Paragrafo>

      <Paragrafo titolo="Modifiche e contatti">
        <p>
          Possiamo aggiornare questi termini: la data in alto indica l&apos;ultima versione. Per domande scrivi a{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </Paragrafo>
    </PaginaTesto>
  );
}
