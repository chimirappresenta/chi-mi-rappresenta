import type { Metadata } from "next";
import Link from "next/link";
import { PaginaTesto, Paragrafo } from "@/components/PaginaTesto";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Quali dati tratta Chi mi rappresenta: niente account, niente cookie, statistiche anonime.",
};

const EMAIL = "infochimirappresenta@gmail.com";

export default function PrivacyPage() {
  return (
    <PaginaTesto
      titolo="Privacy"
      aggiornata="4 ottobre 2026"
      intro={
        <p>
          Per usare il sito non serve un account, non usiamo cookie e non sappiamo chi sei. Qui spieghiamo nel dettaglio
          quali dati passano dal sito, perché e dove.
        </p>
      }
    >
      <Paragrafo titolo="Chi è il titolare">
        <p>
          Chi mi rappresenta è un progetto personale e indipendente di Gerardo Dell&apos;Aquila, titolare del trattamento. Per
          qualsiasi domanda sulla privacy scrivi a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Cosa non raccogliamo">
        <ul>
          <li>Nessun account, nessuna registrazione, nessun cookie di profilazione o pubblicità.</li>
          <li>
            I messaggi che prepari con &quot;Scrivi a…&quot;, &quot;Chiedi un documento&quot; e &quot;Prepara la segnalazione&quot;
            vengono composti nel tuo browser e li invii tu, dalla tua email o PEC: non passano dai nostri server e non li salviamo.
          </li>
          <li>La ricerca del comune avviene nel tuo browser: non registriamo cosa cerchi.</li>
        </ul>
      </Paragrafo>

      <Paragrafo titolo="Statistiche di visita">
        <p>
          Contiamo le visite con <a href="https://umami.is" target="_blank" rel="noreferrer">Umami</a>, in forma anonima e
          aggregata, senza cookie: pagine visitate, sito di provenienza, paese, tipo di dispositivo e i pulsanti usati (per esempio
          &quot;Condividi&quot;). Non possiamo risalire a chi sei. Se il tuo browser chiede di non essere tracciato (&quot;Do Not
          Track&quot;), la visita non viene contata. Lo scopo è capire se il sito è utile e cosa migliorare.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Segnalazioni di errori">
        <p>
          Se usi &quot;Segnala un errore&quot;, inviamo il testo che scrivi (ed eventualmente la fonte che indichi) insieme a pagina,
          sezione, data e ora, dimensione dello schermo e tipo di browser. La segnalazione diventa{" "}
          <strong>pubblica</strong> come &quot;issue&quot; sul nostro repository GitHub, e una copia arriva in privato al gestore del
          progetto su Telegram, per poterla correggere in fretta.
        </p>
        <p>
          Non scrivere nelle segnalazioni dati personali tuoi o di altri. Se l&apos;hai fatto per errore, scrivici e la rimuoviamo.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Dati tecnici e fornitori">
        <p>
          Come ogni sito, quando apri una pagina il server riceve l&apos;indirizzo IP e i dati tecnici della richiesta, necessari per
          mostrartela. Per le segnalazioni usiamo l&apos;indirizzo IP solo per pochi minuti, per bloccare gli invii ripetuti (al
          massimo 5 ogni 10 minuti), senza salvarlo.
        </p>
        <p>Usiamo questi fornitori, ognuno con la propria informativa:</p>
        <ul>
          <li>
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel</a>: ospita il sito (registri
            tecnici delle richieste).
          </li>
          <li>
            <a href="https://umami.is/privacy" target="_blank" rel="noreferrer">Umami</a>: statistiche anonime.
          </li>
          <li>
            <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">
              GitHub
            </a>
            : pubblica le segnalazioni e il codice del sito.
          </li>
          <li>
            <a href="https://telegram.org/privacy" target="_blank" rel="noreferrer">Telegram</a>: avvisa il gestore delle nuove
            segnalazioni.
          </li>
        </ul>
        <p>
          Alcuni di questi fornitori possono trattare dati anche fuori dall&apos;Unione europea, con le garanzie previste dalle loro
          condizioni (per esempio le clausole contrattuali standard).
        </p>
      </Paragrafo>

      <Paragrafo titolo="Perché li trattiamo">
        <p>
          Statistiche anonime, registri tecnici e protezione dagli abusi si basano sul nostro legittimo interesse a far funzionare il
          sito e a migliorarlo. Le segnalazioni le invii tu, volontariamente, per farci correggere un dato.
        </p>
      </Paragrafo>

      <Paragrafo titolo="I dati delle persone elette">
        <p>
          Il sito mostra nomi, ruoli e contatti istituzionali di persone che ricoprono una carica pubblica, insieme ad alcune
          informazioni che le fonti ufficiali pubblicano come dati aperti (per esempio età, titolo di studio e professione dichiarata
          nell&apos;Anagrafe degli amministratori del Ministero dell&apos;Interno). Li riprendiamo così come sono pubblicati, con la
          fonte sempre indicata, per far conoscere a chi vive in un comune le persone che lo rappresentano. Non pubblichiamo email
          personali né dati di dipendenti pubblici.
        </p>
        <p>
          Se ti riguardano e trovi un dato sbagliato o non più attuale, scrivi a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>: lo
          controlliamo e correggiamo. Elenco delle fonti nella pagina <Link href="/fonti/">Fonti e limiti</Link>.
        </p>
      </Paragrafo>

      <Paragrafo titolo="I tuoi diritti">
        <p>
          Raccogliamo pochissimo, quindi in pratica i casi sono due. Se in una segnalazione hai scritto dati personali, possiamo
          modificarla o cancellarla. Se un dato pubblicato sul sito ti riguarda, possiamo correggerlo o valutare di toglierlo. Le
          statistiche invece sono anonime: non c&apos;è nulla che possiamo ricondurre a te.
        </p>
        <p>
          Per queste richieste, o per qualsiasi altro diritto previsto dalla normativa sulla privacy (accesso, rettifica,
          cancellazione, limitazione, opposizione), scrivi a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Hai anche diritto di
          presentare un reclamo al{" "}
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">
            Garante per la protezione dei dati personali
          </a>
          .
        </p>
      </Paragrafo>
    </PaginaTesto>
  );
}
